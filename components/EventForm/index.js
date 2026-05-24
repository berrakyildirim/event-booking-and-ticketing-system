import React from 'react';

// Shared form used by both the create and edit event pages.
// onChange(field, value) updates a single field in the parent's state object.
export default function EventForm({ values, onChange, categories, loading, error, onSubmit, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Display a server-side or validation error at the top of the form */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => onChange('title', e.target.value)}
          className="input-field"
          placeholder="Event title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="input-field resize-none"
          rows={4}
          placeholder="Describe your event"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
        {/* datetime-local input gives both date and time in a single native picker */}
        <input
          type="datetime-local"
          value={values.date}
          onChange={(e) => onChange('date', e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
        {/* Number input value is always a string; the parent converts it with parseInt on submit */}
        <input
          type="number"
          value={values.capacity}
          onChange={(e) => onChange('capacity', e.target.value)}
          className="input-field"
          min="1"
          placeholder="Maximum number of attendees"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={values.categoryId}
          onChange={(e) => onChange('categoryId', e.target.value)}
          className="input-field"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Disabled during submission to prevent duplicate requests */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
