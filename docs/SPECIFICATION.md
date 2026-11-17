# Kalam online course platform: specification

| | |
|---|---|
| Project | Synent Technologies web development internship, Task 8 (Online Course Platform, Full Stack) |
| Author | Parfait Ahouanto |
| Version | 1.0.0 |
| Status | Delivered |

## 1. Context and objective

Task 8 asks for a full-stack platform where users enrol in and follow courses, and where admins
manage course content. The required stack is React, Node.js (Express), MongoDB, JWT authentication
and Razorpay in test mode.

This project answers the brief with **Kalam**, a fictional course platform for self-taught
developers, designers and makers in India. *Kalam* means "pen" in Hindi and Urdu. The product is
invented for this exercise: courses, prices and instructors are illustrative.

## 2. Audience and primary jobs

| Audience | Primary job |
|---|---|
| Learner | Find a course that fits, pay for it in a few clicks, then come back to it lesson after lesson and see how far they have got. |
| Admin | Publish and maintain courses (modules, lessons, videos), and keep an eye on users, enrolments and revenue. |

## 3. Functional requirements

The IDs map to the six sections of the brief.

### 3.1 Authentication (brief section 1)

| ID | Requirement | Where |
|---|---|---|
| A1 | A visitor registers with name, email and password. The password needs 10 to 72 characters with a letter and a digit. The answer is the same generic `202` whether or not the email already has an account; the work runs after the response so timing reveals nothing either. | `server/src/modules/auth`, `client/src/features/auth/RegisterPage.tsx` |
| A2 | Registration sends a verification email with a single-use link valid 24 hours. If the email already has an account, its owner receives an "account exists" email instead and nothing changes. | `auth.service.ts`, `mail/templates.ts` |
| A3 | The user verifies the email by opening the link, then signs in. A verified address is required to enrol. A new link can be requested from the banner shown to unverified users. | `VerifyEmailPage.tsx`, `POST /auth/verify-email`, `POST /auth/resend-verification` |
| A4 | Login returns a short-lived access JWT (15 min) and sets a refresh token cookie (7 days). The error message never reveals whether an email exists. | `POST /auth/login` |
| A5 | The client refreshes the access token silently. Each refresh rotates the refresh token. Reusing an old refresh token revokes the whole session family. | `POST /auth/refresh`, `client/src/lib/api.ts` |
| A6 | Logout revokes the refresh token server-side and clears the cookie. | `POST /auth/logout` |
| A7 | Forgot password sends a single-use reset link valid 30 minutes. The response is sent before any lookup, so its body and timing are identical whether the email exists or not. Resetting revokes every session. | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| A8 | Roles are `user` and `admin`. Every `/api/v1/admin/*` route requires an admin. The first admin is created by the seed script, never through registration. | `middlewares/authenticate.ts`, `middlewares/require-role.ts`, `scripts/seed.ts` |

### 3.2 User dashboard and catalogue (brief section 2)

| ID | Requirement | Where |
|---|---|---|
| C1 | Anyone can browse published courses. | `GET /courses`, `CatalogPage.tsx` |
| C2 | The catalogue supports a text search on the title, and filters by category, level and price (free or paid), with pagination. Filters live in the URL so a search can be shared. | `courses.service.ts`, `CatalogPage.tsx` |
| C3 | The course page shows title, summary, description, price, level, instructor, total duration and the list of modules and lessons. Lesson videos are hidden, except free previews. | `GET /courses/:slug`, `CourseDetailPage.tsx` |
| C4 | The dashboard lists the user's courses with their progress and a link to resume the next lesson. | `GET /me/enrollments`, `DashboardPage.tsx` |

### 3.3 Enrolment flow (brief section 3)

