"""
READ-ONLY CLIMORA Synthetic Data Generation Analysis — PART 2
Covers:
  - Categorical groups
  - Lat/lon spatial structure
  - aspect_deg and curvature randomness tests
  - state_region vs lat/lon geographic validity
  - land_cover distribution realism
  - risk_category_prototype generation mechanism
  - Attempt to reconstruct target via scoring formulas
"""
import pandas as pd
import numpy as np
from scipy import stats

df = pd.read_csv(r"C:\Users\kp811\.gemini\antigravity\scratch\climora\backend\data\climora_85000_non_satellite_prototype.csv")

# ── CATEGORICAL GROUPS ───────────────────────────────────────────────────────
print("=" * 64)
print("TARGET RATE BY state_region (with counts)")
print("=" * 64)
sr = df.groupby("state_region")["landslide"].agg(["mean","count","std"]).sort_values("mean", ascending=False)
print(sr.to_string())

print()
print("=" * 64)
print("TARGET RATE BY land_cover (with counts)")
print("=" * 64)
lc = df.groupby("land_cover")["landslide"].agg(["mean","count","std"]).sort_values("mean", ascending=False)
print(lc.to_string())

# ── LATITUDE / LONGITUDE SPATIAL ANALYSIS ───────────────────────────────────
print()
print("=" * 64)
print("LAT/LON SPATIAL ANALYSIS")
print("=" * 64)

# Expected lat/lon ranges for each Indian state
state_expected = {
    "Jammu and Kashmir":  (32, 37, 73, 80),
    "Himachal Pradesh":   (30, 34, 75, 79),
    "Uttarakhand":        (28, 31, 78, 81),
    "Arunachal Pradesh":  (26, 30, 91, 97),
    "Meghalaya":          (25, 26, 89, 93),
    "Sikkim":             (27, 28, 88, 89),
    "West Bengal":        (21, 27, 85, 90),
    "Karnataka":          (11, 18, 74, 78),
    "Kerala":             ( 8, 13, 76, 77),
    "Tamil Nadu":         ( 8, 13, 77, 80),
    "Maharashtra":        (15, 22, 72, 80),
}

print(f"  {'State':<22} {'lat_min':>7} {'lat_max':>7} {'lon_min':>7} {'lon_max':>7}  in_range%")
for state, (elat_min, elat_max, elon_min, elon_max) in state_expected.items():
    sub = df[df["state_region"] == state]
    in_range = (
        (sub["latitude"] >= elat_min) &
        (sub["latitude"] <= elat_max) &
        (sub["longitude"] >= elon_min) &
        (sub["longitude"] <= elon_max)
    ).mean()
    print(f"  {state:<22} {sub['latitude'].min():>7.2f} {sub['latitude'].max():>7.2f}  {sub['longitude'].min():>7.2f} {sub['longitude'].max():>7.2f}  {in_range*100:>5.1f}%")

print()
print("  Correlation of lat/lon with landslide:")
print(f"    latitude  -> {df['latitude'].corr(df['landslide']):+.6f}")
print(f"    longitude -> {df['longitude'].corr(df['landslide']):+.6f}")
print()
print("  Range check — actual dataset:")
print(f"    latitude:  {df['latitude'].min():.4f} – {df['latitude'].max():.4f}   (India: ~8–37)")
print(f"    longitude: {df['longitude'].min():.4f} – {df['longitude'].max():.4f}   (India: ~68–97)")

# ── ASPECT_DEG AND CURVATURE UNIFORMITY TESTS ────────────────────────────────
print()
print("=" * 64)
print("ASPECT_DEG UNIFORMITY TEST (Kolmogorov-Smirnov vs Uniform)")
print("=" * 64)
aspect_scaled = df["aspect_deg"] / 360.0
ks_stat, ks_p = stats.kstest(aspect_scaled, "uniform")
print(f"  KS statistic: {ks_stat:.6f}")
print(f"  KS p-value:   {ks_p:.4e}")
print(f"  Verdict: {'FAILS TO REJECT uniform (appears random)' if ks_p > 0.05 else 'REJECTS uniform at 5%'}")

