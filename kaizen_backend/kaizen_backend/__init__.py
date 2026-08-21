"""
Django project package initializer for kaizen_backend.
"""

from .celery import app as celery_app

__all__ = ('celery_app',)