| ID | Requirement | Where |
|---|---|---|
| E1 | "Enroll now" on a paid course creates a payment order server-side. The amount is read from the database, never from the client. | `POST /courses/:id/checkout` |
| E2 | The client opens Razorpay Checkout (or the local test payment dialog). | `CheckoutPage.tsx`, `useRazorpayCheckout.ts` |
| E3 | The server verifies the Razorpay signature (HMAC-SHA256 of `order_id|payment_id`, constant-time comparison), then reads the payment from Razorpay and checks its order and amount. Only a `captured` payment enrols; an `authorized` one is captured first for the amount stored in the database. | `payments/razorpay.provider.ts`, `POST /payments/verify` |
| E4 | Enrolment is idempotent: a second checkout on an owned course is refused; the order moves from `created` to `paid` with one conditional update; a replay of the same callback returns the existing enrolment, a different payment id on a paid order is rejected; a unique index on `(user, course)` backs it all. | `enrollment.service.ts` |
| E5 | Free courses (price 0) enrol directly. | `POST /courses/:id/checkout` |
| E6 | After success the course appears in the dashboard. | `DashboardPage.tsx` |
| E7 | An optional Razorpay webhook (`payment.captured`) completes the same flow if the browser closes before verification. Its signature is checked against the raw body. | `POST /payments/webhooks/razorpay` |

### 3.4 Learning system (brief section 4)

| ID | Requirement | Where |
|---|---|---|
| L1 | Only enrolled users (and admins) can open the player. | `GET /learn/:courseId` |
| L2 | Courses are structured as modules, each holding ordered lessons. | `Course` model |
| L3 | MP4 lessons play in an HTML5 `<video>`. YouTube lessons play in a privacy-enhanced `youtube-nocookie.com` embed. | `LessonPlayer.tsx`, `lib/video.ts` |
| L4 | The learner marks a lesson complete (or not complete). | `PUT/DELETE /learn/:courseId/lessons/:lessonId/completion` |
| L5 | Progress is `completed lessons that still exist / total lessons`, rounded down to a whole percent, computed on read so it stays correct when an admin adds or removes lessons. | `learning/progress.ts` |

### 3.5 Admin panel (brief section 5)

| ID | Requirement | Where |
|---|---|---|
| M1 | Overview: number of users, enrolments, revenue and published courses, plus recent payments. | `GET /admin/stats`, `AdminOverviewPage.tsx` |
| M2 | Courses table with search and pagination; create, edit, delete (with confirmation), publish and unpublish. A course with enrolments cannot be deleted: it must be unpublished instead. | `/admin/courses`, `AdminCoursesPage.tsx` |
| M3 | Content editor: add, edit, delete and reorder modules and lessons (title, video URL, duration, free preview flag). | `/admin/courses/:id/modules…`, `AdminCourseEditorPage.tsx` |
| M4 | Users list with search and pagination, and the enrolments of each user. | `GET /admin/users`, `GET /admin/users/:id` |
| M5 | Enrolments and payments lists, filterable by course and payment status. | `GET /admin/enrollments`, `GET /admin/payments` |

### 3.6 Data and notifications (brief section 6)

| ID | Requirement | Where |
|---|---|---|
| D1 | Enrolments and payments are stored in MongoDB (`enrollments`, `payments`). | `models/` |
| D2 | An email is sent on registration (verification link) and on enrolment (course link). | `mail/` |
| D3 | In development, emails are written to `server/.mail-outbox/` as HTML files and their links are printed to the server log. The outbox transport is refused when `NODE_ENV=production`, and tokens are redacted from logged links outside development. In production emails go through SMTP. | `mail/outbox.mailer.ts`, `mail/index.ts` |

**Out of scope.** Refunds, coupons, certificates, instructor accounts, video hosting (lessons
point at public video URLs) and multi-currency (INR only).

## 4. Architecture

```
client (Vite + React)                          server (Express + TypeScript)
┌────────────────────────┐   /api/v1 (JSON)   ┌──────────────────────────────────────┐
│ pages → hooks (Query)  │ ─────────────────▶ │ routes → controllers → services      │
│ api.ts (fetch wrapper, │   access JWT in    │            → repositories → Mongoose │
│ token in memory)       │   Authorization,   │ middlewares: helmet, cors, rate      │
│                        │   refresh cookie   │   limit, authenticate, requireRole,  │
└────────────────────────┘                    │   validate (zod), error handler      │
          │ Razorpay Checkout                 │ PaymentProvider (strategy):          │
          ▼                                   │   RazorpayProvider | MockProvider    │
   checkout.razorpay.com                      │ Mailer: SMTP | outbox                │
                                              └──────────────┬───────────────────────┘
                                                             ▼
                                                  MongoDB `synent_courses`
```

