# usuarios/views.py
from rest_framework import generics
from django.contrib.auth.models import User
from .serializers import UserSerializer, UserProfileSerializer
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import AllowAny # <-- 1. Importa AllowAny
from .models import UserProfile

class UserProfileUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = 'user'

class UserListAPIView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class CustomAuthToken(ObtainAuthToken):
    permission_classes = [AllowAny] # <-- 2. Añade esta línea

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        profile, profile_created = UserProfile.objects.get_or_create(user=user)

        sede_info = {
            'id': None,
            'nombre': None
        }
        
        if profile.sede:
            sede_info['id'] = profile.sede.id
            sede_info['nombre'] = profile.sede.nombre

        return Response({
            'token': token.key,
            'user': {
                'id': user.pk,
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
                'sede': sede_info
            }
        })
