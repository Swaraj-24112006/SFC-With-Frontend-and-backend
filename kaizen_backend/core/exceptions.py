"""
Standardized exception handling for the Kaizen Backend API.
Provides consistent error response structure across all endpoints.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import (
    ValidationError,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
)
import logging

logger = logging.getLogger('kaizen')


class KaizenAPIException(Exception):
    """Base exception for Kaizen business logic errors."""
    def __init__(self, message, code='BUSINESS_ERROR', status_code=400, details=None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class InvalidWorkflowTransition(KaizenAPIException):
    """Raised when an invalid status transition is attempted."""
    def __init__(self, message="Invalid workflow transition", details=None):
        super().__init__(
            message=message,
            code='INVALID_WORKFLOW_TRANSITION',
            status_code=422,
            details=details or {},
        )


class DuplicateResourceError(KaizenAPIException):
    """Raised when a duplicate resource is detected."""
    def __init__(self, message="Resource already exists", details=None):
        super().__init__(
            message=message,
            code='DUPLICATE_RESOURCE',
            status_code=409,
            details=details or {},
        )


class ClosurePreConditionError(KaizenAPIException):
    """Raised when closure pre-conditions are not met."""
    def __init__(self, message="Closure pre-conditions not met", details=None):
        super().__init__(
            message=message,
            code='CLOSURE_PRECONDITION_FAILED',
            status_code=422,
            details=details or {},
        )


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that returns a consistent error structure:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": { ... }
        }
    }
    """

    # Handle our custom business exceptions
    if isinstance(exc, KaizenAPIException):
        logger.warning(f"Business error: {exc.code} - {exc.message}")
        return Response({
            'success': False,
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
            }
        }, status=exc.status_code)

    # Handle Django ValidationError (convert to DRF format)
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(detail=exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)

    # Call DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Map DRF exceptions to our error structure
        error_code = 'UNKNOWN_ERROR'
        message = 'An error occurred.'

        if isinstance(exc, ValidationError):
            error_code = 'VALIDATION_ERROR'
            message = 'Request validation failed.'
        elif isinstance(exc, NotAuthenticated):
            error_code = 'AUTHENTICATION_REQUIRED'
            message = 'Authentication credentials were not provided or are invalid.'
        elif isinstance(exc, PermissionDenied):
            error_code = 'PERMISSION_DENIED'
            message = 'You do not have permission to perform this action.'
        elif isinstance(exc, (NotFound, Http404)):
            error_code = 'NOT_FOUND'
            message = 'The requested resource was not found.'
        elif isinstance(exc, MethodNotAllowed):
            error_code = 'METHOD_NOT_ALLOWED'
            message = f'HTTP method not allowed.'
        elif isinstance(exc, Throttled):
            error_code = 'RATE_LIMITED'
            message = f'Request rate limit exceeded. Retry after {exc.wait} seconds.'

        response.data = {
            'success': False,
            'error': {
                'code': error_code,
                'message': str(exc.detail) if hasattr(exc, 'detail') and not isinstance(exc.detail, (dict, list)) else message,
                'details': exc.detail if hasattr(exc, 'detail') and isinstance(exc.detail, (dict, list)) else {},
            }
        }

        return response

    # Unhandled exceptions — 500 Internal Server Error
    logger.exception(f"Unhandled exception: {exc}")
    return Response({
        'success': False,
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred. Please try again later.',
            'details': {'exception': str(exc)} if True else {},  # Only in DEBUG
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
