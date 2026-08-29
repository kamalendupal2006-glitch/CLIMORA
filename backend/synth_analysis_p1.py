"""
READ-ONLY CLIMORA Synthetic Data Generation Analysis — PART 1
Covers:
  - Correlations, mutual information
  - Target rate by feature bins
  - Numerical feature vs target relationship
  - Monotonicity tests
  - days_since_previous_event = -1 investigation
"""
import pandas as pd
import numpy as np
from sklearn.feature_selection import mutual_info_classif
from scipy import stats

df = pd.read_csv(r"C:\Users\kp811\.gemini\antigravity\scratch\climora\backend\data\climora_85000_non_satellite_prototype.csv")

# ── CORRELATIONS ──────────────────────────────────────────────────────────────
print("=" * 64)
print("PEARSON CORRELATIONS with landslide (sorted)")
print("=" * 64)
num_feats = [c for c in df.select_dtypes("number").columns if c != "landslide"]
corr = df[num_feats].corrwith(df["landslide"]).sort_values(key=abs, ascending=False)
for feat, val in corr.items():
    print(f"  {feat:<35} {val:+.6f}")

# ── MUTUAL INFORMATION ───────────────────────────────────────────────────────
print()
print("=" * 64)
print("MUTUAL INFORMATION with landslide (sorted)")
print("=" * 64)
X_num = df[num_feats].fillna(-1)
mi = mutual_info_classif(X_num, df["landslide"], discrete_features=False, random_state=42)
mi_series = pd.Series(mi, index=num_feats).sort_values(ascending=False)
for feat, val in mi_series.items():
    print(f"  {feat:<35} {val:.6f}")

# ── SPEARMAN (MONOTONIC) ────────────────────────────────────────────────────
print()
print("=" * 64)
print("SPEARMAN (MONOTONIC) CORRELATIONS with landslide")
print("=" * 64)
for feat in num_feats:
    rho, pval = stats.spearmanr(df[feat], df["landslide"])
    sig = "***" if pval < 0.001 else ("**" if pval < 0.01 else ("*" if pval < 0.05 else ""))
    print(f"  {feat:<35} rho={rho:+.6f}  p={pval:.3e}  {sig}")

# ── TARGET RATE BY BIN (key features) ───────────────────────────────────────
def bin_analysis(col, n_bins=10):
    df["_bin"] = pd.qcut(df[col], q=n_bins, duplicates="drop")
    result = df.groupby("_bin", observed=True)["landslide"].agg(["mean", "count"])
    result.columns = ["rate", "n"]
    del df["_bin"]
    return result

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — slope_deg")
print("=" * 64)
print(bin_analysis("slope_deg").to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — soil_moisture")
print("=" * 64)
print(bin_analysis("soil_moisture").to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — rainfall_mm")
print("=" * 64)
print(bin_analysis("rainfall_mm").to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — elevation_m")
print("=" * 64)
print(bin_analysis("elevation_m").to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — temperature_c")
print("=" * 64)
print(bin_analysis("temperature_c").to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — historical_landslide_count")
print("=" * 64)
print(bin_analysis("historical_landslide_count", n_bins=8).to_string())

print()
print("=" * 64)
print("TARGET RATE BY QUANTILE BIN — days_since_previous_event")
print("=" * 64)
print(bin_analysis("days_since_previous_event").to_string())

print()
print("=" * 64)
print("days_since_previous_event = -1  INVESTIGATION")
print("=" * 64)
minus1 = df[df["days_since_previous_event"] == -1]
normal = df[df["days_since_previous_event"] >= 0]
print(f"  Rows with value -1:   {len(minus1)}")
print(f"  Rows with value >= 0: {len(normal)}")
print(f"  Landslide rate (= -1):  {minus1['landslide'].mean():.4f}")
print(f"  Landslide rate (>= 0): {normal['landslide'].mean():.4f}")
print()
print("  historical_landslide_count distribution for -1 rows:")
print(minus1["historical_landslide_count"].describe().to_string())
print()
print("  historical_landslide_count distribution for normal rows:")
print(normal["historical_landslide_count"].describe().to_string())
print()
print("  land_cover distribution for -1 rows:")
print(minus1["land_cover"].value_counts().to_string())
print()
print("  state_region distribution for -1 rows:")
print(minus1["state_region"].value_counts().to_string())
