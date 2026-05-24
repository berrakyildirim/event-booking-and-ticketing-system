'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch categories once on mount for the filter chips
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // Debounce the search input so we don't fire a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch events whenever the active search query, category filter, or page changes
  useEffect(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page, limit: 9 });
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);

    fetch(`/api/events?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 0);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load events. Please try again.');
        setLoading(false);
      });
  }, [search, selectedCategory, page]);

  const handleCategoryClick = (categoryId) => {
    // Toggle behaviour: clicking the already-active category clears the filter;
    // clicking a different one selects it. Reset to page 1 to avoid landing on
    // a non-existent page when the result count changes.
    setSelectedCategory((prev) => (prev === categoryId ? '' : categoryId));
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Upcoming Events</h1>
        <p className="text-gray-500 mb-5">Discover and book tickets for events near you.</p>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search events by title…"
          className="input-field max-w-md"
        />
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => handleCategoryClick('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition cursor-pointer ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      {!loading && !error && (
        <p className="text-sm text-gray-500 mb-4">
          {total === 0 ? 'No events found.' : `${total} event${total !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Events grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading events…</div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No events match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="card flex flex-col gap-3 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-gray-900 text-lg leading-snug">{event.title}</h2>
        {event.category && (
          <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {event.category.name}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm line-clamp-2 flex-1">{event.description}</p>
      <div className="text-sm text-gray-600 space-y-1">
        <p>📅 {formattedDate}</p>
        <p>🎟 {event.capacity} spots</p>
        <p>👤 {event.organiser.name}</p>
      </div>
      <Link href={`/events/${event.id}`} className="btn-primary text-center text-sm mt-1">
        View Details
      </Link>
    </div>
  );
}
