const UserFactory = require("../domain/UserFactory");
const AppError = require("../errors/AppError");

// Only these can sign up themselves. Admins are made by the seed script.
const SIGN_UP_ROLES = ["seeker", "company"];
const MIN_PASSWORD_LENGTH = 8;

// Same message for "no such account" and "wrong password", so it gives no hint (FR-02)
const LOGIN_FAILED = "Wrong email/phone or password";

class AuthService {
    #userRepository;
    #passwordHasher;
    #tokenService;

    constructor(userRepository, passwordHasher, tokenService) {
        this.#userRepository = userRepository;
        this.#passwordHasher = passwordHasher;
        this.#tokenService = tokenService;
    }

    async signUp(data) {
        if (!data || typeof data !== "object") throw new AppError("Invalid data", 400);
        if (!SIGN_UP_ROLES.includes(data.role)) {
            throw new AppError('Pick "Find a job" or "Hire someone"', 400);
        }
        if (typeof data.password !== "string" || data.password.length < MIN_PASSWORD_LENGTH) {
            throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
        }

        const user = UserFactory.createUser(data.role, {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName
        });
        user.signUp();

        if (user.getEmail() && await this.#userRepository.existsWithEmail(user.getEmail())) {
            throw new AppError("An account with this email already exists", 409);
        }
        if (user.getPhone() && await this.#userRepository.existsWithPhone(user.getPhone())) {
            throw new AppError("An account with this phone number already exists", 409);
        }

        const passwordHash = await this.#passwordHasher.hash(data.password);
        const saved = await this.#userRepository.create(user, passwordHash);
        return { user: saved, token: this.#tokenService.sign(saved) };
    }

    async logIn(data) {
        if (!data || typeof data.login !== "string" || typeof data.password !== "string") {
            throw new AppError(LOGIN_FAILED, 401);
        }

        const found = await this.#userRepository.findByLogin(data.login);
        if (!found) throw new AppError(LOGIN_FAILED, 401);

        const matches = await this.#passwordHasher.compare(data.password, found.passwordHash);
        if (!matches) throw new AppError(LOGIN_FAILED, 401);

        found.user.logIn();
        return { user: found.user, token: this.#tokenService.sign(found.user) };
    }
}

module.exports = AuthService;
