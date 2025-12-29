import os
from rest_framework import serializers
from .models import Mantenimiento
from inventory.models import Equipo
from usuarios.models import UserProfile # Asegúrate de que UserProfile sea el modelo de usuario personalizado si lo tienes
from django.contrib.auth.models import User
from sede.models import Sede

class MantenimientoSerializer(serializers.ModelSerializer):
    # Campos anidados para mostrar información relacionada
    equipo_asociado_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    usuario_responsable_username = serializers.CharField(source='responsable.username', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    
    evidencia_url = serializers.SerializerMethodField()
    evidencia_filename = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'equipo', 'equipo_asociado_nombre', 'sede', 'sede_nombre',
            'responsable', 'usuario_responsable_username',
            'tipo_mantenimiento', 'estado_mantenimiento',
            'fecha_inicio', 'fecha_finalizacion',
            'descripcion_problema', 'acciones_realizadas', 'repuestos_utilizados',
            'evidencia', 'evidencia_url', 'evidencia_filename', 'notas', 'creado_en', 'actualizado_en'
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

    def validate(self, data):
        fecha_inicio = data.get('fecha_inicio', self.instance.fecha_inicio if self.instance else None)
        fecha_finalizacion = data.get('fecha_finalizacion', self.instance.fecha_finalizacion if self.instance else None)

        if fecha_inicio and fecha_finalizacion:
            if fecha_finalizacion < fecha_inicio:
                raise serializers.ValidationError("La fecha de finalización no puede ser anterior a la fecha de inicio.")
            
            if fecha_finalizacion > date.today():
                raise serializers.ValidationError("La fecha de finalización no puede ser en el futuro.")
        
        return data


