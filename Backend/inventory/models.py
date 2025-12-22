from django.db import models
from django.conf import settings
from empleados.models import Empleado
from django.contrib.auth.models import AbstractUser

class Sede(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    pais = models.CharField(max_length=100, default='Colombia') # Assuming default country

    class Meta:
        verbose_name = "Sede"
        verbose_name_plural = "Sedes"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre



class Equipo(models.Model):
    # --- SECCIÓN: Descripción del Equipo ---
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Equipo")
    marca = models.CharField(max_length=50, verbose_name="Marca")
    modelo = models.CharField(max_length=50, verbose_name="Modelo")
    serial = models.CharField(max_length=50, unique=True, verbose_name="Serial")
    ram = models.CharField(max_length=20, blank=True, null=True, verbose_name="Memoria RAM")
    rom = models.CharField(max_length=20, blank=True, null=True, verbose_name="Almacenamiento (ROM)")
    
    # Nuevos campos de descripción detallada
    sistema_operativo = models.CharField(max_length=100, blank=True, null=True, verbose_name="Sistema Operativo")
    procesador = models.CharField(max_length=100, blank=True, null=True, verbose_name="Procesador")
    antivirus = models.CharField(max_length=100, blank=True, null=True, verbose_name="Antivirus Instalado")
    usuarios_sistema = models.TextField(blank=True, null=True, verbose_name="Usuarios del Sistema Operativo")
    TIPO_EQUIPO_CHOICES = [
        ('Laptop', 'Laptop'),
        ('Desktop', 'Desktop'),
        ('Servidor', 'Servidor'),
        ('Tablet', 'Tablet'),
        ('Movil', 'Movil'),
        ('Otro', 'Otro'),
    ]
    tipo_equipo = models.CharField(max_length=50, choices=TIPO_EQUIPO_CHOICES, default='Desktop', verbose_name="Tipo de Equipo")
    redes_conectadas = models.TextField(blank=True, null=True, verbose_name="Redes Conectadas")
    
    # --- SECCIÓN: Estado y Ubicación ---
    estado_tecnico = models.CharField(max_length=50, choices=[('Nuevo', 'Nuevo'), ('Funcional', 'Funcional'), ('Con fallas', 'Con fallas'), ('Dañado', 'Dañado'), ('Desguazado', 'Desguazado'), ('En reparación', 'En reparación')], default='Funcional', verbose_name="Estado Técnico")
    estado_disponibilidad = models.CharField(max_length=50, choices=[('Disponible', 'Disponible'), ('Asignado', 'Asignado'), ('Reservado', 'Reservado'), ('No disponible por daño', 'No disponible por mantenimiento')], default='Disponible', verbose_name="Estado de Disponibilidad")
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Sede")
    
    # --- SECCIÓN: A Cargo de ---
    empleado_asignado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='equipos_asignados', verbose_name="Empleado Asignado")
    fecha_entrega_a_colaborador = models.DateField(null=True, blank=True, verbose_name="Fecha de Entrega a Colaborador")
    # --- SECCIÓN: Recibido a Satisfacción ---
    fecha_recibido_satisfaccion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha y Hora de Recibo")
    responsable_entrega = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='equipos_entregados', verbose_name="Responsable de la Entrega (TI)")
    firma_recibido_usuario = models.TextField(blank=True, null=True, verbose_name="Firma de Recibido del Colaborador")

    # --- SECCIÓN: Datos de Jefe Inmediato ---
    nombre_jefe = models.CharField(max_length=150, blank=True, null=True, verbose_name="Nombre del Jefe Inmediato")
    cargo_jefe = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cargo del Jefe Inmediato")
    firma_recibido_jefe = models.TextField(blank=True, null=True, verbose_name="Firma de Recibido del Jefe")

    # --- SECCIÓN: Compromiso y Observaciones ---
    firma_compromiso = models.TextField(blank=True, null=True, verbose_name="Firma de Compromiso")
    
    # --- SECCIÓN: Fechas de Mantenimiento ---
    fecha_ultimo_mantenimiento = models.DateField(null=True, blank=True, verbose_name="Fecha del Último Mantenimiento")
    fecha_proximo_mantenimiento = models.DateField(null=True, blank=True, verbose_name="Fecha del Próximo Mantenimiento")

    # --- Notas Internas (TI) ---
    notas = models.TextField(blank=True, null=True, verbose_name="Notas Internas (TI)")

    def __str__(self):
        return f"{self.nombre} - {self.serial}"

    class Meta:
        verbose_name = "Equipo"
        verbose_name_plural = "Equipos"


