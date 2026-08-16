"""
Kaizen URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KaizenViewSet, KaizenEvidenceViewSet

router = DefaultRouter()
router.register(r'kaizens', KaizenViewSet, basename='kaizen')

urlpatterns = [
    path('', include(router.urls)),
    # Nested evidence endpoints
    path(
        'kaizens/<int:kaizen_pk>/evidence/',
        KaizenEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='kaizen-evidence-list',
    ),
    path(
        'kaizens/<int:kaizen_pk>/evidence/<int:pk>/',
        KaizenEvidenceViewSet.as_view({'delete': 'destroy'}),
        name='kaizen-evidence-detail',
    ),
]
