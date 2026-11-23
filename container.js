const Database = require("./config/Database");
const UserRepository = require("./repositories/UserRepository");
const FileRepository = require("./repositories/FileRepository");
const JobRepository = require("./repositories/JobRepository");
const SwipeRepository = require("./repositories/SwipeRepository");
const MatchRepository = require("./repositories/MatchRepository");
const MessageRepository = require("./repositories/MessageRepository");
const InterviewRepository = require("./repositories/InterviewRepository");
const SocketNotifier = require("./realtime/SocketNotifier");
const SocketServer = require("./realtime/SocketServer");
const Scheduler = require("./realtime/Scheduler");
const cron = require("node-cron");
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
const SeekerSwipeHandler = require("./services/swipe/SeekerSwipeHandler");
const CompanySwipeHandler = require("./services/swipe/CompanySwipeHandler");
const FeedService = require("./services/FeedService");
const MatchService = require("./services/MatchService");
const MatchGuard = require("./services/MatchGuard");
const ChatService = require("./services/ChatService");
const InterviewService = require("./services/InterviewService");
const JitsiMeet = require("./services/video/JitsiMeet");
const HealthController = require("./controllers/HealthController");
const AuthController = require("./controllers/AuthController");
const UserController = require("./controllers/UserController");
const FileController = require("./controllers/FileController");
const JobController = require("./controllers/JobController");
const SwipeController = require("./controllers/SwipeController");
const FeedController = require("./controllers/FeedController");
const MatchController = require("./controllers/MatchController");
const ChatController = require("./controllers/ChatController");
const InterviewController = require("./controllers/InterviewController");
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
    const messageRepository = new MessageRepository();
    const interviewRepository = new InterviewRepository();

    // live updates: silent until server.js attaches Socket.io, so tests and scripts need no socket
    const notifier = new SocketNotifier();

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
    // Open/Closed: one handler per role that can swipe. Admins are not here, so they cannot swipe.
    // Seekers can say Interested to 50 jobs a day; the 51st is refused. Skips are not counted.
    const DAILY_INTERESTED_LIMIT = 50;
    const swipeHandlers = {
        seeker: new SeekerSwipeHandler(swipeRepository, spamChecker, DAILY_INTERESTED_LIMIT),
        company: new CompanySwipeHandler(userRepository)
    };
    const swipeService = new SwipeService(swipeRepository, matchRepository, jobRepository, swipeHandlers, notifier);
    const feedService = new FeedService(jobRepository, swipeRepository, userRepository);

    // Phase 3: chat, interviews, status bar. FR-25 video calls go through Jitsi Meet.
    const matchGuard = new MatchGuard(matchRepository);
    const videoCalls = new JitsiMeet(process.env.JWT_SECRET);
    const chatService = new ChatService(messageRepository, matchRepository, matchGuard, videoCalls, notifier);
    const interviewService = new InterviewService(interviewRepository, matchRepository, matchGuard, chatService);
    const matchService = new MatchService(matchRepository, jobRepository, userRepository, interviewRepository, matchGuard, chatService);

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
        matchController: new MatchController(matchService),
        chatController: new ChatController(chatService),
        interviewController: new InterviewController(interviewService),
        // used by server.js only: the live socket and the timed jobs
        socketServer: new SocketServer(tokenService, userRepository, matchRepository, notifier),
        scheduler: new Scheduler(cron, matchService, interviewService),
        // used by tests to run the timed jobs on demand
        matchService,
        interviewService
    };
}

module.exports = { buildContainer };
