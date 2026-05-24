// GET /api/my-bookings
// Returns all bookings belonging to the currently authenticated attendee.
// Restricted to users with the ATTENDEE role.
// Includes full event details (organiser and category) so the client
// does not need to make separate requests for each booking.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

export async function GET(request) {
  // Step 1: verify the user is authenticated — unauthenticated gets 401
  const user = await requireAuth(request);
  if (!user) {
    // 401 Unauthorized: no valid token was provided
    return NextResponse.json(
      { error: "Unauthorized: please log in" },
      { status: 401 }
    );
  }

  // Step 2: only ATTENDEEs have bookings — organisers are not permitted here
  if (user.role !== "ATTENDEE") {
    // 403 Forbidden: authenticated but the role does not allow this action
    return NextResponse.json(
      { error: "Forbidden: only attendees can view their bookings" },
      { status: 403 }
    );
  }

  // Fetch only the bookings that belong to this attendee.
  // Ordered newest first so the most recent bookings appear at the top.
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      // Embed the full event so clients get title, date, and category in one response
      event: {
        include: {
          // Include organiser contact info in case the attendee needs to reach them
          organiser: { select: { id: true, name: true, email: true } },
          // Include category so the client can display or filter by event type
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ bookings });
}
