# Wuzzufny

A two-way "swipe to match" job app: seekers swipe on jobs, companies swipe on candidates, and a match opens a chat.
Node.js + Express REST API, MongoDB Atlas (Mongoose), with a React front end in `client/`.

## Run it

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET`
3. In MongoDB Atlas, allow your IP (Security > Network Access)
4. Optional demo data: `npm run seed` (add `-- --bulk` for 1,000 extra seekers). Every demo account uses the password `Password123!`
5. Start the API: `npm run dev` (http://localhost:3000 shows a browser API tester)
6. In a second terminal, start the React app: `cd client`, `npm install` (first time only), `npm run dev`, then open http://localhost:5173

| Command | What it does |
|---|---|
| `npm run dev` | Server with auto-restart on file changes |
| `npm start` | Server without auto-restart |
| `npm test` | All tests, on an in-memory MongoDB (real data is never touched) |
| `npm run coverage` | Tests plus coverage; fails if logic files drop below 80% |
| `npm run seed` | Demo accounts: 2 admins, 2 companies, 3 seekers |

## Architecture

MVC with two extra layers (Service and Repository), wired together in one place (`container.js`).

```
request -> routes -> controller -> service -> repository -> Mongoose model -> MongoDB
                        |              |
                      view         domain classes (User, JobSeeker, Company, Admin, ...)
```

| Folder | Layer | Job |
|---|---|---|
| `routes/` | Routing | Which URL goes to which controller method |
| `controllers/` | Controller | HTTP only: reads the request, picks the status code |
| `views/` | View (server) | Shapes every JSON response. React in `client/` is the UI view |
| `services/` | Service | Business rules. Knows nothing about HTTP |
| `domain/` | Model (domain) | The classes from the class diagram, with their pure rules |
| `repositories/` | Repository | The only code that talks to MongoDB. Turns documents into domain objects |
| `models/` | Model (data) | Mongoose schemas and indexes |
| `security/` | Security | Password hashing (bcrypt) and login tokens (JWT) |
| `middleware/` | Middleware | Login check, role check, file uploads, error handling |
| `config/` | Config | `Database`, the Singleton connection |
| `container.js` | Composition root | The only file that creates concrete classes (Dependency Inversion) |

## API so far

All responses are JSON: `{ data }` on success, `{ message }` on error.
Protected routes need the header `Authorization: Bearer <token>`.

| Method | URL | Who | What |
|---|---|---|---|
| GET | `/api/health` | anyone | Server and database status |
| POST | `/api/auth/signup` | anyone | `{ role: "seeker" or "company", fullName, email or phone, password }` |
| POST | `/api/auth/login` | anyone | `{ login: email or phone, password }` |
| POST | `/api/auth/logout` | logged in | Ends the session on the client |
| GET | `/api/users/me` | logged in | Own profile |
| PATCH | `/api/users/me` | logged in | Edit own profile (seeker: headline, city, skills; company: companyName, industry, location, size, about) |
| POST | `/api/users/me/verify` | logged in | One-time ID upload (form field `idDocument`), sets the Verified badge |
| POST | `/api/users/me/logo` | company | Company logo (form field `logo`) |
| GET | `/api/files/:id` | logged in | Public files, or your own private ones |
| POST | `/api/jobs` | company | Post a job: `{ title, salaryMin, salaryMax, workMode, city, skills, description }` |
| GET | `/api/jobs/mine` | company | Own jobs, newest first |
| GET | `/api/jobs/:id` | logged in | One job (paused or closed ones only for their company) |
| PATCH | `/api/jobs/:id` | company | Edit any field of an own job |
| POST | `/api/jobs/:id/pause`, `/resume`, `/close` | company | Change the job status |
| POST | `/api/jobs/:id/image` | company | Job image (form field `image`) |
| GET | `/api/feed/jobs` | seeker | Next job cards with % fit. Filters: `role`, `city`, `workMode`, `minSalary`, `limit` |
| GET | `/api/feed/candidates?jobId=` | company | Candidate cards for a job, plus a "Check later" list |
| POST | `/api/swipes` | seeker, company | `{ jobId, interested }` (company also sends `seekerId`). Returns the match if both said yes |
| POST | `/api/swipes/undo` | seeker | Take back the last swipe, unless it made a match |
| GET | `/api/matches` | logged in | Own matches, with the job and the other person |

See `CODE_WALKTHROUGH.md` for a request traced through every layer.
