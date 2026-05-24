'use client'
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    // Ask the server to clear the HttpOnly cookie — JS cannot delete it directly.
    // Only after the server responds do we clear local auth state and redirect.
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="flex items-center gap-4 px-6 py-3 bg-gray-900 text-white flex-wrap">
      <Link href="/" className="font-bold text-lg tracking-tight">
        EventHub
      </Link>
      <Link href="/" className="text-gray-300 hover:text-white text-sm transition">
        Events
      </Link>

      {/* Spacer: pushes auth-related nav items to the right */}
      <div className="flex-1" />

      {user ? (
        <>
          {/* Show role-specific navigation: attendees see their bookings, organisers see their events */}
          {user.role === 'ATTENDEE' && (
            <Link href="/my-bookings" className="text-gray-300 hover:text-white text-sm transition">
              My Bookings
            </Link>
          )}
          {user.role === 'ORGANISER' && (
            <Link href="/organiser/events" className="text-gray-300 hover:text-white text-sm transition">
              My Events
            </Link>
          )}
          <span className="text-gray-400 text-sm">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-300 hover:text-white transition cursor-pointer"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="text-gray-300 hover:text-white text-sm transition">
            Login
          </Link>
          <Link
            href="/register"
            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition"
          >
            Register
          </Link>
        </>
      )}
    </nav>
  );
}
