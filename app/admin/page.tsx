import { redirect } from 'next/navigation';

// /admin → dashboard (el layout del panel redirige al login si no hay sesión).
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
