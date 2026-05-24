// prisma/seed.js
// Populates the database with realistic sample data for development and testing.
// Clears existing records first (in dependency order) to ensure a clean, predictable state.
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Delete in reverse dependency order to respect foreign key constraints:
  // bookings reference events and users, events reference categories and users
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // --- Categories ---

  const [techCategory, musicCategory, sportsCategory] = await Promise.all([
    prisma.category.create({ data: { name: "Technology" } }),
    prisma.category.create({ data: { name: "Music" } }),
    prisma.category.create({ data: { name: "Sports" } }),
  ]);

  // --- Users ---

  // Hash once and reuse for all seed users — avoids running bcrypt per user
  // Salt rounds of 10 match the production register route
  const passwordHash = await bcrypt.hash("123456", 10);

  const [organiser1, organiser2, attendee1, attendee2, attendee3] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: "Alice Organiser",
          email: "alice@example.com",
          passwordHash,
          role: "ORGANISER",
        },
      }),
      prisma.user.create({
        data: {
          name: "Bob Organiser",
          email: "bob@example.com",
          passwordHash,
          role: "ORGANISER",
        },
      }),
      prisma.user.create({
        data: {
          name: "Charlie Attendee",
          email: "charlie@example.com",
          passwordHash,
          role: "ATTENDEE",
        },
      }),
      prisma.user.create({
        data: {
          name: "Diana Attendee",
          email: "diana@example.com",
          passwordHash,
          role: "ATTENDEE",
        },
      }),
      prisma.user.create({
        data: {
          name: "Eve Attendee",
          email: "eve@example.com",
          passwordHash,
          role: "ATTENDEE",
        },
      }),
    ]);

  // --- Events ---
  // Future dates are used so booking-related tests work correctly (events have not passed)

  const [event1, event2, event3, event4] = await Promise.all([
    prisma.event.create({
      data: {
        title: "Next.js Conference 2026",
        description: "A full-day conference covering the latest in Next.js and React.",
        date: new Date("2026-06-15T09:00:00.000Z"),
        capacity: 100,
        organiserId: organiser1.id,
        categoryId: techCategory.id,
      },
    }),
    prisma.event.create({
      data: {
        title: "Open Source Summit",
        description: "Talks and workshops on open source tools and communities.",
        date: new Date("2026-07-20T10:00:00.000Z"),
        capacity: 50,
        organiserId: organiser1.id,
        categoryId: techCategory.id,
      },
    }),
    prisma.event.create({
      data: {
        title: "Summer Music Festival",
        description: "An outdoor music festival featuring local and international artists.",
        date: new Date("2026-08-05T14:00:00.000Z"),
        capacity: 200,
        organiserId: organiser2.id,
        categoryId: musicCategory.id,
      },
    }),
    prisma.event.create({
      data: {
        title: "City Half Marathon",
        description: "A 21km run through the heart of the city. All levels welcome.",
        date: new Date("2026-09-10T07:00:00.000Z"),
        capacity: 500,
        organiserId: organiser2.id,
        categoryId: sportsCategory.id,
      },
    }),
  ]);

  // --- Bookings ---
  // Each pair of (userId, eventId) is unique to satisfy the DB constraint.
  // No attendee books the same event twice, and no event exceeds its capacity.

  await Promise.all([
    // Charlie attends a tech conference and the music festival
    prisma.booking.create({ data: { userId: attendee1.id, eventId: event1.id } }),
    prisma.booking.create({ data: { userId: attendee1.id, eventId: event3.id } }),

    // Diana attends the tech conference and the marathon
    prisma.booking.create({ data: { userId: attendee2.id, eventId: event1.id } }),
    prisma.booking.create({ data: { userId: attendee2.id, eventId: event4.id } }),

    // Eve attends three different events across all categories
    prisma.booking.create({ data: { userId: attendee3.id, eventId: event2.id } }),
    prisma.booking.create({ data: { userId: attendee3.id, eventId: event3.id } }),
    prisma.booking.create({ data: { userId: attendee3.id, eventId: event4.id } }),
  ]);

  console.log("   Database seeded successfully.");
  console.log("   Categories : 3");
  console.log("   Users      : 2 organisers, 3 attendees");
  console.log("   Events     : 4");
  console.log("   Bookings   : 7");
  console.log("\n   All seeded users have password: 123456");
}

main()
  .catch((error) => {
    console.error("  Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect so the process exits cleanly even after an error
    await prisma.$disconnect();
  });
