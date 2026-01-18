# src/ai_reports_groq.py
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("❌ GROQ_API_KEY not found in .env file!")

# ✅ Updated endpoint and model
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"  # simpler and more widely supported model name

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json",
}

SYSTEM_PROMPT = (
    "You are an expert cybersecurity analyst. Generate a concise, structured insider-threat incident report. "
    "Include: SUMMARY, INDICATORS, IMPACT, and RECOMMENDED ACTIONS. "
    "Use only the telemetry provided. Write formally and clearly."
)

def generate_incident_report(telemetry: dict) -> str:
    user = telemetry.get("user_id", "unknown")
    content = (
        f"User: {user}\n"
        f"Risk Level: {telemetry.get('risk_level')}\n"
        f"Anomaly Score: {telemetry.get('anomaly_score')}\n"
        "Signals:\n"
        f"  - Off-hour logins: {telemetry.get('off_hour_login_count')}\n"
        f"  - USB activity: {telemetry.get('usb_activity_score')}\n"
        f"  - File access freq: {telemetry.get('file_access_freq')}\n"
        f"  - Decoy access flag: {telemetry.get('decoy_access_flag')}\n"
        f"  - Failed logins: {telemetry.get('failed_logins')}\n"
        f"  - Session duration: {telemetry.get('session_duration')}\n"
    )

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        "temperature": 0.3,
        "max_tokens": 500
    }

    try:
        resp = requests.post(GROQ_URL, headers=HEADERS, data=json.dumps(payload), timeout=60)
        if resp.status_code != 200:
            print(f"❌ API Error {resp.status_code}: {resp.text}")
            return f"[Groq API Error {resp.status_code}] {resp.text}"
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[Groq API Exception] {str(e)}"

