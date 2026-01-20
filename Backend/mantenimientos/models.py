from django.db import models
from django.contrib.auth.models import User
from inventory.models import Equipo # Asumo que el modelo Equipo está en la app 'inventory'
from  sede.models import Sede
from datetime import date

class Mantenimiento(models.Model):
    """
    Modelo para registrar los mantenimientos realizados a los equipos.
    """
    TIPO_MANTENIMIENTO_CHOICES = [
        ('Preventivo', 'Preventivo'),
        ('Correctivo', 'Correctivo'),
    ]

    ESTADO_MANTENIMIENTO_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('En proceso', 'En proceso'),
        ('Finalizado', 'Finalizado'),
        ('Cancelado', 'Cancelado'),
    ]

    # Relaciones clave
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name='historial_mantenimientos')
    sede = models.ForeignKey(Sede, on_delete=models.SET_NULL, null=True, blank=True)
    responsable = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, help_text="Técnico que realiza el mantenimiento")

    # Campos del mantenimiento
    tipo_mantenimiento = models.CharField(max_length=50, choices=TIPO_MANTENIMIENTO_CHOICES)
    estado_mantenimiento = models.CharField(max_length=50, choices=ESTADO_MANTENIMIENTO_CHOICES, default='Pendiente')
    
    # Fechas
    fecha_inicio = models.DateField(default=date.today)
    fecha_finalizacion = models.DateField(null=True, blank=True)

    # Descripción y resultados
    descripcion_problema = models.TextField(blank=True, help_text="Qué problema presentaba el equipo")
    acciones_realizadas = models.TextField(blank=True, help_text="Qué se hizo durante el mantenimiento")
    repuestos_utilizados = models.TextField(blank=True)
    
    # Evidencia y notas
    notas = models.TextField(blank=True)
    evidencia_finalizacion = models.FileField(upload_to='evidencias_finalizacion/', blank=True, null=True, help_text="Evidencia de finalización del mantenimiento")

    # Timestamps
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['equipo'],
                condition=models.Q(estado_mantenimiento__in=['Pendiente', 'En proceso']),
                name='unique_pending_or_in_process_maintenance_per_equipo'
            )
        ]

    def __str__(self):
        return f"{self.tipo_mantenimiento} en {self.equipo.nombre} - {self.estado_mantenimiento}"

class EvidenciaMantenimiento(models.Model):
    """
    Modelo para almacenar las evidencias (archivos/imágenes) de un mantenimiento.
    """
    mantenimiento = models.ForeignKey(Mantenimiento, on_delete=models.CASCADE, related_name='evidencias')
    archivo = models.FileField(upload_to='evidencias_mantenimiento/')

    def __str__(self):
        return f"Evidencia para {self.mantenimiento.id}"
