// Authentication helpers
// Centralises all JWT logic so route handlers stay focused on business rules.
// Responsible for: creating tokens, verifying tokens, extracting tokens from
// request headers, and resolving the currently authenticated user from the DB.

import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

// Fail fast at startup if the secret is missing rather than producing silent errors at runtime
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

// Signs a new JWT containing the minimum user identity needed for authorisation.
// The token is valid for 7 days; after that the client must log in again.
export function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Decodes and verifies a JWT. Throws if the token is expired or tampered with.
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Reads the Bearer token from the Authorization header.
// Returns null rather than throwing so callers can handle missing tokens gracefully.
export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  // Strip the "Bearer " prefix to get the raw token string
  return authHeader.split(" ")[1];
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
