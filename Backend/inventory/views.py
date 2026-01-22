from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from sede.models import Sede
from mantenimientos.models import Mantenimiento
from .models import Equipo, Periferico, Licencia, Pasisalvo, HistorialPeriferico, HistorialEquipo
from usuarios.models import UserProfile
from usuarios.permissions import IsAdminOrOwnerBySede # <-- IMPORTAR
from django.db.models import Count, Q
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
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # <-- APLICAR

class EquipoFilter(django_filters.rest_framework.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=[('overdue', 'Vencido'), ('upcoming', 'Próximo')],
        method='filter_by_status',
        label='Estado de Mantenimiento'
    )

    class Meta:
        model = Equipo
        fields = ['sede', 'estado_tecnico', 'estado_disponibilidad']

    def filter_by_status(self, queryset, name, value):
        today = timezone.now().date()
        if value == 'overdue':
            return queryset.filter(fecha_proximo_mantenimiento__lt=today)
        elif value == 'upcoming':
            return queryset.filter(
                fecha_proximo_mantenimiento__gte=today,
                fecha_proximo_mantenimiento__lte=today + timedelta(days=30)
            )
        return queryset

# Vistas para el modelo Equipo
class EquipoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # <-- APLICAR
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_class = EquipoFilter

    def get_queryset(self):
        user = self.request.user
        
        if not user.is_authenticated:
            return Equipo.objects.none()

        # 1. Base queryset
        queryset = Equipo.objects.filter(activo=True).order_by('nombre')

        # 3. Apply user-specific filtering (non-admins see only their sede)
        try:
            user_profile = user.profile
            # Si no es admin/superuser, filtrar por sede del perfil
            if not (user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN')):
                if hasattr(user_profile, 'sede') and user_profile.sede:
                    queryset = queryset.filter(sede=user_profile.sede)
                else:
                    # Si no es admin y no tiene sede, no ve nada
                    return Equipo.objects.none()
        except UserProfile.DoesNotExist:
            # Si no tiene perfil y no es admin, no ve nada
            if not (user.is_staff or user.is_superuser):
                return Equipo.objects.none()

        # El resto de los filtros (como 'sede' en la URL) serán manejados por DjangoFilterBackend
        return queryset
    
    def get_permissions(self):
        """
        Instancia y devuelve la lista de permisos que esta vista requiere.
        Para acciones 'list' y 'create', solo se necesita estar autenticado.
        Para otras acciones (retrieve, update, destroy), se aplica el permiso de sede.
        """
        if self.action in ['list', 'create']:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]
        return super().get_permissions()

    def perform_create(self, serializer):
        """
        Asigna el usuario actual como responsable de la entrega al crear un equipo.
        """
        serializer.save(responsable_entrega=self.request.user)

    def perform_update(self, serializer):
        """
        Asigna el usuario actual como responsable si se está asignando un empleado.
        """
        # Si 'empleado_asignado' está en los datos a actualizar y tiene un valor,
        # significa que se está realizando o cambiando una asignación.
        if 'empleado_asignado' in serializer.validated_data and serializer.validated_data['empleado_asignado']:
            serializer.save(responsable_entrega=self.request.user)
        else:
            # Si no se está asignando un empleado, simplemente guarda los demás cambios
            # sin modificar el responsable_entrega existente.
            serializer.save()


    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            instance.activo = False
            instance.empleado_asignado = None
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
            # Filtra los periféricos para mostrar solo aquellos asociados a equipos de la sede del usuario.
            return Periferico.objects.filter(equipo_asociado__sede=user_profile.sede)

        return Periferico.objects.none()

class PerifericoRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Periferico.objects.all()
    serializer_class = PerifericoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # <-- APLICAR

# Vistas para el modelo Licencia
class LicenciaListCreateAPIView(generics.ListCreateAPIView):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [IsAuthenticated]

class LicenciaRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede] # <-- APLICAR

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
        
        # Definir QuerySets base
        equipos_qs = Equipo.objects.all() # Se incluyen todos para contar los de baja
        mantenimientos_qs = Mantenimiento.objects.all()
        perifericos_qs = Periferico.objects.all()
        licencias_qs = Licencia.objects.all()
        usuarios_qs = User.objects.all()

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
            user_sede = getattr(user_profile, 'sede', None)
            if user_sede:
                equipos_qs = equipos_qs.filter(sede=user_sede)
                mantenimientos_qs = mantenimientos_qs.filter(sede=user_sede)
                perifericos_qs = perifericos_qs.filter(equipo_asociado__sede=user_sede) # Lógica corregida
                licencias_qs = licencias_qs.filter(equipo_asociado__sede=user_sede)
                usuarios_qs = usuarios_qs.filter(profile__sede=user_sede)
            else:
                # Si el usuario no tiene sede, no debe ver datos
                equipos_qs = Equipo.objects.none()
                mantenimientos_qs = Mantenimiento.objects.none()
                perifericos_qs = Periferico.objects.none()
                licencias_qs = Licencia.objects.none()
                # Aún puede verse a sí mismo en el conteo de usuarios si se decidiera así
                usuarios_qs = User.objects.filter(pk=user.pk)
        
        # QuerySet de equipos activos para la mayoría de las estadísticas
        equipos_activos_qs = equipos_qs.filter(activo=True)

        # Contadores basados en los QuerySets filtrados
        total_equipos = equipos_activos_qs.count()
        equipos_dados_de_baja = equipos_qs.filter(activo=False).count()
        total_mantenimientos = mantenimientos_qs.count()
        total_perifericos = perifericos_qs.count()
        total_licencias = licencias_qs.count()
        total_usuarios = usuarios_qs.count()

        # Estadísticas basadas en los QuerySets filtrados
        equipos_por_estado = equipos_activos_qs.values('estado_tecnico').annotate(count=Count('estado_tecnico'))
        equipos_por_disponibilidad = equipos_activos_qs.values('estado_disponibilidad').annotate(count=Count('estado_disponibilidad'))
        mantenimientos_por_estado = mantenimientos_qs.values('estado_mantenimiento').annotate(count=Count('estado_mantenimiento'))
        
        # Conteo de mantenimientos "activos" (Pendientes o En proceso)
        mantenimientos_activos = mantenimientos_qs.filter(
            estado_mantenimiento__in=['Pendiente', 'En proceso']
        ).count()

        # Para los próximos mantenimientos, usamos el queryset ya filtrado por sede y estado 'Pendiente'
        proximos_mantenimientos = mantenimientos_qs.filter(
            estado_mantenimiento='Pendiente',
            fecha_inicio__gte=timezone.now(),
            fecha_inicio__lte=timezone.now() + timedelta(days=30)
        ).count()

        stats = {
            'total_equipos': total_equipos,
            'equipos_dados_de_baja': equipos_dados_de_baja,
            'total_mantenimientos': total_mantenimientos,
            'total_perifericos': total_perifericos,
            'total_licencias': total_licencias,
            'total_usuarios': total_usuarios,
            'proximos_mantenimientos': proximos_mantenimientos,
            'mantenimientos_activos': mantenimientos_activos,
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
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]

    def get_queryset(self):
        """
        This view returns a list of history records for the equipo specified
        in the URL, but first, it checks if the user has permission to view
        the parent 'Equipo' object.
        """
        equipo_pk = self.kwargs['equipo_pk']
        
        # 1. Fetch the parent object.
        try:
            equipo = Equipo.objects.get(pk=equipo_pk)
        except Equipo.DoesNotExist:
            # This will result in a 404 response, which is appropriate.
            # The queryset will be empty and DRF will handle it.
            return HistorialEquipo.objects.none()

        # 2. Manually check permissions on the parent object.
        # This will trigger IsAdminOrOwnerBySede.has_object_permission(..., equipo)
        self.check_object_permissions(self.request, equipo)
        
        # 3. If permission is granted, return the actual queryset.
        return HistorialEquipo.objects.filter(equipo__pk=equipo_pk)