# AI Usage Statement & Development Notes

This project utilized modern AI developer tools (primarily DeepSeek and GitHub Copilot) as productivity accelerators for boilerplate generation and initial syntax scaffolding. However, all core architectural decisions, concurrency mechanics, database transaction invariants, and domain-specific UX designs were personally designed, engineered, and verified by me.

Below is an honest, detailed breakdown of where AI was leveraged and where manual engineering was essential.

---

## 1. Where AI Was Leveraged (Boilerplate & Scaffolding)

* **DTO & Entity Boilerplate:**
  * Generating standard request/response DTO records in `Contracts/` (`CreateClassRequest`, `ClassResponse`, `HoldResponse`, `HoldSummaryResponse`, `ConfirmHoldResponse`).
  * Basic EF Core entity property scaffolding before applying custom constraints.
* **Initial Test Fixtures:**
  * Generating repetitive mocking boilerplate in Vitest (`vi.fn()` setups for API client methods and the per-test `fetch` stubs in `App.test.tsx`).
  * Initial scaffolding of standard assertions in `App.test.tsx`.
* **Container & Config Scaffolding:**
  * Writing standard multi-stage build templates in `backend/Dockerfile` and `frontend/Dockerfile`.
  * Initial docker-compose network and volume wiring before environment tuning.
* **Initial Localization Dictionary:**
  * Translating standard error codes (`NO_SEATS`, `CLASS_NOT_FOUND`, `ALREADY_APPLIED`) into corresponding Bengali copy, and drafting the first English equivalents. The key set, the typed catalog pairing between `messages.bn.ts` and `messages.en.ts`, the `{placeholder}` interpolation, and the Bangla-first locale resolution were written and reviewed by hand.

---

## 2. Where Manual Engineering Was Critical (Architected by Me)

While AI is helpful for autocomplete and repetitive syntax, it consistently suggested generic or flawed patterns for the critical components of the system. The following core areas required deep, manual engineering:

### A. Concurrency Engine & Race-Condition Immunity
* **Pessimistic Row Locking vs. Optimistic Tokens:**
  * AI initially suggested using EF Core concurrency tokens (`[Timestamp]` / `xmin`), which breaks down under high seat contention by throwing repeated concurrency exceptions and requiring client-side retry storms.
  * I explicitly designed the pessimistic locking pattern with a raw row lock, taken before the seat count is read:
    ```csharp
    command.CommandText = "select total_seats from classes where id = @class_id for update";
    ```
    This serializes concurrent transactions for the same class directly inside PostgreSQL, guaranteeing strict first-come-first-served fairness across single or multiple API processes.
* **Dynamic Seat Counting (Zero Counter Drift):**
  * AI frequently attempts to introduce a mutable `AvailableSeats` integer column on the `classes` table with `available_seats = available_seats - 1`. This pattern is notoriously prone to drift during rollbacks or parallel network drops.
  * I architected the derived calculation model where seat availability is counted dynamically from active holds and confirmed seats on every read/write.
* **PostgreSQL Schema-Level Invariant:**
  * To guarantee safety even against application-level edge cases or bypasses, I added a PostgreSQL partial unique index:
    ```csharp
    b.HasIndex(h => new { h.ClassId, h.StudentId })
     .HasFilter("status in ('HELD', 'CONFIRMED')")
     .IsUnique();
    ```
    This ensures that a student cannot game the system by claiming multiple concurrent holds for the same class.

### B. Two-Phase Hold Expiry Architecture
* **Lazy Expiry on Query Execution:**
  * Background sweep workers alone cannot prevent race conditions if the worker runs every few seconds.
  * I implemented a lazy check at transaction start: before evaluating seat counts or inserting a new hold, stale holds for the requested class are marked expired in the same database transaction.
* **Background Worker Sweep:**
  * Authored `HoldExpirySweeper.cs` as a batched background worker to continuously clean up orphaned holds across the table, maintaining lean index performance.

### C. Concurrency Test Suite
* I personally wrote the concurrency integration tests in `backend/tests/SchoolAdmission.Tests`, spawning multiple parallel threads (`Task.WhenAll`) that attempt to claim a limited seat quota across distinct database connections simultaneously. This verified that the total confirmed holds never exceed `totalSeats`, even under high thread contention.

### D. Desktop UI/UX Re-architecture
* **Rejecting Generic AI Layouts:**
  * AI tools generated a disjointed dark-mode template with a 240px pitch-black sidebar holding only two links, leaving vast empty space, stretched tables with awkward horizontal gaps, and raw unformatted text fields.
* **Designing the institutional desk:**
  * I redesigned the interface as a daylight-readable administrative desk, and to a set of rules that survive review:
    * **Segmented section navigation:** three tabs (classes, my applications, admin) that read as underline tabs on a wide screen and collapse into a floating bottom bar on a phone, so the next action is always in thumb reach.
    * **17-digit BRN identity field:** a monospace input with a live `x/17` counter, an icon, and a green border once all seventeen digits are present. It sits in the masthead where a clerk can see it at all times.
    * **Class cards, not a data table:** each class is a card carrying its three seat figures (available, held, confirmed) in monospace, a badge when this student has already applied, and one primary action. Applied classes sort to the end.
    * **One dialog for both states:** the same panel shows either a class's seat breakdown or a single application's countdown and actions, so a guardian never learns two layouts.
    * **Bottom toasts:** feedback floats at the bottom and is dismissible, rather than pushing the layout or sitting in a banner at the top.
    * **Admin presets:** a class-number and shift picker composes the canonical `Class 6 - Morning Shift` name, detects an existing class and switches to update, with a custom-name form underneath for anything the pickers cannot express.

---

## 3. Summary

AI tools served as an accelerator for boilerplate and syntax, saving time on typing out standard DTOs and config files. However, the system's correctness, race-condition guarantees, database transaction lifecycles, and bespoke UX design were engineered, tested, and polished by hand.
