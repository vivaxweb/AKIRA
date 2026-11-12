"""Custom exception handler returning a consistent error envelope."""
import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Returns errors in the shape:
        {"detail": "...", "code": "...", "fields": {...}}
    Never leaks stack traces to the client.
    """
    response = exception_handler(exc, context)

    if response is not None:
        code = getattr(exc, "default_code", "error")
        detail = str(response.data.get("detail", exc))

        # DRF returns field errors as a dict under non-detail keys
        fields = {}
        for key, value in response.data.items():
            if key != "detail":
                fields[key] = value if isinstance(value, list) else [str(value)]

        response.data = {
            "detail": detail,
            "code": code,
        }
        if fields:
            response.data["fields"] = fields

    else:
        # Unhandled server errors — log and return a generic 500
        logger.exception("Unhandled server error", exc_info=exc)
        response = Response(
            {"detail": "An unexpected error occurred.", "code": "server_error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
