import os
import sys
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ai_reports_groq import generate_incident_report



# === Ensure folders ===
os.makedirs("data/processed", exist_ok=True)
os.makedirs("data/output", exist_ok=True)
os.makedirs("reports/generated", exist_ok=True)

DATA_IN = "data/processed/combined_logs.csv"
ANOM_OUT = "data/output/anomaly_results.csv"
FINAL_OUT = "data/output/final_risk_scored_logs.csv"
REPORT_DIR = "reports/generated"

# === Verify dataset ===
if not os.path.exists(DATA_IN):
    print(f"❌ Input file not found: {DATA_IN}")
    sys.exit(1)

print(f"📥 Loading data from: {DATA_IN}")
df = pd.read_csv(DATA_IN)

# === Features ===
features = [
    "off_hour_login_count",
    "usb_activity_score",
    "file_access_freq",
    "decoy_access_flag",
    "failed_logins",
    "session_duration"
]
for col in features:
    if col not in df.columns:
        df[col] = 0.0
X = df[features]

# === Train model ===
print("🧠 Training Isolation Forest...")
model = IsolationForest(n_estimators=100, contamination=0.25, random_state=42)
model.fit(X)

# === Predict ===
df["anomaly_score"] = model.decision_function(X)
df["is_anomaly"] = model.predict(X)
df["is_anomaly"] = df["is_anomaly"].replace({1: 0, -1: 1})

# === Risk Mapping ===
def calculate_risk_level(score):
    if score < -0.25:
        return "Critical"
    elif score < 0:
        return "High"
    elif score < 0.25:
        return "Moderate"
    else:
        return "Low"
        
def threat_tag(level):
    tags = {
        "Critical": "🔴 [CRITICAL]",
        "High": "🟠 [HIGH]",
        "Moderate": "🟡 [MODERATE]",
        "Low": "🟢 [LOW]"
    }
    return tags.get(level, "[UNKNOWN]")


df["risk_level"] = df["anomaly_score"].apply(calculate_risk_level)
print("✅ Model done. Risk distribution:")
print(df["risk_level"].value_counts())

for _, row in df.iterrows():
    tag = threat_tag(row["risk_level"])
    print(f"{tag} {row['user_id']} — anomaly_score: {row['anomaly_score']:.3f}")

# === Save outputs ===
df.to_csv(ANOM_OUT, index=False, encoding="utf-8")
df.to_csv(FINAL_OUT, index=False, encoding="utf-8")



# === AI Reports + CSV logging ===
import csv

os.makedirs(REPORT_DIR, exist_ok=True)
LOG_FILE = "data/output/ai_incident_log.csv"

# Create CSV with header if not exists
if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, "w", newline='', encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "user_id", "risk_level", "anomaly_score",
            "off_hour_login_count", "usb_activity_score", "file_access_freq",
            "decoy_access_flag", "failed_logins", "session_duration", "ai_report_path"
        ])

highrisk = df[df["risk_level"].isin(["High", "Critical"])].copy()
print(f"🤖 Generating AI reports for {len(highrisk)} high-risk users...")

for _, row in highrisk.iterrows():
    telemetry = {
        "user_id": row.get("user_id", "unknown"),
        "risk_level": row["risk_level"],
        "anomaly_score": float(row["anomaly_score"]),
        "off_hour_login_count": float(row["off_hour_login_count"]),
        "usb_activity_score": float(row["usb_activity_score"]),
        "file_access_freq": float(row["file_access_freq"]),
        "decoy_access_flag": int(row["decoy_access_flag"]),
        "failed_logins": float(row["failed_logins"]),
        "session_duration": float(row["session_duration"]),
    }

    try:
        ai_text = generate_incident_report(telemetry)
        fname = f"incident_{row['user_id']}.txt"
        fpath = os.path.join(REPORT_DIR, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(ai_text)

        with open(LOG_FILE, "a", newline='', encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(timespec="seconds"),
                telemetry["user_id"], telemetry["risk_level"], telemetry["anomaly_score"],
                telemetry["off_hour_login_count"], telemetry["usb_activity_score"],
                telemetry["file_access_freq"], telemetry["decoy_access_flag"],
                telemetry["failed_logins"], telemetry["session_duration"], fpath
            ])

        print(f"✅ AI report saved: {fname}")
    except Exception as e:
        print(f"⚠️ Failed to generate report for {row['user_id']}: {e}")

print(f"🧾 All AI reports logged to: {LOG_FILE}")

print("🎯 Pipeline complete!")

print("\n🧑‍💻 Interactive Threat Query Mode (type 'exit' to quit)")

while True:
    user = input("Enter a user_id to view details: ").strip()
    if user.lower() == "exit":
        break
    if user not in df["user_id"].values:
        print("⚠️ User not found.")
        continue
    record = df[df["user_id"] == user].iloc[0]
    print(f"\nUser: {record['user_id']}")
    print(f"Risk Level: {record['risk_level']}")
    print(f"Anomaly Score: {record['anomaly_score']:.3f}")
    print(f"Detailed Metrics:")
    print(f"  Off-hour logins: {record['off_hour_login_count']}")
    print(f"  USB activity: {record['usb_activity_score']}")
    print(f"  File access freq: {record['file_access_freq']}")
    print(f"  Decoy access: {record['decoy_access_flag']}")
    print(f"  Failed logins: {record['failed_logins']}")
    print(f"  Session duration: {record['session_duration']}")
    print("─────────────────────────────\n")

