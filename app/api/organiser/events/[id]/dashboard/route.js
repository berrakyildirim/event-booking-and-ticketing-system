// GET /api/organiser/events/:id/dashboard
// Returns a summary dashboard for a specific event owned by the authenticated organiser.
// Restricted to authenticated users with the ORGANISER role who own the requested event.
// Provides ticket sales stats and the full list of attendees in a single response.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

export async function GET(request, { params }) {
  // params must be awaited in Next.js App Router before accessing its properties
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Event ID is required" },
      { status: 400 }
    );
  }

  // Step 1: verify the user is authenticated — unauthenticated gets 401
  const user = await requireAuth(request);
  if (!user) {
    // 401 Unauthorized: no valid token was provided
    return NextResponse.json(
      { error: "Unauthorized: please log in" },
      { status: 401 }
    );
  }

  // Step 2: only ORGANISERs can access the dashboard
  if (user.role !== "ORGANISER") {
    // 403 Forbidden: authenticated but the role does not allow this action
    return NextResponse.json(
      { error: "Forbidden: only organisers can access the dashboard" },
      { status: 403 }
    );
  }

  // Fetch the event together with all related data in a single query to avoid
  // multiple sequential DB round-trips. Bookings include nested user info so
  // we can build the attendee list without an extra query.
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      organiser: { select: { id: true, name: true, email: true } },
      bookings: {
        include: {
          // Each booking's user becomes an entry in the attendee list
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  // Ownership check: an organiser may only view the dashboard for their own events.
  // This prevents one organiser from inspecting another organiser's attendee list.
  if (event.organiserId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: you can only view the dashboard for your own events" },
      { status: 403 }
    );
  }

  // ticketsSold is derived from the number of confirmed bookings, not a stored field.
  // This ensures it is always accurate and consistent with the actual booking records.
  const ticketsSold = event.bookings.length;

  // remainingCapacity shows how many more bookings the event can accept
  const remainingCapacity = event.capacity - ticketsSold;

  // Flatten the bookings array into a plain list of attendee objects for easier client consumption
  const attendeeList = event.bookings.map((booking) => booking.user);

  // Shape the response to separate event metadata from analytics data
  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      capacity: event.capacity,
      createdAt: event.createdAt,
      category: event.category,
      organiser: event.organiser,
    },
    ticketsSold,
    remainingCapacity,
    attendeeList,
  });
}
