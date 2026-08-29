"""Reproducible CLIMORA synthetic-prototype model improvement cycle.

This script separates tuning/calibration decisions from the final test set.
It is a prototype evaluation workflow only: a random stratified split is useful
for exercising this synthetic dataset, not for claiming geospatial or temporal
generalisation.
"""

from __future__ import annotations

import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (  # noqa: E402
    ALL_INPUT_FEATURES,
    CALIBRATION_COMPARISON_PATH,
    CATEGORICAL_FEATURES,
    COMPARISON_PATH,
    CONFUSION_MATRIX_PATH,
    DATASET_AUDIT_PATH,
    DATASET_PATH,
    FEATURE_IMPORTANCE_PATH,
    METRICS_PATH,
    MODEL_DIR,
    MODEL_PATH,
    MODEL_VERSION,
    NUMERICAL_FEATURES,
    REPORTS_DIR,
    TARGET_COLUMN,
    THRESHOLD_PATH,
)
from preprocessing import build_preprocessor  # noqa: E402

RANDOM_STATE = 42
TUNING_RANDOM_STATE = 314
OUTER_TEST_SIZE = 0.20
VALIDATION_FRACTION_OF_OUTER_TRAIN = 0.25
INNER_FOLDS = 3
MIN_RECALL_FOR_OPERATING_THRESHOLD = 0.70


def json_ready(value: Any) -> Any:
    """Convert NumPy/Pandas values recursively for stable JSON reports."""
    if isinstance(value, dict):
        return {str(key): json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_ready(item) for item in value]
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, Path):
        return str(value)
    return value


def write_json(path: Path, payload: dict[str, Any] | list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as report_file:
        json.dump(json_ready(payload), report_file, indent=2)


def build_pipeline(params: dict[str, Any]) -> Pipeline:
    """Return a fresh preprocessing + XGBoost pipeline for one experiment."""
    classifier = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
        **params,
    )
    return Pipeline(
        steps=[
            (
                "preprocessor",
                build_preprocessor(
                    numerical_cols=NUMERICAL_FEATURES,
                    categorical_cols=CATEGORICAL_FEATURES,
                ),
            ),
            ("classifier", classifier),
        ]
    )


def expected_calibration_error(
    y_true: pd.Series | np.ndarray, probabilities: np.ndarray, bins: int = 10
) -> tuple[float, list[dict[str, Any]]]:
    """Compute a compact ECE summary without a real-world calibration claim."""
    y_values = np.asarray(y_true, dtype=float)
    prob_values = np.asarray(probabilities, dtype=float)
    bin_edges = np.linspace(0.0, 1.0, bins + 1)
    bin_ids = np.clip(np.digitize(prob_values, bin_edges[1:-1], right=False), 0, bins - 1)
    rows: list[dict[str, Any]] = []
    ece = 0.0
    total = len(y_values)
    for index in range(bins):
        mask = bin_ids == index
        count = int(mask.sum())
        if not count:
            continue
        mean_probability = float(prob_values[mask].mean())
        observed_rate = float(y_values[mask].mean())
        ece += (count / total) * abs(observed_rate - mean_probability)
        rows.append(
            {
                "bin": index + 1,
                "count": count,
                "mean_predicted_probability": round(mean_probability, 6),
                "observed_positive_rate": round(observed_rate, 6),
                "absolute_gap": round(abs(observed_rate - mean_probability), 6),
            }
        )
    return float(ece), rows


def metric_bundle(
    y_true: pd.Series | np.ndarray, probabilities: np.ndarray, threshold: float
) -> dict[str, Any]:
    """Metrics at an explicit threshold plus probability-quality metrics."""
    labels = (np.asarray(probabilities) >= threshold).astype(int)
    y_values = np.asarray(y_true, dtype=int)
    matrix = confusion_matrix(y_values, labels, labels=[0, 1])
    ece, calibration_bins = expected_calibration_error(y_values, probabilities)
    return {
        "threshold": round(float(threshold), 4),
        "accuracy": round(float(accuracy_score(y_values, labels)), 6),
        "precision": round(float(precision_score(y_values, labels, zero_division=0)), 6),
        "recall": round(float(recall_score(y_values, labels, zero_division=0)), 6),
        "f1_score": round(float(f1_score(y_values, labels, zero_division=0)), 6),
        "roc_auc": round(float(roc_auc_score(y_values, probabilities)), 6),
        "brier_score": round(float(brier_score_loss(y_values, probabilities)), 6),
        "expected_calibration_error_10_bins": round(float(ece), 6),
        "confusion_matrix": {
            "true_negative": int(matrix[0, 0]),
            "false_positive": int(matrix[0, 1]),
            "false_negative": int(matrix[1, 0]),
            "true_positive": int(matrix[1, 1]),
            "matrix": matrix.tolist(),
        },
        "calibration_bins": calibration_bins,
    }


