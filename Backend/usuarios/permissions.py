from rest_framework.permissions import BasePermission, IsAuthenticated
from .models import UserProfile, Role

class IsAdminUser(BasePermission):
    """
    Permiso que solo permite el acceso a usuarios con rol de ADMIN.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.rol == Role.ADMIN
        )

class IsManagerUser(BasePermission):
    """
    Permiso que solo permite el acceso a usuarios con rol de MANAGER.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.rol == Role.MANAGER
        )

class IsTechnicianUser(BasePermission):
    """
    Permiso que solo permite el acceso a usuarios con rol de TECHNICIAN.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.rol == Role.TECHNICIAN
        )

class IsManagerOrAdmin(BasePermission):
    """
    Permiso para roles de MANAGER o ADMIN.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.rol in [Role.ADMIN, Role.MANAGER]
        )

class IsTechnicianOrManagerOrAdmin(BasePermission):
    """
    Permiso para roles de TECHNICIAN, MANAGER o ADMIN.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.rol in [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN]
        )
