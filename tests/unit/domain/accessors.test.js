const JobSeeker = require("../../../domain/JobSeeker");
const Company = require("../../../domain/Company");
const Admin = require("../../../domain/Admin");

// The getters and setters from the class diagram, checked once each
describe("getters and setters", () => {
    it("User fields", () => {
        const user = new JobSeeker({ fullName: "Salma", email: "s@s.co" });
        user.setUserId("u1");
        user.setEmail("new@s.co");
        user.setPhone("+201001234567");
        user.setRole("seeker");
        user.setIsVerified(true);
        user.setAccountState("suspended");
        expect([user.getUserId(), user.getEmail(), user.getPhone(), user.getRole(), user.getIsVerified(), user.getAccountState()])
            .toEqual(["u1", "new@s.co", "+201001234567", "seeker", true, "suspended"]);
    });

    it("JobSeeker fields", () => {
        const seeker = new JobSeeker({ fullName: "Salma", email: "s@s.co" });
        seeker.setCity("Giza");
        seeker.setHeadline("QA tester");
        expect([seeker.getCity(), seeker.getHeadline()]).toEqual(["Giza", "QA tester"]);
        expect(() => seeker.setCity(3)).toThrow("City must be text");
    });

    it("Company fields", () => {
        const company = new Company({ fullName: "Acme HR", email: "hr@acme.co" });
        company.setIndustry("Software");
        company.setLocation("Cairo");
        company.setLogoId("f1");
        expect([company.getIndustry(), company.getLocation(), company.getSize(), company.getAbout(), company.getLogoId()])
            .toEqual(["Software", "Cairo", "", "", "f1"]);
        expect(() => company.setIndustry(null)).toThrow("Industry must be text");
    });

    it("Admin fields", () => {
        const admin = new Admin({ fullName: "Mona", email: "m@w.co" });
        expect(admin.getAdminRole()).toBe("moderator");
        admin.setAdminRole("support");
        expect(admin.getAdminRole()).toBe("support");
    });
});
