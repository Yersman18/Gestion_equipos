Para aplicar los cambios en la base de datos que garantizan que solo puede haber **un único mantenimiento por equipo (independientemente de su estado)**, por favor, ejecute los siguientes comandos en su terminal desde la carpeta `Backend`:

**Problema Actual:** Error `UniqueViolation: no se pudo crear el índice único «unique_maintenance_per_equipo» DETAIL: La llave (equipo_id)=(2) está duplicada.`

**Explicación del problema:** Este error significa que ya existen múltiples registros de mantenimiento para el mismo equipo (`equipo_id=2` en este caso, y posiblemente otros equipos) en su base de datos. La nueva restricción que hemos implementado exige que cada equipo solo pueda tener UN registro de mantenimiento. Antes de poder aplicar esta restricción, debe limpiar los datos existentes.

**Solución: Limpieza de datos (opciones) y aplicación de migraciones:**

Tiene dos opciones para limpiar los datos, dependiendo de si desea conservar algún registro o eliminarlos todos para empezar de nuevo:

**Opción A: Eliminar TODOS los registros de mantenimiento (si son solo datos de prueba):**

    **¡ADVERTENCIA!** Esta opción borrará **permanentemente todos los datos** de la tabla `mantenimientos_mantenimiento`. Si estos datos no son importantes (son solo de prueba), puede usar este comando.

    1.  **Conéctese a su base de datos** (usando `psql` para PostgreSQL, u otra herramienta de cliente de base de datos).
    2.  Ejecute el siguiente comando SQL:
        ```sql
        TRUNCATE TABLE mantenimientos_mantenimiento RESTART IDENTITY CASCADE;
        ```
        *   `TRUNCATE TABLE mantenimientos_mantenimiento`: Elimina todos los registros de la tabla.
        *   `RESTART IDENTITY`: Reinicia las secuencias relacionadas (por ejemplo, para los IDs auto-incrementales).
        *   `CASCADE`: Elimina automáticamente objetos que dependen de las filas truncadas (si los hubiera, aunque para esta tabla es poco probable que sea crítico).

**Opción B: Eliminar REGISTROS DE MANTENIMIENTO DUPLICADOS manualmente (si desea conservar algunos datos):**

    **¡ADVERTENCIA!** Realice una copia de seguridad de su base de datos antes de hacer cualquier eliminación.

    1.  **Conéctese a su base de datos** (por ejemplo, usando `psql` para PostgreSQL, `pgAdmin`, `DBeaver`, o una herramienta similar).
    2.  Identifique los equipos con mantenimientos duplicados ejecutando una consulta SQL como esta (para PostgreSQL):
        ```sql
        SELECT equipo_id, COUNT(*)
        FROM mantenimientos_mantenimiento
        GROUP BY equipo_id
        HAVING COUNT(*) > 1;
        ```
    3.  Para cada `equipo_id` con duplicados (como `equipo_id=2` en su caso), decida qué registro de mantenimiento desea conservar y elimine los demás manualmente.
        Por ejemplo, si para `equipo_id=2` desea eliminar los registros con IDs `10` y `11`, usaría:
        ```sql
        DELETE FROM mantenimientos_mantenimiento WHERE id IN (10, 11);
        ```

---

**Una vez que haya limpiado los datos (ELIGE SOLO UNA OPCIÓN, A o B), proceda con las siguientes migraciones:**

1.  **Asegúrese de que todas las migraciones anteriores a la 0005 estén aplicadas y que la 0005 esté "falseada" (si no lo ha hecho ya):**
    ```bash
    python manage.py migrate mantenimientos 0004
    python manage.py migrate mantenimientos 0005 --fake
    ```
    *(Si ya realizó estos pasos, puede omitirlos.)*

2.  **Cree una nueva migración para el cambio en el `UniqueConstraint` (si aún no lo ha hecho, aunque el error indica que ya existe la migración `0006`):**
    ```bash
    python manage.py makemigrations mantenimientos
    ```
    *(Este comando generará una nueva migración si no existe una para los cambios del `UniqueConstraint`. El error que tiene ahora sugiere que la migración `0006` ya existe y está intentando aplicarla.)*

3.  **Aplique todas las migraciones pendientes:**
    ```bash
    python manage.py migrate
    ```

Después de ejecutar estos pasos (especialmente la limpieza de datos), su base de datos tendrá la nueva restricción que impide la creación de más de un mantenimiento por equipo. Si intenta crear un segundo mantenimiento para un equipo que ya tiene uno, el sistema debería mostrar un error.
