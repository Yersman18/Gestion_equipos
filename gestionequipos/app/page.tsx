import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige automáticamente al usuario a la página de login
  redirect('/login');
}
