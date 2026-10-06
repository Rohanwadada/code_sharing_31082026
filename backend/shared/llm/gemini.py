from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import settings


def get_gemini_instance(
    model: str = "gemini-2.5-flash",
    temperature: float = 0.0,
    top_p: float = 0.8,
    thinking_budget: int = 0,
    max_output_tokens: int | None = None,
):
    gemini_instance = ChatGoogleGenerativeAI(
        google_api_key=settings.gemini_api_key,
        model=model,
        temperature=temperature,
        top_p=top_p,
        thinking_budget=thinking_budget,
        max_output_tokens=max_output_tokens,
    )
    if model == "gemini-2.5-pro":
        gemini_instance = ChatGoogleGenerativeAI(
            google_api_key=settings.gemini_api_key,
            model=model,
            temperature=temperature,
            top_p=top_p,
            thinking_budget=200,
            max_output_tokens=max_output_tokens,
        )
    elif model == "gemini-2.0-flash":
        gemini_instance = ChatGoogleGenerativeAI(
            google_api_key=settings.gemini_api_key,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_output_tokens=max_output_tokens,
        )

    return gemini_instance


import datetime
import json
import os
import uuid
from collections import deque

TELEMETRY_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "token_telemetry.json")
_TELEMETRY_LOGS = deque(maxlen=2000)

# Load existing telemetry logs on startup if file exists
if os.path.exists(TELEMETRY_FILE):
    try:
        with open(TELEMETRY_FILE, "r", encoding="utf-8") as f:
            saved_logs = json.load(f)
            if isinstance(saved_logs, list):
                _TELEMETRY_LOGS.extend(saved_logs[-2000:])
    except Exception as e:
        print(f"[TELEMETRY WARNING] Could not load telemetry file: {e}")


def save_telemetry_to_disk(new_record: dict = None):
    try:
        current_logs = []
        if os.path.exists(TELEMETRY_FILE):
            try:
                with open(TELEMETRY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        current_logs = data
            except Exception:
                current_logs = list(_TELEMETRY_LOGS)

        if new_record:
            # Avoid duplicate insertion by ID
            if not any(item.get("id") == new_record.get("id") for item in current_logs):
                current_logs.insert(0, new_record)
        else:
            current_logs = list(_TELEMETRY_LOGS)

        # Keep last 2000
        current_logs = current_logs[:2000]

        with open(TELEMETRY_FILE, "w", encoding="utf-8") as f:
            json.dump(current_logs, f, indent=2)
    except Exception as e:
        pass


def log_token_usage(response, feature_name: str = "LLM Call", model_name: str = "gemini-2.5-flash", latency: str = "1.2s"):
    """
    Utility function to log exact Gemini token usage to the terminal console
    and store real-time telemetry logs for the live dashboard.
    """
    input_t = 0
    output_t = 0
    total_t = 0

    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        input_t = response.usage_metadata.get('input_tokens', 0)
        output_t = response.usage_metadata.get('output_tokens', 0)
        total_t = response.usage_metadata.get('total_tokens', 0)
    elif isinstance(response, dict) and "usage_metadata" in response:
        meta = response.get("usage_metadata") or {}
        input_t = meta.get("input_tokens", 0)
        output_t = meta.get("output_tokens", 0)
        total_t = meta.get("total_tokens", 0)
    else:
        return None

    # Determine real model name
    detected_model = model_name
    if hasattr(response, "response_metadata") and isinstance(response.response_metadata, dict):
        detected_model = response.response_metadata.get("model_name") or response.response_metadata.get("model") or model_name

    log_str = f"[GEMINI LOG - {feature_name}] Input: {input_t} tokens | Output: {output_t} tokens | Total: {total_t} tokens"
    print(log_str)

    # Append real live record to telemetry store
    record = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "feature": feature_name,
        "model": detected_model,
        "input_tokens": input_t,
        "output_tokens": output_t,
        "total_tokens": total_t,
        "latency": latency,
        "status": "SUCCESS"
    }

    _TELEMETRY_LOGS.appendleft(record)
    save_telemetry_to_disk(record)

    return {"input_tokens": input_t, "output_tokens": output_t, "total_tokens": total_t}


def get_all_token_logs() -> list[dict]:
    """Returns all recorded live token logs in reverse chronological order directly from disk."""
    if os.path.exists(TELEMETRY_FILE):
        try:
            with open(TELEMETRY_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, list):
                    return saved
        except Exception:
            pass
    return list(_TELEMETRY_LOGS)


def clear_token_logs():
    """Clears all stored token logs."""
    _TELEMETRY_LOGS.clear()
    try:
        if os.path.exists(TELEMETRY_FILE):
            with open(TELEMETRY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)
    except Exception:
        pass
    return {"status": "cleared"}

