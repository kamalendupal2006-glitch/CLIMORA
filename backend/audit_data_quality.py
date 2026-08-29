"""READ-ONLY data quality probe for CLIMORA prototype CSV."""
import pandas as pd
import numpy as np

df = pd.read_csv(r"C:\Users\kp811\.gemini\antigravity\scratch\climora\backend\data\climora_85000_non_satellite_prototype.csv")

print("=== DATA QUALITY: days_since_previous_event has -1 ===")
neg = (df["days_since_previous_event"] < 0).sum()
print(f"  Rows with days_since_previous_event < 0: {neg}")
print(f"  Min value: {df['days_since_previous_event'].min()}")

print()
print("=== CORRELATION of each feature with target 'landslide' ===")
num_cols = df.select_dtypes(include="number").columns.drop("landslide").tolist()
corr = df[num_cols].corrwith(df["landslide"]).sort_values(ascending=False)
print(corr.to_string())

print()
print("=== LANDSLIDE rate by land_cover ===")
print(df.groupby("land_cover")["landslide"].mean().sort_values(ascending=False).to_string())

print()
print("=== LANDSLIDE rate by state_region ===")
print(df.groupby("state_region")["landslide"].mean().sort_values(ascending=False).to_string())

print()
print("=== Suspicious: risk_category_prototype vs landslide cross-tab ===")
ct = pd.crosstab(df["risk_category_prototype"], df["landslide"], normalize="index")
print(ct.to_string())

print()
print("=== Check: rows where landslide=1 but risk_category_prototype=NO_RISK ===")
leakage_check = df[(df["landslide"] == 1) & (df["risk_category_prototype"] == "NO_RISK")]
print(f"  Count: {len(leakage_check)}")
leakage_check2 = df[(df["landslide"] == 0) & (df["risk_category_prototype"] == "CRITICAL")]
print(f"  Rows where landslide=0 but risk_category_prototype=CRITICAL: {len(leakage_check2)}")

print()
print("=== RAINFALL distribution percentiles ===")
print(df["rainfall_mm"].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

print()
print("=== SLOPE distribution percentiles ===")
print(df["slope_deg"].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

print()
print("=== SOIL_MOISTURE distribution (check if suspiciously uniform) ===")
print(df["soil_moisture"].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

print()
print("=== CURVATURE distribution ===")
print(df["curvature"].describe())

print()
print("=== HISTORICAL_LANDSLIDE_COUNT vs target: mean landslide per count ===")
print(df.groupby("historical_landslide_count")["landslide"].mean().head(15).to_string())

print()
print("=== ASPECT_DEG: check if uniformly distributed ===")
# Count in 8 sectors
df["_aspect_sector"] = pd.cut(df["aspect_deg"], bins=[0,45,90,135,180,225,270,315,360], include_lowest=True)
print(df["_aspect_sector"].value_counts().sort_index().to_string())

print()
print("=== STATE REGION counts ===")
print(df["state_region"].value_counts().to_string())

print()
print("=== LAND COVER counts ===")
print(df["land_cover"].value_counts().to_string())