def select_operating_threshold(
    y_true: pd.Series, probabilities: np.ndarray
) -> tuple[float, dict[str, Any]]:
    """Select a prototype operating point without looking at the outer test set."""
    candidates: list[tuple[float, dict[str, Any]]] = []
    for threshold in np.round(np.arange(0.10, 0.901, 0.005), 3):
        metrics = metric_bundle(y_true, probabilities, float(threshold))
        candidates.append((float(threshold), metrics))

    feasible = [item for item in candidates if item[1]["recall"] >= MIN_RECALL_FOR_OPERATING_THRESHOLD]
    pool = feasible if feasible else candidates
    # F1 is primary; recall and precision resolve exact ties.
    selected_threshold, selected_metrics = max(
        pool,
        key=lambda item: (item[1]["f1_score"], item[1]["recall"], item[1]["precision"]),
    )
    return selected_threshold, selected_metrics


def audit_dataset(frame: pd.DataFrame) -> dict[str, Any]:
    """Capture integrity checks and prototype limitations before model selection."""
    grouped_target_conflicts = int(
        (frame.groupby(ALL_INPUT_FEATURES, dropna=False)[TARGET_COLUMN].nunique() > 1).sum()
    )
    risk_category_table = (
        pd.crosstab(frame["risk_category_prototype"], frame[TARGET_COLUMN], normalize="index")
        .round(6)
        .to_dict(orient="index")
    )
    numerical_association = (
        frame[NUMERICAL_FEATURES + [TARGET_COLUMN]]
        .corr(numeric_only=True)[TARGET_COLUMN]
        .drop(TARGET_COLUMN)
        .sort_values(key=lambda values: values.abs(), ascending=False)
        .round(6)
        .to_dict()
    )
    categorical_rates = {
        column: (
            frame.groupby(column, observed=False)[TARGET_COLUMN]
            .agg(["size", "mean"])
            .rename(columns={"mean": "positive_rate"})
            .round(6)
            .to_dict(orient="index")
        )
        for column in CATEGORICAL_FEATURES
    }
    return {
        "audit_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "path": DATASET_PATH.name,
            "declared_type": "Synthetic prototype dataset",
            "rows": int(frame.shape[0]),
            "columns": int(frame.shape[1]),
            "all_missing_values": int(frame.isna().sum().sum()),
            "full_row_duplicates": int(frame.duplicated().sum()),
            "feature_duplicate_rows": int(frame.duplicated(subset=ALL_INPUT_FEATURES).sum()),
            "feature_groups_with_conflicting_targets": grouped_target_conflicts,
            "target_counts": {
                str(label): int(count)
                for label, count in frame[TARGET_COLUMN].value_counts().sort_index().items()
            },
            "positive_rate": round(float(frame[TARGET_COLUMN].mean()), 6),
        },
        "feature_quality": {
            "columns_and_unique_values": {
                column: {
                    "dtype": str(frame[column].dtype),
                    "unique_values": int(frame[column].nunique(dropna=False)),
                }
                for column in frame.columns
            },
            "numerical_target_correlation": numerical_association,
            "categorical_positive_rates": categorical_rates,
            "out_of_api_range": {
                "days_since_previous_event_negative_rows": int(
                    (frame["days_since_previous_event"] < 0).sum()
                ),
                "soil_moisture_outside_zero_to_one_rows": int(
                    ((frame["soil_moisture"] < 0) | (frame["soil_moisture"] > 1)).sum()
                ),
            },
        },
        "leakage_review": {
            "excluded_columns": [TARGET_COLUMN, "risk_category_prototype"],
            "risk_category_prototype_target_distribution": risk_category_table,
            "finding": (
                "risk_category_prototype is excluded from ALL_INPUT_FEATURES because it is a target-adjacent "
                "prototype label. It must never be used as a model feature."
            ),
        },
        "limitations": [
            "The CSV is synthetic, so random-split metrics do not establish real-world landslide prediction performance.",
            "Rows have no event date or documented provenance; this prevents temporal validation.",
            "Random train/test splits do not prevent nearby or related locations from appearing in both partitions; future real-data work needs spatial blocking.",
            "The approximately balanced target (rather than a naturally rare event rate) means the prototype's precision, recall, and probability levels will not transfer directly to operations.",
            "Latitude and longitude are mostly unique synthetic values and should not be interpreted as a validated regional susceptibility map.",
        ],
    }


