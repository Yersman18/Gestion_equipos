from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Mantenimiento, EvidenciaMantenimiento
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
        queryset = Mantenimiento.objects.prefetch_related('evidencias').select_related('equipo', 'sede', 'responsable')

        # Aplicar filtro de estado_mantenimiento si está en los parámetros
        estado_param = self.request.query_params.get('estado_mantenimiento')
        if estado_param:
            queryset = queryset.filter(estado_mantenimiento=estado_param)

        # Si es superusuario o staff, puede ver todos los mantenimientos
        if user.is_staff or user.is_superuser:
            return queryset.all().order_by('-fecha_inicio')

        try:
            user_profile = user.profile
            # Si es ADMIN, puede ver todos los mantenimientos
            if hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN':
                return queryset.all().order_by('-fecha_inicio')
        except UserProfile.DoesNotExist:
            pass

        # Obtener sede del parámetro de consulta si está disponible
        sede_id_param = self.request.query_params.get('sede_id')
        
        # Obtener sede del perfil del usuario
        user_sede = None
        try:
            user_profile = user.profile
            user_sede = getattr(user_profile, 'sede', None)
        except UserProfile.DoesNotExist:
            pass

        # Si hay un parámetro sede_id, usarlo para filtrar (prioridad más alta)
        if sede_id_param:
            try:
                sede_id = int(sede_id_param)
                # Filtrar por sede_id del parámetro
                return queryset.filter(sede_id=sede_id).order_by('-fecha_inicio')
            except (ValueError, TypeError):
                pass

        # Construir filtros usando Q objects para ser más inclusivo
        from django.db.models import Q
        filters = Q()
        
        # Si el usuario tiene sede asignada, incluir mantenimientos de esa sede
        if user_sede:
            filters |= Q(sede=user_sede)
        
        # Siempre incluir mantenimientos donde el usuario es responsable
        filters |= Q(responsable=user)
        
        # Si hay filtros, aplicarlos
        if filters:
            return queryset.filter(filters).distinct().order_by('-fecha_inicio')
        
        # Si no hay filtros, retornar queryset vacío (no debería llegar aquí)
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
        # No asignamos evidencias_uploads a data, el serializer las obtendrá directamente de request.FILES
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        """
        Sobrescribimos el método list para manejar errores y debuggear
        """
        try:
            queryset = self.get_queryset()
            
            # Debug: imprimir información del queryset
            print(f"DEBUG - Usuario: {request.user.username}")
            print(f"DEBUG - Total mantenimientos en BD: {Mantenimiento.objects.count()}")
            print(f"DEBUG - Mantenimientos después de get_queryset: {queryset.count()}")
            print(f"DEBUG - Query params: {dict(request.query_params)}")
            
            queryset = self.filter_queryset(queryset)
            print(f"DEBUG - Mantenimientos después de filter_queryset: {queryset.count()}")
            
            # Paginación si está configurada
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True, context={'request': request})
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            data = serializer.data
            print(f"DEBUG - Datos serializados: {len(data)} mantenimientos")
            return Response(data)
        except Exception as e:
            # Si hay un error, lo retornamos para debuggear
            import traceback
            error_info = {
                'error': str(e),
                'error_type': type(e).__name__,
                'traceback': traceback.format_exc()
            }
            print(f"ERROR en list: {error_info}")
            return Response(error_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_permissions(self):
        if self.action in ['list', 'create', 'proximos', 'historial', 'finalizar']:
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

        # No asignamos evidencias_uploads a data, el serializer las obtendrá directamente de request.FILES

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """
        Finaliza un mantenimiento y guarda la evidencia de finalización
        """
        instance = self.get_object()

        if instance.estado_mantenimiento == 'Finalizado':
            return Response(
                {'error': 'Este mantenimiento ya está finalizado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if instance.estado_mantenimiento == 'Cancelado':
            return Response(
                {'error': 'Un mantenimiento cancelado no puede ser finalizado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener el archivo de evidencia de finalización
        evidencia_file = request.FILES.get('evidencia_finalizacion')
        if not evidencia_file:
            return Response(
                {'error': 'Debes adjuntar un archivo de evidencia de finalización.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Actualizar el mantenimiento
        instance.estado_mantenimiento = 'Finalizado'
        instance.fecha_finalizacion = timezone.now().date()
        instance.evidencia_finalizacion = evidencia_file
        instance.save()

        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

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