// POST /api/auth/login
// Authenticates a user with email and password, and returns a signed JWT.
// Accessible by anyone (no prior authentication required).
// The JWT is used by subsequent protected requests via the Authorization header.

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma.js";
import { createToken } from "@/lib/auth.js";

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
  const { email, password } = body;

  // Both fields are required before any database lookup is attempted
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Look up the user by email — includes passwordHash which is needed for comparison
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return the same message as a wrong password to avoid revealing whether an email is registered
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Compare the submitted plain-text password against the stored bcrypt hash
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    // Same generic message as above — prevents attackers from enumerating valid emails
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Credentials are valid — issue a JWT the client can use for future authenticated requests
  const token = createToken(user);

  // Return the token alongside basic user info; passwordHash is intentionally excluded
  return NextResponse.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
