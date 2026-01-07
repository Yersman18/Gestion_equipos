from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from sede.models import Sede
from mantenimientos.models import Mantenimiento
from .models import Equipo, Periferico, Licencia, Pasisalvo, HistorialPeriferico, HistorialEquipo
from usuarios.models import UserProfile
from django.db.models import Count
from .serializers import SedeSerializer, EquipoSerializer, MantenimientoSerializer, PerifericoSerializer, LicenciaSerializer, PasisalvoSerializer, HistorialPerifericoSerializer, HistorialEquipoSerializer
import django_filters.rest_framework
from rest_framework import viewsets

# Vistas para el modelo Sede
class SedeListCreateAPIView(generics.ListCreateAPIView):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    permission_classes = [IsAuthenticated]

class SedeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    permission_classes = [IsAuthenticated]

# Filtro para Equipos
class EquipoFilter(django_filters.rest_framework.FilterSet):
    class Meta:
        model = Equipo
        fields = ['sede', 'estado_tecnico', 'estado_disponibilidad']

# Vistas para el modelo Equipo
class EquipoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = EquipoFilter

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated:
            return Equipo.objects.none()

        # Primero, verificar los roles de administrador que pueden ver todo
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Equipo.objects.filter(activo=True).order_by('nombre')
        except UserProfile.DoesNotExist:
            # Un superusuario podría no tener un perfil de usuario, pero debería ver todo
            if user.is_staff or user.is_superuser:
                return Equipo.objects.filter(activo=True).order_by('nombre')
            else:
                # Si no hay perfil y no es admin, no puede ver nada
                return Equipo.objects.none()

        # Si llegamos aquí, el usuario no es admin. Filtrar por su sede.
        if hasattr(user_profile, 'sede') and user_profile.sede:
            return Equipo.objects.filter(activo=True, sede=user_profile.sede).order_by('nombre')

        # Por defecto, si un usuario normal no tiene sede, no ve nada.
        return Equipo.objects.none()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            instance.activo = False
            instance.empleado_asignado = None
            instance.estado_disponibilidad = 'Disponible' # O un nuevo estado 'De baja' si se añade al modelo
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"No se pudo dar de baja el equipo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Filtro para Mantenimientos
class MantenimientoFilter(django_filters.rest_framework.FilterSet):
    class Meta:
        model = Mantenimiento
        fields = ['sede', 'estado_mantenimiento', 'tipo_mantenimiento', 'equipo']

# Vistas para el modelo Mantenimiento
class MantenimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MantenimientoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = MantenimientoFilter

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Mantenimiento.objects.none()

        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Mantenimiento.objects.all().order_by('-fecha_inicio')
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return Mantenimiento.objects.all().order_by('-fecha_inicio')
            return Mantenimiento.objects.none()

        if hasattr(user_profile, 'sede') and user_profile.sede:
            return Mantenimiento.objects.filter(sede=user_profile.sede).order_by('-fecha_inicio')

        return Mantenimiento.objects.none()

    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Obtener la fecha para el próximo mantenimiento del equipo desde los datos validados
        fecha_proximo_mantenimiento_equipo = serializer.validated_data.get('fecha_proximo_mantenimiento_equipo', None)
        
        equipo = instance.equipo
        
        # Actualizar la fecha del último mantenimiento del equipo si el estado es 'Finalizado'
        if instance.estado_mantenimiento == 'Finalizado' and instance.fecha_finalizacion:
            equipo.fecha_ultimo_mantenimiento = instance.fecha_finalizacion
        
        # Si se proporcionó una nueva fecha para el próximo mantenimiento, actualizar el equipo
        if fecha_proximo_mantenimiento_equipo:
            equipo.fecha_proximo_mantenimiento = fecha_proximo_mantenimiento_equipo
        
        # Guardar los cambios en el equipo
        equipo.save()

    def perform_update(self, serializer):
        instance = serializer.save()

        # Obtener la fecha para el próximo mantenimiento del equipo desde los datos validados
        fecha_proximo_mantenimiento_equipo = serializer.validated_data.get('fecha_proximo_mantenimiento_equipo', None)
        
        equipo = instance.equipo
        
        # Actualizar la fecha del último mantenimiento del equipo si el estado es 'Finalizado'
        if instance.estado_mantenimiento == 'Finalizado' and instance.fecha_finalizacion:
            equipo.fecha_ultimo_mantenimiento = instance.fecha_finalizacion
        
        # Si se proporcionó una nueva fecha para el próximo mantenimiento, actualizar el equipo
        if fecha_proximo_mantenimiento_equipo:
            equipo.fecha_proximo_mantenimiento = fecha_proximo_mantenimiento_equipo
        
        # Guardar los cambios en el equipo
        equipo.save()


