from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Mantenimiento
from .serializers import MantenimientoSerializer
from django.db.models import Q # Import Q for complex lookups
from datetime import date, timedelta
from django.shortcuts import get_object_or_404


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.all().order_by('-fecha_inicio')
    serializer_class = MantenimientoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por estado_mantenimiento
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado_mantenimiento=estado)

        # Filtrar por sede (asumiendo que el usuario tiene una sede asociada o es superuser)
        # Esto es un ejemplo, ajusta según tu lógica de permisos y asignación de sede
        if not self.request.user.is_superuser and hasattr(self.request.user, 'userprofile') and self.request.user.userprofile.sede:
            queryset = queryset.filter(sede=self.request.user.userprofile.sede)
        
        sede_id = self.request.query_params.get('sede_id', None)
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)

        return queryset

    # Acción personalizada para obtener próximos mantenimientos
    @action(detail=False, methods=['get'])
    def proximos(self, request):
        today = date.today()
        # Mantenimientos cuya fecha de inicio está en el futuro o fecha_finalizacion es null y fecha_inicio es en el futuro
        # y que no estén 'Finalizado'
        queryset = self.get_queryset().filter(
            Q(fecha_inicio__gte=today) | Q(fecha_finalizacion__isnull=True, fecha_inicio__gte=today),
            ~Q(estado_mantenimiento='Finalizado')
        ).order_by('fecha_inicio')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # Acción personalizada para el historial de mantenimientos (finalizados)
    @action(detail=False, methods=['get'])
    def historial(self, request):
        queryset = self.get_queryset().filter(estado_mantenimiento='Finalizado').order_by('-fecha_finalizacion', '-fecha_inicio')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # Sobreescribir create para manejar relaciones
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # Sobreescribir update para añadir lógica de negocio
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Proteger estados terminales
        if instance.estado_mantenimiento in ['Finalizado', 'Cancelado']:
            return Response(
                {'error': f'Un mantenimiento en estado "{instance.estado_mantenimiento}" no puede ser modificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()

        # Lógica de negocio: si se añade fecha de finalización, el estado cambia a Finalizado.
        if 'fecha_finalizacion' in data and data['fecha_finalizacion']:
            data['estado_mantenimiento'] = 'Finalizado'

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    # Acción para cancelar un mantenimiento en lugar de borrarlo
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        instance = self.get_object()

        if instance.estado_mantenimiento == 'Finalizado':
            return Response(
                {'error': 'Un mantenimiento finalizado no puede ser cancelado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if instance.estado_mantenimiento == 'Cancelado':
            # Si ya está cancelado, no hacemos nada, solo confirmamos.
            return Response({'status': 'El mantenimiento ya estaba cancelado.'}, status=status.HTTP_200_OK)

        instance.estado_mantenimiento = 'Cancelado'
        instance.save(update_fields=['estado_mantenimiento']) # Guardar solo el campo modificado
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)