// POST /api/auth/register
// Creates a new user account with a hashed password.
// Accessible by anyone (no authentication required).
// Validates all required fields, enforces a whitelist of allowed roles,
// and prevents duplicate accounts by checking email uniqueness before insert.

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma.js";

// Only these two roles are permitted in the system
const VALID_ROLES = ["ORGANISER", "ATTENDEE"];

export async function POST(request) {
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
  const { name, email, password, role } = body;

  // All four fields are mandatory for a complete user record
  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "All fields are required: name, email, password, role" },
      { status: 400 }
    );
  }

  // Reject any role value that is not explicitly supported
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Role must be either ORGANISER or ATTENDEE" },
      { status: 400 }
    );
  }

  // Email must be unique — check before attempting an insert to give a clear error
  // instead of relying on a database constraint violation
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // 409 Conflict is appropriate because the resource (email) already exists
    return NextResponse.json(
      { error: "Email is already in use" },
      { status: 409 }
    );
  }

  // Hash the password before persisting — plain-text passwords must never be stored
  // Salt rounds of 10 balances security and performance for a course project
  const passwordHash = await bcrypt.hash(password, 10);

  // Create the user and return only safe fields — passwordHash is excluded from the response
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // 201 Created signals that a new resource was successfully created
  return NextResponse.json(
    { message: "User registered successfully", user },
    { status: 201 }
  );
}
