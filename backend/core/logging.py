import json
import logging
import os
import sys
from datetime import datetime, timezone

SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "fastapi-service")
ENVIRONMENT = os.getenv("APP_ENV", "dev")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": SERVICE_NAME,
            "environment": ENVIRONMENT,
        }

        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        # Add custom extras if present
        for key in (
            "request_id",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "client_ip",
        ):
            value = getattr(record, key, None)
            if value is not None:
                log_record[key] = value

        # Inject OpenTelemetry trace/span IDs if a span is active
        # span = get_current_span()
        # if span is not None:
        #     span_context = span.get_span_context()
        #     if span_context and span_context.is_valid:
        #         log_record["trace_id"] = format(span_context.trace_id, "032x")
        #         log_record["span_id"] = format(span_context.span_id, "016x")

        return json.dumps(log_record, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    # Remove default handlers so we fully control output format
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    # handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)

    # Optional: tune noisy libraries
    # logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    # logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    # logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
