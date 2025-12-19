from django.urls import path
from .views import UserListAPIView, UserProfileUpdateAPIView

urlpatterns = [
    path('', UserListAPIView.as_view(), name='user-list'),
    path('<int:user_pk>/profile/', UserProfileUpdateAPIView.as_view(), name='user-profile-update'),
]
