# backend/sedes/models.py
from django.db import models

class Sede(models.Model):
    """
    Modelo para representar las sedes o sucursales de la empresa.
    """
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.nombre

