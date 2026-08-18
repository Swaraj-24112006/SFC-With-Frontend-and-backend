from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VotingSessionViewSet, CftMemberViewSet, CftSessionViewSet

router = DefaultRouter()
# Legacy auth-based voting
router.register(r'voting/sessions', VotingSessionViewSet, basename='voting-session')
# New unauthenticated CFT evaluation system
router.register(r'cft/members', CftMemberViewSet, basename='cft-member')
router.register(r'cft/sessions', CftSessionViewSet, basename='cft-session')

urlpatterns = [
    path('', include(router.urls)),
]
