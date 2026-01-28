from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['cargo', 'area']

    def update(self, instance, validated_data):
        print(f"DEBUG_UserProfileSerializer: Recibiendo validated_data para UserProfile: {validated_data}")
        # Call the superclass update method to handle the actual saving
        return super().update(instance, validated_data)

class UserSerializer(serializers.ModelSerializer):
    cargo = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    area = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    rol = serializers.CharField(required=False)
    sede_id = serializers.IntegerField(required=False, write_only=True, allow_null=True)
    sede = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_superuser', 'sede', 'sede_id', 'cargo', 'area', 'rol', 'password']

    def get_sede(self, obj):
        if hasattr(obj, 'profile') and obj.profile.sede:
            return {
                'id': obj.profile.sede.id,
                'nombre': obj.profile.sede.nombre
            }
        return None

    def create(self, validated_data):
        cargo = validated_data.pop('cargo', None)
        area = validated_data.pop('area', None)
        rol = validated_data.pop('rol', 'USUARIO')
        sede_id = validated_data.pop('sede_id', None)
        password = validated_data.pop('password', None)
        
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        # El signal crea el perfil automáticamente
        profile = user.profile
        profile.cargo = cargo
        profile.area = area
        profile.rol = rol
        if sede_id:
            from sede.models import Sede
            try:
                profile.sede = Sede.objects.get(id=sede_id)
            except Sede.DoesNotExist:
                pass
        profile.save()
        return user

    def update(self, instance, validated_data):
        cargo = validated_data.pop('cargo', None)
        area = validated_data.pop('area', None)
        rol = validated_data.pop('rol', None)
        sede_id = validated_data.pop('sede_id', 'no_change')
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        instance.save()
        
        profile = instance.profile
        if cargo is not None: profile.cargo = cargo
        if area is not None: profile.area = area
        if rol is not None: profile.rol = rol
        
        if sede_id != 'no_change':
            if sede_id is None:
                profile.sede = None
            else:
                from sede.models import Sede
                try:
                    profile.sede = Sede.objects.get(id=sede_id)
                except Sede.DoesNotExist:
                    profile.sede = None
        
        profile.save()
        return instance
