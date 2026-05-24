'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function OrganiserEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Redirect non-organisers away from this page
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
    else if (user.role !== 'ORGANISER') router.push('/');
  }, [user, authLoading, router]);

  // Fetch organiser's events once auth is confirmed
  useEffect(() => {
    if (authLoading || !user || user.role !== 'ORGANISER') return;

    fetch('/api/organiser/events', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load events.');
        setLoading(false);
      });
  }, [user, authLoading]);

  const handleDelete = async (eventId, eventTitle) => {
    if (!window.confirm(`Delete "${eventTitle}"? This will also cancel all bookings and cannot be undone.`)) return;

    // Track the specific event being deleted (not just a boolean) so only its row
    // shows a loading spinner while other rows remain interactive.
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        // Remove the deleted event from local state to avoid a refetch
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        const data = await res.json();
        alert(data.error || 'Delete failed.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-500 text-sm">Manage the events you are organising.</p>
        </div>
        <Link href="/organiser/events/new" className="btn-primary">
          + Create Event
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading your events…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : events.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">You haven&apos;t created any events yet.</p>
          <Link href="/organiser/events/new" className="btn-primary inline-block">
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onDelete={handleDelete}
              deleting={deletingId === event.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onDelete, deleting }) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // `_count.bookings` is Prisma's aggregate syntax for counting related Booking records
  const booked = event._count.bookings;
  // Derive remaining spots rather than storing it — keeps data consistent with the DB
  const remaining = event.capacity - booked;

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="font-semibold text-gray-900 truncate">{event.title}</h2>
          {event.category && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
              {event.category.name}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">📅 {formattedDate}</p>
        <p className="text-sm text-gray-600">
          🎟 {booked} booked · {remaining} remaining of {event.capacity}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap shrink-0">
        <Link
          href={`/organiser/events/${event.id}/dashboard`}
          className="btn-secondary text-sm"
        >
          Dashboard
        </Link>
        <Link
          href={`/organiser/events/${event.id}/edit`}
          className="btn-secondary text-sm"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(event.id, event.title)}
          disabled={deleting}
          className="btn-danger text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
