# usuarios/views.py
from rest_framework import generics
from django.contrib.auth.models import User
from .serializers import UserSerializer, UserProfileSerializer
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .permissions import IsAdminOrSelf
from .models import UserProfile

class UserProfileUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSelf]
    lookup_field = 'user_id'
    lookup_url_kwarg = 'user_pk'

class UserListAPIView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        try:
            user_profile = user.profile
            if user.is_staff or user.is_superuser or (hasattr(user_profile, 'rol') and user_profile.rol == 'ADMIN'):
                return User.objects.all()
        except UserProfile.DoesNotExist:
            if user.is_staff or user.is_superuser:
                return User.objects.all()
            return User.objects.filter(pk=user.pk) # Un usuario sin perfil solo se ve a sí mismo

        user_sede = getattr(user_profile, 'sede', None)
        if user_sede:
            return User.objects.filter(profile__sede=user_sede)
        
        # Si no es admin y no tiene sede, solo se ve a sí mismo
        return User.objects.filter(pk=user.pk)

class CustomAuthToken(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        # Asegurarse de que el perfil exista
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
                'rol': getattr(profile, 'rol', None), # Incluir rol
                'sede': sede_info
            }
        })
