'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EventForm from '@/components/EventForm';

// Initial (empty) form state defined outside the component to avoid
// recreating the object on every render and to make resets easy.
const EMPTY = { title: '', description: '', date: '', capacity: '', categoryId: '' };

export default function NewEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect non-organisers away from this page
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
    else if (user.role !== 'ORGANISER') router.push('/');
  }, [user, authLoading, router]);

  // Fetch categories for the dropdown
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { title, description, date, capacity, categoryId } = values;

    if (!title.trim() || !description.trim() || !date || !capacity || !categoryId) {
      setError('All fields are required.');
      return;
    }
    if (parseInt(capacity) < 1) {
      setError('Capacity must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      // Normalise values before sending: trim strings, parse capacity to int,
      // and convert the datetime-local string to a full ISO 8601 timestamp.
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          date: new Date(date).toISOString(),
          capacity: parseInt(capacity),
          categoryId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create event.');
        return;
      }

      router.push('/organiser/events');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/organiser/events" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Back to My Events
      </Link>
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h1>
        <EventForm
          values={values}
          onChange={handleChange}
          categories={categories}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          submitLabel="Create Event"
        />
      </div>
    </div>
  );
}
