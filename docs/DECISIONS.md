# Build decisions

Agreed 2026-11-14, before Phase 0. Where this file and the Milestone 1 report disagree, this file wins for the build; the differences are explained in `ARCHITECTURE.md` under "Changes since Milestone 1".

## Process

- Repo lives in `OneDrive\Documents\Wuzufly project`.
- One commit per phase (or per finished feature), straight to `main`. No branches. No AI attribution in commits.
- Scope: all 43 FRs. In each phase, M items first, then S, then C. Anything that slips is reported.
- Local only, no deployment. NFR-04 is checked by "AI key not in the client bundle" and "passwords hashed".
- The Milestone 1 report is not edited.
- AI-use disclosure: the module policy is to be checked; if it asks for one, a statement goes in the report.

## Graded topic: SOLID + MVC

The graded principles are SOLID. Singleton, Strategy and Factory are kept because they are in the class diagram, and each is documented under the principle it serves.

| Principle | Where it shows |
|---|---|
| SRP | One job per layer. Entity methods do only the pure part; services load and save. |
| OCP | `FlagRule` classes + `FlagChecker`; `AIModel` providers; `UserFactory` role map. |
| LSP | Contract tests run the same checks on every `AIModel` subclass and every `User` subclass. |
| ISP | Tiny interfaces (abstract classes) in `interfaces/`. Role methods live only on the subclasses that need them. |
| DIP | `container.js` is the only file that creates concrete classes and calls `Database.getInstance()`. Everything else gets its dependencies through the constructor. |

Docs: `docs/SOLID.md` (one section per principle) and `docs/ARCHITECTURE.md`.

## Architecture

- Layers: routes, controllers, services, repositories, models, plus separate domain classes that mirror the class diagram.
- ES6 classes everywhere, constructor injection, CommonJS.
- Errors: services throw `AppError(message, status)`; the error middleware in `server.js` turns it into JSON.
- `views/` stays as JSON presenters (server view). React is the UI view.
- Server stays at the repo root. React + Vite goes in `client/`.
- The `profile` demo feature is replaced by the real User feature in Phase 1. README and CODE_WALKTHROUGH get rewritten. `public/api-tester.html` stays as a dev tool.

## Data

- Users: one `users` collection with Mongoose discriminators (`discriminatorKey: 'role'`). The ERD stays the logical model.
- Files (ID, logo, job image, CV PDF): GridFS behind `FileRepository`, uploads through multer.
- Verification (FR-03/04): uploading the ID sets `isVerified = true` at once. No review step (prototype limitation).
- Timed tests (FR-26): questions, answers, score and time limit are stored inside the Interview document.
- Account delete (FR-05): removes the user's own data; on shared data (messages, matches) the user becomes "Deleted user"; reviews they wrote are removed. The data download is one JSON file.
- Seed script: creates the admin accounts (moderator, support) and demo data. `--bulk` adds 1,000 users for NFR-09.

## Features

- AI:
  - Classes: `AIModel` interface, with `GeminiFlash`, `Haiku`, `Sonnet` and `MockModel`.
  - Choice of model: `AI_MODEL` in `.env`. The default is `mock`. There is no ModelRouter.
  - The student is getting a free Gemini key.
  - `AIChat` documents keep the history, and the last 6 turns are sent to the model.
- Notices are in-app only, never email:
  - match events (nudge, reminder, job updated, interview booked) appear as system cards in the chat;
  - account events (warning, ticket reply) appear in the Trust centre.
- Cron:
  - a daily job runs the 5-day nudge, the 14-day review reveal and the review flag check;
  - a second job runs every 10 minutes for the 1-hour interview reminder, using `Interview.reminded`.
- Socket.io:
  - the socket logs in with the same JWT;
  - rooms are `user:<id>` and `match:<id>`, and the server checks membership before a socket joins;
  - events are `match:new`, `message:new`, `match:status` and `notice:new`.
- CV export (FR-10): `cv.exportPdf(exporter)` with a `PdfExporter` that uses pdfkit.
- Auth: bcrypt; the JWT is sent as `Authorization: Bearer`, stored in `localStorage`.

## Tests

- Server: Vitest in Node mode, with `mongodb-memory-server` and Supertest.
- Client: Vitest with jsdom and React Testing Library, inside `client/`.
- Coverage below 80% on the logic files fails the run (NFR-10).

## Diagram changes (Lucid, additions only)

Class diagram (page `-gQJ3X.IgpkF`):

1. Rename `Model` to `AIModel`, marked `<<interface>>`.
2. Change the arrows from GeminiFlash, Haiku and Sonnet to realisation arrows (dashed line, hollow triangle).
3. Add `MockModel`, which realises `AIModel`.
4. Add `<<interface>> FlagRule` with `isHit(user, data)`, and its six rules: NewAccount, NotVerified, MassApply, EmptyProfile, SeriousTags and LowAverage.
5. Add `FlagChecker(rules, minHits)`.
6. Add `UserFactory.createUser(role, data)`.
7. Split "writes / receives" into two associations, with the roles `reviewer` and `reviewee`.
8. Interview gains `questions`, `answers`, `score`, `timeLimit`, `reminded`, `startTest()` and `submitTest(answers)`.
9. Add `PdfExporter`, and change the signature to `CV.exportPdf(exporter)`.
10. Change these signatures:
    - `Swipe.checkForMatch(otherSwipe)`
    - `Admin.suspend(user, warnings)`
    - `JobSeeker.swipeOnJob(job, choice): Swipe`
11. Keep the container, services and repositories out of the class diagram; they go in the architecture docs.

ERD (page `p1`): separate `reviewer_id` and `reviewee_id` relationships, plus the Interview test fields and `reminded`.

## Screens without a Figma frame

The review screens, the admin dashboard, the "Your data" page and the timed test have no frame. The student sends sketches or screenshots before the phase that needs each one, and the screen is built from those.