def candidate_definitions(scale_pos_weight: float) -> dict[str, dict[str, Any]]:
    """Small, theory-driven search—not a blind sweep."""
    return {
        "current_style_weighted_baseline": {
            "n_estimators": 200,
            "max_depth": 6,
            "learning_rate": 0.06,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "min_child_weight": 2,
            "gamma": 0.0,
            "reg_alpha": 0.0,
            "reg_lambda": 1.0,
            "scale_pos_weight": scale_pos_weight,
        },
        "regularized_depth4_unweighted": {
            "n_estimators": 450,
            "max_depth": 4,
            "learning_rate": 0.035,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "min_child_weight": 6,
            "gamma": 0.10,
            "reg_alpha": 0.05,
            "reg_lambda": 2.0,
            "scale_pos_weight": 1.0,
        },
        "compact_depth3_unweighted": {
            "n_estimators": 400,
            "max_depth": 3,
            "learning_rate": 0.04,
            "subsample": 0.90,
            "colsample_bytree": 0.90,
            "min_child_weight": 8,
            "gamma": 0.10,
            "reg_alpha": 0.05,
            "reg_lambda": 3.0,
            "scale_pos_weight": 1.0,
        },
        "moderate_depth5_regularized": {
            "n_estimators": 350,
            "max_depth": 5,
            "learning_rate": 0.04,
            "subsample": 0.80,
            "colsample_bytree": 0.80,
            "min_child_weight": 8,
            "gamma": 0.15,
            "reg_alpha": 0.10,
            "reg_lambda": 3.0,
            "scale_pos_weight": 1.0,
        },
    }


def oof_candidate_evaluation(
    X_train: pd.DataFrame, y_train: pd.Series, params: dict[str, Any]
) -> dict[str, Any]:
    """Generate OOF scores for tuning only; the outer test remains untouched."""
    folds = StratifiedKFold(n_splits=INNER_FOLDS, shuffle=True, random_state=TUNING_RANDOM_STATE)
    oof_probabilities = np.zeros(len(X_train), dtype=float)
    for fit_index, holdout_index in folds.split(X_train, y_train):
        pipeline = build_pipeline(params)
        pipeline.fit(X_train.iloc[fit_index], y_train.iloc[fit_index])
        oof_probabilities[holdout_index] = pipeline.predict_proba(X_train.iloc[holdout_index])[:, 1]
    threshold, threshold_metrics = select_operating_threshold(y_train, oof_probabilities)
    return {
        "oof_rows": int(len(y_train)),
        "oof_default_threshold_metrics": metric_bundle(y_train, oof_probabilities, 0.50),
        "oof_selected_threshold": round(threshold, 4),
        "oof_selected_threshold_metrics": threshold_metrics,
    }


