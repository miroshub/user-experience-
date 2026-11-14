const JobSeeker = require("../../../domain/JobSeeker");
const Company = require("../../../domain/Company");
const Admin = require("../../../domain/Admin");

describe("User.signUp", () => {
    it("accepts email only", () => {
        const user = new JobSeeker({ fullName: " Salma Ali ", email: "SALMA@Example.com" });
        user.signUp();
        expect(user.getFullName()).toBe("Salma Ali");
        expect(user.getEmail()).toBe("salma@example.com");
    });

    it("accepts phone only", () => {
        const user = new JobSeeker({ fullName: "Salma", phone: "+201001234567" });
        expect(() => user.signUp()).not.toThrow();
    });

    it("needs a name", () => {
        expect(() => new JobSeeker({ fullName: "  ", email: "a@b.co" }).signUp()).toThrow("Full name is required");
    });

    it("needs an email or a phone", () => {
        expect(() => new JobSeeker({ fullName: "Salma" }).signUp()).toThrow("Email or phone number is required");
    });

    it("rejects a bad email and a bad phone", () => {
        expect(() => new JobSeeker({ fullName: "S", email: "not-an-email" }).signUp()).toThrow("Email address is not valid");
        expect(() => new JobSeeker({ fullName: "S", phone: "12ab" }).signUp()).toThrow("Phone number is not valid");
    });
});

describe("User.logIn and logOut", () => {
    it("lets an active account in", () => {
        expect(() => new Company({ fullName: "Acme", email: "hr@acme.co" }).logIn()).not.toThrow();
    });

    it("blocks a suspended account", () => {
        const user = new Company({ fullName: "Acme", email: "hr@acme.co", accountState: "suspended" });
        expect(() => user.logIn()).toThrow("This account is suspended");
    });

    it("logOut needs nothing from the server", () => {
        expect(new JobSeeker({ fullName: "S", email: "s@s.co" }).logOut()).toBe(true);
    });
});

describe("profile changes", () => {
    it("seeker can change headline, city and skills", () => {
        const user = new JobSeeker({ fullName: "Salma", email: "s@s.co" });
        user.applyProfileChanges({ headline: "Junior React dev", city: "Cairo", skills: [" React ", "CSS", "React", ""] });
        expect(user.getProfileFields()).toEqual({ headline: "Junior React dev", city: "Cairo", skills: ["React", "CSS"] });
    });

    it("seeker cannot set company fields", () => {
        const user = new JobSeeker({ fullName: "Salma", email: "s@s.co" });
        expect(() => user.applyProfileChanges({ companyName: "Acme" })).toThrow('"companyName" cannot be changed here');
    });

    it("company profile fields are checked", () => {
        const company = new Company({ fullName: "Acme HR", email: "hr@acme.co" });
        company.applyProfileChanges({ companyName: "Acme", size: "11-50", about: "Small, friendly team" });
        expect(company.getCompanyName()).toBe("Acme");
        expect(() => company.applyProfileChanges({ size: "huge" })).toThrow("Size must be one of");
        expect(() => company.applyProfileChanges({ about: "x".repeat(501) })).toThrow("500 characters");
    });

    it("bad types are rejected", () => {
        const user = new JobSeeker({ fullName: "Salma", email: "s@s.co" });
        expect(() => user.applyProfileChanges({ skills: "React" })).toThrow("Skills must be a list");
        expect(() => user.applyProfileChanges({ fullName: "" })).toThrow("Full name cannot be empty");
        expect(() => user.applyProfileChanges({ headline: 5 })).toThrow("Headline must be text");
    });

    it("admin can only change the name", () => {
        const admin = new Admin({ fullName: "Mona", email: "m@w.co", adminRole: "support" });
        expect(admin.getEditableFields()).toEqual(["fullName"]);
        expect(() => admin.setAdminRole("boss")).toThrow("moderator or support");
    });
});
