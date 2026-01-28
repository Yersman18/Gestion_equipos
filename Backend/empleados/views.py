from rest_framework import generics
from .models import Empleado
from .serializers import EmpleadoSerializer
from usuarios.models import UserProfile
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsAdminOrOwnerBySede

class EmpleadoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated] # ASEGURAR VISTA

    def get_queryset(self):
        user = self.request.user
        
        is_admin = False
        user_profile = None
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                is_admin = True
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                is_admin = True

        queryset = Empleado.objects.all()

        if is_admin:
            sede_id = self.request.query_params.get('sede')
            if sede_id:
                queryset = queryset.filter(sede_id=sede_id)
            return queryset
        
        if user_profile and hasattr(user_profile, 'sede') and user_profile.sede:
            return queryset.filter(sede=user_profile.sede)

        return Empleado.objects.none()

class EmpleadoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # ASEGURAR VISTA
