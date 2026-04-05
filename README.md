# Event Booking & Ticketing System — Backend (Part 1)

A RESTful backend API for an event booking and ticketing platform, built as part of the SNG346 Web Application Development course (by Berrak Yıldırım, 2690964).

The system allows organisers to create and manage events, and attendees to discover and book them — with JWT-based authentication and role-based access control enforced on every protected route.

---

## ER Diagram & Dependencies

<img width="1240" height="430" alt="Blank diagram" src="https://github.com/user-attachments/assets/58e99743-9104-4ea1-93d7-e00403f9685b" />

---

![WhatsApp Image 2026-04-05 at 16 49 14](https://github.com/user-attachments/assets/a5de1a77-c077-4eaa-9e3f-3f6f11dba85f)

---

## Technologies Used

| Technology | Version | Purpose |
|---|---|---|
| Next.js (App Router) | 15 | API route handlers |
| Prisma ORM | **v6** | Database access and schema management |
| SQLite | — | Local development database |
| JSON Web Tokens (JWT) | — | Stateless authentication |
| bcrypt | — | Secure password hashing |
| Node.js | 18+ | Runtime environment |

---

## Features

### Authentication
- User registration with bcrypt-hashed passwords (salt rounds: 10)
- Login returns a signed JWT valid for 7 days
- Protected `/me` endpoint returns the current user's profile from the database

### Role-Based Access Control
- Two roles: `ORGANISER` and `ATTENDEE`
- Organisers can create, update, and delete only their own events
- Attendees can browse events and make bookings
- Every protected route distinguishes clearly between `401 Unauthorized` (not logged in) and `403 Forbidden` (wrong role or wrong ownership)

### Event Management
- Full CRUD for events (organisers only)
- Each event belongs to a category
- Event fields: title, description, date, capacity, organiser, category

### Booking System
- Attendees can book any available event
- Duplicate bookings are blocked at both the application level (explicit check) and the database level (unique constraint on `[userId, eventId]`)
- Overbooking is prevented by comparing the current booking count against the event's capacity before creating a new booking

### Organiser Dashboard
- Returns ticket sales summary: tickets sold and remaining capacity
- Returns the full attendee list for the event
- Restricted to the organiser who owns the event

### Advanced Event Search & Filtering *(Bonus)*
- Search by title keyword (case-insensitive)
- Filter by category ID
- Filter by date range using `dateFrom` and `dateTo`
- Invalid date values are silently ignored — the request never crashes

### Pagination *(Bonus)*
- Controlled via `page` and `limit` query parameters on `GET /api/events`
- Response includes `total`, `totalPages`, `page`, and `limit`
- Falls back to safe defaults (page 1, limit 10) when parameters are missing or invalid

---

## Database Design

The schema is managed with **Prisma v6** and uses SQLite for local development.

### Models & Relationships

| Model | Description |
|---|---|
| `User` | Stores all users. Holds a `role` field (`ORGANISER` or `ATTENDEE`), name, email, and bcrypt-hashed password. |
| `Category` | Lookup table for event categories (e.g. Technology, Music, Sports). |
| `Event` | Created by an organiser. Belongs to one `Category`. Has a capacity limit. |
| `Booking` | Join table between `User` and `Event`. Has a compound unique constraint on `[userId, eventId]` to prevent duplicate bookings. |

### Key Relationship Rules

- `User` → `Event`: one-to-many (one organiser can create many events)
- `Category` → `Event`: one-to-many (one category can have many events)
- `User` ↔ `Event` via `Booking`: many-to-many
- `Booking → Event`: `onDelete: Cascade` — deleting an event automatically removes all its bookings

---

## Project Structure

```
├── app/
│   └── api/
│       ├── auth/
│       │   ├── register/route.js       # POST - register new user
│       │   ├── login/route.js          # POST - login and get JWT
│       │   └── me/route.js             # GET  - current user profile
│       ├── events/
│       │   ├── route.js                # GET (list/filter/paginate) + POST (create)
│       │   └── [id]/
│       │       ├── route.js            # GET, PUT, DELETE by event ID
│       │       └── book/route.js       # POST - book an event
│       ├── my-bookings/route.js        # GET - attendee's booking history
│       └── organiser/
│           └── events/[id]/
│               └── dashboard/route.js  # GET - organiser event dashboard
├── lib/
│   ├── auth.js                         # JWT helpers and auth guard functions
│   └── prisma.js                       # Prisma client singleton
├── prisma/
│   ├── schema.prisma                   # Data models, relations, enums
│   ├── migrations/                     # Auto-generated migration history
│   └── seed.js                         # Sample data for development/testing
├── .env                                # Not included — must be created manually
├── jsconfig.json                       # Enables @/ path alias
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

Create a `.env` file in the project root with the following content:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
```

> Use a long, random string for `JWT_SECRET`. The server will refuse to start if this variable is missing.

### 4. Run database migrations

> Requires **Prisma v6**. Migrations will create the SQLite database and apply the full schema.

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

> `.env` is intentionally excluded from this repository. It must be created manually before running the project.

---

## API Documentation

All endpoints return JSON. Protected endpoints require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user account |
| POST | `/api/auth/login` | Public | Log in and receive a JWT token |
| GET | `/api/auth/me` | Authenticated | Get the current user's profile |

**Register request body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "123456",
  "role": "ORGANISER"
}
```

**Login request body:**
```json
{
  "email": "alice@example.com",
  "password": "123456"
}
```

---

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Public | List all events (supports filters + pagination) |
| POST | `/api/events` | Organiser | Create a new event |
| GET | `/api/events/:id` | Public | Get a single event by ID |
| PUT | `/api/events/:id` | Organiser (owner only) | Update an event |
| DELETE | `/api/events/:id` | Organiser (owner only) | Delete an event |

**Supported query parameters for `GET /api/events`:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter by title keyword (case-insensitive) |
| `category` | string | Filter by category ID |
| `dateFrom` | ISO date | Events on or after this date |
| `dateTo` | ISO date | Events on or before this date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

**Example:**
```
GET /api/events?search=music&dateFrom=2026-06-01&page=1&limit=5
```

**Create/Update event request body:**
```json
{
  "title": "Tech Summit 2026",
  "description": "A conference for developers.",
  "date": "2026-07-15T09:00:00.000Z",
  "capacity": 100,
  "categoryId": "CATEGORY_ID_HERE"
}
```

---

### Bookings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/events/:id/book` | Attendee | Book an event |
| GET | `/api/my-bookings` | Attendee | View personal booking history |

