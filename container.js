const Database = require("./config/Database");
const UserRepository = require("./repositories/UserRepository");
const FileRepository = require("./repositories/FileRepository");
const JobRepository = require("./repositories/JobRepository");
const SwipeRepository = require("./repositories/SwipeRepository");
const MatchRepository = require("./repositories/MatchRepository");
const MessageRepository = require("./repositories/MessageRepository");
const InterviewRepository = require("./repositories/InterviewRepository");
const CvRepository = require("./repositories/CvRepository");
const AIChatRepository = require("./repositories/AIChatRepository");
const ReviewRepository = require("./repositories/ReviewRepository");
const WarningRepository = require("./repositories/WarningRepository");
const SupportTicketRepository = require("./repositories/SupportTicketRepository");
const FlagRepository = require("./repositories/FlagRepository");
const AccountDataRepository = require("./repositories/AccountDataRepository");
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
const SeriousTagsRule = require("./rules/review/SeriousTagsRule");
const LowAverageRule = require("./rules/review/LowAverageRule");
const CvAdvisor = require("./rules/CvAdvisor");
const MissingSkillsRule = require("./rules/cv/MissingSkillsRule");
const SummaryRule = require("./rules/cv/SummaryRule");
const MissingDatesRule = require("./rules/cv/MissingDatesRule");
const MissingSectionsRule = require("./rules/cv/MissingSectionsRule");
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
const CvService = require("./services/CvService");
const AssistantService = require("./services/AssistantService");
const FlagService = require("./services/FlagService");
const ReviewService = require("./services/ReviewService");
const TrustService = require("./services/TrustService");
const AdminService = require("./services/AdminService");
const DataService = require("./services/DataService");
const PdfExporter = require("./services/export/PdfExporter");
const MockModel = require("./services/ai/MockModel");
const GeminiFlash = require("./services/ai/GeminiFlash");
const Haiku = require("./services/ai/Haiku");
const Sonnet = require("./services/ai/Sonnet");
const Anthropic = require("@anthropic-ai/sdk");
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
const CvController = require("./controllers/CvController");
const AssistantController = require("./controllers/AssistantController");
const TrustController = require("./controllers/TrustController");
const ReviewController = require("./controllers/ReviewController");
const AdminController = require("./controllers/AdminController");
const { createAuthMiddleware } = require("./middleware/auth");

// FR-19: AI_MODEL in .env picks the provider (Strategy). Each entry needs its key; mock needs none.
// A new provider is one new class and one new line here (Open/Closed).
const AI_MODELS = {
    mock: () => new MockModel(),
    gemini: () => process.env.GEMINI_API_KEY &&
        new GeminiFlash(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || "gemini-3-flash-preview", fetch),
    haiku: () => process.env.ANTHROPIC_API_KEY && new Haiku(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })),
    sonnet: () => process.env.ANTHROPIC_API_KEY && new Sonnet(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
};

function buildAIModel() {
    const choice = (process.env.AI_MODEL || "mock").trim().toLowerCase();
    const build = AI_MODELS[choice];
    const model = build ? build() : null;
    if (model) return model;
    console.warn(`AI_MODEL=${choice} is unknown or its API key is missing in .env, so the mock model is used.`);
    return new MockModel();
}

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
    const cvRepository = new CvRepository();
    const aiModel = buildAIModel();
    const aiChatRepository = new AIChatRepository(aiModel);
    const reviewRepository = new ReviewRepository();
    const warningRepository = new WarningRepository();
    const ticketRepository = new SupportTicketRepository();
    const flagRepository = new FlagRepository();
    const accountDataRepository = new AccountDataRepository(database);

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

    // FR-42: one of these is enough (minHits = 1). Same FlagChecker class as spam (Open/Closed).
    const reviewFlagChecker = new FlagChecker([
        new SeriousTagsRule(3, 30),
        new LowAverageRule(2, 5)
    ], 1);
    // FR-34: spam and review flags go to one moderator list
    const flagService = new FlagService(flagRepository);

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
        seeker: new SeekerSwipeHandler(swipeRepository, spamChecker, DAILY_INTERESTED_LIMIT, flagService),
        company: new CompanySwipeHandler(userRepository)
    };
    const swipeService = new SwipeService(swipeRepository, matchRepository, jobRepository, swipeHandlers, notifier);
    const feedService = new FeedService(jobRepository, swipeRepository, userRepository, reviewRepository);

    // Phase 3: chat, interviews, status bar. FR-25 video calls go through Jitsi Meet.
    const matchGuard = new MatchGuard(matchRepository);
    const videoCalls = new JitsiMeet(process.env.JWT_SECRET);
    const chatService = new ChatService(messageRepository, matchRepository, matchGuard, videoCalls, notifier);
    const interviewService = new InterviewService(interviewRepository, matchRepository, matchGuard, chatService);
    const matchService = new MatchService(matchRepository, jobRepository, userRepository, interviewRepository, matchGuard, chatService);

    // Phase 4: CV, ATS score (FR-08 to FR-10) and the AI helper (FR-19 to FR-21).
    // FR-09: up to 5 fixes. A new kind of fix is one more rule in this list.
    const cvAdvisor = new CvAdvisor([
        new MissingSkillsRule(2),
        new SummaryRule(),
        new MissingDatesRule(),
        new MissingSectionsRule()
    ], 5);
    const cvService = new CvService(cvRepository, userRepository, jobRepository, swipeRepository, fileRepository, cvAdvisor, new PdfExporter());
    const assistantService = new AssistantService(aiChatRepository, jobRepository, swipeRepository, userRepository);

    // Phase 5: reviews (FR-38 to FR-43), Trust centre (FR-05 to FR-07), admin (FR-33 to FR-37)
    const reviewService = new ReviewService(reviewRepository, interviewRepository, userRepository, matchGuard, reviewFlagChecker, flagService, notifier);
    const trustService = new TrustService(warningRepository, ticketRepository);
    const adminService = new AdminService(userRepository, flagRepository, warningRepository, ticketRepository, reviewRepository, notifier);
    const dataService = new DataService(accountDataRepository, userRepository, matchRepository, passwordHasher, chatService);

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
        cvController: new CvController(cvService),
        assistantController: new AssistantController(assistantService),
        trustController: new TrustController(trustService, dataService),
        reviewController: new ReviewController(reviewService),
        adminController: new AdminController(adminService),
        // used by server.js only: the live socket and the timed jobs
        socketServer: new SocketServer(tokenService, userRepository, matchRepository, notifier),
        scheduler: new Scheduler(cron, matchService, interviewService, reviewService),
        // used by tests to run the timed jobs on demand
        matchService,
        interviewService,
        reviewService
    };
}

module.exports = { buildContainer, buildAIModel };