- **Layers.** Routes declare paths and middlewares. Controllers translate HTTP to service calls.
  Services hold the business rules. Repositories are the only code that touches Mongoose models.
- **Validation.** Every body, query and param is parsed with zod before it reaches a controller.
- **Errors.** Services throw `AppError(status, code, message)`. One error middleware turns errors
  into `{ error: { code, message, details? } }` and never leaks stack traces in production.
- **Lists.** Every list endpoint is paginated: `?page=1&limit=12`, `limit` capped at 50. The
  response is `{ items, page, limit, total, totalPages }`.

## 5. Data model

All collections live in the `synent_courses` database. Timestamps (`createdAt`, `updatedAt`) are
on every collection.

### users

| Field | Type | Notes |
|---|---|---|
| `name` | string | 2 to 80 characters |
| `email` | string | lowercase, unique index |
| `passwordHash` | string | bcrypt, cost 12; never returned (`select: false`) |
| `role` | `user` \| `admin` | index |
| `emailVerifiedAt` | date \| null | |

### tokens

One collection for the three kinds of secret tokens. Only the SHA-256 hash of a token is stored.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → users | index |
| `type` | `refresh` \| `email_verification` \| `password_reset` | |
| `tokenHash` | string | unique index |
| `family` | string | refresh only: shared by a chain of rotated tokens |
| `expiresAt` | date | TTL index: MongoDB deletes expired tokens |
| `usedAt` | date \| null | set when a token is consumed or rotated |

### courses

| Field | Type | Notes |
|---|---|---|
| `title`, `slug` | string | `slug` unique index |
| `summary`, `description` | string | |
| `category` | enum (`development`, `design`, `data`, `business`, `marketing`, `photography`) | compound index with `isPublished` |
| `level` | `beginner` \| `intermediate` \| `advanced` | compound index with `isPublished` |
| `price` | integer, INR | 0 means free; index |
| `instructor` | string | |
| `isPublished` | boolean | |
| `modules[]` | embedded `{ _id, title, lessons[] }` | array order is display order |
| `modules[].lessons[]` | embedded `{ _id, title, videoUrl, durationMinutes, isFreePreview }` | |

Modules and lessons are embedded because they are always read with their course, they are small,
and reordering becomes one atomic update. Lesson `_id`s are stable and referenced by progress.

### enrollments

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → users | unique compound index `(user, course)` |
| `course` | ObjectId → courses | index |
| `payment` | ObjectId → payments \| null | null for free courses |
| `completedLessons` | ObjectId[] | lesson ids |
| `lastLesson` | ObjectId \| null | used by "Resume" |

### payments

| Field | Type | Notes |
|---|---|---|
| `user`, `course` | ObjectId | indexes |
| `provider` | `razorpay` \| `mock` | |
| `orderId` | string | unique index |
| `paymentId` | string \| null | unique sparse index |
| `amount` | integer, paise | copied from the course price at order time |
| `currency` | `INR` | |
| `status` | `created` \| `paid` \| `failed` | index |
| `paidAt` | date \| null | |

## 6. API

