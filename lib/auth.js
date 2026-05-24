// Authentication helpers
// Centralises all JWT logic so route handlers stay focused on business rules.
// Responsible for: creating tokens, verifying tokens, extracting tokens from
// request headers, and resolving the currently authenticated user from the DB.

import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

// Read the secret lazily so the module can be imported during `next build` without
// a JWT_SECRET in the environment. The error surfaces on the first real request
// instead of at build time, which is the correct behaviour for a Docker build.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing environment variable: JWT_SECRET");
  return secret;
}

// Signs a new JWT containing the minimum user identity needed for authorisation.
// The token is valid for 7 days; after that the client must log in again.
export function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getSecret(),
    { expiresIn: "7d" }
  );
}

// Decodes and verifies a JWT. Throws if the token is expired or tampered with.
export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

// Reads the token from either the Authorization header or the HttpOnly cookie.
// Header takes priority so that API clients (e.g. test.http) continue to work.
// Browser clients use the cookie set by the login/register routes.
export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return request.cookies.get("token")?.value ?? null;
}

// Resolves the authenticated user from the database using the token in the request.
// We look up the user in the DB (not just trust the token payload) so that
// deactivated or deleted accounts are correctly treated as unauthenticated.
export async function getAuthUser(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      // Only select safe fields — never expose passwordHash outside this module
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return user;
  } catch {
    // Token verification failed (expired, tampered, etc.) — treat as unauthenticated
    return null;
  }
}

// Returns the authenticated user, or null if the request carries no valid token.
// Route handlers use this to enforce the 401 Unauthorized response.
export async function requireAuth(request) {
  const user = await getAuthUser(request);
  return user ?? null;
}

// Returns the authenticated user only if their role matches the required role.
// Returns null for both unauthenticated requests and wrong-role requests.
// Routes that need to distinguish 401 vs 403 should call requireAuth first,
// then check user.role themselves.
export async function requireRole(request, role) {
  const user = await getAuthUser(request);
  if (!user || user.role !== role) return null;
  return user;
}
