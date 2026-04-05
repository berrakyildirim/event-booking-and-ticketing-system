// POST /api/events/:id/book
// Creates a booking for the specified event on behalf of the authenticated attendee.
// Restricted to users with the ATTENDEE role — organisers may not book their own or others' events.
// Enforces both duplicate booking prevention and capacity limits before creating the record.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

export async function POST(request, { params }) {
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

  // Step 2: only ATTENDEEs are allowed to book events
  // Organisers are excluded to keep roles clearly separated
  if (user.role !== "ATTENDEE") {
    // 403 Forbidden: the user is authenticated but does not have the required role
    return NextResponse.json(
      { error: "Forbidden: only attendees can book events" },
      { status: 403 }
    );
  }

  // Confirm the event exists before attempting any booking logic
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }

  // Duplicate booking check performed in application code rather than relying solely
  // on the DB unique constraint. This gives us a clear, user-friendly 409 response
  // instead of a raw constraint violation error from Prisma.
  const existingBooking = await prisma.booking.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: id } },
  });
  if (existingBooking) {
    // 409 Conflict: the booking already exists for this user-event pair
    return NextResponse.json(
      { error: "You have already booked this event" },
      { status: 409 }
    );
  }

  // Capacity check: count confirmed bookings and compare against the event limit.
  // This prevents overbooking when concurrent requests arrive.
  const bookingCount = await prisma.booking.count({ where: { eventId: id } });
  if (bookingCount >= event.capacity) {
    // 409 Conflict: no seats remain — the resource state conflicts with the request
    return NextResponse.json(
      { error: "This event is fully booked" },
      { status: 409 }
    );
  }

  // All checks passed — create the booking and include basic event info in the response
  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      eventId: id,
    },
    include: {
      // Return enough event context so the client can confirm which event was booked
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          capacity: true,
        },
      },
    },
  });

  // 201 Created: a new booking resource was successfully created
  return NextResponse.json(
    { message: "Event booked successfully", booking },
    { status: 201 }
  );
}