print()
print("=" * 64)
print("CURVATURE NORMALITY TEST (Kolmogorov-Smirnov vs Normal)")
print("=" * 64)
curv_norm = (df["curvature"] - df["curvature"].mean()) / df["curvature"].std()
ks_stat2, ks_p2 = stats.kstest(curv_norm, "norm")
print(f"  KS statistic: {ks_stat2:.6f}")
print(f"  KS p-value:   {ks_p2:.4e}")
print(f"  Curvature mean: {df['curvature'].mean():.8f}, std: {df['curvature'].std():.6f}")
print(f"  Min: {df['curvature'].min()}, Max: {df['curvature'].max()}")

print()
print("  Curvature vs landslide:")
print(f"    Pearson r:  {df['curvature'].corr(df['landslide']):+.6f}")
rho, p = stats.spearmanr(df["curvature"], df["landslide"])
print(f"    Spearman r: {rho:+.6f}  (p={p:.3e})")

# ── RISK_CATEGORY_PROTOTYPE GENERATION MECHANISM ────────────────────────────
print()
print("=" * 64)
print("risk_category_prototype vs landslide — DETAILED")
print("=" * 64)
ct = pd.crosstab(df["risk_category_prototype"], df["landslide"], margins=True)
print(ct.to_string())
print()

# Check if risk_category is deterministically set from key numerical features
# Attempt to find thresholds using slope_deg + rainfall_mm + soil_moisture
print("Numerical stats PER risk_category_prototype:")
key_num = ["slope_deg", "rainfall_mm", "soil_moisture", "elevation_m", "temperature_c",
           "historical_landslide_count"]
for feat in key_num:
    grp = df.groupby("risk_category_prototype")[feat].mean().sort_values(ascending=False)
    print(f"\n  {feat}:")
    print("  " + grp.to_string())

# ── ATTEMPT TO RECONSTRUCT RISK SCORE ────────────────────────────────────────
print()
print("=" * 64)
print("RISK SCORE RECONSTRUCTION ATTEMPT")
print("(Normalized weighted formula: slope + moisture + rainfall - temperature)")
print("=" * 64)

# Normalize key features to [0,1]
def norm(series):
    return (series - series.min()) / (series.max() - series.min())

df["_score"] = (
    0.30 * norm(df["slope_deg"]) +
    0.25 * norm(df["soil_moisture"]) +
    0.20 * norm(df["rainfall_mm"]) +
    0.15 * norm(df["elevation_m"]) +
    0.15 * norm(df["historical_landslide_count"]) -
    0.10 * norm(df["temperature_c"])
)
print(f"  Correlation of reconstructed score with landslide: {df['_score'].corr(df['landslide']):+.4f}")
print(f"  Correlation of reconstructed score with risk encoded:")
risk_ord = {"NO_RISK": 0, "LOW": 1, "MODERATE": 2, "HIGH": 3, "CRITICAL": 4}
df["_risk_ord"] = df["risk_category_prototype"].map(risk_ord)
print(f"    vs risk_category_prototype (ordinal): {df['_score'].corr(df['_risk_ord']):+.4f}")

print()
print("  Mean score per risk category (ascending = monotonic signal?)")
print(df.groupby("risk_category_prototype")["_score"].mean().sort_values().to_string())

print()
print("  Mean score per landslide class:")
print(df.groupby("landslide")["_score"].mean().to_string())

del df["_score"], df["_risk_ord"]

# ── LAND COVER REALISM ───────────────────────────────────────────────────────
print()
print("=" * 64)
print("LAND COVER DISTRIBUTION CHECK")
print("=" * 64)
lc_state = pd.crosstab(df["state_region"], df["land_cover"], normalize="index")
print(lc_state.to_string())

print()
print("  Expected real-world: Forest dominant in NE states, Cropland in plains")
print("  Forest % by state:")
print(lc_state["Forest"].sort_values(ascending=False).to_string())
