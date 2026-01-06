¡Hola! Entiendo tu frustración con la "sede fantasma". Este tipo de problemas, donde algo parece persistir aunque lo borres, generalmente indican que hay una inconsistencia a nivel de la base de datos o que alguna caché está interfiriendo de forma muy agresiva.

Como agente de IA, no puedo acceder directamente a tu terminal ni a tu base de datos para ejecutar comandos o verificar el estado en tiempo real. Sin embargo, puedo darte las instrucciones exactas para que tú mismo realices una limpieza profunda y podamos resolver esto.

**Por favor, sigue estos pasos cuidadosamente en tu propia terminal y navegador:**

**Paso 1: Limpia la base de datos de tu proyecto Django (¡Advertencia: esto eliminará TODOS los datos de tu aplicación!)**

1.  Abre tu terminal (por ejemplo, `cmd`, PowerShell, Bash, etc.).
2.  Navega hasta la carpeta `Backend` de tu proyecto. Asegúrate de estar en el mismo directorio donde se encuentra el archivo `manage.py`. Por ejemplo:
    ```bash
    cd c:\Users\Yersman\Proyecto gestion de equipos\Equipos_integra\Backend
    ```
3.  Una vez en esa carpeta, ejecuta el siguiente comando:
    ```bash
    python manage.py flush
    ```
4.  El comando te preguntará si quieres continuar con la operación. Verás un mensaje como: `Type 'yes' to continue, or 'no' to cancel:`. **Escribe `yes`** (en minúsculas) y presiona la tecla `Enter`.
    *   Este comando borrará *todos los datos* de tu base de datos (usuarios, sedes, equipos, etc.) y dejará las tablas vacías, como si hubieras iniciado el proyecto por primera vez.

**Paso 2: Reinicia el servidor de desarrollo y limpia la caché del navegador**

1.  Después de que el comando `flush` haya terminado, inicia tu servidor de desarrollo de Django nuevamente:
    ```bash
    python manage.py runserver
    ```
    *   Asegúrate de que no haya errores al iniciar el servidor.

2.  En tu navegador web, abre el administrador de Django (normalmente en `http://127.0.0.1:8000/admin/`).
3.  **Limpia la caché de tu navegador:** Esto es importante para asegurarte de que no estás viendo información antigua. La forma de hacerlo varía según el navegador:
    *   **Google Chrome / Microsoft Edge:** Presiona `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac) para recargar la página sin usar la caché. Alternativamente, puedes ir a Configuración > Privacidad y seguridad > Borrar datos de navegación y seleccionar "Imágenes y archivos almacenados en caché".
    *   **Mozilla Firefox:** Presiona `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac). También puedes ir a Opciones > Privacidad & Seguridad > Datos de sitios > Limpiar datos.

**Paso 3: Crea nuevas sedes y verifica**

1.  Ahora que la base de datos está limpia y la caché de tu navegador ha sido vaciada, ve a la sección de 'Sedes' en el administrador de Django. **Debería estar completamente vacía.**
2.  Crea al menos **dos o tres sedes nuevas** con nombres diferentes a la "sede fantasma" que te aparecía antes. Por ejemplo: "Sede Principal", "Sede Norte", "Sede Sur".
3.  Una vez creadas las sedes, ve a la sección de 'Usuarios' y luego a 'User Profiles'.
4.  Intenta editar un `UserProfile` existente o crea uno nuevo, y verifica si ahora el campo desplegable de 'Sede' te muestra **todas las sedes que acabas de crear**.

**Por favor, házmelo saber cuando hayas completado todos estos pasos y cuál fue el resultado.** Con esa información, podré determinar si el problema de visualización se ha resuelto o si necesitamos investigar algo más."