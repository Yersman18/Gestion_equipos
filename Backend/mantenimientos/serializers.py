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
        read_only_fields = ('creado_en', 'actualizado_en')

    def create(self, validated_data):
        # Manejar la asignación de equipo y responsable si son pasados por ID
        equipo_id = validated_data.pop('equipo').id if 'equipo' in validated_data and isinstance(validated_data['equipo'], Equipo) else validated_data.pop('equipo')
        responsable_id = validated_data.pop('responsable').id if 'responsable' in validated_data and isinstance(validated_data['responsable'], (User, UserProfile)) else validated_data.pop('responsable')
        sede_id = validated_data.pop('sede').id if 'sede' in validated_data and isinstance(validated_data['sede'], Sede) else validated_data.pop('sede')

        equipo = Equipo.objects.get(id=equipo_id)
        responsable = User.objects.get(id=responsable_id)
        sede = Sede.objects.get(id=sede_id)

        mantenimiento = Mantenimiento.objects.create(
            equipo=equipo,
            responsable=responsable,
            sede=sede,
            **validated_data
        )
        return mantenimiento

    def update(self, instance, validated_data):
        # Actualizar campos del mantenimiento
        instance.equipo = validated_data.get('equipo', instance.equipo)
        instance.sede = validated_data.get('sede', instance.sede)
        instance.responsable = validated_data.get('responsable', instance.responsable)
        instance.tipo_mantenimiento = validated_data.get('tipo_mantenimiento', instance.tipo_mantenimiento)
        instance.estado_mantenimiento = validated_data.get('estado_mantenimiento', instance.estado_mantenimiento)
        instance.fecha_inicio = validated_data.get('fecha_inicio', instance.fecha_inicio)
        instance.fecha_finalizacion = validated_data.get('fecha_finalizacion', instance.fecha_finalizacion)
        instance.descripcion_problema = validated_data.get('descripcion_problema', instance.descripcion_problema)
        instance.acciones_realizadas = validated_data.get('acciones_realizadas', instance.acciones_realizadas)
        instance.repuestos_utilizados = validated_data.get('repuestos_utilizados', instance.repuestos_utilizados)
        instance.evidencia = validated_data.get('evidencia', instance.evidencia)
        instance.notas = validated_data.get('notas', instance.notas)
        
        instance.save()
        return instance

