const Database = require("./config/Database");
const UserRepository = require("./repositories/UserRepository");
const FileRepository = require("./repositories/FileRepository");
const JobRepository = require("./repositories/JobRepository");
const SwipeRepository = require("./repositories/SwipeRepository");
const MatchRepository = require("./repositories/MatchRepository");
const PasswordHasher = require("./security/PasswordHasher");
const TokenService = require("./security/TokenService");
const FlagChecker = require("./rules/FlagChecker");
const NewAccountRule = require("./rules/spam/NewAccountRule");
const NotVerifiedRule = require("./rules/spam/NotVerifiedRule");
const MassApplyRule = require("./rules/spam/MassApplyRule");
const EmptyProfileRule = require("./rules/spam/EmptyProfileRule");
const HealthService = require("./services/HealthService");
const AuthService = require("./services/AuthService");
const UserService = require("./services/UserService");
const FileService = require("./services/FileService");
const JobService = require("./services/JobService");
const SwipeService = require("./services/SwipeService");
const FeedService = require("./services/FeedService");
const MatchService = require("./services/MatchService");
const HealthController = require("./controllers/HealthController");
const AuthController = require("./controllers/AuthController");
const UserController = require("./controllers/UserController");
const FileController = require("./controllers/FileController");
const JobController = require("./controllers/JobController");
const SwipeController = require("./controllers/SwipeController");
const FeedController = require("./controllers/FeedController");
const MatchController = require("./controllers/MatchController");
const { createAuthMiddleware } = require("./middleware/auth");

// Dependency Inversion: this is the only file that creates concrete classes.
// Everything else receives what it needs through its constructor.
function buildContainer() {
    const database = Database.getInstance();

    // repositories (talk to MongoDB)
    const userRepository = new UserRepository();
    const fileRepository = new FileRepository(database);
    const jobRepository = new JobRepository();
    const swipeRepository = new SwipeRepository();
    const matchRepository = new MatchRepository();

    // security
    const passwordHasher = new PasswordHasher(Number(process.env.BCRYPT_ROUNDS) || 10);
    const tokenService = new TokenService(process.env.JWT_SECRET);
    const auth = createAuthMiddleware(tokenService, userRepository);

    // FR-18: 2 or more of these rules = "Check later". A new rule is one more line here.
    const spamChecker = new FlagChecker([
        new NewAccountRule(),
        new NotVerifiedRule(),
        new MassApplyRule(),
        new EmptyProfileRule()
    ], 2);

    // services (business rules)
    const healthService = new HealthService(database);
    const authService = new AuthService(userRepository, passwordHasher, tokenService);
    const userService = new UserService(userRepository, fileRepository);
    const fileService = new FileService(fileRepository);
    const jobService = new JobService(jobRepository, fileRepository);
    const swipeService = new SwipeService(swipeRepository, matchRepository, jobRepository, userRepository, spamChecker);
    const feedService = new FeedService(jobRepository, swipeRepository, userRepository);
    const matchService = new MatchService(matchRepository, jobRepository, userRepository);

    // controllers (HTTP only)
    return {
        database,
        auth,
        userRepository,
        passwordHasher,
        healthController: new HealthController(healthService),
        authController: new AuthController(authService),
        userController: new UserController(userService),
        fileController: new FileController(fileService),
        jobController: new JobController(jobService),
        swipeController: new SwipeController(swipeService),
        feedController: new FeedController(feedService),
        matchController: new MatchController(matchService)
    };
}

module.exports = { buildContainer };
