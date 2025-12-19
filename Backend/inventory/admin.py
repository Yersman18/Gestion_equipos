from django.contrib import admin
from .models import Sede, Equipo, Mantenimiento, Periferico, Licencia, Pasisalvo
from usuarios.models import UserProfile

# Register your models here.
admin.site.register(Sede)
admin.site.register(UserProfile)
admin.site.register(Equipo)
admin.site.register(Mantenimiento)
admin.site.register(Periferico)
admin.site.register(Licencia)
admin.site.register(Pasisalvo)
