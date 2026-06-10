# CampusCarry

A peer-to-peer campus delivery platform built for VIT Vellore. Students place delivery orders from campus pickup points (canteens, food courts, gates) to their hostel blocks. Other students earn by accepting and completing deliveries.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [User Flows](#user-flows)
7. [API Reference](#api-reference)
8. [WebSocket Events](#websocket-events)
9. [Frontend Routes](#frontend-routes)
10. [Pricing Logic](#pricing-logic)
11. [Admin Panel](#admin-panel)
12. [Security](#security)
13. [Data Seeding](#data-seeding)

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3 |
| Security | Spring Security + JWT (Bearer token) |
| Database | PostgreSQL |
| ORM | Spring Data JPA / Hibernate |
| Real-time | Spring WebSocket (STOMP) |
| Email | Spring Mail (SMTP) |
| Build | Maven |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | React 18 (Vite) |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Real-time | STOMP over SockJS |
| Notifications | react-hot-toast |

---

## Features

### Student Features
- **3-step OTP signup** — email OTP verification before account creation
- **Login & forgot password** — OTP-based password reset with 2-minute cooldown
- **Live order feed** — real-time WebSocket feed of open delivery orders, filterable by pickup location
- **Order creation** — select pickup location, hostel block, size, and optional description; live fee estimate shown before placing
- **Accept deliveries** — any student can accept a pending order; first to tap wins; OTP emailed to requester on acceptance
- **Notify arrival** — deliverer taps "I'm Here" on reaching the hostel block; both phone numbers revealed
- **OTP confirmation** — delivery confirmed by entering the OTP the requester received by email
- **Order history** — separate tabs for orders placed and deliveries done, with infinite scroll
- **Order detail** — full order info including route, parties, timeline, payment status, and rating
- **Star rating** — requester rates the deliverer (1–5 stars) after delivery; can be done inline or from history; skipping the prompt does not prevent later rating
- **Profile management** — update name, phone, hostel block, UPI ID; change password
- **Retry orders** — expired or unpaid orders can be one-tap retried without refilling the form

### Admin Features
- **Dashboard** — platform statistics (users, orders, revenue) filtered by date range
- **User management** — search/filter all users by name, email, status, gender, year; suspend or ban accounts
- **Order management** — search/filter all orders; view full order detail with parties and timeline
- **Failed payments** — dedicated view for orders where payout to deliverer failed; retry logic handled by scheduler
- **Locations** — add new pickup locations; toggle any location active or inactive
- **Pricing matrix** — live-editable 12-cluster × 6-location base price grid; changes apply to new orders only

---

## Project Structure

```
campuscarry/                          ← Spring Boot backend
  src/main/java/com/campuscarry/
    auth/                             ← JWT + Spring Security config
    config/                           ← DataSeeder, WebSocket config, CORS
    controller/                       ← REST controllers
    dto/request/                      ← Incoming request DTOs
    dto/response/                     ← Outgoing response DTOs
    entity/                           ← JPA entities
    entity/enums/                     ← Enums (OrderStatus, OrderSize, etc.)
    exception/                        ← Custom exceptions + global handler
    payment/                          ← Payment service (mocked Razorpay)
    repository/                       ← Spring Data JPA repositories
    scheduler/                        ← Scheduled jobs (expiry, payment retry)
    service/                          ← Business logic

campuscarry-frontend/                 ← React frontend
  src/
    api/                              ← Axios API modules (auth, orders, admin…)
    components/shared/                ← Reusable UI components
    pages/
      auth/                           ← Login, Signup, ForgotPassword, Reset
      student/                        ← Feed, CreateOrder, MyOrders, OrderDetail, Profile
      admin/                          ← Dashboard, Users, Orders, Locations, Pricing, Payments
    types/index.ts                    ← Shared TypeScript interfaces
    App.tsx                           ← Router + protected route wrappers
```

---

## Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- PostgreSQL 15+
- Maven 3.9+

### Backend Setup

```bash
# 1. Create a PostgreSQL database
createdb campuscarry

# 2. Copy and fill in environment variables
cp campuscarry/src/main/resources/application.properties.example \
   campuscarry/src/main/resources/application.properties

# 3. Run the application
cd campuscarry
mvn spring-boot:run
```

The backend starts on **http://localhost:8080**.  
All API routes are prefixed with `/api/v1`.

On first startup, `DataSeeder` automatically populates:
- 6 pickup locations
- 72 base prices (12 hostel clusters × 6 locations)
- 1 admin user (`admin@campuscarry.com` / `Admin@1234`)

### Frontend Setup

```bash
cd campuscarry-frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**.

---

## Environment Variables

### Backend (`application.properties`)

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/campuscarry
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD

# JWT
app.jwt.secret=YOUR_JWT_SECRET_KEY
app.jwt.expiration-ms=86400000

# Email (SMTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_EMAIL
spring.mail.password=YOUR_APP_PASSWORD
```

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=http://localhost:8080/ws
```

---

## User Flows

### Signup Flow (3 steps)

```
1. /signup
   POST /auth/signup/initiate  { email }
   → OTP sent to email (valid 10 minutes, 2-minute cooldown between resends)

2. /signup/verify-otp
   POST /auth/signup/verify-otp  { email, otp }
   → OTP verified, session proceeds

3. /signup/complete
   POST /auth/signup/complete  { email, password, fullName, phone, gender, year, hostelBlock }
   → Account created, redirect to login
```

### Forgot Password Flow

```
1. /forgot-password
   POST /auth/forgot-password  { email }
   → OTP sent to registered email (2-minute cooldown)

2. /reset-password
   POST /auth/reset-password  { email, otp, newPassword, confirmNewPassword }
   → Password updated, redirect to login
```

### Order Placement Flow

```
1. Student opens Create Order page
   GET /locations                 → populate pickup location dropdown
   GET /orders/estimate?...       → live fee preview as student fills form

2. Student submits order
   POST /orders  { pickupLocationId, dropHostelBlock, size, description? }
   → Order saved as PENDING
   → WebSocket broadcast: new order appears on all connected students' feed instantly
   → Order expires in 10 minutes if not accepted
```

### Delivery Flow

```
1. Deliverer sees PENDING order on live feed
   POST /orders/{id}/accept
   → Order moves to ACCEPTED
   → OTP (6-digit) generated, hashed, stored
   → OTP emailed to requester
   → Payment collected from requester (held in escrow)
   → WebSocket broadcast: order removed from all feeds
   → Deliverer's active slot count updated

2. Deliverer reaches hostel block
   POST /orders/{id}/notify
   → WebSocket event sent to requester's browser: "Deliverer has arrived"
   → Both phone numbers now visible to both parties

3. Requester shares OTP with deliverer at handoff
   POST /orders/{id}/deliver  { otp }
   → OTP validated (bcrypt match + expiry check)
   → Order moves to DELIVERED
   → Payout triggered to deliverer
   → Deliverer's total deliveries count incremented
   → Active slot count decremented

4. Requester rates the delivery (optional)
   POST /orders/{id}/rate  { stars }          ← from feed modal or order history
   POST /orders/{id}/skip-rate                ← dismisses prompt, can still rate later
   → Deliverer's average rating recalculated and stored on User
```

### Payment States

| State | Meaning |
|---|---|
| `PENDING` | Order placed, no payment yet |
| `HELD` | Payment collected from requester, held until delivery |
| `RELEASED` | Delivery confirmed, payout sent to deliverer |
| `FAILED` | Payout to deliverer failed; retried automatically by scheduler |

---

## API Reference

All endpoints are prefixed with `/api/v1`.  
Authenticated endpoints require `Authorization: Bearer <token>` header.

### Auth — Public, no token required

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/signup/initiate` | `{ email }` | Send OTP to email for signup |
| POST | `/auth/signup/verify-otp` | `{ email, otp }` | Verify signup OTP |
| POST | `/auth/signup/complete` | `{ email, password, fullName, phone, gender, year, hostelBlock }` | Complete account creation |
| POST | `/auth/login` | `{ email, password }` | Login, returns JWT tokens |
| POST | `/auth/forgot-password` | `{ email }` | Send password reset OTP |
| POST | `/auth/reset-password` | `{ email, otp, newPassword, confirmNewPassword }` | Reset password with OTP |

### Profile — Requires STUDENT token

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | `/me` | — | Get own profile |
| PATCH | `/me` | `{ fullName?, phone?, hostelBlock?, upiId? }` | Partial profile update |
| PATCH | `/me/password` | `{ currentPassword, newPassword, confirmNewPassword }` | Change password |

### Orders — Requires STUDENT token

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| POST | `/orders` | `{ pickupLocationId, dropHostelBlock, size, description? }` | Place new order |
| GET | `/orders/feed` | `?pickupLocationId&page&size` | Paginated feed of PENDING orders |
| GET | `/orders/me` | `?role=requester\|deliverer&page&size` | Own order history |
| GET | `/orders/{id}` | — | Full order detail |
| POST | `/orders/{id}/accept` | — | Accept a pending order |
| POST | `/orders/{id}/notify` | — | Notify arrival at hostel block |
| POST | `/orders/{id}/deliver` | `{ otp }` | Confirm delivery with OTP |
| POST | `/orders/{id}/retry` | — | Re-place an expired or unpaid order |

### Ratings — Requires STUDENT token

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/orders/{id}/rate` | `{ stars, description? }` | Submit 1–5 star rating |
| POST | `/orders/{id}/skip-rate` | — | Dismiss rating prompt |
| GET | `/orders/{id}/rating` | — | Fetch submitted rating for order |

### Locations — Requires STUDENT token

| Method | Endpoint | Description |
|---|---|---|
| GET | `/locations` | All active pickup locations |
| GET | `/orders/estimate` | `?pickupLocationId&dropHostelBlock&size` — fee preview |

### Admin — Requires ADMIN token

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | `?from&to` — platform statistics for date range |
| GET | `/admin/users` | `?search&status&gender&year&page&size&sortBy` — search/filter users |
| PATCH | `/admin/users/{id}/status` | `{ status }` — set ACTIVE / SUSPENDED / BANNED |
| GET | `/admin/orders` | `?search&status&page&size` — all orders with filters |
| GET | `/admin/orders/{id}` | Full order detail |
| GET | `/admin/payments/failed` | Orders with FAILED payment status |
| GET | `/admin/locations` | All locations (active + inactive) |
| POST | `/admin/locations` | `{ name, code }` — add new location |
| PATCH | `/admin/locations/{id}/toggle` | Toggle location active/inactive |
| GET | `/admin/pricing` | Full 12 × 6 pricing matrix |
| PATCH | `/admin/pricing/{id}` | `{ basePrice }` — update base price for a cell |

---

## WebSocket Events

Connect to: `ws://localhost:8080/ws` (SockJS + STOMP)

| Topic | Direction | Payload | Trigger |
|---|---|---|---|
| `/topic/orders/new` | Server → All students | `OrderFeedItem` | New PENDING order placed |
| `/topic/orders/removed` | Server → All students | `{ id: UUID }` | Order accepted, expired, or unpaid |
| `/topic/orders/{id}/arrived` | Server → Requester | `{ orderId }` | Deliverer pressed "I'm Here" |

---

## Frontend Routes

### Public (no auth required)
| Route | Page |
|---|---|
| `/login` | Login |
| `/signup` | Signup — enter email |
| `/signup/verify-otp` | Signup — verify OTP |
| `/signup/complete` | Signup — fill profile |
| `/forgot-password` | Forgot password — request OTP |
| `/reset-password` | Forgot password — set new password |

### Student (STUDENT role required)
| Route | Page |
|---|---|
| `/` | Live Feed — browse and accept orders |
| `/orders/new` | Create Order |
| `/orders/me` | My Orders — requests and deliveries history |
| `/orders/:id` | Order Detail — full info, timeline, rating |
| `/profile` | Profile — view and edit, change password |

### Admin (ADMIN role required)
| Route | Page |
|---|---|
| `/admin` | Dashboard — stats and charts |
| `/admin/users` | User Management |
| `/admin/orders` | Order Management |
| `/admin/orders/:id` | Order Detail |
| `/admin/locations` | Location Management |
| `/admin/pricing` | Pricing Matrix |
| `/admin/payments/failed` | Failed Payouts |

---

## Pricing Logic

Delivery fee = **Base Price** (from pricing matrix) + **Size Surcharge**

| Size | Surcharge |
|---|---|
| Small | + ₹0 |
| Medium | + ₹7 |
| Large | + ₹15 |

The **base price** depends on the combination of:
- **Pickup location** (6 locations: Main Gate, OFW, Darling, KC/FC, SJT, Enzo)
- **Hostel cluster** (12 clusters: C1–C12, covering MH blocks A–T and LH blocks A–F)

Example: SJT → C6 (M MH) base price is ₹15. A Large order = ₹15 + ₹15 = ₹30.

The admin can edit any cell in the pricing matrix from the Admin Panel. Changes apply to new orders only — existing orders store a fee snapshot at creation time.

### Hostel Cluster Mapping

| Cluster | Blocks |
|---|---|
| C1 | A, B, C MH |
| C2 | D, E MH |
| C3 | F, G MH |
| C4 | H, J MH |
| C5 | K, L MH |
| C6 | M MH |
| C7 | N, P, Q, R MH |
| C8 | S, T MH |
| C9 | G, J, H LH |
| C10 | A, B LH |
| C11 | C, D LH |
| C12 | E, F LH |

---

## Admin Panel

### Dashboard
Shows platform-wide stats filtered by date range:
- Total and active users, suspended/banned counts
- Total orders broken down by status (Pending, Accepted, Delivered, Expired)
- Total revenue and failed payment count

### User Management
- Search by name or email
- Filter by status (Active / Suspended / Banned), gender, year
- Sort by join date, total deliveries, or rating
- Update any user's status directly from the table

### Order Management
- Search by order number or user name
- Filter by status
- Click any order to view the full detail page (route, parties, timeline, payment)

### Failed Payments
- Lists all orders where payout to the deliverer has a `FAILED` payment status
- The backend scheduler retries payouts automatically up to 3 times

### Locations
- View all pickup locations with active/inactive status
- Add a new location (name + internal code)
- Toggle any location on or off — inactive locations are hidden from students when placing orders

### Pricing Matrix
- Full grid of all 72 base prices (12 clusters × 6 locations)
- Click the pencil icon on any row to edit that location's base price
- Preview shows Medium (+₹7) and Large (+₹15) calculated prices as you type

---

## Security

- **JWT authentication** — access tokens sent as `Authorization: Bearer <token>` on every request
- **Role-based access control** — `STUDENT` and `ADMIN` roles enforced at the controller level via `@PreAuthorize`
- **OTP hashing** — delivery OTPs are bcrypt-hashed before storage; never stored in plaintext
- **Password hashing** — all passwords stored as bcrypt hashes
- **Phone number privacy** — requester and deliverer phone numbers are only included in API responses after an order is ACCEPTED; PENDING feed items never expose contact details
- **Rate limiting** — OTP endpoints enforce a 2-minute cooldown between sends to prevent abuse
- **One OTP per order** — delivery OTP can only be verified once; second attempt returns an error
- **Capacity enforcement** — deliverers are limited on concurrent active orders by size; attempting to accept beyond capacity returns a 400 error
- **Self-delivery prevention** — a student cannot accept their own order

---

## Data Seeding

`DataSeeder` runs automatically on every application startup and is safe to re-run — each seed block is guarded by an existence check so no duplicates are created.

**Seeded data:**

1. **6 Pickup Locations**
   - Main Gate / 1-A Gate
   - One Food World (OFW)
   - Darling Food Court / All Mart Gate
   - KC/FC
   - SJT
   - Enzo / JustBake

2. **Pricing Matrix** — 72 rows covering all cluster × location combinations

3. **Admin User**
   - Email: `admin@campuscarry.com`
   - Password: `Admin@1234`
   - *(Change this in production)*

After initial seeding, admin can update prices via the Admin Pricing page. Restarting the backend will not overwrite prices that have already been edited, because the seeder only inserts rows that don't exist yet.
