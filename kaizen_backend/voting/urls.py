from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VotingSessionViewSet

router = DefaultRouter()
router.register(r'voting/sessions', VotingSessionViewSet, basename='voting-session')

urlpatterns = [
    path('', include(router.urls)),
]
