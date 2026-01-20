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
        queryset = Mantenimiento.objects.prefetch_related('evidencias')

        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return queryset.all().order_by('-fecha_inicio')
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return queryset.all().order_by('-fecha_inicio')
            return queryset.none()

        user_sede = getattr(user_profile, 'sede', None)
        if user_sede:
            return queryset.filter(sede=user_sede).order_by('-fecha_inicio')
            
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(fecha_inicio=timezone.now().date())

    def create(self, request, *args, **kwargs):
        equipo_id = request.data.get('equipo')
        if equipo_id:
            existing_maintenance = Mantenimiento.objects.filter(
                equipo_id=equipo_id,
                estado_mantenimiento__in=['Pendiente', 'En proceso']
            ).first()
            if existing_maintenance:
                return Response(
                    {'error': 'Este equipo ya tiene un mantenimiento pendiente o en proceso.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        data = request.data.copy()
        evidencias = request.FILES.getlist('evidencias_uploads')
        if evidencias:
            data['evidencias_uploads'] = evidencias
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_permissions(self):
        if self.action in ['list', 'create', 'proximos', 'historial']:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def proximos(self, request):
        today = date.today()
        # Ajusta el queryset para ser consistente con get_queryset
        base_queryset = self.get_queryset()
        queryset = base_queryset.filter(
            Q(fecha_inicio__gte=today) | Q(fecha_finalizacion__isnull=True, fecha_inicio__gte=today),
            ~Q(estado_mantenimiento='Finalizado')
        ).order_by('fecha_inicio')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def historial(self, request):
        # Ajusta el queryset para ser consistente con get_queryset
        base_queryset = self.get_queryset()
        queryset = base_queryset.filter(estado_mantenimiento='Finalizado').order_by('-fecha_finalizacion', '-fecha_inicio')
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

        evidencias = request.FILES.getlist('evidencias_uploads')
        if evidencias:
            data['evidencias_uploads'] = evidencias

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

class EvidenciaMantenimientoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrOwnerBySede]

    def destroy(self, request, pk=None):
        try:
            evidencia = EvidenciaMantenimiento.objects.get(pk=pk)
            
            # Check permissions
            mantenimiento = evidencia.mantenimiento
            user_profile = request.user.profile

            # Only allow deletion if user is admin/superuser, or admin of the maintenance's sede
            if not (request.user.is_staff or request.user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN' and user_profile.sede == mantenimiento.sede)):
                 return Response({'error': 'No tienes permiso para eliminar esta evidencia.'}, status=status.HTTP_403_FORBIDDEN)

            evidencia.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EvidenciaMantenimiento.DoesNotExist:
            return Response({'error': 'La evidencia no fue encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)