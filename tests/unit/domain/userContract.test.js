const User = require("../../../domain/User");
const UserFactory = require("../../../domain/UserFactory");
const { userToJson } = require("../../../views/userView");

// Liskov Substitution: every kind of user must work anywhere a User is expected.
// The same checks run against all three subclasses.
const cases = [
    { role: "seeker", data: { fullName: "Salma", email: "s@s.co", headline: "Dev" } },
    { role: "company", data: { fullName: "Acme HR", email: "hr@acme.co", companyName: "Acme" } },
    { role: "admin", data: { fullName: "Mona", email: "m@w.co", adminRole: "moderator" } }
];

describe.each(cases)("$role behaves as a User", ({ role, data }) => {
    const make = () => UserFactory.createUser(role, data);

    it("is a User with the right role", () => {
        const user = make();
        expect(user).toBeInstanceOf(User);
        expect(user.getRole()).toBe(role);
    });

    it("passes signUp, logIn and logOut", () => {
        const user = make();
        expect(() => user.signUp()).not.toThrow();
        expect(() => user.logIn()).not.toThrow();
        expect(user.logOut()).toBe(true);
    });

    it("can change its name the same way", () => {
        const user = make();
        user.applyProfileChanges({ fullName: "New Name" });
        expect(user.getFullName()).toBe("New Name");
    });

    it("can be shown by the view", () => {
        const json = userToJson(make());
        expect(json.role).toBe(role);
        expect(json).not.toHaveProperty("passwordHash");
        expect(typeof make().getProfileFields()).toBe("object");
    });
});

describe("UserFactory", () => {
    it("rejects an unknown role", () => {
        expect(() => UserFactory.createUser("pirate", {})).toThrow("Unknown role");
    });
});
