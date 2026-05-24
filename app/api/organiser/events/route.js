// GET /api/organiser/events
// Returns all events created by the authenticated organiser, with booking counts.
// Restricted to users with the ORGANISER role.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized: please log in" }, { status: 401 });
  }
  if (user.role !== "ORGANISER") {
    return NextResponse.json({ error: "Forbidden: only organisers can access this" }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    // Scope the query to only the events owned by the authenticated organiser
    where: { organiserId: user.id },
    include: {
      category: { select: { id: true, name: true } },
      // `_count.bookings` lets the client show "X booked / Y remaining" without a separate query
      _count: { select: { bookings: true } },
    },
    orderBy: { date: "asc" }, // Chronological order so upcoming events appear first
  });

  return NextResponse.json({ events });
}
