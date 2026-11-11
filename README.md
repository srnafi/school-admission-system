# School Admission System

Online admission for a school: first come, first served, with a seat held for a limited
time while the applicant pays.

- Backend: .NET 8 minimal API, PostgreSQL 16, EF Core
- Frontend: React 19, TypeScript, Vite, Tailwind, served by nginx
- Everything runs with one `docker compose up`

| | |
|---|---|
| UI | <http://localhost:3000> |
| API | <http://localhost:8080> |
| Database | PostgreSQL 16 inside the compose network, data in the `pgdata` volume |

## Run it

Docker is the only requirement.

```
docker compose up --build
```

Wait until the API has printed that it is listening, then open <http://localhost:3000>.

The UI opens with no data. Type a 17 digit birth registration number in the top bar, create
a class with a seat count, then press the apply button on that class.

To stop: `docker compose down`. To stop and delete the database: `docker compose down -v`.
Data survives a plain `down` and `up`, because it lives in the `pgdata` volume.

### Configuration

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `ConnectionStrings__Default` | backend | set in compose | Npgsql connection string |
| `HOLD_DURATION_SECONDS` | backend | `600` | how long a seat stays held |
| `ASPNETCORE_URLS` | backend | `http://+:8080` | listening address |
| `API_URL` | frontend container | `http://localhost:8080` | API address the browser calls |

`API_URL` is read when the container starts, not when the image is built: the entrypoint
writes `config.js` before nginx starts, so the same image works against any API address.
It must be an address the browser can reach, not a compose service name.

## Tests

Backend tests, including the concurrency test, run against the compose PostgreSQL:

```
docker compose --profile test run --rm --build backend-tests
```

Frontend tests:

```
docker compose --profile test run --rm --build frontend-tests
```

To run them without Docker on a machine that has the SDKs:

```
cd backend && dotnet test
cd frontend && npm ci && npm test
```

When running the backend tests outside Docker, point `TEST_CONNECTION` at a database the
tests may empty, for example
`Host=localhost;Port=5432;Database=admission_test;Username=app;Password=app`.

## How the seat limit is enforced

Seat counts are never stored. They are counted from the holds table on every read, so they
cannot drift away from reality:

- held: rows with status `HELD` whose expiry is still in the future
- confirmed: rows with status `CONFIRMED`
- available: `totalSeats - held - confirmed`

Applying opens a transaction and takes a row lock on the class row with `SELECT ... FOR
UPDATE`. Every application for that class therefore runs one at a time: expire the stale
holds of that class, check that this student has no live application, check the seat count,
insert. The lock lives in the database, so it also holds when more than one API process is
running.

A unique partial index on `(class_id, student_id)` where the status is `HELD` or `CONFIRMED`
backs the same rule up at the schema level.

Expiry does not depend on a background job: reads treat a hold whose expiry has passed as
expired, and writes mark such rows expired before counting. A small background service also
marks them every second so the table stays tidy.

## Trying the two process bonus

```
docker compose --profile bonus up -d
```

That starts a second API on <http://localhost:8081> against the same database. Applying
through both processes at once still respects the seat limit, because the lock is in
PostgreSQL rather than in the application.

## Layout

```
backend/
  src/SchoolAdmission.Api/    minimal API
    Endpoints/                /classes and /holds routes
    Services/                 AdmissionService, all seat logic
    Data/                     EF Core context, migration, migration runner
    Background/               expired hold sweep
    Errors/                   error codes and the single error shape
  tests/SchoolAdmission.Tests concurrency and rule tests
frontend/
  src/api/                    fetch client and types
  src/App.tsx                 class list, application dialog, admin panel
  src/styles.css              Tailwind entry
  nginx.conf                  static hosting and SPA fallback
db/init/                      creates the test database on first start
```
