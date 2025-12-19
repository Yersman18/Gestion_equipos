from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Mantenimiento
from datetime import timedelta

@receiver(post_save, sender=Mantenimiento)
def actualizar_fechas_mantenimiento_equipo(sender, instance, created, **kwargs):
    """
    Actualiza las fechas de último y próximo mantenimiento en el equipo asociado
    cuando un mantenimiento se marca como 'Finalizado'.
    """
    if instance.estado_mantenimiento == 'Finalizado' and instance.fecha_finalizacion:
        equipo = instance.equipo_asociado
        
        # Actualiza la fecha del último mantenimiento
        equipo.fecha_ultimo_mantenimiento = instance.fecha_finalizacion.date()
        
        # Calcula la fecha del próximo mantenimiento (6 meses después por defecto)
        equipo.fecha_proximo_mantenimiento = instance.fecha_finalizacion.date() + timedelta(days=180)
        
        equipo.save()
