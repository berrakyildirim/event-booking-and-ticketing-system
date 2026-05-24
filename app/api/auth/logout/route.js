// POST /api/auth/logout
// Clears the HttpOnly auth cookie, ending the user's browser session.
// No authentication required — an already-expired or missing cookie is harmless.

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
