// app/api/events/[id]/route.js
// Handles single-event operations by event ID.
//
// GET    /api/events/:id  — public, returns full event details
// PUT    /api/events/:id  — restricted to the ORGANISER who owns the event
// DELETE /api/events/:id  — restricted to the ORGANISER who owns the event

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

// Shared include config to keep GET, PUT responses consistent.
// Organiser and category data is embedded to reduce client-side fetches.
const eventInclude = {
  organiser: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
};

// GET /api/events/:id
// Public endpoint — no authentication required.
export async function GET(request, { params }) {
  // params must be awaited in Next.js App Router before accessing its properties
  const { id } = await params;

  // Fetch the event and embed its related organiser and category in one query
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventInclude,
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

// PUT /api/events/:id
// Updates an existing event. Only the organiser who created it may do so.
export async function PUT(request, { params }) {
  // params must be awaited in Next.js App Router before accessing its properties
  const { id } = await params;

  // Step 1: verify the user is authenticated — unauthenticated gets 401
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: please log in" },
      { status: 401 }
    );
  }

  // Step 2: verify the user is an ORGANISER — wrong role gets 403
  if (user.role !== "ORGANISER") {
    return NextResponse.json(
      { error: "Forbidden: only organisers can update events" },
      { status: 403 }
    );
  }

  // Confirm the event exists before checking ownership
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Ownership check: an organiser may only edit events they created
  if (event.organiserId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: you can only update your own events" },
      { status: 403 }
    );
  }

  // Guard against malformed request bodies that are not valid JSON
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { title, description, date, capacity, categoryId } = body;

  // Check for missing fields using strict null/undefined checks so that
  // a value of 0 for capacity is not incorrectly treated as missing
  if (
    title === undefined || title === null ||
    description === undefined || description === null ||
    date === undefined || date === null ||
    capacity === undefined || capacity === null ||
    categoryId === undefined || categoryId === null
  ) {
    return NextResponse.json(
      { error: "All fields are required: title, description, date, capacity, categoryId" },
      { status: 400 }
    );
  }

  // Validate content after confirming presence — empty strings are not acceptable
  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "Title must not be empty" }, { status: 400 });
  }

  if (typeof description !== "string" || description.trim() === "") {
    return NextResponse.json({ error: "Description must not be empty" }, { status: 400 });
  }

  // Capacity must be a whole number greater than zero
  if (!Number.isInteger(capacity) || capacity < 1) {
    return NextResponse.json(
      { error: "Capacity must be a positive integer" },
      { status: 400 }
    );
  }

  // Confirm the referenced category exists before updating the event
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description.trim(),
      date: new Date(date),
      capacity,
      categoryId,
    },
    // Include relations so the response has the same shape as GET
    include: eventInclude,
  });

  return NextResponse.json({ message: "Event updated successfully", event: updated });
}

// DELETE /api/events/:id
// Removes an event. Only the organiser who created it may do so.
// Related bookings are deleted automatically via the cascade rule on the Booking model.
export async function DELETE(request, { params }) {
  // params must be awaited in Next.js App Router before accessing its properties
  const { id } = await params;

  // Step 1: verify the user is authenticated — unauthenticated gets 401
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: please log in" },
      { status: 401 }
    );
  }

  // Step 2: verify the user is an ORGANISER — wrong role gets 403
  if (user.role !== "ORGANISER") {
    return NextResponse.json(
      { error: "Forbidden: only organisers can delete events" },
      { status: 403 }
    );
  }

  // Confirm the event exists before checking ownership
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Ownership check: an organiser may only delete events they created
  if (event.organiserId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: you can only delete your own events" },
      { status: 403 }
    );
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ message: "Event deleted successfully" });
}