Base URL `/api/v1`. Interactive documentation (Swagger UI) at `/api/v1/docs`, raw document at
`/api/v1/docs.json`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness and database status |
| POST | `/auth/register` | public, rate limited | Create an account and send the verification email (generic `202`) |
| POST | `/auth/login` | public, rate limited | Access token + refresh cookie |
| POST | `/auth/refresh` | refresh cookie | Rotate refresh token, new access token |
| POST | `/auth/logout` | refresh cookie | Revoke the session |
| POST | `/auth/verify-email` | public | Consume a verification token |
| POST | `/auth/resend-verification` | user | Send a new verification email |
| POST | `/auth/forgot-password` | public, rate limited | Send a reset link (same response either way) |
| POST | `/auth/reset-password` | public, rate limited | Consume a reset token, set a new password |
| GET | `/me` | user | Current profile |
| GET | `/me/enrollments` | user | Dashboard: courses with progress (paginated) |
| GET | `/courses` | public | Catalogue: `search`, `category`, `level`, `price=free\|paid`, `page`, `limit` |
| GET | `/courses/meta` | public | Categories and levels for the filters |
| GET | `/courses/:slug` | public (optional auth) | Course detail, plus `isEnrolled` when signed in |
| POST | `/courses/:courseId/checkout` | verified user | Free: enrol. Paid: create a payment order |
| POST | `/payments/verify` | user | Verify signature, record payment, enrol |
| POST | `/payments/mock/:orderId/pay` | user, mock provider only | Simulate the Razorpay Checkout callback |
| POST | `/payments/webhooks/razorpay` | Razorpay signature | Optional webhook for `payment.captured` |
| GET | `/learn/:courseId` | enrolled user or admin | Full course with video URLs and progress |
| PUT | `/learn/:courseId/lessons/:lessonId/completion` | enrolled user | Mark complete |
| DELETE | `/learn/:courseId/lessons/:lessonId/completion` | enrolled user | Mark not complete |
| GET | `/admin/stats` | admin | Overview numbers and recent payments |
| GET, POST | `/admin/courses` | admin | List (search, status, pagination), create |
| GET, PATCH, DELETE | `/admin/courses/:id` | admin | Read, update, delete |
| PATCH | `/admin/courses/:id/publication` | admin | Publish or unpublish |
| POST | `/admin/courses/:id/modules` | admin | Add a module |
| PATCH, DELETE | `/admin/courses/:id/modules/:moduleId` | admin | Rename, delete a module |
| PUT | `/admin/courses/:id/modules/order` | admin | Reorder modules |
| POST | `/admin/courses/:id/modules/:moduleId/lessons` | admin | Add a lesson |
| PATCH, DELETE | `/admin/courses/:id/modules/:moduleId/lessons/:lessonId` | admin | Edit, delete a lesson |
| PUT | `/admin/courses/:id/modules/:moduleId/lessons/order` | admin | Reorder lessons |
| GET | `/admin/users` | admin | Users (search, pagination) |
| GET | `/admin/users/:id` | admin | One user and their enrolments |
| GET | `/admin/enrollments` | admin | Enrolments (filter by course) |
| GET | `/admin/payments` | admin | Payments (filter by course and status) |

## 7. Authentication and token lifecycle

```
register ─▶ 202 at once; then user (unverified) + email_verification token (24 h) ─▶ email with /verify-email?token=…
            (existing email: "account exists" email instead, no change)
login    ─▶ access JWT (15 min, in memory on the client)
            + refresh token (7 days, httpOnly cookie, path /api/v1/auth, SameSite=Lax, Secure in prod)
refresh  ─▶ old refresh token marked used, new one issued in the same family
            reuse of a used token ─▶ every token of the family revoked ─▶ 401
logout   ─▶ refresh token revoked, cookie cleared
forgot   ─▶ 202 at once; then, if the account exists, password_reset token (30 min) ─▶ email with /reset-password?token=…
reset    ─▶ new password, token consumed, every refresh token of the user revoked
```

- Tokens are 32 random bytes (`crypto.randomBytes`), sent in base64url, stored as SHA-256 hashes.
  A database leak does not expose usable tokens.
- The access JWT is signed with HS256 and carries `sub` and `role`. It is checked on each request;
  the role is re-read from the database for admin routes, so a demoted admin loses access at once.
- The client never stores the access token in `localStorage`. On page load it calls `/auth/refresh`
  to restore the session from the cookie. On a 401 it refreshes once and replays the request.
- Login runs bcrypt even when the email is unknown, so response time does not reveal accounts.
  Registration and forgot-password answer before doing any account-dependent work
  (`lib/background.ts`), with errors logged, never swallowed.