---

### Organiser Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/organiser/events/:id/dashboard` | Organiser (owner only) | View ticket stats and full attendee list |

**Example response:**
```json
{
  "event": { "id": "...", "title": "...", "capacity": 100, "..." : "..." },
  "ticketsSold": 37,
  "remainingCapacity": 63,
  "attendeeList": [
    { "id": "...", "name": "Charlie Attendee", "email": "charlie@example.com" }
  ]
}
```

---

## Seeded Test Accounts

Run `npx prisma db seed` to populate the database. All accounts use the password **`123456`**.

| Name | Email | Role |
|---|---|---|
| Alice Organiser | alice@example.com | ORGANISER |
| Bob Organiser | bob@example.com | ORGANISER |
| Charlie Attendee | charlie@example.com | ATTENDEE |
| Diana Attendee | diana@example.com | ATTENDEE |
| Eve Attendee | eve@example.com | ATTENDEE |

---

## How to Test (Step-by-Step Flow)

### Step 1 — Register or log in

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@example.com\",\"password\":\"123456\"}"
```

Copy the `token` value from the response.

---

### Step 2 — Get all events (public)

```bash
curl http://localhost:3000/api/events
```

Copy an `id` from the response to use in the next steps.

---

### Step 3 — Create an event (as organiser)

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"title\":\"Test Event\",\"description\":\"A test.\",\"date\":\"2026-09-01T10:00:00.000Z\",\"capacity\":50,\"categoryId\":\"CATEGORY_ID_HERE\"}"
```

---

### Step 4 — Book an event (as attendee)

Log in as `charlie@example.com`, then:

```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID_HERE/book \
  -H "Authorization: Bearer CHARLIE_TOKEN_HERE"
```

---

### Step 5 — View booking history

```bash
curl http://localhost:3000/api/my-bookings \
  -H "Authorization: Bearer CHARLIE_TOKEN_HERE"
```

---

### Step 6 — View organiser dashboard

Log in as `alice@example.com`, then:

```bash
curl http://localhost:3000/api/organiser/events/EVENT_ID_HERE/dashboard \
  -H "Authorization: Bearer ALICE_TOKEN_HERE"
```

---

### Step 7 — Test filtering and pagination

```bash
curl "http://localhost:3000/api/events?search=conference&page=1&limit=5"
curl "http://localhost:3000/api/events?dateFrom=2026-06-01&dateTo=2026-12-31"
```

---

## Architecture Overview

### API Layer — Next.js App Router
Each route file in `app/api/` exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`). There is no Express or custom server — Next.js handles routing natively. All handlers return `NextResponse.json()` with appropriate HTTP status codes.

### Data Access — Prisma ORM (v6)
Prisma acts as the query builder and schema manager. The `lib/prisma.js` file exports a singleton client to prevent multiple database connections during Next.js hot reloads. All queries use `async/await`.

### Authentication — JWT + bcrypt
- On registration, bcrypt hashes the password before it is stored. The hash is never returned in any response.
- On login, bcrypt compares the submitted password against the stored hash. A JWT is issued on success.
- On each protected request, `lib/auth.js` extracts the Bearer token, verifies its signature, and looks up the user in the database. The database lookup is intentional — it ensures that stale tokens for deleted accounts are rejected.

### Separation of Concerns
- `lib/auth.js` — all authentication logic (token creation, verification, user resolution, role guards)
- `lib/prisma.js` — database client lifecycle
- `app/api/**` — route handlers containing only request handling and response logic
- `prisma/schema.prisma` — single source of truth for the data model

### Async Logic & Performance
- All Prisma queries use `async/await`
- `GET /api/events` runs `count()` and `findMany()` in parallel with `Promise.all` to reduce response time
- `request.json()` is wrapped in `try/catch` on all write routes to handle malformed JSON without crashing

### Pagination
- `page` and `limit` are read from query params and validated with `parseInt`
- `skip = (page - 1) * limit` is passed to Prisma's `skip` / `take` options
- `totalPages = Math.ceil(total / limit)` is calculated and returned so clients can implement navigation without a second request

---

## Notes

- `node_modules/` is excluded — restore with `npm install`
- `.env` is excluded — contains credentials that must never be committed to version control
- `prisma/migrations/` is committed — it represents the full schema change history and is required to reconstruct the database
- The seed script can be re-run at any time to reset the database to a clean, predictable state

---

Berrak Yıldırım — 2690964
