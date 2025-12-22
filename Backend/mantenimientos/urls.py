from rest_framework.routers import DefaultRouter
from .views import MantenimientoViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'', MantenimientoViewSet, basename='mantenimiento')

urlpatterns = [
    path('', include(router.urls)),
]