- The client keeps a non-secret `kalam:has-session` flag in `localStorage` only to skip the
  refresh call for anonymous visitors; it never stores a token.

## 8. Payment sequence

```
Client                         Server                           Razorpay
  │ POST /courses/:id/checkout   │                                  │
  │─────────────────────────────▶│ price from DB × 100 → paise      │
  │                              │ orders.create(amount, receipt) ─▶│
  │                              │◀──────────────── order_id ───────│
  │                              │ Payment{status: created}         │
  │◀── { orderId, amount, key } ─│                                  │
  │ Razorpay Checkout(order_id) ──────────────────────────────────▶│
  │◀──── razorpay_payment_id, razorpay_order_id, razorpay_signature │
  │ POST /payments/verify ──────▶│ HMAC-SHA256(order|payment, secret)
  │                              │ timingSafeEqual(signature)       │
  │                              │ payments.fetch(payment_id) ─────▶│
  │                              │ same order? same amount?         │
  │                              │ authorized → capture(amount) ───▶│
  │                              │ captured only                    │
  │                              │ created → paid (conditional)     │
  │                              │ Enrollment upsert                │
  │                              │ enrolment email                  │
  │◀──────── { enrollment } ─────│                                  │
```

- **Strategy.** `PaymentProvider` has two implementations. `RazorpayProvider` talks to Razorpay
  in test mode. `MockPaymentProvider` creates `mock_order_…` ids and signs the simulated callback
  with a local secret, so the same `/payments/verify` code path runs in both cases.
- **Selection.** `PAYMENT_PROVIDER=razorpay|mock`. The server refuses to start with `mock` when
  `NODE_ENV=production`, and refuses `razorpay` without keys.
- **Integrity.** The amount comes from the course document. Verification checks that the order
  belongs to the signed-in user, that the signature is valid (`PAYMENT_SIGNATURE_INVALID`), that
  the provider's payment belongs to the same order with the same amount (`PAYMENT_AMOUNT_MISMATCH`,
  order marked `failed`) and that it is captured (`PAYMENT_NOT_CAPTURED`).
- **Idempotency.** The `created → paid` transition is a conditional `findOneAndUpdate`, so only one
  request performs it. Replaying the same callback returns the existing enrolment; another payment
  id on a paid order is rejected (`PAYMENT_ALREADY_PROCESSED`). The enrolment is an upsert on the
  unique `(user, course)` index, so concurrent verifications cannot create two.

## 9. Security measures

| Threat | Measure |
|---|---|
| Password theft | bcrypt (cost 12), password policy, reset revokes all sessions |
| Token theft | Access token in memory only, refresh token httpOnly + SameSite + Secure, rotation with reuse detection, hashed storage |
| Account enumeration | Same login error for unknown emails with constant bcrypt work; registration and forgot-password answer a generic `202` before any lookup, the work runs after the response |
| Brute force | `express-rate-limit` on login, register, forgot and reset (per IP) |
| CSRF on cookie routes | The refresh cookie is scoped to `/api/v1/auth`, `SameSite=Lax`, and CORS only accepts the client origin with credentials |
| Privilege escalation | `role` cannot be set through any public route; admin routes check the role from the database |
| Payment fraud | Server-side amount, HMAC signature with constant-time comparison, ownership check, provider-side amount and capture check, atomic settlement, webhook signature on raw body, mock provider refused in production |
| Injection | zod validation on every input (only parsed primitives reach queries, never raw request objects), regex search input escaped, `strictQuery`, video URLs limited to http(s) on server and client |
| Information leak | Generic 500 messages in production, `passwordHash` never selected, lesson video URLs only for enrolled users or free previews |
| Headers | `helmet` defaults, `x-powered-by` disabled, JSON body limit 100 kB |
| Secrets | Environment variables only, validated at startup with zod (the outbox mailer and the mock payment provider are refused in production); `.env` is git-ignored; email tokens redacted from production logs |

## 10. Design

### 10.1 Direction

