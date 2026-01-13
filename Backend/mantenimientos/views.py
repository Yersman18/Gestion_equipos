from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Mantenimiento
from .serializers import MantenimientoSerializer
from django.db.models import Q
from datetime import date
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsAdminOrOwnerBySede
from usuarios.models import UserProfile


class MantenimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MantenimientoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]

    def get_queryset(self):
        user = self.request.user
        
        # Superusuarios y administradores ven todo
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return Mantenimiento.objects.all().order_by('-fecha_inicio')
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return Mantenimiento.objects.all().order_by('-fecha_inicio')
            return Mantenimiento.objects.none()

        # Usuarios normales ven solo los de su sede
        user_sede = getattr(user_profile, 'sede', None)
        if user_sede:
            return Mantenimiento.objects.filter(sede=user_sede).order_by('-fecha_inicio')
            
        return Mantenimiento.objects.none()

    def perform_create(self, serializer):
        """
        Asigna la fecha de inicio como la fecha actual al crear un mantenimiento.
        """
        serializer.save(fecha_inicio=timezone.now().date())

    def get_permissions(self):
        """
        Permisos más estrictos para acciones que modifican un objeto específico.
        """
        if self.action in ['list', 'create', 'proximos', 'historial']:
            self.permission_classes = [IsAuthenticated]
        else: # retrieve, update, partial_update, destroy, cancelar
            self.permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def proximos(self, request):
        today = date.today()
        queryset = self.get_queryset().filter(
            Q(fecha_inicio__gte=today) | Q(fecha_finalizacion__isnull=True, fecha_inicio__gte=today),
            ~Q(estado_mantenimiento='Finalizado')
        ).order_by('fecha_inicio')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def historial(self, request):
        queryset = self.get_queryset().filter(estado_mantenimiento='Finalizado').order_by('-fecha_finalizacion', '-fecha_inicio')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        if instance.estado_mantenimiento in ['Finalizado', 'Cancelado']:
            return Response(
                {'error': f'Un mantenimiento en estado "{instance.estado_mantenimiento}" no puede ser modificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()
        if 'fecha_finalizacion' in data and data['fecha_finalizacion']:
            data['estado_mantenimiento'] = 'Finalizado'

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        instance = self.get_object()

        if instance.estado_mantenimiento == 'Finalizado':
            return Response(
                {'error': 'Un mantenimiento finalizado no puede ser cancelado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.estado_mantenimiento == 'Cancelado':
            return Response({'status': 'El mantenimiento ya estaba cancelado.'}, status=status.HTTP_200_OK)

        instance.estado_mantenimiento = 'Cancelado'
        instance.save(update_fields=['estado_mantenimiento'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        instance = self.get_object()

        if instance.estado_mantenimiento == 'Finalizado':
            return Response({'status': 'El mantenimiento ya estaba finalizado.'}, status=status.HTTP_200_OK)
        
        if instance.estado_mantenimiento == 'Cancelado':
            return Response(
                {'error': 'Un mantenimiento cancelado no puede ser finalizado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        evidencia_finalizacion = request.FILES.get('evidencia_finalizacion')
        if not evidencia_finalizacion:
            return Response(
                {'error': 'El archivo de evidencia de finalización es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.estado_mantenimiento = 'Finalizado'
        instance.fecha_finalizacion = timezone.now().date()
        instance.evidencia_finalizacion = evidencia_finalizacion
        instance.save(update_fields=['estado_mantenimiento', 'fecha_finalizacion', 'evidencia_finalizacion'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)