# backend/app.py
import os, io, json
from datetime import datetime
from typing import List, Dict, Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# === Config paths
DATA_COMBINED = "data/processed/combined_logs.csv"
DATA_FINAL    = "data/output/final_risk_scored_logs.csv"
AI_LOG        = "data/output/ai_incident_log.csv"
REPORT_DIR    = "reports/generated"

# === FastAPI app + CORS for React dev server
app = FastAPI(title="Insider Threat Backend", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# === Load data helpers
def load_final_df() -> pd.DataFrame:
    if not os.path.exists(DATA_FINAL):
        raise FileNotFoundError(f"{DATA_FINAL} not found. Run day3 pipeline first.")
    df = pd.read_csv(DATA_FINAL)
    if "user_id" not in df.columns:
        df["user_id"] = "unknown"
    return df

def load_ai_log() -> pd.DataFrame:
    if not os.path.exists(AI_LOG):
        # create empty frame if not exists
        cols = ["timestamp","user_id","risk_level","anomaly_score",
                "off_hour_login_count","usb_activity_score","file_access_freq",
                "decoy_access_flag","failed_logins","session_duration","ai_report_path"]
        return pd.DataFrame(columns=cols)
    return pd.read_csv(AI_LOG)

# === Simple explainability: SHAP (TreeExplainer) for IsolationForest
# IsolationForest support can vary; we’ll try SHAP and fall back to z-score explanation.
_shap_ready = False
_model = None
_X = None
_feature_names = [
    "off_hour_login_count","usb_activity_score","file_access_freq",
    "decoy_access_flag","failed_logins","session_duration"
]

def _try_fit_model():
    global _shap_ready, _model, _X
    try:
        from sklearn.ensemble import IsolationForest
        import shap

        df_final = load_final_df()
        for c in _feature_names:
            if c not in df_final.columns:
                df_final[c] = 0.0
        _X = df_final[_feature_names].astype(float).copy()

        # Train fresh IF quickly (same as Day 3 defaults)
        _model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        _model.fit(_X)

        # Try shap
        shap.TreeExplainer(_model)  # probe
        _shap_ready = True
    except Exception:
        _shap_ready = False

def explain_user(user_row: pd.Series) -> Dict[str, Any]:
    """Return feature contributions for a single user.
       If SHAP works: SHAP values. Else: z-score style deviations."""
    values = {}
    try:
        if _X is None or _model is None:
            _try_fit_model()
        if _shap_ready:
            import shap
            explainer = shap.TreeExplainer(_model)
            x_row = user_row[_feature_names].astype(float).values.reshape(1, -1)
            shap_vals = explainer.shap_values(x_row)
            # shap_values shape: (1, n_features)
            for i, f in enumerate(_feature_names):
                values[f] = float(shap_vals[0][i])
            mode = "shap"
        else:
            # Fallback: deviation-based explanation
            means = _X.mean()
            stds = _X.std().replace(0, 1.0)
            z = (user_row[_feature_names] - means) / stds
            for f in _feature_names:
                values[f] = float(z[f])
            mode = "zscore"
        # return top 5 absolute contributors
        top = sorted(values.items(), key=lambda kv: abs(kv[1]), reverse=True)[:5]
        return {"mode": mode, "top_contributors": [{"feature": k, "value": v} for k, v in top]}
    except Exception as e:
        return {"mode": "none", "error": str(e), "top_contributors": []}

@app.get("/api/health")
def health():
    return {"ok": True, "time": datetime.now().isoformat()}

@app.get("/api/summary")
def summary():
    df = load_final_df()
    counts = df["risk_level"].value_counts(dropna=False).to_dict()
    total = int(len(df))
    return {"total": total, "by_risk": counts}

@app.get("/api/users")
def users():
    df = load_final_df()
    cols = ["user_id","anomaly_score","risk_level"] + _feature_names
    out = df[cols].to_dict(orient="records")
    return {"users": out}

@app.get("/api/user/{user_id}")
def user_detail(user_id: str):
    df = load_final_df()
    rows = df[df["user_id"] == user_id]
    if rows.empty:
        raise HTTPException(404, f"user_id '{user_id}' not found")
    record = rows.iloc[0].to_dict()
    record["explain"] = explain_user(rows.iloc[0])
    return record

@app.get("/api/incidents")
def incidents():
    df = load_final_df()
    ai = load_ai_log()
    high = df[df["risk_level"].isin(["High","Critical"])].copy()
    # Attach ai report path if logged
    if not ai.empty:
        ai_map = ai.set_index("user_id")["ai_report_path"].to_dict()
        high["ai_report_path"] = high["user_id"].map(ai_map).fillna("")
    return {"incidents": high[["user_id","risk_level","anomaly_score"] + _feature_names + (["ai_report_path"] if "ai_report_path" in high.columns else [])].to_dict(orient="records")}

@app.get("/api/report/{user_id}")
def get_report(user_id: str):
    # Returns report text if exists
    # Try from AI log first
    ai = load_ai_log()
    path = ""
    if not ai.empty:
        row = ai[ai["user_id"] == user_id]
        if not row.empty:
            path = str(row.iloc[0]["ai_report_path"])
    if not path:
        # fallback by convention
        candidate = os.path.join(REPORT_DIR, f"incident_{user_id}.txt")
        if os.path.exists(candidate):
            path = candidate
    if not path or not os.path.exists(path):
        raise HTTPException(404, "Report not found")
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return {"user_id": user_id, "path": path, "text": f.read()}

# Simple critical alert check
@app.get("/api/alerts/scan")
def scan_alerts():
    df = load_final_df()
    crit = df[df["risk_level"]=="Critical"]
    return {"critical_count": int(len(crit)), "users": crit["user_id"].tolist()}
