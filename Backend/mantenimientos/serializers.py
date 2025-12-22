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

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'equipo', 'equipo_asociado_nombre', 'sede', 'sede_nombre',
            'responsable', 'usuario_responsable_username',
            'tipo_mantenimiento', 'estado_mantenimiento',
            'fecha_inicio', 'fecha_finalizacion',
            'descripcion_problema', 'acciones_realizadas', 'repuestos_utilizados',
            'evidencia', 'notas', 'creado_en', 'actualizado_en'
        ]
        read_only_fields = ('creado_en', 'actualizado_en', 'fecha_inicio')

