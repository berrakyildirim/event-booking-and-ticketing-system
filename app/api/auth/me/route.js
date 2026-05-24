// GET /api/auth/me
// Returns the currently authenticated user's profile.
// Requires a valid Bearer token in the Authorization header.
// Useful for clients that need to restore session state on page load.

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth.js";

export async function GET(request) {
  // Resolve the user from the JWT — returns null if the token is missing, expired, or invalid
  const user = await getAuthUser(request);

  if (!user) {
    // 401 Unauthorized: the request lacks valid authentication credentials
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid token" },
      { status: 401 }
    );
  }

  // Return the user's safe profile fields (passwordHash is never included by getAuthUser)
  return NextResponse.json({ user });
}
