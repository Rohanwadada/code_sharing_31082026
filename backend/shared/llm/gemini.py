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


def log_token_usage(response, feature_name: str = "LLM Call"):
    """
    Utility function to log exact Gemini token usage to the terminal console.
    """
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        input_t = response.usage_metadata.get('input_tokens', 0)
        output_t = response.usage_metadata.get('output_tokens', 0)
        total_t = response.usage_metadata.get('total_tokens', 0)
        log_str = f"[GEMINI LOG - {feature_name}] Input: {input_t} tokens | Output: {output_t} tokens | Total: {total_t} tokens"
        print(log_str)
        return {"input_tokens": input_t, "output_tokens": output_t, "total_tokens": total_t}
    elif isinstance(response, dict) and "usage_metadata" in response:
        meta = response.get("usage_metadata") or {}
        input_t = meta.get("input_tokens", 0)
        output_t = meta.get("output_tokens", 0)
        total_t = meta.get("total_tokens", 0)
        log_str = f"[GEMINI LOG - {feature_name}] Input: {input_t} tokens | Output: {output_t} tokens | Total: {total_t} tokens"
        print(log_str)
        return {"input_tokens": input_t, "output_tokens": output_t, "total_tokens": total_t}
    return None

