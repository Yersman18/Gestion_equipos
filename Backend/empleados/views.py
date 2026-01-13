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
        # El chequeo de 'is_authenticated' ya lo hace la permission_class
        
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Empleado.objects.all()
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return Empleado.objects.all()
            return Empleado.objects.none()

        if hasattr(user_profile, 'sede') and user_profile.sede:
            # Asumiendo que Empleado tiene una relación a User y User a UserProfile con Sede
            return Empleado.objects.filter(user__profile__sede=user_profile.sede)

        return Empleado.objects.none()

class EmpleadoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # ASEGURAR VISTA
