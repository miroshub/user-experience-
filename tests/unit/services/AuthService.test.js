const AuthService = require("../../../services/AuthService");
const JobSeeker = require("../../../domain/JobSeeker");

// Dependency Inversion pays off here: fakes are passed in, no database or bcrypt needed
function makeFakes(existing = null) {
    const saved = [];
    const userRepository = {
        existsWithEmail: async email => existing !== null && existing.user.getEmail() === email,
        existsWithPhone: async () => false,
        create: async user => { user.setUserId("id-1"); saved.push(user); return user; },
        findByLogin: async login => (existing && existing.user.getEmail() === login ? existing : null)
    };
    const passwordHasher = {
        hash: async plain => "hashed:" + plain,
        compare: async (plain, hash) => hash === "hashed:" + plain
    };
    const tokenService = { sign: user => "token-for-" + user.getUserId() };
    return { service: new AuthService(userRepository, passwordHasher, tokenService), saved };
}

const goodSignUp = { role: "seeker", fullName: "Salma", email: "salma@example.com", password: "longenough" };

describe("AuthService.signUp", () => {
    it("creates the right kind of user and returns a token", async () => {
        const { service, saved } = makeFakes();
        const result = await service.signUp(goodSignUp);
        expect(result.user).toBeInstanceOf(JobSeeker);
        expect(result.token).toBe("token-for-id-1");
        expect(saved).toHaveLength(1);
    });

    it("refuses admin sign-ups", async () => {
        const { service } = makeFakes();
        await expect(service.signUp({ ...goodSignUp, role: "admin" })).rejects.toMatchObject({ status: 400 });
    });

    it("refuses short passwords", async () => {
        const { service } = makeFakes();
        await expect(service.signUp({ ...goodSignUp, password: "short" })).rejects.toMatchObject({ status: 400 });
    });

    it("refuses a taken email", async () => {
        const existing = { user: new JobSeeker({ userId: "x", fullName: "Old", email: "salma@example.com" }), passwordHash: "h" };
        const { service } = makeFakes(existing);
        await expect(service.signUp(goodSignUp)).rejects.toMatchObject({ status: 409 });
    });
});

describe("AuthService.logIn", () => {
    const existing = {
        user: new JobSeeker({ userId: "id-9", fullName: "Salma", email: "salma@example.com" }),
        passwordHash: "hashed:longenough"
    };

    it("logs in with the right password", async () => {
        const { service } = makeFakes(existing);
        const result = await service.logIn({ login: "salma@example.com", password: "longenough" });
        expect(result.token).toBe("token-for-id-9");
    });

    it("gives the same answer for a wrong password and an unknown account", async () => {
        const { service } = makeFakes(existing);
        const wrongPassword = service.logIn({ login: "salma@example.com", password: "nope-nope" });
        const unknown = service.logIn({ login: "ghost@example.com", password: "longenough" });
        await expect(wrongPassword).rejects.toMatchObject({ status: 401, message: "Wrong email/phone or password" });
        await expect(unknown).rejects.toMatchObject({ status: 401, message: "Wrong email/phone or password" });
    });
});