Kalam borrows from the school exercise book that every Indian learner has filled: a solid coloured
cover with a white name label. Each course gets a generated cover in the colour of its subject, with
the label carrying its title and level. That cover is the one memorable element. It replaces stock
photos, keeps the catalogue honest and lets a learner recognise a course at a glance in the
dashboard. Around it the interface stays quiet: cool paper background, deep ink text, a marigold
accent reserved for the primary action and progress.

The admin panel uses the same type and ink colour but drops the covers and the warmth: white
surfaces, dense tables, small type, a sidebar.

### 10.2 Tokens

| Token | Value | Role |
|---|---|---|
| `ink` | `#1B2560` | Text, primary buttons, admin accent |
| `paper` | `#F5F6FA` | Learner background |
| `marigold` | `#F4A20C` | Main call to action (ink text on it), progress fill, focus halo |
| `graphite` | `#4A5070` | Secondary text |
| `leaf` | `#1D6B45` | Completed lessons, success |
| `margin` | `#B4233A` | Errors, destructive actions |

Cover colours, one per category: development `#2D3A8C`, design `#E9B949`, data `#0E6466`,
business `#7A2E5E`, marketing `#9C3B22`, photography `#3D4A1F`.

Measured WCAG 2.1 contrast ratios (all pass AA for body text):

| Text | Background | Ratio |
|---|---|---|
| ink | white | 14.19:1 |
| ink | paper | 13.14:1 |
| graphite | paper | 7.28:1 |
| ink | marigold | 6.77:1 |
| leaf | white | 6.48:1 |
| margin | white | 6.48:1 |
| white | development cover | 10.02:1 |
| ink | design cover | 7.77:1 |
| white | data cover | 6.92:1 |
| white | business cover | 8.82:1 |
| white | marketing cover | 6.86:1 |
| white | photography cover | 9.56:1 |

### 10.3 Typography

| Family | Role |
|---|---|
| Familjen Grotesk (variable, self-hosted via Fontsource) | Headings, cover titles, numbers |
| Atkinson Hyperlegible Next (variable, self-hosted via Fontsource) | Body, forms, tables. Designed for legibility, which suits long study sessions |

Scale (rem): 0.8125, 0.875, 1, 1.25, 1.5625, 2, 2.75. Body line height 1.6, headings 1.15.
Line length is capped at about 70 characters on reading pages.

### 10.4 Accessibility and responsiveness

- Layouts work from 360 px. The catalogue grid goes from one to three columns; the player sidebar
  becomes a sheet on small screens; admin tables scroll horizontally inside their card.
- Every interactive element has a visible focus style (`:focus-visible`): a 2 px ink outline
  (13:1 on paper) with a marigold halo; on the dark footer the outline turns white.
- Motion is limited to state changes (dialogs, sheets, progress bar) and is disabled under
  `prefers-reduced-motion`.
- Forms use labels, `aria-invalid` and `aria-describedby` for errors; toasts are announced by sonner.
- Progress bars expose `role="progressbar"` with values.

## 11. Testing strategy

| Layer | Tool | What is covered |
|---|---|---|
| Server integration | Vitest + supertest on the real Express app, MongoDB database `synent_courses_test` | Auth flow (register → verify → login → refresh rotation → reuse detection → logout), generic registration and forgot-password answers, reset, RBAC (401/403 on every admin route, demoted admin, forged token), checkout (server amount, order reuse, free course, unverified email), payment verification (valid, invalid signature, tampered callback, tampered amount, authorized-not-captured, capture for the database amount, replay, second payment id, concurrent verification, foreign order), catalogue filters, video URL hiding, learning access and progress, admin content management |
| Server unit | Vitest | Progress computation, Razorpay signature, environment rules (outbox and mock refused in production), outbox token redaction |
| Client | Vitest + Testing Library + jsdom | Video URL parsing, price and duration formatting, token refresh and replay (single-flight), route guards, login form validation, progress bar accessibility |
| End to end | Puppeteer script run by hand against the dev servers | Full learner and admin journeys (see the README) |

The test database is dropped before each run. A guard refuses to drop any database whose name does
not end in `_test`.
