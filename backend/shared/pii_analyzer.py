from celery.signals import worker_process_init

import re
from typing import Any

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider


class PIIAnalyzer:
    def __init__(self):
        self._analyzer = None

    def get_analyzer(self):
        if self._analyzer is None:
            import logging
            logger = logging.getLogger(__name__)
            for model_name in ["en_core_web_lg", "en_core_web_trf"]:
                try:
                    configuration = {
                        "nlp_engine_name": "spacy",
                        "models": [{"lang_code": "en", "model_name": model_name}],
                    }
                    provider = NlpEngineProvider(nlp_configuration=configuration)
                    nlp_engine = provider.create_engine()
                    self._analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
                    logger.info(f"Successfully loaded PII model '{model_name}'")
                    break
                except Exception as e:
                    logger.warning(
                        f"Failed to load PII model '{model_name}': {e}"
                    )
            if self._analyzer is None:
                try:
                    self._analyzer = AnalyzerEngine()
                except Exception as fallback_err:
                    logger.error(f"Failed to create default AnalyzerEngine: {fallback_err}")
                    self._analyzer = None
        return self._analyzer

    def anonymize_text(self, text: str, mapping: dict):
        if not text:
            return text

        analyzer = self._analyzer
        if not analyzer:
            analyzer = self.get_analyzer()
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=[
                "PERSON",
                "ORGANIZATION",
                "PHONE_NUMBER",
                "CREDIT_CARD",
                "US_SSN",
                "EMAIL_ADDRESS",
                "LOCATION",
            ],
            score_threshold=0.3,
        )

        results = sorted(results, key=lambda x: x.start, reverse=True)

        anonymized_text = text
        entity_counters = {}

        for res in results:
            original = text[res.start : res.end]
            entity_type = res.entity_type

            # Increment per-entity counter
            entity_counters[entity_type] = entity_counters.get(entity_type, 0) + 1

            placeholder = f"__{entity_type}_{entity_counters[entity_type]}__"

            mapping[placeholder] = original

            anonymized_text = (
                anonymized_text[: res.start] + placeholder + anonymized_text[res.end :]
            )

        return anonymized_text

    def deanonymize_value(self, value: Any, mapping: dict) -> Any:
        """Recursively replaces placeholders in strings, lists, or dicts."""
        if isinstance(value, str):
            for placeholder, original in mapping.items():
                # value = value.replace(placeholder, original)
                core = placeholder.strip("_")  # PERSON_1

                core_pattern = core.replace("_", r"[_\s]?")

                patterns = [
                    re.escape(placeholder),  # exact match
                    rf"_*{core}_*",  # tolerate missing/extra underscores
                    rf"\b{core}\b",  # plain PERSON_1
                    rf"{core_pattern}",  # PERSON 1 or PERSON_1
                ]

                for pattern in patterns:
                    value = re.sub(pattern, original, value, flags=re.IGNORECASE)
            return value
        elif isinstance(value, list):
            return [self.deanonymize_value(v, mapping) for v in value]
        elif isinstance(value, dict):
            return {k: self.deanonymize_value(v, mapping) for k, v in value.items()}
        elif hasattr(value, "__dict__"):  # Handle Pydantic models
            for key, val in value.__dict__.items():
                setattr(value, key, self.deanonymize_value(val, mapping))
            return value
        return value


pii_analyzer = PIIAnalyzer()


@worker_process_init.connect
def init_worker(**kwargs):
    pii_analyzer.get_analyzer()
