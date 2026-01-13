// gestionequipos/app/utils/api.ts

/**
 * Interfaz para las opciones de la función fetchAuthenticated.
 * Extiende las opciones de RequestInit pero hace 'headers' opcionalmente un objeto HeadersInit.
 */
interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
}

/**
 * Una función wrapper para 'fetch' que automáticamente añade el token de autenticación.
 * También maneja la URL base de la API y centraliza el manejo de errores.
 * @param path La ruta del endpoint de la API a la que se quiere llamar (ej. '/equipos/').
 * @param options Opciones de configuración para la petición 'fetch', como method, body, etc.
 * @returns Una promesa que se resuelve con los datos de la respuesta en formato JSON.
 * @throws Una excepción si la respuesta de la red no es OK (ej. 4xx, 5xx).
 */
export const fetchAuthenticated = async (path: string, options: FetchOptions = {}) => {
  const token = localStorage.getItem('authToken');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const fullUrl = `${apiUrl}${path}`;

  // Prepara las cabeceras
  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json');

  if (token) {
    headers.append('Authorization', `Token ${token}`);
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Si el token es inválido o ha expirado, el servidor devolverá 401
    if (response.status === 401) {
      // Limpiamos el almacenamiento local y redirigimos al login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Usamos 'window.location' para una redirección forzada fuera del router de Next.js
      window.location.href = '/login';
      // Lanzamos un error para detener la ejecución del código que llamó a fetchAuthenticated
      throw new Error('Sesión expirada o inválida. Redirigiendo al login.');
    }

    if (!response.ok) {
      // Intentamos obtener un mensaje de error más detallado del cuerpo de la respuesta
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido del servidor.' }));
      throw new Error(errorData.detail || `Error del servidor: ${response.statusText}`);
    }

    // Si la respuesta no tiene contenido (ej. en un DELETE exitoso), devolvemos un objeto vacío
    if (response.status === 204) {
      return {};
    }

    return response.json();

  } catch (error) {
    console.error(`Error en la llamada a la API: ${fullUrl}`, error);
    // Re-lanzamos el error para que el componente que llama pueda manejarlo (ej. mostrar un mensaje al usuario)
    throw error;
  }
};
