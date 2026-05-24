'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect unauthenticated users or organisers away from this page.
  // Kept in a separate effect from the data fetch so that the redirect logic
  // doesn't re-run every time the bookings array updates.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'ATTENDEE') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Fetch bookings once the user is confirmed as an ATTENDEE.
  // The guard conditions mirror the redirect above so we never call the endpoint
  // for an unauthenticated session or for an organiser (who has no bookings).
  useEffect(() => {
    if (authLoading || !user || user.role !== 'ATTENDEE') return;

    fetch('/api/my-bookings', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load your bookings.');
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Bookings</h1>
      <p className="text-gray-500 text-sm mb-8">All events you have booked tickets for.</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading your bookings…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">You haven&apos;t booked any events yet.</p>
          <Link href="/" className="btn-primary inline-block">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  const { event } = booking;
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const bookedOn = new Date(booking.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-start gap-2 mb-1">
          <h2 className="font-semibold text-gray-900">{event.title}</h2>
          {event.category && (
            <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {event.category.name}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">📅 {formattedDate}</p>
        <p className="text-sm text-gray-600">👤 {event.organiser.name}</p>
        <p className="text-xs text-gray-400 mt-1">Booked on {bookedOn}</p>
      </div>
      <Link
        href={`/events/${event.id}`}
        className="btn-secondary text-sm text-center shrink-0"
      >
        View Event
      </Link>
    </div>
  );
}
