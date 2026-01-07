from rest_framework import generics
from .models import Empleado
from .serializers import EmpleadoSerializer
from usuarios.models import UserProfile

class EmpleadoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EmpleadoSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Empleado.objects.none()

        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Empleado.objects.all()
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return Empleado.objects.all()
            return Empleado.objects.none()

        if hasattr(user_profile, 'sede') and user_profile.sede:
            return Empleado.objects.filter(user__profile__sede=user_profile.sede)

        return Empleado.objects.none()

class EmpleadoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
