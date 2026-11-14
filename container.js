const Database = require("./config/Database");
const UserRepository = require("./repositories/UserRepository");
const FileRepository = require("./repositories/FileRepository");
const PasswordHasher = require("./security/PasswordHasher");
const TokenService = require("./security/TokenService");
const HealthService = require("./services/HealthService");
const AuthService = require("./services/AuthService");
const UserService = require("./services/UserService");
const FileService = require("./services/FileService");
const HealthController = require("./controllers/HealthController");
const AuthController = require("./controllers/AuthController");
const UserController = require("./controllers/UserController");
const FileController = require("./controllers/FileController");
const { createAuthMiddleware } = require("./middleware/auth");

// Dependency Inversion: this is the only file that creates concrete classes.
// Everything else receives what it needs through its constructor.
function buildContainer() {
    const database = Database.getInstance();

    // repositories (talk to MongoDB)
    const userRepository = new UserRepository();
    const fileRepository = new FileRepository(database);

    // security
    const passwordHasher = new PasswordHasher(Number(process.env.BCRYPT_ROUNDS) || 10);
    const tokenService = new TokenService(process.env.JWT_SECRET);
    const auth = createAuthMiddleware(tokenService, userRepository);

    // services (business rules)
    const healthService = new HealthService(database);
    const authService = new AuthService(userRepository, passwordHasher, tokenService);
    const userService = new UserService(userRepository, fileRepository);
    const fileService = new FileService(fileRepository);

    // controllers (HTTP only)
    return {
        database,
        auth,
        userRepository,
        passwordHasher,
        healthController: new HealthController(healthService),
        authController: new AuthController(authService),
        userController: new UserController(userService),
        fileController: new FileController(fileService)
    };
}

module.exports = { buildContainer };
