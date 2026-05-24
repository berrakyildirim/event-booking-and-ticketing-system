// GET /api/categories
// Returns all categories ordered alphabetically.
// Public endpoint — used by the frontend for filter chips on the events listing page.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ categories });
}
