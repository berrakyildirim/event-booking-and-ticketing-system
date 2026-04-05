# Event Booking & Ticketing System — Backend (Part 1)

A RESTful backend API for an event booking and ticketing platform, built as part of the SNG346 Web Application Development course (by Berrak Yıldırım, 2690964). The system allows organisers to create and manage events, and attendees to discover and book them — with role-based access control enforced on every protected route.

---

## ER Diagram & Dependencies

<img width="1240" height="430" alt="Blank diagram" src="https://github.com/user-attachments/assets/58e99743-9104-4ea1-93d7-e00403f9685b" />

---

![WhatsApp Image 2026-04-05 at 16 49 14](https://github.com/user-attachments/assets/a5de1a77-c077-4eaa-9e3f-3f6f11dba85f)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js (App Router) | API route handlers |
| Prisma ORM | Database access and schema management |
| SQLite | Local development database |
| JSON Web Tokens (JWT) | Stateless authentication |
| bcrypt | Secure password hashing |

---

## Features

### Authentication
- Users can sign up with passwords that are hashed
- Log in with the issuance of a JWT token
- Protected the `/me` endpoint to get the current user

### Role-Based Access Control
- Two roles: `ORGANISER` and `ATTENDEE`
- Organisers can create, update, and delete their own events
- Attendees can browse events and make bookings
- Each protected route makes a clear distinction between "401 Unauthorised" and "403 Forbidden."

### Event Management
- Full CRUD for events (organisers only)
- There is a category for each event
- Information about events includes the title, description, date, capacity, and organiser

### Booking System
- Attendees can book available events
- Both the application and the database stop duplicate bookings from happening
- Overbooking is prevented by checking current booking count against event capacity

### Organiser Dashboard
- Returns tickets sold and remaining capacity for an event
- Includes full attendee list for the event

### Advanced Event Search & Filtering *(Bonus)*
- Filter by title keyword (case-insensitive)
- Filter by category ID
- Filter by date range (`dateFrom` / `dateTo`)
- Invalid date values are silently ignored — the request never crashes

### Pagination *(Bonus)*
- `page` and `limit` query parameters on `GET /api/events`
- Response includes `total`, `totalPages`, `page`, and `limit`
- Defaults to page 1, limit 10 when parameters are missing or invalid

---

## Project Structure

```
├── app/
│   └── api/
│       ├── auth/
│       │   ├── register/route.js
│       │   ├── login/route.js
│       │   └── me/route.js
│       ├── events/
│       │   ├── route.js                  # GET (list/filter) + POST (create)
│       │   └── [id]/
│       │       ├── route.js              # GET, PUT, DELETE by ID
│       │       └── book/route.js         # POST booking
│       ├── my-bookings/route.js          # Attendee's booking history
│       └── organiser/
│           └── events/[id]/
│               └── dashboard/route.js    # Organiser event dashboard
├── lib/
│   ├── auth.js                           # JWT helpers and auth guards
│   └── prisma.js                         # Prisma client singleton
├── prisma/
│   ├── schema.prisma                     # Data models and relations
│   ├── migrations/                       # Auto-generated migration history
│   └── seed.js                           # Sample data script
├── .env                                  # Not included in repository
├── jsconfig.json                         # Path alias configuration (@/)
└── next.config.js
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/berrakyildirim/event-booking-and-ticketing-system
cd event-booking-and-ticketing-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
```

> Use a long, random string for `JWT_SECRET` in any real deployment.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Seed the database with sample data

```bash
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Path to the SQLite database file |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens |

> `.env` is intentionally excluded from this repository to protect sensitive credentials. You must create it manually following the example above.

---

## API Overview

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive a JWT |
| GET | `/api/auth/me` | Authenticated | Get current user profile |

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Public | List events (supports filters + pagination) |
| POST | `/api/events` | Organiser | Create a new event |
| GET | `/api/events/:id` | Public | Get a single event |
| PUT | `/api/events/:id` | Organiser (owner) | Update an event |
| DELETE | `/api/events/:id` | Organiser (owner) | Delete an event |

**Supported query parameters for `GET /api/events`:**

```
?search=music
?category=CATEGORY_ID
?dateFrom=2026-01-01
?dateTo=2026-12-31
?page=1&limit=10
```

### Bookings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/events/:id/book` | Attendee | Book an event |
| GET | `/api/my-bookings` | Attendee | View personal booking history |

### Organiser Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/organiser/events/:id/dashboard` | Organiser (owner) | View ticket stats and attendee list |

---

## Test Accounts (from seed)

All seeded accounts use the password: **`123456`**

| Name | Email | Role |
|---|---|---|
| Alice Organiser | alice@example.com | ORGANISER |
| Bob Organiser | bob@example.com | ORGANISER |
| Charlie Attendee | charlie@example.com | ATTENDEE |
| Diana Attendee | diana@example.com | ATTENDEE |
| Eve Attendee | eve@example.com | ATTENDEE |

---

## Architecture & Design Notes

### Authentication Flow
1. User registers — password is hashed with bcrypt (salt rounds: 10) before storage
2. User logs in — bcrypt compares the submitted password against the stored hash
3. On success, a signed JWT is returned containing `userId`, `email`, and `role`
4. Protected routes extract the Bearer token from the `Authorization` header, verify it, then look up the user in the database — the DB lookup ensures deleted or modified accounts are handled correctly rather than blindly trusting the token payload

### Data Modelling Decisions
- `User` holds a `role` enum (`ORGANISER` / `ATTENDEE`) to enforce access at the application layer
- `Booking` has a compound unique constraint on `[userId, eventId]` to prevent duplicate bookings at the database level, backed by an explicit application-level check for a clear error response
- `Event` belongs to a `Category` (many-to-one) to support filtering
- The `Booking → Event` relation uses `onDelete: Cascade` so deleting an event automatically removes all related bookings

### Security Measures
- Passwords are never stored or returned in plain text
- JWT secret is loaded from environment variables — the server refuses to start if it is missing
- Login returns the same error message for both "email not found" and "wrong password" to prevent email enumeration
- Organiser endpoints verify both role and record ownership — one organiser cannot modify or view another organiser's data
- `passwordHash` is excluded from every API response using Prisma `select`

### Async Logic
- All database operations use `async/await` throughout
- The event list endpoint runs `prisma.event.count()` and `prisma.event.findMany()` in parallel using `Promise.all` to reduce response time
- `request.json()` is wrapped in `try/catch` on all POST and PUT routes to handle malformed JSON gracefully

### Pagination Implementation
- `page` and `limit` are parsed with `parseInt` and validated — non-numeric, negative, or missing values fall back to safe defaults (page 1, limit 10)
- `skip` is calculated as `(page - 1) * limit` and passed to Prisma's `skip` / `take` options
- The total record count is fetched alongside the data so `totalPages` can be returned in every response

---

## Notes

- `node_modules/` is excluded from the repository — run `npm install` to restore dependencies
- `.env` is excluded — it contains credentials that must not be committed to version control
- Prisma migrations are tracked in `prisma/migrations/` and should be committed — they represent the full history of schema changes
- The seed script can be re-run at any time to reset the database to a clean state

Berrak Yıldırım
2690964
