from rest_framework.routers import DefaultRouter
from .views import MantenimientoViewSet, EvidenciaMantenimientoViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'', MantenimientoViewSet, basename='mantenimiento')
router.register(r'evidencias', EvidenciaMantenimientoViewSet, basename='evidencia-mantenimiento')

urlpatterns = [
    path('', include(router.urls)),
]