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
    cargo = serializers.CharField(source='profile.cargo', read_only=True, allow_null=True)
    area = serializers.CharField(source='profile.area', read_only=True, allow_null=True)
    sede = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_superuser', 'sede', 'cargo', 'area']

    def get_sede(self, obj):
        # Usamos hasattr para asegurar que el perfil y la sede existen
        if hasattr(obj, 'profile') and obj.profile.sede:
            return {
                'id': obj.profile.sede.id,
                'nombre': obj.profile.sede.nombre
            }
        return None
