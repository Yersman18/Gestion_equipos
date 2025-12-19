# usuarios/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserProfile

# 1. Anular el registro del modelo UserProfile independiente si ya no se necesita
# admin.site.unregister(UserProfile) # Esto daría error si no está registrado, lo omitimos por seguridad

# 2. Definir el inline para el perfil de usuario
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Perfil (Sede)'
    fk_name = 'user'

# 3. Crear una nueva clase de administrador de usuarios que incluya el inline
class CustomUserAdmin(UserAdmin):
    def get_inlines(self, request, obj=None):
        """
        No muestra el formulario de perfil al crear un usuario nuevo para evitar
        el conflicto con la señal que lo crea automáticamente. Solo lo muestra
        al editar un usuario ya existente.
        """
        if obj is None:
            return ()
        return (UserProfileInline,)

    # Opcional: para mostrar la sede en la lista de usuarios
    def get_sede(self, instance):
        return instance.profile.sede.nombre if hasattr(instance, 'profile') and instance.profile.sede else 'N/A'
    get_sede.short_description = 'Sede'

    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_sede')
    list_select_related = ('profile__sede', )

# 4. Anular el registro del UserAdmin por defecto y registrar el nuestro
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
