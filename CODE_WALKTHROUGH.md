# Code walkthrough

How one request travels through the app, file by file. The example is a seeker signing up.

## 1. Start-up: who builds what

`server.js` reads `.env`, calls `buildContainer()` and connects to MongoDB.

`container.js` is the only file that uses `new` on concrete classes:

```js
const database = Database.getInstance();              // Singleton: one connection
const userRepository = new UserRepository();
const passwordHasher = new PasswordHasher(10);
const tokenService = new TokenService(process.env.JWT_SECRET);
const authService = new AuthService(userRepository, passwordHasher, tokenService);
authController: new AuthController(authService)
```

Every class receives its helpers through its constructor (Dependency Inversion). A test can therefore pass in fakes, as `tests/unit/services/AuthService.test.js` does.

## 2. The request: `POST /api/auth/signup`

Body: `{ "role": "seeker", "fullName": "Salma", "email": "salma@example.com", "password": "Password123!" }`

| Step | File | What happens |
|---|---|---|
| 1 | `app.js` | `express.json()` turns the body into `req.body` |
| 2 | `routes/authRoutes.js` | `POST /api/auth/signup` goes to `authController.signUp` |
| 3 | `controllers/AuthController.js` | Passes `req.body` to `authService.signUp`. HTTP only, no rules |
| 4 | `services/AuthService.js` | Checks the role (only seeker or company) and the password length |
| 5 | `domain/UserFactory.js` | `createUser("seeker", data)` returns a `JobSeeker` (map of role to class) |
| 6 | `domain/User.js` | `user.signUp()` checks the name, the email or phone, and their formats |
| 7 | `repositories/UserRepository.js` | `existsWithEmail` stops duplicates (409) |
| 8 | `security/PasswordHasher.js` | bcrypt turns the password into a hash |
| 9 | `repositories/UserRepository.js` | `create(user, hash)` saves through the `seeker` discriminator model |
| 10 | `security/TokenService.js` | Signs a JWT holding the user id and role |
| 11 | `views/userView.js` | Shapes `{ data: { user, token } }`. The hash is never in it |
| 12 | `controllers/AuthController.js` | Sends status `201` |

If anything goes wrong, a service or domain class throws `new AppError(message, status)`. Express 5 passes it to `middleware/errorHandler.js`, which sends `{ message }` with that status.

## 3. A protected request: `GET /api/users/me`

1. `middleware/auth.js` reads `Authorization: Bearer <token>`.
2. `TokenService.verify` checks the signature and the expiry date. A fake or changed token returns `null`, which gives a 401.
3. The user is loaded fresh from the database, so a suspension works at once (403).
4. `req.user` is set, and `UserController.getMe` sends it through the view.

## 4. Where each SOLID principle shows

| Principle | Example |
|---|---|
| Single Responsibility | Controller = HTTP, Service = rules, Repository = database, View = JSON shape |
| Open/Closed | `UserFactory` role map: a new role is one new line |
| Liskov Substitution | `tests/unit/domain/userContract.test.js` runs the same checks on JobSeeker, Company and Admin |
| Interface Segregation | Admin has no seeker or company fields or methods; each subclass only adds what it needs |
| Dependency Inversion | `container.js` hands every class its dependencies |

## 5. Data storage

- One `users` collection. The `role` field selects the Mongoose discriminator (`seeker`, `company` or `admin`), and each has its own extra fields.
- `email` and `phone` have unique indexes that ignore missing values, so email-only and phone-only accounts both work.
- Files (ID scans, logos) are stored in GridFS (`files.*` collections) through `repositories/FileRepository.js`. ID scans are private; logos are public.
