'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
    setError(null);
    setIsLoading(true);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/login/`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Credenciales incorrectas. Por favor, inténtalo de nuevo.';

        try {
          const errorData = JSON.parse(errorText);
          // Django REST Framework suele devolver errores en 'detail' o 'non_field_errors'
          if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
            errorMessage = errorData.non_field_errors[0];
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }

          // Traducción amigable de mensajes comunes del backend
          if (errorMessage === 'Unable to log in with provided credentials.') {
            errorMessage = 'El usuario o la contraseña son incorrectos. Por favor, verifica tus datos.';
          }
        } catch (jsonError) {
          // Si no es JSON, mensaje genérico con el código de estado
          errorMessage = `Error del servidor (${response.status}). Por favor, contacta a soporte.`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Usamos la función del contexto. Asumimos que la API devuelve `token` y `user`.
      // El objeto `user` debe contener `id`, `username` y `sedes_autorizadas`.
      if (data.token && data.user) {
        login(data.user, data.token);
      } else {
        throw new Error('La respuesta del servidor no es válida.');
      }
    } catch (err) {
      console.error('Error en el login:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-green-500 to-green-600 px-4">
      <div className="w-full max-w-md">
        {/* Tarjeta de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex justify-center mb-6">
            <Image
              src="/img/logo.png" // Ruta a tu imagen dentro de la carpeta 'public'
              alt="Logo de INTEGRA"
              width={192} // Ancho en píxeles (ajusta al tamaño de tu logo)
              height={96}  // Alto en píxeles (ajusta al tamaño de tu logo)
              priority     // Le da prioridad de carga a esta imagen
            />
          </div>

          {/* Título */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Iniciar Sesión</h1>
            <p className="text-gray-500 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                placeholder="Ingresa tu contraseña"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón de Submit */}
            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Footer opcional */}
          <div className="text-center text-xs text-gray-500 mt-6">
            ¿Problemas para ingresar? Contacta al administrador
          </div>
        </div>
      </div>
    </div>
  );
}