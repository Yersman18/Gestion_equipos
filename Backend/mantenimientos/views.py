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

    # Sobreescribir update para manejar relaciones
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the cache on the instance, otherwise the
            # 'pk' of the object would be cached and not get updated.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)