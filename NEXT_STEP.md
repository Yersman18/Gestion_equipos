## Siguientes Pasos

He modificado el modelo `Equipo` para que el campo `estado_tecnico` solo acepte 'Nuevo' o 'Reacondicionado'. También he creado el archivo de migración necesario.

Para aplicar estos cambios a tu base de datos, por favor ejecuta el siguiente comando en tu terminal, dentro del directorio `Backend`:

```bash
python manage.py migrate inventory
```
