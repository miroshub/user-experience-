# Profiles CRUD API (MVC + Layered Architecture)

Run: `node server.js` → http://localhost:3000 (a browser API tester is served at `/api-tester.html`).

## Architecture
The API combines **MVC** (Model, View, Controller) with a **layered architecture** (Service and Repository layers).
Each module has one responsibility, and each layer only talks to the layer directly below it.

| Module | Layer | Responsibility |
|---|---|---|
| `server.js` | Entry point | Creates the Express app, registers middleware and routes, starts the server |
| `routes/profileRoutes.js` | Routing | Maps each HTTP method + URL to a Controller function |
| `controllers/profileController.js` | Controller | The only layer that touches `req`/`res`: passes request data to the Service, picks the status code, sends the View output |
| `services/profileService.js` | Service | Business operations: coordinates validation, pagination, filtering, merging partial updates, and calls the Repository. Knows nothing about HTTP |
| `repositories/profileRepository.js` | Repository | Owns the in-memory `profiles` array; the only module that reads or changes stored data. Knows nothing about HTTP |
| `models/profileModel.js` | Model | Defines what a profile is: its fields, validation rules for data and IDs, and normalizing (trimming) input |
| `views/profileView.js` | View | Formats every JSON response body (`{ data }`, `{ data, pagination }`, `{ message }`) |

Rules that keep the layers separate:
- Only the Controller uses `req` and `res`.
- Only the Repository touches the stored data.
- Only the Model knows the profile's fields and rules.
- Only the View decides the shape of the response body.

## How a request travels through the app
```
Client
  → server.js            (express.json() parses the body)
  → profileRoutes        (picks the controller function for METHOD + URL)
  → profileController    (passes req.params / req.query / req.body to the service)
  → profileService       (validates with the Model, applies business rules)
      → profileModel            validate id / data, normalize fields
      → profileRepository       read or change stored data
  ← profileService       (returns data, or "invalid" / "not found")
  ← profileController    (chooses status code: 200/201/204, or 400/404 for errors)
  → profileView          (shapes the JSON body)
  → Client
```

Example — `PATCH /profiles/2` with `{ "role": "recruiter" }`:
1. The route calls `patchProfile` in the Controller.
2. The Controller calls `profileService.patchProfile("2", { role: "recruiter" })`.
3. The Service checks the id and the patch with the Model, loads profile 2 from the Repository, merges the change, validates the merged profile, and saves it through `profileRepository.update`.
4. The Controller passes the saved profile to `profileView.presentProfile` and responds `200` with `{ "data": { ... } }`. Fields that were not sent keep their old values.

## Endpoints
| Method | URL | Description | Success |
|---|---|---|---|
| GET | /profiles | List profiles. Optional query: `page`, `limit` (default 1 / 10), `role`, `search` | 200 |
| GET | /profiles/:id | Get one profile | 200 |
| POST | /profiles | Create (name, email, role required) | 201 |
| PUT | /profiles/:id | Replace (all fields required) | 200 |
| PATCH | /profiles/:id | Partial update (only the fields sent change) | 200 |
| DELETE | /profiles/:id | Delete | 204 |

Errors: `400` for an invalid id, body or query (`{ "message": "..." }`), `404` when the profile does not exist.

For a line-by-line explanation of every file, see [CODE_WALKTHROUGH.md](CODE_WALKTHROUGH.md).
