from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Equipo, HistorialEquipo
from .middleware import get_current_user

@receiver(pre_save, sender=Equipo)
def cache_old_equipo_instance(sender, instance, **kwargs):
    """
    On pre_save, cache the old instance of the Equipo model if it exists.
    """
    if instance.pk:
        try:
            instance._old_instance = Equipo.objects.get(pk=instance.pk)
        except Equipo.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None


@receiver(post_save, sender=Equipo)
def log_equipo_changes(sender, instance, created, **kwargs):
    """
    On post_save, compare the new instance with the cached old one and log changes.
    """
    user = get_current_user()

    old_instance = getattr(instance, '_old_instance', None)
    
    if created:
        # For a created instance, we can log the initial state of all fields.
        for field in instance._meta.fields:
            if field.name == 'id':
                continue
            
            new_value = getattr(instance, field.name)
            if new_value not in [None, '']:
                HistorialEquipo.objects.create(
                    equipo=instance,
                    usuario=user,
                    campo_modificado=field.verbose_name,
                    valor_anterior="",
                    valor_nuevo=str(new_value),
                    tipo_accion='CREADO'
                )
    elif old_instance is not None:
        # For an updated instance, we compare fields and log what changed.
        for field in instance._meta.fields:
            old_value = getattr(old_instance, field.name)
            new_value = getattr(instance, field.name)

            if field.is_relation and old_value != new_value:
                old_val_str = str(old_value) if old_value else ""
                new_val_str = str(new_value) if new_value else ""

                if old_val_str != new_val_str:
                    HistorialEquipo.objects.create(
                        equipo=instance,
                        usuario=user,
                        campo_modificado=field.verbose_name,
                        valor_anterior=old_val_str,
                        valor_nuevo=new_val_str,
                        tipo_accion='ACTUALIZADO'
                    )
            elif not field.is_relation and old_value != new_value:
                HistorialEquipo.objects.create(
                    equipo=instance,
                    usuario=user,
                    campo_modificado=field.verbose_name,
                    valor_anterior=str(old_value),
                    valor_nuevo=str(new_value),
                    tipo_accion='ACTUALIZADO'
                )