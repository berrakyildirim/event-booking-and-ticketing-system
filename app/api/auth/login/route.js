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

  // Set the token in an HttpOnly cookie so browser clients never touch it via JS.
  // The Authorization header path in getTokenFromRequest still works for API clients.
  const response = NextResponse.json({
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

  response.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