def calibration_comparison(
    X_fit: pd.DataFrame,
    y_fit: pd.Series,
    X_validation: pd.DataFrame,
    y_validation: pd.Series,
    params: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    """Choose a probability calibration method only from the validation partition."""
    candidates: dict[str, dict[str, Any]] = {}
    for method in ("sigmoid", "isotonic"):
        calibrated = CalibratedClassifierCV(
            estimator=build_pipeline(params), method=method, cv=INNER_FOLDS, n_jobs=1
        )
        calibrated.fit(X_fit, y_fit)
        probabilities = calibrated.predict_proba(X_validation)[:, 1]
        candidates[method] = metric_bundle(y_validation, probabilities, 0.50)
    selected_method = min(
        candidates,
        key=lambda method: (
            candidates[method]["brier_score"],
            candidates[method]["expected_calibration_error_10_bins"],
        ),
    )
    return selected_method, {
        "selection_partition": "Validation partition only; outer test partition untouched.",
        "selection_rule": "Lowest Brier score, then lowest 10-bin expected calibration error.",
        "candidate_metrics_at_default_threshold": candidates,
        "selected_method": selected_method,
    }


def extract_feature_importance(
    calibrated_model: CalibratedClassifierCV,
) -> list[dict[str, Any]]:
    """Average XGBoost gain importances across calibration folds for auditing."""
    importances: list[np.ndarray] = []
    feature_names: list[str] | None = None
    for calibrated_classifier in calibrated_model.calibrated_classifiers_:
        estimator = calibrated_classifier.estimator
        preprocessor = estimator.named_steps["preprocessor"]
        classifier = estimator.named_steps["classifier"]
        try:
            names = preprocessor.get_feature_names_out().tolist()
        except Exception:
            names = [f"feature_{index}" for index in range(len(classifier.feature_importances_))]
        if feature_names is None:
            feature_names = names
        importances.append(np.asarray(classifier.feature_importances_, dtype=float))
    if not importances or feature_names is None:
        raise RuntimeError("Unable to extract feature importances from calibrated model.")
    average_importance = np.mean(np.vstack(importances), axis=0)
    result = [
        {"feature": name, "importance": round(float(importance), 8)}
        for name, importance in zip(feature_names, average_importance)
    ]
    return sorted(result, key=lambda item: item["importance"], reverse=True)


def main() -> None:
    print("=" * 76)
    print("CLIMORA — SYNTHETIC PROTOTYPE MODEL IMPROVEMENT CYCLE")
    print("=" * 76)
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    frame = pd.read_csv(DATASET_PATH)
    audit = audit_dataset(frame)
    write_json(DATASET_AUDIT_PATH, audit)
    print(f"[1/6] Data audit saved: {DATASET_AUDIT_PATH.name}")

    X = frame[ALL_INPUT_FEATURES].copy()
    y = frame[TARGET_COLUMN].astype(int).copy()
    X_outer_train, X_outer_test, y_outer_train, y_outer_test = train_test_split(
        X, y, test_size=OUTER_TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    X_fit, X_validation, y_fit, y_validation = train_test_split(
        X_outer_train,
        y_outer_train,
        test_size=VALIDATION_FRACTION_OF_OUTER_TRAIN,
        random_state=TUNING_RANDOM_STATE,
        stratify=y_outer_train,
    )
    class_weight = float((y_fit == 0).sum() / (y_fit == 1).sum())
    print(
        f"[2/6] Stratified partitions: fit={len(y_fit):,}, "
        f"validation={len(y_validation):,}, test={len(y_outer_test):,}"
    )

    candidate_results: dict[str, dict[str, Any]] = {}
    for name, params in candidate_definitions(class_weight).items():
        print(f"[3/6] OOF tuning candidate: {name}")
        candidate_results[name] = {
            "parameters": params,
            **oof_candidate_evaluation(X_fit, y_fit, params),
        }
    selected_name = max(
        candidate_results,
        key=lambda name: (
            candidate_results[name]["oof_selected_threshold_metrics"]["f1_score"],
            candidate_results[name]["oof_selected_threshold_metrics"]["recall"],
            candidate_results[name]["oof_selected_threshold_metrics"]["roc_auc"],
        ),
    )
    selected_params = candidate_results[selected_name]["parameters"]
    write_json(
        COMPARISON_PATH,
        {
            "evaluation_scope": "Candidate selection on three-fold stratified OOF predictions from the fit partition only.",
            "selection_policy": (
                "Highest F1 after selecting a prototype operating threshold with recall >= 0.70; "
                "ties resolve by recall, then ROC-AUC. Accuracy is not a selection criterion."
            ),
            "selected_candidate": selected_name,
            "candidates": candidate_results,
        },
    )
    print(f"      Selected: {selected_name}")

    selected_calibration, calibration_payload = calibration_comparison(
        X_fit, y_fit, X_validation, y_validation, selected_params
    )
    write_json(CALIBRATION_COMPARISON_PATH, calibration_payload)
    print(f"[4/6] Calibration selected on validation set: {selected_calibration}")

    validation_model = CalibratedClassifierCV(
        estimator=build_pipeline(selected_params), method=selected_calibration, cv=INNER_FOLDS, n_jobs=1
    )
    validation_model.fit(X_fit, y_fit)
    validation_probabilities = validation_model.predict_proba(X_validation)[:, 1]
    operating_threshold, validation_threshold_metrics = select_operating_threshold(
        y_validation, validation_probabilities
    )
    threshold_payload = {
        "selection_partition": "Validation partition only; outer test partition was not used.",
        "selection_policy": (
            "Maximum F1 among thresholds with recall >= 0.70; ties resolve by recall and then precision."
        ),
        "minimum_recall_constraint": MIN_RECALL_FOR_OPERATING_THRESHOLD,
        "selected_threshold": round(operating_threshold, 4),
        "validation_metrics_at_selected_threshold": validation_threshold_metrics,
        "interpretation": (
            "Prototype binary operating point only. It is not an alert or evacuation threshold and must be revalidated "
            "on real, temporally and spatially separated data before operational use."
        ),
    }
    write_json(THRESHOLD_PATH, threshold_payload)
    print(f"[5/6] Operating threshold selected from validation: {operating_threshold:.3f}")

    final_model = CalibratedClassifierCV(
        estimator=build_pipeline(selected_params), method=selected_calibration, cv=INNER_FOLDS, n_jobs=1
    )
    final_model.fit(X_outer_train, y_outer_train)
    test_probabilities = final_model.predict_proba(X_outer_test)[:, 1]
    final_metrics = metric_bundle(y_outer_test, test_probabilities, operating_threshold)
    default_metrics = metric_bundle(y_outer_test, test_probabilities, 0.50)
    feature_importance = extract_feature_importance(final_model)
    pd.DataFrame(feature_importance).to_csv(FEATURE_IMPORTANCE_PATH, index=False)
    pd.DataFrame(
        final_metrics["confusion_matrix"]["matrix"],
        index=["actual_0_no_landslide", "actual_1_landslide"],
        columns=["predicted_0", "predicted_1"],
    ).to_csv(CONFUSION_MATRIX_PATH)

    metrics_payload = {
        "evaluation_label": "Synthetic prototype evaluation — not real-world validation",
        "model_version": MODEL_VERSION,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": audit["dataset"],
        "validation_design": {
            "outer_test": "20% stratified, held untouched during candidate/calibration/threshold selection",
            "fit_partition": "60% of all rows; used for candidate OOF tuning and calibration fitting",
            "validation_partition": "20% of all rows; used to choose calibration method and operating threshold",
            "inner_cv": f"{INNER_FOLDS}-fold stratified CV",
            "important_limitation": "Random stratification is appropriate only for this synthetic prototype; it is not spatial or temporal validation.",
        },
        "selected_model": {
            "candidate": selected_name,
            "xgboost_parameters": selected_params,
            "calibration_method": selected_calibration,
            "pipeline": "ColumnTransformer(SimpleImputer + OneHotEncoder) -> XGBClassifier -> CalibratedClassifierCV",
            "serialized_artifact": MODEL_PATH.name,
        },
        "operating_threshold": threshold_payload,
        "outer_test_metrics_at_selected_threshold": final_metrics,
        "outer_test_metrics_at_default_0_50_threshold": default_metrics,
        "top_feature_importances": feature_importance[:20],
        "artifacts": {
            "dataset_audit": DATASET_AUDIT_PATH.name,
            "candidate_comparison": COMPARISON_PATH.name,
            "calibration_comparison": CALIBRATION_COMPARISON_PATH.name,
            "threshold_selection": THRESHOLD_PATH.name,
            "feature_importance": FEATURE_IMPORTANCE_PATH.name,
            "confusion_matrix": CONFUSION_MATRIX_PATH.name,
        },
        "runtime": {
            "python": platform.python_version(),
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "xgboost": xgb.__version__,
        },
        "disclaimer": (
            "All results in this report arise from a synthetic prototype CSV and a random stratified split. They demonstrate a reproducible "
            "software/modeling workflow only; they must not be described as real-world landslide prediction accuracy, calibrated operational risk, "
            "or a validated public-alert model. Real deployment requires provenance-tracked event data plus temporal and spatially blocked validation."
        ),
    }
    write_json(METRICS_PATH, metrics_payload)
    joblib.dump(final_model, MODEL_PATH)
    print(f"[6/6] Saved versioned calibrated pipeline: {MODEL_PATH.name}")
    print("\nFINAL OUTER-TEST METRICS (SYNTHETIC PROTOTYPE ONLY)")
    for key in (
        "precision",
        "recall",
        "f1_score",
        "roc_auc",
        "brier_score",
        "expected_calibration_error_10_bins",
        "accuracy",
    ):
        print(f"  {key}: {final_metrics[key]}")
    print(f"  selected_threshold: {operating_threshold:.3f}")
    print(f"  confusion_matrix: {final_metrics['confusion_matrix']['matrix']}")


if __name__ == "__main__":
    main()