# Vistas para el modelo Periferico
class PerifericoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PerifericoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Periferico.objects.none()

        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Periferico.objects.all()
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return Periferico.objects.all()
            return Periferico.objects.none()

        if hasattr(user_profile, 'sede') and user_profile.sede:
            # Filtra los periféricos que no tienen equipo asociado O los que tienen un equipo en la sede del usuario.
            return Periferico.objects.filter(models.Q(equipo_asociado__isnull=True) | models.Q(equipo_asociado__sede=user_profile.sede))

        return Periferico.objects.none()

class PerifericoRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Periferico.objects.all()
    serializer_class = PerifericoSerializer
    permission_classes = [IsAuthenticated]

# Vistas para el modelo Licencia
class LicenciaListCreateAPIView(generics.ListCreateAPIView):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [IsAuthenticated]

class LicenciaRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [IsAuthenticated]

# Vistas para el modelo Pasisalvo
class PasisalvoListCreateAPIView(generics.ListCreateAPIView):
    queryset = Pasisalvo.objects.all()
    serializer_class = PasisalvoSerializer
    permission_classes = [IsAuthenticated]

class PasisalvoRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Pasisalvo.objects.all()
    serializer_class = PasisalvoSerializer
    permission_classes = [IsAuthenticated]

# Vista para el Historial de Periféricos
class HistorialPerifericoListAPIView(generics.ListAPIView): 
    queryset = HistorialPeriferico.objects.all()
    serializer_class = HistorialPerifericoSerializer
    permission_classes = [IsAuthenticated]

from datetime import datetime, timedelta

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        """
        Calcula y devuelve estadísticas clave para el dashboard, filtradas por sede para usuarios no administradores.
        """
        user = request.user
        
        # Definir QuerySets base en función del rol y la sede del usuario
        equipos_qs = Equipo.objects.filter(activo=True)
        mantenimientos_qs = Mantenimiento.objects.all()
        
        is_admin = False
        user_profile = None
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                is_admin = True
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                is_admin = True

        if not is_admin:
            if user_profile and hasattr(user_profile, 'sede') and user_profile.sede:
                equipos_qs = equipos_qs.filter(sede=user_profile.sede)
                mantenimientos_qs = mantenimientos_qs.filter(sede=user_profile.sede)
            else:
                # Si el usuario no tiene sede, no debe ver datos de equipos/mantenimientos
                equipos_qs = Equipo.objects.none()
                mantenimientos_qs = Mantenimiento.objects.none()

        # Contadores basados en los QuerySets filtrados
        total_equipos = equipos_qs.count()
        total_mantenimientos = mantenimientos_qs.count()
        
        # Contadores globales (no parecen estar ligados a sedes)
        total_perifericos = Periferico.objects.count()
        total_licencias = Licencia.objects.count()
        total_usuarios = User.objects.count()

        # Estadísticas basadas en los QuerySets filtrados
        equipos_por_estado = equipos_qs.values('estado_tecnico').annotate(count=Count('estado_tecnico'))
        equipos_por_disponibilidad = equipos_qs.values('estado_disponibilidad').annotate(count=Count('estado_disponibilidad'))
        mantenimientos_por_estado = mantenimientos_qs.values('estado_mantenimiento').annotate(count=Count('estado_mantenimiento'))
        proximos_mantenimientos = mantenimientos_qs.filter(
            fecha_inicio__gte=timezone.now(),
            fecha_inicio__lte=timezone.now() + timedelta(days=30)
        ).count()

        stats = {
            'total_equipos': total_equipos,
            'total_mantenimientos': total_mantenimientos,
            'total_perifericos': total_perifericos,
            'total_licencias': total_licencias,
            'total_usuarios': total_usuarios,
            'proximos_mantenimientos': proximos_mantenimientos,
            'equipos_por_estado': list(equipos_por_estado),
            'equipos_por_disponibilidad': list(equipos_por_disponibilidad),
            'mantenimientos_por_estado': list(mantenimientos_por_estado),
        }
        return Response(stats, status=status.HTTP_200_OK)

class HistorialEquipoListView(generics.ListAPIView):
    """
    API view to retrieve the history of changes for a specific equipo.
    """
    serializer_class = HistorialEquipoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all the history records
        for the equipo as determined by the equipo_pk portion of the URL.
        """
        equipo_pk = self.kwargs['equipo_pk']
        return HistorialEquipo.objects.filter(equipo__pk=equipo_pk)