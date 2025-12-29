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
    queryset = Equipo.objects.filter(activo=True).order_by('nombre')
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = EquipoFilter

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
    queryset = Mantenimiento.objects.all().order_by('-fecha_inicio')
    serializer_class = MantenimientoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = MantenimientoFilter

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
    queryset = Periferico.objects.all()
    serializer_class = PerifericoSerializer
    permission_classes = [IsAuthenticated]

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
        Calcula y devuelve estadísticas clave para el dashboard.
        """
        # Contadores totales
        total_equipos = Equipo.objects.filter(activo=True).count()
        total_mantenimientos = Mantenimiento.objects.count()
        total_perifericos = Periferico.objects.count()
        total_licencias = Licencia.objects.count()
        total_usuarios = User.objects.count()

        # Equipos por estado técnico
        equipos_por_estado = Equipo.objects.filter(activo=True).values('estado_tecnico').annotate(count=Count('estado_tecnico'))

        # Equipos por estado de disponibilidad
        equipos_por_disponibilidad = Equipo.objects.filter(activo=True).values('estado_disponibilidad').annotate(count=Count('estado_disponibilidad'))

        # Mantenimientos por estado
        mantenimientos_por_estado = Mantenimiento.objects.values('estado_mantenimiento').annotate(count=Count('estado_mantenimiento'))

        # Próximos mantenimientos (en los próximos 30 días)
        proximos_mantenimientos = Mantenimiento.objects.filter(
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