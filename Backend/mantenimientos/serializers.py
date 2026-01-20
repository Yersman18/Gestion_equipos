from rest_framework import serializers
from django.utils import timezone
from .models import Mantenimiento, EvidenciaMantenimiento
from inventory.models import Equipo
from django.contrib.auth.models import User
from sede.models import Sede
import os

class EvidenciaMantenimientoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo EvidenciaMantenimiento.
    """
    archivo_url = serializers.SerializerMethodField()
    archivo_filename = serializers.SerializerMethodField()

    class Meta:
        model = EvidenciaMantenimiento
        fields = ['id', 'archivo', 'archivo_url', 'archivo_filename']

    def get_archivo_url(self, obj):
        request = self.context.get('request')
        if obj.archivo and hasattr(obj.archivo, 'url'):
            return request.build_absolute_uri(obj.archivo.url) if request else obj.archivo.url
        return None

    def get_archivo_filename(self, obj):
        if obj.archivo and hasattr(obj.archivo, 'name'):
            return os.path.basename(obj.archivo.name)
        return None

class MantenimientoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Mantenimiento, ahora con soporte para múltiples evidencias.
    """
    # Campos anidados para información relacionada
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    responsable_nombre = serializers.CharField(source='responsable.get_full_name', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    
    # Campo para mostrar las evidencias existentes (solo lectura)
    evidencias = EvidenciaMantenimientoSerializer(many=True, read_only=True)
    
    # Campo para subir nuevas evidencias (solo escritura)
    evidencias_uploads = serializers.ListField(
        child=serializers.FileField(max_length=1000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False # No siempre se suben archivos nuevos, especialmente en la actualización
    )

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'equipo', 'equipo_nombre', 'sede', 'sede_nombre',
            'responsable', 'responsable_nombre',
            'tipo_mantenimiento', 'estado_mantenimiento',
            'fecha_inicio', 'fecha_finalizacion',
            'descripcion_problema', 'acciones_realizadas', 'repuestos_utilizados',
            'notas', 'creado_en', 'actualizado_en',
            'evidencias', 'evidencias_uploads'
        ]
        read_only_fields = ('creado_en', 'actualizado_en', 'fecha_inicio')

    def validate(self, data):
        # La validación de la fecha de finalización sigue siendo la misma
        fecha_finalizacion = data.get('fecha_finalizacion')
        if not fecha_finalizacion:
            return data
        
        fecha_inicio_a_comparar = self.instance.fecha_inicio if self.instance else timezone.now().date()
        if fecha_finalizacion < fecha_inicio_a_comparar:
            raise serializers.ValidationError("La fecha de finalización no puede ser anterior a la fecha de inicio.")

        return data

    def create(self, validated_data):
        evidencias_data = validated_data.pop('evidencias_uploads', [])
        mantenimiento = Mantenimiento.objects.create(**validated_data)
        
        for archivo in evidencias_data:
            EvidenciaMantenimiento.objects.create(mantenimiento=mantenimiento, archivo=archivo)
            
        return mantenimiento

    def update(self, instance, validated_data):
        evidencias_data = validated_data.pop('evidencias_uploads', [])
        
        # Actualizar campos del mantenimiento
        instance = super().update(instance, validated_data)
        
        # Añadir nuevas evidencias si se subieron
        for archivo in evidencias_data:
            EvidenciaMantenimiento.objects.create(mantenimiento=instance, archivo=archivo)
            
        return instance
