"""
core/session_middleware.py — Redis Session Validation Middleware
================================================================
Sits between the CORS middleware and the authentication middleware.

For every request to a protected API path (/api/v1/ except auth endpoints):
1. Read the `kspg_sid` HttpOnly cookie.
2. Look it up in Redis.
3. If it exists → slide TTL (keep session alive) and allow the request.
4. If it is missing or expired → return 401 Unauthorized immediately.

Auth endpoints are always exempted so the login flow is never broken.
"""

import json
import logging

from django.http import JsonResponse

from core.redis_client import get_session, refresh_session_ttl

logger = logging.getLogger(__name__)

# ── Paths that are always allowed without a Redis session ─────────────────────
EXEMPT_PREFIXES = (
    "/api/v1/auth/login/",
    "/api/v1/auth/register/",
    "/api/v1/auth/token/refresh/",
    "/api/v1/health/",
    "/admin/",
    "/media/",
    "/static/",
)

# ── Only protect these path prefixes ─────────────────────────────────────────
PROTECTED_PREFIX = "/api/v1/"

SESSION_COOKIE_NAME = "kspg_sid"


class SessionValidationMiddleware:
    """
    Validates the Redis session cookie on every protected API request.
    Must be placed AFTER CorsMiddleware so CORS preflight (OPTIONS) passes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_validate(request):
            session_id = request.COOKIES.get(SESSION_COOKIE_NAME)

            if not session_id:
                return self._reject("SESSION_MISSING", "Authentication required. Please log in.")

            session_data = get_session(session_id)
            if session_data is None:
                return self._reject(
                    "SESSION_EXPIRED",
                    "Your session has expired. Please log in again.",
                )

            # Attach session data to the request for downstream views
            request.kspg_session_id = session_id
            request.kspg_session = session_data

            # Slide the TTL on every valid request (rolling session)
            refresh_session_ttl(session_id)

        return self.get_response(request)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _should_validate(self, request) -> bool:
        """Return True if this request must have a valid Redis session."""
        path = request.path_info

        # CORS preflight — always pass
        if request.method == "OPTIONS":
            return False

        # Only validate API paths
        if not path.startswith(PROTECTED_PREFIX):
            return False

        # Exempt auth endpoints
        for prefix in EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return False

        return True

    @staticmethod
    def _reject(code: str, message: str) -> JsonResponse:
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "details": {},
                },
            },
            status=401,
        )
