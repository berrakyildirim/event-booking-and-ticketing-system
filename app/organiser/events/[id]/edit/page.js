'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EventForm from '@/components/EventForm';

export default function EditEventPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState({
    title: '', description: '', date: '', capacity: '', categoryId: '',
  });
  const [categories, setCategories] = useState([]);
  // Two separate loading flags: `pageLoading` hides the form while the existing event data
  // is being fetched; `submitLoading` disables the submit button during the PUT request.
  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
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

  // Fetch the existing event and pre-fill the form
  useEffect(() => {
    if (!id) return;

    fetch(`/api/events/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        const ev = data.event;
        setValues({
          title: ev.title,
          description: ev.description,
          // Convert stored ISO date to datetime-local format (YYYY-MM-DDTHH:MM)
          date: new Date(ev.date).toISOString().slice(0, 16),
          capacity: String(ev.capacity),
          categoryId: ev.categoryId,
        });
        setPageLoading(false);
      })
      .catch(() => {
        setError('Event not found.');
        setPageLoading(false);
      });
  }, [id]);

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

    setSubmitLoading(true);
    try {
      // Normalise values before sending: trim strings, parse capacity to int,
      // and convert the datetime-local string to a full ISO 8601 timestamp.
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
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
        setError(data.error || 'Failed to update event.');
        return;
      }

      router.push('/organiser/events');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/organiser/events" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Back to My Events
      </Link>
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>
        {pageLoading ? (
          <p className="text-gray-400 text-center py-8">Loading event…</p>
        ) : (
          <EventForm
            values={values}
            onChange={handleChange}
            categories={categories}
            loading={submitLoading}
            error={error}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
          />
        )}
      </div>
    </div>
  );
}