class Periferico(models.Model):
    TIPO_PERIFERICO_CHOICES = [
        ('Mouse', 'Mouse'),
        ('Teclado', 'Teclado'),
        ('Base', 'Base'),
        ('Cargador', 'Cargador'),
        ('Monitor', 'Monitor'),
        ('Otro', 'Otro'),
    ]
    ESTADO_TECNICO_CHOICES = [
        ('Funcional', 'Funcional'),
        ('Con fallas', 'Con fallas'),
        ('Dañado', 'Dañado'),
    ]
    ESTADO_DISPONIBILIDAD_CHOICES = [
        ('Disponible', 'Disponible'),
        ('Asignado', 'Asignado'),
        ('Devuelto', 'Devuelto'), # Aunque "Devuelto" es más un evento, lo incluimos como estado si es necesario.
    ]

    nombre = models.CharField(max_length=100, help_text="Nombre o descripción del periférico, ej: Mouse Logitech G203")
    tipo = models.CharField(max_length=50, choices=TIPO_PERIFERICO_CHOICES)
    estado_tecnico = models.CharField(max_length=50, choices=ESTADO_TECNICO_CHOICES, default='Funcional')
    estado_disponibilidad = models.CharField(max_length=50, choices=ESTADO_DISPONIBILIDAD_CHOICES, default='Disponible')
    empleado_asignado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='perifericos_asignados')
    equipo_asociado = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, related_name='perifericos')
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    notas = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"

class Licencia(models.Model):
    TIPO_LICENCIA_CHOICES = [
        ('Sistema Operativo', 'Sistema Operativo'),
        ('Office', 'Office'),
        ('Otro', 'Otro'),
    ]
    TIPO_ACTIVACION_CHOICES = [
        ('Original', 'Original'),
        ('Pirateada', 'Pirateada'),
        ('OEM', 'OEM'),
        ('Volumen', 'Volumen'),
    ]
    ESTADO_LICENCIA_CHOICES = [
        ('Activa', 'Activa'),
        ('Inactiva', 'Inactiva'),
        ('Vencida', 'Vencida'),
    ]

    equipo_asociado = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name='licencias')
    tipo_licencia = models.CharField(max_length=50, choices=TIPO_LICENCIA_CHOICES)
    tipo_activacion = models.CharField(max_length=50, choices=TIPO_ACTIVACION_CHOICES)
    clave = models.CharField(max_length=255, blank=True, null=True)
    fecha_instalacion = models.DateField()
    estado = models.CharField(max_length=50, choices=ESTADO_LICENCIA_CHOICES, default='Activa')
    notas = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Licencia de {self.tipo_licencia} para {self.equipo_asociado.nombre}"

class Pasisalvo(models.Model):
    ESTADO_PASISALVO_CHOICES = [
        ('Aprobado', 'Aprobado'),
        ('Con Pendientes', 'Con Pendientes'),
        ('Rechazado', 'Rechazado'), # Si no se puede aprobar debido a problemas graves
    ]

    colaborador = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='pasisalvos_generados')
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=50, choices=ESTADO_PASISALVO_CHOICES)
    detalles_pendientes = models.TextField(blank=True, null=True, help_text="Detalles de equipos, periféricos o mantenimientos pendientes.")
    generado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='pasisalvos_creados_por_admin')
    pdf_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL del PDF del pasisalvo generado.")

    class Meta:
        verbose_name = "Paz y Salvo"
        verbose_name_plural = "Paz y Salvos"
        ordering = ['-fecha_generacion']

    def __str__(self):
        return f"Paz y Salvo para {self.colaborador} - {self.estado}"
    
class HistorialPeriferico(models.Model):
    """
    Modelo para registrar el historial de asignación de periféricos.
    """
    periferico = models.ForeignKey(Periferico, on_delete=models.CASCADE, related_name='historial')
    empleado_asignado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Empleado Asignado")
    equipo_asociado = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Equipo Asociado en la Entrega")
    fecha_asignacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Asignación")
    fecha_devolucion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Devolución")
    observacion_devolucion = models.TextField(blank=True, null=True, verbose_name="Observación de Devolución")

    class Meta:
        verbose_name = "Historial de Periférico"
        verbose_name_plural = "Historial de Periféricos"
        ordering = ['-fecha_asignacion']

    def __str__(self):
        return f"Historial de {self.periferico.nombre}"
   
