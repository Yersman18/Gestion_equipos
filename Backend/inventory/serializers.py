from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Sede, Equipo, Mantenimiento, Periferico, Licencia, Pasisalvo
from .models import HistorialPeriferico # Asegúrate de importar el nuevo modelo
from usuarios.serializers import UserSerializer # Importar UserSerializer


class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = '__all__'

class EquipoSerializer(serializers.ModelSerializer):
    # Campo para mostrar el nombre de la sede (solo lectura).
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    # Usar un serializador anidado para mostrar la información completa del usuario (solo lectura).
    usuario_asignado = serializers.SerializerMethodField()
    # Campo adicional para mostrar información del empleado asignado
    empleado_asignado_info = serializers.SerializerMethodField()
    # Campo para aceptar el ID del usuario al crear/actualizar un equipo (solo escritura).
    usuario_asignado_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'marca', 'modelo', 'serial', 'ram', 'rom',
            'sistema_operativo', 'procesador', 'antivirus', 'usuarios_sistema',
            'tipo_equipo', 'redes_conectadas',
            'estado_tecnico', 'estado_disponibilidad', 'sede', 'sede_nombre',
            'empleado_asignado', 'usuario_asignado', 'usuario_asignado_id', 'empleado_asignado_info',
            'fecha_entrega_a_colaborador', 'fecha_recibido_satisfaccion',
            'responsable_entrega', 'nombre_jefe', 'cargo_jefe', 
            'firma_recibido_usuario', 'firma_recibido_jefe', 'firma_compromiso',
            'fecha_ultimo_mantenimiento', 'fecha_proximo_mantenimiento',
            'notas'
        ]
        read_only_fields = ['sede_nombre', 'usuario_asignado', 'empleado_asignado_info']

    def get_usuario_asignado(self, obj):
        if obj.empleado_asignado and obj.empleado_asignado.user:
            return UserSerializer(obj.empleado_asignado.user).data
        return None

    def get_empleado_asignado_info(self, obj):
        if obj.empleado_asignado:
            return {
                'id': obj.empleado_asignado.id,
                'nombre': obj.empleado_asignado.nombre,
                'apellido': obj.empleado_asignado.apellido,
                'nombre_completo': f"{obj.empleado_asignado.nombre} {obj.empleado_asignado.apellido}",
                'cargo': obj.empleado_asignado.cargo,
                'area': obj.empleado_asignado.area,
                'tiene_user': obj.empleado_asignado.user is not None,
                'user_id': obj.empleado_asignado.user.id if obj.empleado_asignado.user else None
            }
        return None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        return representation


class MantenimientoSerializer(serializers.ModelSerializer):
    equipo_asociado_nombre = serializers.CharField(source='equipo_asociado.nombre', read_only=True)
    usuario_responsable_username = serializers.CharField(source='usuario_responsable.username', read_only=True, allow_null=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True, allow_null=True)
    tipo_mantenimiento_nombre = serializers.CharField(source='get_tipo_mantenimiento_display', read_only=True)
    fecha_proximo_mantenimiento_equipo = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Mantenimiento
        fields = [
            'id',
            'equipo_asociado',
            'equipo_asociado_nombre',
            'tipo_mantenimiento',
            'tipo_mantenimiento_nombre',
            'usuario_responsable',
            'usuario_responsable_username',
            'fecha_inicio',
            'fecha_finalizacion',
            'estado_mantenimiento',
            'descripcion_problema',
            'acciones_realizadas',
            'repuestos_utilizados',
            'sede',
            'sede_nombre',
            'notas',
            'evidencia',
            'fecha_proximo_mantenimiento_equipo',
        ]
        read_only_fields = ['equipo_asociado_nombre', 'usuario_responsable_username', 'sede_nombre', 'tipo_mantenimiento_nombre']


class PerifericoSerializer(serializers.ModelSerializer):
    usuario_asignado_username = serializers.CharField(source='usuario_asignado.username', read_only=True, allow_null=True)
    equipo_asociado_serial = serializers.CharField(source='equipo_asociado.serial', read_only=True, allow_null=True)

    class Meta:
        model = Periferico
        fields = [
            'id', 'nombre', 'tipo', 'estado_tecnico', 'estado_disponibilidad',
            'usuario_asignado', 'usuario_asignado_username', 'equipo_asociado',
            'equipo_asociado_serial', 'fecha_entrega', 'notas'
        ]
        read_only_fields = ['usuario_asignado_username', 'equipo_asociado_serial']

class LicenciaSerializer(serializers.ModelSerializer):
    equipo_asociado_serial = serializers.CharField(source='equipo_asociado.serial', read_only=True)

    class Meta:
        model = Licencia
        fields = [
            'id', 'equipo_asociado', 'equipo_asociado_serial', 'tipo_licencia',
            'tipo_activacion', 'clave', 'fecha_instalacion', 'estado', 'notas'
        ]
        read_only_fields = ['equipo_asociado_serial']

class PasisalvoSerializer(serializers.ModelSerializer):
    colaborador_username = serializers.CharField(source='colaborador.username', read_only=True)
    generado_por_username = serializers.CharField(source='generado_por.username', read_only=True, allow_null=True)

    class Meta:
        model = Pasisalvo
        fields = '__all__'
        read_only_fields = ['fecha_generacion', 'estado', 'detalles_pendientes', 'colaborador_username', 'generado_por_username']

class HistorialPerifericoSerializer(serializers.ModelSerializer):
    periferico = serializers.StringRelatedField()
    usuario_asignado = serializers.StringRelatedField()
    class Meta:
        model = HistorialPeriferico
        fields = '__all__'