from rest_framework import serializers
from django.utils import timezone
from .models import Mantenimiento
from inventory.models import Equipo
from usuarios.models import UserProfile # Asegúrate de que UserProfile sea el modelo de usuario personalizado si lo tienes
from django.contrib.auth.models import User
from sede.models import Sede
import os


class MantenimientoSerializer(serializers.ModelSerializer):
    # Campos anidados para mostrar información relacionada
    equipo_asociado_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    usuario_responsable_username = serializers.CharField(source='responsable.username', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    
    evidencia_url = serializers.SerializerMethodField()
    evidencia_filename = serializers.SerializerMethodField()
    evidencia_finalizacion_url = serializers.SerializerMethodField()
    evidencia_finalizacion_filename = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'equipo', 'equipo_asociado_nombre', 'sede', 'sede_nombre',
            'responsable', 'usuario_responsable_username',
            'tipo_mantenimiento', 'estado_mantenimiento',
            'fecha_inicio', 'fecha_finalizacion',
            'descripcion_problema', 'acciones_realizadas', 'repuestos_utilizados',
            'evidencia', 'evidencia_url', 'evidencia_filename', 
            'evidencia_finalizacion', 'evidencia_finalizacion_url', 'evidencia_finalizacion_filename',
            'notas', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ('creado_en', 'actualizado_en', 'fecha_inicio')

    def get_evidencia_url(self, obj):
        if obj.evidencia and hasattr(obj.evidencia, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.evidencia.url)
            return obj.evidencia.url
        return None

    def get_evidencia_filename(self, obj):
        if obj.evidencia and hasattr(obj.evidencia, 'name'):
            return os.path.basename(obj.evidencia.name)
        return None
        
    def get_evidencia_finalizacion_url(self, obj):
        if obj.evidencia_finalizacion and hasattr(obj.evidencia_finalizacion, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.evidencia_finalizacion.url)
            return obj.evidencia_finalizacion.url
        return None

    def get_evidencia_finalizacion_filename(self, obj):
        if obj.evidencia_finalizacion and hasattr(obj.evidencia_finalizacion, 'name'):
            return os.path.basename(obj.evidencia_finalizacion.name)
        return None

    def validate(self, data):
        fecha_finalizacion = data.get('fecha_finalizacion')

        # Si no se proporciona una fecha de finalización, no hay nada que validar.
        if not fecha_finalizacion:
            return data

        # Determina la fecha de inicio para la comparación.
        # Al crear (self.instance es None), la fecha de inicio será la de hoy.
        # Al actualizar, usa la fecha de inicio existente.
        fecha_inicio_a_comparar = self.instance.fecha_inicio if self.instance else timezone.now().date()

        # Realiza la validación.
        if fecha_finalizacion < fecha_inicio_a_comparar:
            raise serializers.ValidationError("La fecha de finalización no puede ser anterior a la fecha de inicio.")

        return data


