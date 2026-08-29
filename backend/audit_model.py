"""READ-ONLY audit script for CLIMORA ML model pipeline."""
import joblib
import json
import os

pkl_path = r"C:\Users\kp811\.gemini\antigravity\scratch\climora\backend\model\climora_landslide_model.pkl"
pkl_size = os.path.getsize(pkl_path)
print(f"=== PKL FILE SIZE: {pkl_size:,} bytes ({pkl_size/1024:.1f} KB) ===")
print()

pipeline = joblib.load(pkl_path)

print("=== PIPELINE STEPS ===")
for step_name, step_obj in pipeline.steps:
    print(f'  Step: "{step_name}" -> {type(step_obj).__name__}')
print()

# Preprocessor
preprocessor = pipeline.named_steps["preprocessor"]
print("=== PREPROCESSOR (ColumnTransformer) ===")
for name, transformer, columns in preprocessor.transformers_:
    print(f'  Transformer: "{name}"')
    print(f"    Columns: {columns}")
    print(f"    Steps: {[type(s).__name__ for _, s in transformer.steps]}")
print()

# Classifier
clf = pipeline.named_steps["classifier"]
print(f"=== CLASSIFIER: {type(clf).__name__} ===")
params = clf.get_params()
key_params = [
    "n_estimators", "max_depth", "learning_rate", "subsample",
    "colsample_bytree", "min_child_weight", "gamma", "reg_alpha",
    "reg_lambda", "scale_pos_weight", "random_state", "objective",
    "eval_metric", "tree_method", "n_jobs",
]
print("Key parameters:")
for k in key_params:
    if k in params:
        print(f"  {k}: {params[k]}")

print()
print("Full parameter dict:")
for k, v in sorted(params.items()):
    print(f"  {k}: {v}")

print()
print("=== FEATURE IMPORTANCES ===")
fi = clf.feature_importances_
# Get feature names from preprocessor
try:
    feat_names = preprocessor.get_feature_names_out()
    pairs = sorted(zip(feat_names, fi), key=lambda x: x[1], reverse=True)
    for name, score in pairs:
        print(f"  {name}: {score:.6f}")
except Exception as e:
    print(f"  Could not retrieve feature names: {e}")
    print(f"  Raw importances: {fi}")

print()
print("=== METRICS FILE ===")
metrics_path = r"C:\Users\kp811\.gemini\antigravity\scratch\climora\backend\reports\model_metrics.json"
if os.path.exists(metrics_path):
    with open(metrics_path) as f:
        metrics = json.load(f)
    for k, v in metrics.items():
        print(f"  {k}: {v}")
else:
    print("  metrics file NOT FOUND")
