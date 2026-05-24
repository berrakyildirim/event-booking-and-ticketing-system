'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function EventDashboardPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect non-organisers away from this page
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
    else if (user.role !== 'ORGANISER') router.push('/');
  }, [user, authLoading, router]);

  // Fetch dashboard data once auth is confirmed
  useEffect(() => {
    if (authLoading || !user || user.role !== 'ORGANISER' || !id) return;

    fetch(`/api/organiser/events/${id}/dashboard`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load dashboard. You may not own this event.');
        setLoading(false);
      });
  }, [user, authLoading, id]);

  if (authLoading || !user) return null;

  // Compute formattedDate only after `data` is available to avoid calling
  // new Date(undefined) and producing an invalid date string.
  const formattedDate = data
    ? new Date(data.event.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/organiser/events" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Back to My Events
      </Link>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading dashboard…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : (
        <>
          {/* Event header */}
          <div className="card mb-6">
            <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{data.event.title}</h1>
              {data.event.category && (
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {data.event.category.name}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">📅 {formattedDate}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Capacity" value={data.event.capacity} />
            <StatCard label="Tickets Sold" value={data.ticketsSold} highlight />
            <StatCard label="Remaining Spots" value={data.remainingCapacity} />
          </div>

          {/* Attendee list */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Attendees ({data.attendeeList.length})
            </h2>
            {data.attendeeList.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                No attendees yet. Share your event to get bookings!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendeeList.map((attendee) => (
                      <tr key={attendee.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-900">{attendee.name}</td>
                        <td className="py-3 text-gray-600">{attendee.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// highlight adds a blue border/background to make the most important stat stand out
function StatCard({ label, value, highlight }) {
  return (
    <div className={`card text-center ${highlight ? 'border-2 border-blue-200 bg-blue-50' : ''}`}>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </p>
    </div>
  );
}
