// gestionequipos/app/utils/api.ts

/**
 * Error personalizado para las respuestas de la API que no son exitosas.
 * Contiene el código de estado HTTP para un manejo de errores más específico.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
 * @throws Una instancia de `ApiError` si la respuesta de la red no es OK (ej. 4xx, 5xx).
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

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new ApiError('Sesión expirada o inválida. Redirigiendo al login.', 401);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido del servidor.' }));
      throw new ApiError(errorData.detail || `Error del servidor: ${response.statusText}`, response.status);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();

  } catch (error) {
    console.error(`Error en la llamada a la API: ${fullUrl}`, error);
    throw error;
  }
};
