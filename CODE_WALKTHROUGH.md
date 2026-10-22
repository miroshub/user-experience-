# Code Walkthrough — Profiles CRUD API

A line-by-line explanation of every file in this project: what each line does, why it is written that way, and which architectural rule it serves.

**Contents**
1. [Folder structure](#1-folder-structure)
2. [The architecture in one picture](#2-the-architecture-in-one-picture)
3. [A request's full journey](#3-a-requests-full-journey)
4. [File-by-file, line-by-line](#4-file-by-file-line-by-line)
   - [server.js](#41-serverjs)
   - [routes/profileRoutes.js](#42-routesprofileroutesjs)
   - [controllers/profileController.js](#43-controllersprofilecontrollerjs)
   - [services/profileService.js](#44-servicesprofileservicejs)
   - [repositories/profileRepository.js](#45-repositoriesprofilerepositoryjs)
   - [models/profileModel.js (Model)](#46-modelsprofilemodeljs-model)
   - [views/profileView.js](#47-viewsprofileviewjs)
   - [public/api-tester.html](#48-publicapi-testerhtml)
   - [README.md and .gitignore](#49-readmemd-and-gitignore)
5. [Advanced concepts the code relies on](#5-advanced-concepts-the-code-relies-on)
6. [Known limitations](#6-known-limitations)
7. [Postman test plan](#7-postman-test-plan)

---

## 1. Folder structure

```
Wuzufly project/
├── server.js                         Entry point: builds the Express app and starts listening
├── routes/
│   └── profileRoutes.js              ROUTES      METHOD + URL  →  controller function
├── controllers/
│   └── profileController.js          CONTROLLER  HTTP in, HTTP out (status codes, req/res)
├── services/
│   └── profileService.js             SERVICE     business rules; coordinates Model + Repository
├── repositories/
│   └── profileRepository.js          REPOSITORY  owns the stored data (the in-memory array)
├── models/
│   └── profileModel.js               MODEL       validation rules for a profile
├── views/
│   └── profileView.js                VIEW        shape of every JSON response body
├── public/
│   └── api-tester.html               Browser-based request tester (served as a static file)
├── README.md                         Architecture summary, request flow, endpoint list
├── CODE_WALKTHROUGH.md               This document
├── .gitignore                        Keeps node_modules/ out of Git
└── node_modules/                     Installed packages (Express 5.3.0) — not committed
```

`graphify-out/` and `.claude/` are tool output folders and are not part of the application.


---

## 2. The architecture in one picture

```
                ┌──────────────┐
  HTTP  ──────► │  server.js   │  middleware: express.json(), express.static("public")
                └──────┬───────┘
                       ▼
                ┌──────────────┐
                │    Routes    │  "PATCH /profiles/:id" → patchProfile
                └──────┬───────┘
                       ▼
                ┌──────────────┐        ┌──────────────┐
                │  Controller  │ ─────► │     View     │  formats JSON bodies
                └──────┬───────┘        └──────────────┘
                       ▼
                ┌──────────────┐        ┌──────────────┐
                │   Service    │ ─────► │    Model     │  validation rules
                └──────┬───────┘        └──────────────┘
                       ▼
                ┌──────────────┐
                │  Repository  │  the only code that touches `profiles`
                └──────────────┘
```

**Dependency rule:** arrows only point *downwards or sideways*, never upwards.

| Module | Knows about | Never knows about |
|---|---|---|
| Routes | Controller | Service, Repository, data |
| Controller | Service, View, HTTP (`req`, `res`, status codes) | Repository, the data array |
| Service | Model, Repository | `req`, `res`, status codes |
| Repository | the data array | HTTP, validation, business rules |
| Model | nothing (pure functions) | everything else |
| View | nothing (pure functions) | everything else |

The rule matters for three reasons:

- **Swappability.** To move from an array to MongoDB or PostgreSQL, you rewrite only the Repository. Its five functions (`findAll`, `findById`, `create`, `update`, `remove`) stay the same, so the Service and Controller do not change.
- **Testability.** The Service has no `req` or `res`, so a unit test can call `profileService.patchProfile("2", { role: "x" })` directly, without starting a server.
- **Single Responsibility.** Each file has one reason to change:
  - Routes change when URLs change.
  - Views change when the response shape changes.
  - The Model changes when validation rules change.
  - The Service changes when business rules change.
  - The Repository changes when storage changes.
  - The Controller changes when the HTTP mapping changes.

---

## 3. A request's full journey

### Happy path — `PATCH /profiles/2` with body `{"role":"recruiter"}`

| # | Where | What happens |
|---|---|---|
| 1 | Node's HTTP server | A TCP connection arrives. Express wraps it in `req` and `res` objects. |
| 2 | `server.js` L5 `express.json()` | The `Content-Type` is `application/json`, so the body stream is read and `JSON.parse`d into `req.body = { role: "recruiter" }`. |
| 3 | `server.js` L6 `express.static` | Looks for a file called `public/profiles/2`. None exists, so it calls `next()`. |
| 4 | `server.js` L7 → `profileRoutes.js` L8 | The router matches `PATCH /profiles/:id` and sets `req.params = { id: "2" }`. The id is a **string**. |
| 5 | `profileController.patchProfile` (L58) | Passes the plain values `"2"` and `{ role: "recruiter" }` to the service. |
| 6 | `profileService.patchProfile` (L91) | 1. `parseId("2")` checks the id with the Model's regex and turns it into the number `2`.<br>2. `validateProfilePatch` confirms that only known fields were sent and that none are empty.<br>3. `findById(2)` returns a **copy** of profile 2.<br>4. The change is merged into the copy, and the merged profile is validated as a whole.<br>5. `update(2, trimmedData)` stores the result. |
| 7 | `profileRepository.update` (L59) | Replaces the array entry and returns a copy. |
| 8 | Back in the controller (L61) | `presentProfile(profile)` wraps the profile as `{ data: {...} }`. `res.json` sends it with status `200`. |

### Error path — `GET /profiles/abc`

1. Route → `getProfile` controller → `profileService.getProfile("abc")`.
2. `parseId` fails the regex and **throws** `ProfileError("INVALID", "ID must be a positive integer")`.
3. The exception skips the rest of the service and the rest of the controller's `try` block, and lands in the controller's `catch`.
4. `sendError` sees that it is a `ProfileError` and looks up `INVALID → 400`. It responds with `presentError(message)` → `{"message":"ID must be a positive integer"}`.

The Service never mentioned 400. It said *what* went wrong. The Controller decided *how HTTP expresses it*.

---

## 4. File-by-file, line-by-line

### 4.1 `server.js`

```js
1  const express = require("express");
2  const app = express();
3  const port = 3000;
4
5  app.use(express.json());
6  app.use(express.static("public"));
7  app.use(require("./routes/profileRoutes"));
8
9  app.listen(port, () => console.log(`server is live on http://localhost:${port}`));
```

- **L1** `require("express")` loads the Express package from `node_modules`. In CommonJS, `require` runs the module once and caches what it exports. Later `require` calls for the same file return the same object. This caching is the reason the Repository's data persists between requests (see §5.1).
- **L2** `express()` creates an *application*. It is a request handler function with extra methods (`use`, `listen`, `get`…).
- **L3** The port number is kept in a constant so that L9 uses one source of truth.
- **L5** `app.use(express.json())` registers body-parsing **middleware** for every request:
  - It only parses when the request's `Content-Type` is `application/json`.
  - The default size limit is 100 kB.
  - It runs in `strict` mode, so the top-level JSON value must be an object or an array.
  - If no body was parsed, **Express 5 leaves `req.body` as `undefined`**. Express 4 used `{}`. The Model's `isObject` check handles this case, so a POST with no body gets `400 Invalid profile data`.
  - Malformed JSON never reaches your code: the parser calls `next(err)`, and Express's default error handler replies `400` (see §6).
- **L6** `express.static("public")` serves files from `public/`, so `/api-tester.html` maps to `public/api-tester.html`. The path is resolved against the **current working directory** (`process.cwd()`), not against the folder that contains `server.js`. Start the server from the project folder.
- **L7** Mounts the router at `/`. The `require` runs inline: it loads `profileRoutes.js`, which loads the controller, which loads the service, which loads the Repository and the Model. **The whole dependency chain is built here, once, at startup.**
- **Middleware order matters.** Express runs middleware in registration order:
  - The JSON parser must come before the router, or `req.body` would be `undefined` inside the handlers.
  - The static middleware runs before the router, so a file in `public/` with the same path as a route would be served first.
- **L9** `app.listen` creates a Node `http.Server` and binds it to the port. The callback runs once the socket is listening.

---

### 4.2 `routes/profileRoutes.js`

```js
1  const router = require("express").Router();
2  const c = require("../controllers/profileController");
3
4  router.get("/profiles", c.getAllProfiles);
5  router.get("/profiles/:id", c.getProfile);
6  router.post("/profiles", c.createProfile);
7  router.put("/profiles/:id", c.replaceProfile);
8  router.patch("/profiles/:id", c.patchProfile);
9  router.delete("/profiles/:id", c.deleteProfile);
10
11 module.exports = router;
```

- **L1** `Router()` creates a mini-application that holds only routes. It keeps URL definitions out of `server.js`, which is the separation the lab asks for in "Organize the Routes".
- **L2** Imports the controller's exported object. The short name `c` keeps the route table readable.
- **L4–9** Each line pairs an **HTTP method** with a **path pattern** and a **handler**:
  - `:id` is a *route parameter*. Express 5 (path-to-regexp v8) matches one non-empty path segment and stores it as a **string** in `req.params.id`. That is why the Service has to convert it with `Number()`.
  - Handlers are passed by reference (`c.getProfile`, not `c.getProfile()`). Express calls them later with `(req, res, next)`.
  - Two routes can share a path (`/profiles/:id` appears four times) because Express matches on method **and** path.
  - Routing is non-strict by default, so `/profiles/` (trailing slash) matches `/profiles`.
- **L11** Exports the router so that `server.js` L7 can mount it.

The route table is identical to Increment 1. The lab requires "HTTP methods and endpoint URLs remain unchanged".

---

### 4.3 `controllers/profileController.js`

The Controller's job is **translation**: HTTP request → service call → HTTP response. It contains no data access and no business rules.

```js
1  const profileService = require("../services/profileService");
2  const profileView = require("../views/profileView");
```
- **L1–2** These are the Controller's only two dependencies: the Service, which does the work, and the View, which shapes the output. It does **not** import the Repository. That missing import is the code-level proof of "Controllers do not directly access or modify the stored data."

```js
4  const STATUS_BY_ERROR_TYPE = {
5      INVALID: 400,
6      NOT_FOUND: 404
7  };
```
- **L4–7** This is a lookup table from *business* error types to *HTTP* status codes. It lives in the Controller because status codes are an HTTP concept. Supporting a new error type, such as `CONFLICT: 409` for duplicate emails, means adding one line here.

```js
11 function sendError(res, error) {
12     if (!(error instanceof profileService.ProfileError)) throw error;
13
14     res.status(STATUS_BY_ERROR_TYPE[error.type]).json(profileView.presentError(error.message));
15 }
```
- **L11** This shared helper replaces the repeated `return res.status(400).json({...})` blocks from Increment 1.
- **L12** `instanceof` checks the error's prototype chain. Only errors the Service threw *on purpose* are turned into 400 or 404.
  - Anything else is a real bug (a `TypeError`, for example). It is **re-thrown**.
  - Express 5 catches errors thrown by a handler and answers `500 Internal Server Error`.
  - Without this guard, a bug could be mislabelled as "your input was bad", or swallowed silently.
- **L14** `res.status(code)` sets the status and returns `res`, so `.json(...)` can be chained. `.json` serialises the object, sets `Content-Type: application/json`, and ends the response. The body comes from the View, so error bodies also have one defined shape.

```js
18 function getAllProfiles(req, res) {
19     try {
20         const { profiles, pagination } = profileService.listProfiles(req.query);
21         res.json(profileView.presentProfileList(profiles, pagination));
22     } catch (error) {
23         sendError(res, error);
24     }
25 }
```
- **L18** Express calls this as `(req, res, next)`. `next` is not needed, so it is left out.
- **L19** `try` covers everything that can throw. A `ProfileError` thrown by the Service jumps straight to L22.
- **L20** `req.query` is the parsed query string, for example `?page=2&role=recruit` → `{ page: "2", role: "recruit" }`. Every value is a string, or an array if a key is repeated. It is passed as a plain object, so the Service never sees `req`. The result is *destructured* into two variables.
- **L21** `res.json` with no `status()` call sends `200 OK`. The View builds `{ data: [...], pagination: {...} }`.

```js
28 function getProfile(req, res) {                                   // GET /profiles/:id
30         const profile = profileService.getProfile(req.params.id);
31         res.json(profileView.presentProfile(profile));
```
- **L30** `req.params.id` is passed as the raw string. Validating and converting it is the Service's job, through the Model.
- **L31** `200` with `{ data: {...} }`.

```js
38 function createProfile(req, res) {                                // POST /profiles
40         const profile = profileService.createProfile(req.body);
41         res.status(201).json(profileView.presentProfile(profile));
```
- **L41** `201 Created` is the correct status when POST creates a resource. The body contains the new profile, including its server-generated `id`.

```js
48 function replaceProfile(req, res) {                               // PUT /profiles/:id
50         const profile = profileService.replaceProfile(req.params.id, req.body);
51         res.json(profileView.presentProfile(profile));
```
- **L50** PUT means "replace the whole resource". The Service requires all fields.

```js
58 function patchProfile(req, res) {                                 // PATCH /profiles/:id
60         const profile = profileService.patchProfile(req.params.id, req.body);
61         res.json(profileView.presentProfile(profile));
```
- **L60** PATCH means "change only what I sent". The merging happens in the Service.

```js
68 function deleteProfile(req, res) {                                // DELETE /profiles/:id
70         profileService.deleteProfile(req.params.id);
71         res.status(204).send();
```
- **L70** The return value is ignored. The Service either succeeds or throws `NOT_FOUND`.
- **L71** `204 No Content` means success with an intentionally empty body. `.send()` with no argument ends the response. A 204 response must not contain a body.

```js
77 module.exports = { getAllProfiles, getProfile, createProfile, replaceProfile, patchProfile, deleteProfile };
```
- **L77–84** This is the public interface that `profileRoutes.js` uses. `sendError` and `STATUS_BY_ERROR_TYPE` are not exported, so they stay private to this module.

**Pattern to notice:** all six handlers have the same shape: *call service → present with view → send*. This uniformity shows that each layer has a single job.

---

### 4.4 `services/profileService.js`

The Service holds **business logic**. It decides what each operation means, in what order the checks happen, and which rules apply. It coordinates the Model (validation) and the Repository (storage). It has no `req`, `res`, or status codes.

```js
1  const profileModel = require("../models/profileModel");
2  const profileRepository = require("../repositories/profileRepository");
```
- **L1–2** These are the Service's two collaborators. As the lab says: "the Service uses the Repository to access stored data" and "coordinates validation and data-access operations."

```js
5  class ProfileError extends Error {
6      constructor(type, message) {
7          super(message);
8          this.type = type;
9      }
10 }
```
- **L5** This is a **custom error class**. `extends Error` gives it a `message`, a `stack` trace, and `instanceof Error === true`.
- **L7** `super(message)` must run before `this` is used in a subclass constructor. It calls `Error`'s constructor, which sets `this.message`.
- **L8** `type` is a machine-readable category (`"INVALID"` or `"NOT_FOUND"`). The Controller maps it to a status code. Using a *type* instead of a *status code* keeps HTTP out of the business layer. A CLI or a GraphQL API could reuse this Service unchanged.

```js
12 const invalid = message => new ProfileError("INVALID", message);
13 const notFound = () => new ProfileError("NOT_FOUND", "Profile not found");
```
- **L12–13** These are *factory functions*. They are arrow functions that return a new error, so the code later reads as plain English: `throw notFound()`. A **new** error is created on every call, because each error carries its own stack trace.

```js
16 function parseId(id) {
17     if (!profileModel.validateId(id)) {
18         throw invalid("ID must be a positive integer");
19     }
20     return Number(id);
21 }
```
- **L16** This helper is used by four operations, which avoids repeating the same three-line check.
- **L17** It delegates the *rule* to the Model. The Service decides *when* to validate; the Model decides *what is valid*.
- **L18** `throw` stops this function and every caller until a `catch` is reached (the Controller's).
- **L20** `Number("2")` gives `2`. This is safe here because the regex has already guaranteed that the string contains only digits. The Repository compares with `===`, so it needs a number: `"2" === 2` is `false`.

```js
24 function toProfileData(data) {
25     return {
26         name: data.name.trim(),
27         email: data.email.trim(),
28         role: data.role.trim()
29     };
30 }
```
- **L24–30** This **normalises** and **whitelists** the input.
  - `.trim()` removes surrounding whitespace, so `" Jane "` is stored as `"Jane"`.
  - Only the three known fields are copied into a fresh object. Any extra keys a client sends (`id`, `isAdmin`, …) are dropped.
  - This protects against *mass assignment*. Without it, `{ id: nextId++, ...data }` in the Repository would let a client choose its own `id`.
  - Increment 1 repeated this object three times in the controller. Now it is written once.

```js
32 function listProfiles(query) {
33     const page = query.page === undefined ? 1 : Number(query.page);
34     const limit = query.limit === undefined ? 10 : Number(query.limit);
```
- **L33–34** Default values apply only when the parameter is **absent**. `?page=` (empty) gives `Number("")`, which is `0`, so the request is rejected rather than defaulted. If a key is repeated, `Number(["1","2"])` is `NaN`, which is also rejected.

```js
36     if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
37         throw invalid("Page and limit must be positive integers");
38     }
```
- **L36** `Number.isInteger` rejects `NaN`, `Infinity`, and decimals like `1.5`. Unlike the global `isNaN`, it does **not** convert its argument first. `||` short-circuits: the first failing check is enough to throw.

```js
40     const { role, search } = query;
41     if (
42         (role !== undefined && typeof role !== "string") ||
43         (search !== undefined && typeof search !== "string")
44     ) {
45         throw invalid("Role and search must each be a single text value");
46     }
```
- **L40** Destructuring pulls two properties into local variables.
- **L41–44** These checks are type guards. `?role=a&role=b` makes Express produce `["a","b"]`, an array. Calling `.trim()` on an array would crash with a `TypeError`, so arrays are rejected here with a clear 400 instead.

```js
48     const filteredProfiles = profileRepository.findAll({
49         role: role?.trim().toLowerCase(),
50         search: search?.trim().toLowerCase()
51     });
```
- **L49–50** `?.` is *optional chaining*. If `role` is `undefined`, the whole expression `role?.trim().toLowerCase()` short-circuits to `undefined` without throwing.
  - Inputs are normalised before they reach the Repository: trimmed and lower-cased, so `"  AMINA "` becomes `"amina"`.
  - The Repository only has to compare lower-case values.
- **L48** The filtering itself happens in the Repository. With a database this step would become a `WHERE` clause, so it belongs to data access.

```js
53     const startIndex = (page - 1) * limit;
54     return {
55         profiles: filteredProfiles.slice(startIndex, startIndex + limit),
56         pagination: {
57             page,
58             limit,
59             total: filteredProfiles.length,
60             totalPages: Math.ceil(filteredProfiles.length / limit)
61         }
62     };
```
- **L53** Pages are 1-based for clients. Array indexes are 0-based. With page 2 and limit 2, `startIndex` is 2.
- **L55** `slice(start, end)` returns a **new** array from `start` up to (not including) `end`. It never throws. Slicing past the end returns `[]`, so `?page=99` gives an empty page rather than an error.
- **L57–58** These use *shorthand properties*: `{ page }` means `{ page: page }`.
- **L59–60** `total` counts **all** matches, not only this page. `Math.ceil` rounds up, so 5 items with limit 2 gives 3 pages. 0 items gives 0 pages.
- **L54** The Service returns *data*, not a response. Turning it into JSON is the View's job, which the Controller invokes.

```js
65 function getProfile(id) {
66     const profile = profileRepository.findById(parseId(id));
67     if (!profile) throw notFound();
68     return profile;
69 }
```
- **L66** The calls are nested: validate and convert the id, then look it up. If `parseId` throws, `findById` never runs.
- **L67** The Repository returns `null` for "not found". It reports the *fact*; the Service decides that this is an *error*.

```js
71 function createProfile(data) {
72     if (!profileModel.validateProfile(data)) {
73         throw invalid("Invalid profile data");
74     }
75     return profileRepository.create(toProfileData(data));
76 }
```
- **L72** Full validation: all three fields must be non-empty strings.
- **L75** The data is cleaned, then handed to the Repository, which assigns the `id`.

```js
78 function replaceProfile(id, data) {
79     const profileId = parseId(id);
81     if (!profileModel.validateProfile(data)) { throw invalid("Invalid profile data"); }
85     const profile = profileRepository.update(profileId, toProfileData(data));
86     if (!profile) throw notFound();
87     return profile;
88 }
```
- **Check order is a business decision:** first the id format (400), then the body (400), then existence (404). A request with a bad id *and* a bad body therefore reports the id problem. This order matches Increment 1 exactly.
- **L85** `update` returns `null` if the id is unknown. Existence is checked and the write is done in one Repository call.

```js
91 function patchProfile(id, changes) {
92     const profileId = parseId(id);
94     if (!profileModel.validateProfilePatch(changes)) { throw invalid("Invalid update data"); }
98     const existing = profileRepository.findById(profileId);
99     if (!existing) throw notFound();
101    const updatedProfile = { ...existing, ...changes };
102    if (!profileModel.validateProfile(updatedProfile)) { throw invalid("Invalid profile data"); }
106    return profileRepository.update(profileId, toProfileData(updatedProfile));
107 }
```
This is the most involved operation.
- **L94** Validates the *shape of the request*: at least one key, only known keys, and every value a non-empty string. `{}` is rejected, and so is `{ "id": 7 }`.
- **L98** Loads the current profile. It is a **copy**, so the merge below cannot change stored data by accident.
- **L101** **Spread merge.** Properties spread later override earlier ones.
  - `{ ...{name:"A", role:"recruit"}, ...{role:"recruiter"} }` gives `{ name:"A", role:"recruiter" }`.
  - This is how *"partial updates preserve fields that were not modified"*.
- **L102** Validates the *resulting entity*. Given L94 and valid stored data, it cannot fail today. It is kept as a guard of the rule "a stored profile is always complete and valid", which still holds if someone later relaxes `validateProfilePatch`.
- **L106** Saves through the Repository, so the change goes through the data-access layer.

```js
109 function deleteProfile(id) {
110     if (!profileRepository.remove(parseId(id))) throw notFound();
111 }
```
- **L110** `remove` returns `true` or `false`, which is turned into success or a `NOT_FOUND` error. The function returns nothing (`undefined`), because a delete has no result to show.

```js
113 module.exports = { ProfileError, listProfiles, getProfile, createProfile, replaceProfile, patchProfile, deleteProfile };
```
- `ProfileError` is exported so the Controller can use `instanceof`. `parseId`, `toProfileData`, `invalid`, and `notFound` stay private implementation details.

---

### 4.5 `repositories/profileRepository.js`

The Repository is the **data-access layer**. It is the only file that holds or changes the data. It knows nothing about HTTP or validation.

```js
2  let profiles = [ { id: 1, name: "Amina Yusuf", ... }, ... ];   // L2–27
29 let nextId = 5;
```
- **L2** The data store is a **module-level variable**. Nothing else in the project can reach it, because it is not exported. Only the functions below can read or write it, because they are *closures* over this module's scope (see §5.1). This is encapsulation without a class.
- **L2–27** Four seed profiles, so the API has data to show right after it starts.
- **L29** `nextId` is an auto-increment counter, like a database sequence. Ids are never reused after a delete, so a deleted id cannot suddenly point to a different person.

```js
32 const copy = profile => ({ ...profile });
```
- **L32** This makes a **defensive copy**. Objects in JavaScript are passed *by reference*. If the Repository returned the stored object itself, any caller could write `profile.name = "x"` and silently change the "database".
  - The extra parentheses `({ ... })` make the arrow function return an object literal. Without them, `{` would start a function body.
  - A *shallow* copy is enough here, because every field is a primitive (number or string).

```js
36 function findAll({ role, search } = {}) {
37     return profiles
38         .filter(profile => {
39             const matchesRole = !role || profile.role.toLowerCase() === role;
40             const searchableText = `${profile.name} ${profile.email}`.toLowerCase();
41             const matchesSearch = !search || searchableText.includes(search);
42             return matchesRole && matchesSearch;
43         })
44         .map(copy);
45 }
```
- **L36** The parameter is destructured, with `= {}` as the default. `findAll()` with no argument still works, because it destructures an empty object.
- **L38** `.filter` builds a new array of the items for which the callback returns `true`.
- **L39** `!role ||` means that an absent or empty filter matches everything. Otherwise the stored role, lower-cased, must equal the requested role exactly.
- **L40** Name and email are joined with a space into one searchable string, using a *template literal*. A side effect: a search can match across the join, so `"yusuf amina"` matches `"amina yusuf amina@example.com"`.
- **L41** `.includes` does a substring match.
- **L42** Both conditions must hold (AND).
- **L44** Each result is copied. This is the same encapsulation as L32.

```js
47 function findById(id) {
48     const profile = profiles.find(profile => profile.id === id);
49     return profile ? copy(profile) : null;
50 }
```
- **L48** `.find` returns the first match, or `undefined`. `===` needs `id` to be a number. That is why the Service converts it.
- **L49** The Repository returns an explicit `null` for "no row", which is the convention most database drivers use.

```js
52 function create(data) {
53     const profile = { id: nextId++, ...data };
54     profiles.push(profile);
55     return copy(profile);
56 }
```
- **L53** `nextId++` is a *post-increment*: it uses the current value (5) and then increases the counter to 6. `id` is placed first, and `...data` is spread after it. That is safe only because the Service whitelisted `data`, so it can never contain an `id`.
- **L54** `push` changes the stored array.
- **L55** It returns a copy that includes the generated id, so the client can learn its new id.

```js
59 function update(id, data) {
60     const index = profiles.findIndex(profile => profile.id === id);
61     if (index === -1) return null;
63     profiles[index] = { id, ...data };
64     return copy(profiles[index]);
65 }
```
- **L60** `findIndex` returns a position, or `-1`. A position is needed because the array slot is replaced.
- **L63** A **new** object replaces the old one: replace, not change in place. The `id` comes from the URL and is never taken from the body.
- One `update` function serves both PUT and PATCH. The Service has already built the complete profile, so the Repository does not need to know the difference.

```js
68 function remove(id) {
69     const index = profiles.findIndex(profile => profile.id === id);
70     if (index === -1) return false;
72     profiles.splice(index, 1);
73     return true;
74 }
```
- **L72** `splice(index, 1)` removes one element at `index` and changes the array in place.
- The function is named `remove`, not `delete`, because `delete` is a reserved operator in JavaScript.

```js
76 module.exports = { findAll, findById, create, update, remove };
```
- These five functions are the Repository's **contract**. A MongoDB version would export the same names (made `async`, plus `await` in the Service), and nothing above the Repository would need to change.

---

### 4.6 `models/profileModel.js` (Model)

The Model holds **validation rules**. Its functions take data and return `true` or `false`, with no side effects.

```js
1  const PROFILE_FIELDS = ["name", "email", "role"];
```
- **L1** This is the schema: the single list of allowed fields. Both validators read from it, so adding a field happens in one place.

```js
3  const isObject = data => data !== null && typeof data === "object" && !Array.isArray(data);
4  const isNonEmptyString = value => typeof value === "string" && value.trim() !== "";
```
- **L3** `typeof null === "object"` is a historic JavaScript quirk, hence the explicit `!== null`. Arrays are also `"object"`, hence `!Array.isArray`. Together these ensure the body is a plain `{...}` object. They also handle `undefined`, which Express 5 sets as the body when nothing was sent.
- **L4** Rejects numbers, `null`, and whitespace-only strings like `"   "`.

```js
7  function validateId(id) {
8      return /^[1-9]\d*$/.test(id);
9  }
```
- **L8** A regular expression, read left to right:
  - `^` start of string
  - `[1-9]` first digit 1–9, so there are no leading zeros (`01` fails) and no `0`
  - `\d*` zero or more digits
  - `$` end of string, so nothing may follow (`1abc` fails)
  - Signs and decimals (`-1`, `1.5`) and spaces are rejected.
  - `.test()` converts its argument to a string and returns a boolean.

```js
12 function validateProfile(data) {
13     return isObject(data) && PROFILE_FIELDS.every(field => isNonEmptyString(data[field]));
14 }
```
- **L13** `every` returns `true` only if the callback is `true` for **all** fields. It stops at the first failure. `&&` short-circuits, so `data[field]` is never read if `data` is not an object. That check is what prevents `Cannot read properties of undefined`.
- Extra keys are *allowed* here. They are removed later by the Service's `toProfileData`.

```js
17 function validateProfilePatch(data) {
18     if (!isObject(data)) return false;
19     const keys = Object.keys(data);
20     return keys.length > 0 && keys.every(key => PROFILE_FIELDS.includes(key) && isNonEmptyString(data[key]));
21 }
```
- **L19** `Object.keys` returns the object's own property names.
- **L20** Three rules:
  - at least one field (an empty PATCH is meaningless)
  - every key is known (stricter than `validateProfile`: unknown keys are rejected, not ignored)
  - every value is a non-empty string
- This strictness is what makes the Service's spread merge safe.

```js
23 module.exports = { validateId, validateProfile, validateProfilePatch };
```

---

### 4.7 `views/profileView.js`

The View defines the **shape of every response body**. It is the API's public contract.

```js
2  function formatProfile(profile) {
3      return { id: profile.id, name: profile.name, email: profile.email, role: profile.role };
9  }
```
- **L2–8** This is an *explicit allow-list* of output fields. If the stored profile later gains private fields (`passwordHash`, `createdBy`…), they will **not** leak to clients unless they are added here. It is the output-side equivalent of the Service's `toProfileData`.

```js
11 function presentProfile(profile) {
12     return { data: formatProfile(profile) };
15 }
```
- **L11–15** A single resource is wrapped in a `data` envelope. Every success response has its payload under `data`, so clients always know where to look.

```js
17 function presentProfileList(profiles, pagination) {
18     return { data: profiles.map(formatProfile), pagination };
22 }
```
- **L19** `.map(formatProfile)` passes the function itself as the callback, so each element goes through the same formatting.
- **L20** `pagination` is metadata. It sits *beside* `data`, not inside it.

```js
24 function presentError(message) {
25     return { message };
28 }
```
- **L24–28** All errors share one shape: `{ "message": "..." }`. The Controller uses this instead of building the object itself, so the View alone decides what JSON looks like, for successes and errors alike.

```js
30 module.exports = { presentProfile, presentProfileList, presentError };
```
- `formatProfile` is private. Callers only see the enveloped forms.

---

### 4.8 `public/api-tester.html`

This is a self-contained, Postman-like tester served by `express.static`. Open http://localhost:3000/api-tester.html. It is a client of the API, not part of its architecture. It uses **relative URLs** (`/profiles`), so requests go to the same origin and there are no CORS issues.

| Lines | Block | What it does |
|---|---|---|
| 1–6 | Document head | `<!doctype html>` makes the browser use standards mode. The `viewport` meta lets the layout adapt on phones. |
| 7–64 | `<style>` | Defines CSS **custom properties** on `:root` (L8): colours, plus one colour per HTTP method. L13 `@media (prefers-color-scheme: dark)` redefines them for dark mode, so every rule that uses `var(--x)` switches automatically. L57 `@media (max-width: 760px)` stacks the sidebar on top for small screens. |
| 66–74 | `<aside>` | Sidebar with the saved request collection (`#collection`) and the request history (`#history`). |
| 75–82 | `<form id="reqForm">` | Method `<select>`, URL input, and Send button. Using a `<form>` means Enter submits it. |
| 84–96 | Request card | Tabs for Params, Headers, and Body. Each `.pane` is shown or hidden by the tab script. |
| 98–112 | Response card | Status, time, size, plus Body and Headers panes. |
| 116 | `sample` | Example body used by POST and PUT. |
| 117–124 | `collection` | One preset per CRUD operation, matching Task 6 of the lab. |
| 126 | `$` | Shorthand for `document.querySelector`. |
| 127–130 | `store` | Wraps `localStorage` in `try/catch`. Storage can throw (private mode, blocked cookies), and a corrupted value would make `JSON.parse` throw. `?? d` falls back to a default. |
| 133–140 | Tabs | Uses **event delegation**: one listener per tab bar, and `e.target.closest(".tab")` finds which tab was clicked. `:scope > .pane` selects only *direct* child panes, so request tabs never toggle response panes. |
| 143–151 | `addRow` | Builds a key/value row (checkbox, key, value, remove). Uses array destructuring of `row.children`. For Params rows, any edit re-syncs the URL. |
| 153–155 | `rowsOf` | Reads the rows back as `{on, key, value}` and keeps only rows that are enabled and have a key. |
| 160–169 | URL ⇄ Params sync | `URLSearchParams` handles encoding: a space in a value becomes `+`, and `&` becomes `%26`. The two functions keep the URL bar and the Params table consistent in both directions. |
| 172–182 | `load` | Fills the form from a saved request. `colorMethod` colours the method dropdown using the `.m-GET` (etc.) classes. |
| 184–192 | `sidebarItem` | Creates a sidebar button. The label is set with `textContent`, not `innerHTML`, so a URL containing `<script>` is displayed as text instead of being executed (prevents XSS). |
| 194–198 | History | Renders and clears the last 20 requests from `localStorage`. |
| 201 | `esc` | HTML-escapes `& < >` **before** highlighting, so response data is never interpreted as HTML. |
| 202–207 | `highlight` | One regex finds JSON strings (with or without a trailing `:`, i.e. keys versus values), `true`/`false`/`null`, and numbers. Each match is wrapped in a coloured `<span>`. |
| 209–216 | Submit: collect | `e.preventDefault()` stops the form's default page reload. Reads the method, URL, enabled headers, and body. |
| 218–225 | Submit: body | Only POST, PUT, and PATCH send a body. The JSON is checked **in the browser** first, so you get a clear message instead of the server's 400 page. `Content-Type: application/json` is added automatically unless you set one, because `express.json()` (server.js L5) only parses that type. |
| 227–229 | Submit: start | Disables Send to prevent double submits. `performance.now()` is a high-resolution timer. |
| 230–241 | Submit: `fetch` | `await fetch` resolves once headers arrive, even for 4xx and 5xx responses (fetch only *rejects* on network failure). `res.text()` reads the body. The status is coloured green, amber, or red. The body is pretty-printed if it parses as JSON, otherwise shown as escaped text (a 204 shows "(empty body)"). |
| 242–245 | Submit: `catch` | Only reached on network errors, for example when the server is not running. |
| 246–248 | Submit: `finally` | Re-enables Send whether the request succeeded or failed. |
| 250–253 | Submit: history | Removes any older entry with the same method and URL, puts this request first, and keeps 20. |
| 257–259 | Shortcut | Ctrl/Cmd+Enter sends the request. `requestSubmit()` fires the form's `submit` event, unlike `form.submit()`. |
| 261–262 | Startup | Draws the history and loads the first preset. |

---

### 4.9 `README.md` and `.gitignore`

- **README.md** is the lab's "Update Your Documentation" deliverable: architecture, module responsibilities, request flow, and endpoint list.
- **.gitignore** contains `node_modules/`. Installed packages are large, platform-specific, and can be rebuilt from `package.json`, so they are not committed. (See §6: `package.json` is currently missing.)

---

## 5. Advanced concepts the code relies on

### 5.1 Module caching = a singleton data store
Node runs each module file **once**. `require` returns the cached `module.exports` on every later call. The `profiles` array therefore exists exactly once per process. Every request sees the same data, because every request reaches the same Repository module instance.

The functions `findAll`, `create`, and the rest are **closures**: they keep access to `profiles` and `nextId` even though those variables are not exported.

> **Trap on Windows:** the module cache is keyed by the file path *string*. Windows file names are case-insensitive, so `require("../Repositories/profileRepository")` (capital R) would still load. But Node would store it under a second cache key, which creates a **second copy of the data array**. On Linux (most servers and graders) the wrong case simply fails with `Cannot find module`. Always match the exact folder casing: `models`, `views`, `repositories`, `services`.

### 5.2 Errors as control flow, and why they are typed
Without exceptions, every Service function would have to return something like `{ ok, error, value }`, and every caller would need an `if` for each case. `throw` jumps straight to the nearest `catch`, which keeps the "happy path" code linear.

Typing the errors (`INVALID`, `NOT_FOUND`) and checking `instanceof ProfileError` separates two kinds of failure:
- **expected failures**: the client's fault, reported as 4xx
- **bugs**: the server's fault, reported as 500

### 5.3 What Express 5 does differently from Express 4 (version 5.3.0 is installed)
- `req.body` is `undefined`, not `{}`, when no body was parsed. The Model's `isObject` guards against this.
- If a handler throws, or returns a rejected promise, Express 5 forwards the error to the error handler automatically. That is why re-throwing in `sendError` produces a 500 instead of crashing the process.
- `req.query` uses the "simple" parser (Node's `querystring`). Repeated keys become arrays, and `role[x]=1` is **not** turned into a nested object. The Service's `typeof === "string"` checks rely on this.
- Path patterns use path-to-regexp v8. The old `:id?` and `*` syntax changed. `:id` behaves the same as before.

### 5.4 HTTP semantics the API follows
| Method | Safe? | Idempotent? | Success code | Why |
|---|---|---|---|---|
| GET | yes | yes | 200 | Reads only. |
| POST | no | **no** | 201 | Each call creates a new profile with a new id. |
| PUT | no | yes | 200 | Sending the same replacement twice leaves the same state. |
| PATCH | no | yes *for this API* | 200 | Setting `role` to `"recruiter"` twice gives the same state. A PATCH like "increment a counter" would not be idempotent. |
| DELETE | no | yes | 204 | The second call returns 404, but the *server state* is identical, which is what idempotency means. |

- `400 Bad Request`: the client sent something malformed (bad id, body, or query).
- `404 Not Found`: the input is well-formed, but that profile does not exist.

### 5.5 Input on the way in, output on the way out
Both ends of the system use a whitelist:
- **In:** the Model's `validateProfilePatch` rejects unknown keys, and the Service's `toProfileData` copies only known keys. This prevents mass assignment, such as a client overwriting `id`.
- **Out:** the View's `formatProfile` copies only public fields. This prevents data leaks.
- **Inside:** the Repository's `copy` hands out copies. This prevents changes to stored data that bypass the Repository.

### 5.6 `Number()` conversion edge cases (query parameters)
`Number` is lenient:
- `Number(" 2 ")` → 2
- `Number("2.0")` → 2
- `Number("1e1")` → 10
- `Number("0x10")` → 16

All of these are integers, so `?limit=1e1` is accepted as 10. IDs do not go through this leniency, because `validateId`'s regex runs **before** `Number`. Very large ids beyond `Number.MAX_SAFE_INTEGER` (2⁵³−1) pass the regex but lose precision. They can never match a stored id, so they simply return 404.

---

## 6. Known limitations

These are not lab requirements, but you should know about them:

1. **No `package.json`.** `node_modules/` is git-ignored, so someone who clones the repository cannot `npm install`. Run `npm init -y` and then `npm install express@5`, and commit `package.json` and `package-lock.json`.
2. **Malformed JSON returns an HTML error page.** For example, `{bad` gets Express's default 400 page with a stack trace, not `{ "message": ... }`. Fix: add an error-handling middleware `(err, req, res, next)` after the router in `server.js` that answers `res.status(err.status || 500).json({ message: ... })`.
3. **Data resets on restart.** That is expected for in-memory storage. Persisting it means replacing only the Repository.
4. **Email format is not checked.** Any non-empty string is accepted, and duplicate emails are allowed. Both rules would go in the Model (format) and the Service (uniqueness, via a new `findByEmail` in the Repository).
5. **`limit` has no maximum.** `?limit=1000000` is accepted. A real API would cap it.

---

## 7. Postman test plan

Use these for the lab's screenshots. Base URL: `http://localhost:3000`. Restart the server first to reset the data.

| # | Request | Body (raw → JSON) | Expect |
|---|---|---|---|
| 1 | `GET /profiles` | – | `200`, 4 profiles + `pagination` |
| 2 | `GET /profiles?page=1&limit=2&role=recruit` | – | `200`, filtered + paged |
| 3 | `GET /profiles/1` | – | `200`, `{ data: { id: 1, … } }` |
| 4 | `POST /profiles` | `{"name":"Jane Doe","email":"jane@example.com","role":"recruit"}` | `201`, new `id: 5` |
| 5 | `PUT /profiles/1` | `{"name":"New Name","email":"new@example.com","role":"recruiter"}` | `200`, all fields replaced |
| 6 | `PATCH /profiles/2` | `{"role":"recruiter"}` | `200`, only `role` changed — name/email preserved |
| 7 | `DELETE /profiles/4` | – | `204`, empty body |
| 8 | `GET /profiles/4` | – | `404 Profile not found` (proves the delete) |
| 9 | `GET /profiles/abc` | – | `400 ID must be a positive integer` |
| 10 | `POST /profiles` | `{"name":""}` | `400 Invalid profile data` |
| 11 | `PATCH /profiles/2` | `{}` | `400 Invalid update data` |
