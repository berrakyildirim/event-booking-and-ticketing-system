'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function EventDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isBooked, setIsBooked] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Fetch the event details
  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then((data) => {
        setEvent(data.event);
        setLoading(false);
      })
      .catch(() => {
        setError('Event not found or failed to load.');
        setLoading(false);
      });
  }, [id]);

  // Check if the authenticated attendee has already booked this event.
  // We skip this fetch entirely for organisers because they can never book events.
  useEffect(() => {
    if (authLoading || user?.role !== 'ATTENDEE') return;

    // Re-use the existing my-bookings endpoint and search locally rather than
    // adding a dedicated per-event booking-status endpoint.
    fetch('/api/my-bookings', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const booked = data.bookings?.some((b) => b.eventId === id);
        setIsBooked(booked);
      })
      .catch(() => {});
  }, [user, authLoading, id]);

  const handleBook = async () => {
    setBookingError('');
    setBookingMessage('');
    setBookingLoading(true);

    try {
      const res = await fetch(`/api/events/${id}/book`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || 'Booking failed.');
        return;
      }

      setIsBooked(true);
      setBookingMessage('🎉 You have successfully booked this event!');
    } catch {
      setBookingError('Something went wrong. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">
        Loading event…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/" className="btn-secondary inline-block">← Back to Events</Link>
      </div>
    );
  }

  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = new Date(event.date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Back to Events
      </Link>

      <div className="card">
        {/* Title & category */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          {event.category && (
            <span className="shrink-0 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              {event.category.name}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">{event.description}</p>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-sm text-gray-700">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Date</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Time</p>
            <p className="font-medium">{formattedTime}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Capacity</p>
            <p className="font-medium">{event.capacity} spots</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Organiser</p>
            <p className="font-medium">{event.organiser.name}</p>
          </div>
        </div>

        {/* Booking section */}
        <div className="border-t pt-6">
          {bookingMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {bookingMessage}
            </div>
          )}
          {bookingError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {bookingError}
            </div>
          )}

          {/*
            Booking CTA rendering priority:
            1. Auth still loading  → render nothing (avoid flicker)
            2. Not logged in       → prompt to sign in
            3. User is ORGANISER   → informational note (organisers can't book)
            4. Already booked      → disabled confirmation button
            5. Default             → active Book Ticket button
          */}
          {authLoading ? null : !user ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Sign in to book a ticket for this event.</p>
              <Link href="/login" className="btn-primary inline-block">
                Sign in to Book
              </Link>
            </div>
          ) : user.role === 'ORGANISER' ? (
            <p className="text-gray-400 text-sm text-center">
              Organisers cannot book events.
            </p>
          ) : isBooked ? (
            <button disabled className="btn-primary w-full opacity-60 cursor-not-allowed">
              ✓ Already Booked
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={bookingLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bookingLoading ? 'Booking…' : 'Book Ticket'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
