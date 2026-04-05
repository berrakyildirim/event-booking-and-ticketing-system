// app/api/events/route.js
// Handles listing all events (GET) and creating a new event (POST).
//
// GET  /api/events  — public, supports optional filtering and pagination
// POST /api/events  — restricted to authenticated users with the ORGANISER role

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { requireAuth } from "@/lib/auth.js";

// Shared include config so both GET and POST return consistent event shapes.
// Organiser and category are included to avoid extra round-trips on the client side.
const eventInclude = {
  organiser: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Read optional filter params; null means the filter will be skipped
  const search   = searchParams.get("search")   || null;
  const category = searchParams.get("category") || null;
  const dateFrom = searchParams.get("dateFrom") || null;
  const dateTo   = searchParams.get("dateTo")   || null;

  // Build the Prisma where clause dynamically — only applied filters are included
  const where = {};

  if (search) {
    // SQLite's LIKE is case-insensitive for ASCII characters by default,
    // so contains works correctly without needing mode: "insensitive"
    where.title = { contains: search };
  }

  if (category) {
    // Filter events that belong to the specified category ID
    where.categoryId = category;
  }

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      // Skip invalid dates silently rather than crashing the request
      if (!isNaN(from)) where.date.gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to)) where.date.lte = to;
    }
    // If both date values were invalid, remove the empty filter object entirely
    if (Object.keys(where.date).length === 0) delete where.date;
  }

  // Parse pagination params and fall back to safe defaults for missing or invalid values
  const rawPage  = parseInt(searchParams.get("page"));
  const rawLimit = parseInt(searchParams.get("limit"));

  const page  = Number.isInteger(rawPage)  && rawPage  >= 1 ? rawPage  : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? rawLimit : 10;
  const skip  = (page - 1) * limit;

  // Run count and data fetch in parallel to avoid sequential DB round-trips
  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { date: "asc" }, // Soonest events first is most useful for attendees
      skip,
      take: limit,
    }),
  ]);

  // When there are no matching events, totalPages should be 0 not 1
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return NextResponse.json({ page, limit, total, totalPages, events });
}

export async function POST(request) {
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
      { error: "Forbidden: only organisers can create events" },
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

  // Capacity must be a whole number greater than zero — decimals and zero are not valid
  if (!Number.isInteger(capacity) || capacity < 1) {
    return NextResponse.json(
      { error: "Capacity must be a positive integer" },
      { status: 400 }
    );
  }

  // Confirm the referenced category exists before creating the event
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // The organiserId is taken from the authenticated user — clients cannot supply it directly
  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      date: new Date(date),
      capacity,
      organiserId: user.id,
      categoryId,
    },
    // Include relations so the response has the same shape as the GET list
    include: eventInclude,
  });

  return NextResponse.json({ message: "Event created successfully", event }, { status: 201 });
}
