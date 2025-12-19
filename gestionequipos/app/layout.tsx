// app/layout.tsx
import { AuthProvider } from './context/AuthContext';
import { SedeProvider } from './context/SedeContext';
import './globals.css'; // O la ruta a tus estilos globales

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <SedeProvider>
            {children}
          </SedeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
