# Assumptions & Architectural Decisions

This document outlines the core business assumptions, system boundaries, and architectural trade-offs made while designing and implementing the School Admission System.

---

## 1. Concurrency, Seat Allocation & Locking Model

* **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`):**
  Under high-demand admission scenarios (e.g. popular classes filling up within seconds), multiple guardians attempt to claim the last remaining seats simultaneously.
  * *Decision:* We opted for database-level pessimistic locking (`SELECT ... FOR UPDATE`) over optimistic locking (e.g., `xmin` or version columns). Optimistic locking would fail with concurrency conflict exceptions under heavy contention, forcing repeated retries and frustrating users. Pessimistic row locking on the target `classes` row serializes requests cleanly.
  * *Multi-Process Safety:* Because the lock resides in PostgreSQL rather than in-memory application memory (like C# `SemaphoreSlim` or `lock`), the seat guarantee holds across multiple distributed API processes (demonstrated in the `bonus` compose profile running two API instances against the same DB).
* **Computed Seat Availability (No Stored Counters):**
  * *Assumption:* Storing an `available_seats` counter column creates write amplification and drift risks during network failures or unexpected rollbacks.
  * *Implementation:* Seat availability is strictly derived on demand:
    $$\text{Available Seats} = \text{Total Seats} - \text{Active Holds} - \text{Confirmed Admissions}$$
    This guarantees that seat availability is always mathematically consistent with actual database records.
* **Database-Level Invariant Enforcement:**
  * In addition to application-level checks, a unique partial index was defined:
    ```sql
    CREATE UNIQUE INDEX uq_active_hold ON holds (class_id, student_id)
    WHERE status IN ('HELD', 'CONFIRMED');
    ```
    This guarantees that a student cannot hold duplicate active reservations or confirmed seats in the same class, even if simultaneous requests bypass application guards.

---

## 2. Hold Expiry & Lifecycle Management

* **Hybrid Expiry (Lazy + Active Sweep):**
  * *Lazy / On-Read & On-Write Evaluation:* Reads and write transactions evaluate `expires_at <= now()`. If a hold's deadline has passed, queries immediately treat it as expired. This means the system never oversells even if the background service is delayed or stopped.
  * *Active Background Sweeper (`HoldExpirySweeper.cs`):* A lightweight `BackgroundService` runs a batched status update every second to explicitly transition expired `HELD` rows to `EXPIRED`. This maintains index efficiency and clean statistics.
* **Hold Duration:**
  * Defaults to 600 seconds (10 minutes), configurable via the `HOLD_DURATION_SECONDS` environment variable.
  * Once a hold expires or is cancelled, the reserved seat is immediately released back to the general pool for other applicants.

---

## 3. Student Identity & Authentication

* **17-Digit Birth Registration Number (BRN / জন্ম নিবন্ধন নম্বর):**
  * In Bangladesh, admission to educational institutions requires the official 17-digit online birth registration number.
  * *Assumption:* Rather than enforcing a traditional username/password authentication wall (which introduces onboarding friction for guardians on mobile devices or shared community centers), the student's 17-digit BRN serves as the identity token passed via the `X-Student-Id` header.
  * Validation rules enforce strict 17-digit numeric constraints.
  * A student may hold seats across different classes, but cannot hold more than one seat in the same class.

---

## 4. Payment Gateway Simulation

* **Instant Confirmation:**
  * Real-world school portals integrate with MFS gateways (bKash, Nagad, Rocket) or local payment aggregators (SSLCommerz, Shurjopay).
  * For this system, the payment step is simulated: clicking "ভর্তি ফি দিন" (Pay Admission Fee) immediately triggers the confirmation transaction, transitioning the hold status from `HELD` to `CONFIRMED` and recording `confirmed_at`.
  * If a hold has already expired before the payment request reaches the server, the transaction is rejected with `HOLD_EXPIRED` (HTTP 409 Conflict).

---

## 5. User Interface & Localization

* **Primary Interface Language:**
  * Bengali (`bn`) is the default for all UI copy, error alerts, status labels, and dates, matching the domain of Bangladeshi school administration desks.
  * The brief specifies Bengali only. English is offered as a second language behind a switch in the masthead, because the same desk is sometimes staffed by someone who reads English more comfortably. Bengali wins every tie: no stored choice means Bengali, and the server error codes are translated rather than shown raw.
  * The selection is held in `localStorage` under `locale`. There is no locale in the URL, so a shared link always opens in Bengali.
  * Seat counts, IDs, clocks and dates stay in Latin digits in both languages. They are measurements in a monospace column, and localising them would break the tabular alignment.
* **Daylight Operational Desk Ergonomics:**
  * The UI is designed for daytime visibility on standard laptops used by school clerks, as well as mobile screens (390px+) used by parents.
  * Replaced dark dashboard templates with high-contrast neutral slate (`#f8fafc` / `#ffffff`) and institutional blue (`#1d4ed8`), adhering to high data-density and ledger readability.
* **Offline & Container Boundary:**
  * The frontend Docker container runs standalone behind nginx without external CDN font dependencies, using native cross-platform Bengali and Latin font stacks. Bengali copy takes a taller line box (`1.65`) than Latin (`1.5`), because stacked matras clip at the Latin leading.
