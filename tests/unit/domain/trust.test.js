const Warning = require("../../../domain/Warning");
const SupportTicket = require("../../../domain/SupportTicket");
const Review = require("../../../domain/Review");
const Flag = require("../../../domain/Flag");
const Admin = require("../../../domain/Admin");
const JobSeeker = require("../../../domain/JobSeeker");
const Company = require("../../../domain/Company");
const Interview = require("../../../domain/Interview");

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-25T10:00:00Z");
const later = days => new Date(now.getTime() + days * DAY);

const moderator = new Admin({ userId: "a1", fullName: "Mona", email: "m@w.test", adminRole: "moderator" });
const support = new Admin({ userId: "a2", fullName: "Sami", email: "s@w.test", adminRole: "support" });
const seeker = () => new JobSeeker({ userId: "u1", fullName: "Salma", email: "salma@x.co", headline: "Dev", city: "Cairo", skills: ["React"] });

describe("Warning (FR-35, FR-36)", () => {
    it("gets a fix-by date 7 days after it is sent", () => {
        const w = moderator.sendWarning(seeker(), "  Fake job posts  ", now);
        expect(w.getDeadline()).toEqual(later(7));
        expect(w.getReason()).toBe("Fake job posts");
        expect(w.getAdminId()).toBe("a1");
        expect(w.daysLeft(now)).toBe(7);
    });

    it("needs a reason of up to 300 characters", () => {
        expect(() => moderator.sendWarning(seeker(), " ", now)).toThrow("reason");
        expect(() => moderator.sendWarning(seeker(), "x".repeat(301), now)).toThrow("300");
    });

    it("is open, then expired once the deadline passes, unless it was fixed", () => {
        const w = moderator.sendWarning(seeker(), "Rude messages", now);
        expect(w.currentStatus(later(6))).toBe("open");
        expect(w.currentStatus(later(7))).toBe("expired");
        expect(w.daysLeft(later(8))).toBe(0);
        w.markFixed();
        expect(w.currentStatus(later(8))).toBe("fixed");
        expect(() => w.markFixed()).toThrow("already fixed");
    });

    it("can link to a review as evidence (FR-43)", () => {
        const review = new Review({ reviewId: "r1", matchId: "m1", reviewerId: "u2", revieweeId: "u1", stars: 1 });
        expect(moderator.sendWarning(seeker(), "Fake profile", now, review).getReviewId()).toBe("r1");
    });

    it("cannot be sent to an admin, or by support staff", () => {
        expect(() => moderator.sendWarning(support, "x", now)).toThrow("Admins cannot be warned");
        expect(() => support.sendWarning(seeker(), "x", now)).toThrow("cannot open");
    });
});

describe("Admin.suspend (FR-36)", () => {
    it("is refused without a warning past its fix-by date", () => {
        const user = seeker();
        const open = moderator.sendWarning(user, "Spam", now);
        expect(() => moderator.suspend(user, [], now)).toThrow(/7-day/);
        expect(() => moderator.suspend(user, [open], later(3))).toThrow(/7-day/);
    });

    it("works once a warning has expired", () => {
        const user = seeker();
        const warning = moderator.sendWarning(user, "Spam", now);
        moderator.suspend(user, [warning], later(7));
        expect(user.getAccountState()).toBe("suspended");
        expect(() => moderator.suspend(user, [warning], later(8))).toThrow("already suspended");
    });

    it("ignores a fixed warning and other people's warnings", () => {
        const user = seeker();
        const fixed = moderator.sendWarning(user, "Spam", now);
        fixed.markFixed();
        const someoneElse = new Warning({ userId: "u9", adminId: "a1", reason: "x", createdAt: now });
        expect(() => moderator.suspend(user, [fixed, someoneElse], later(30))).toThrow(/7-day/);
    });
});

describe("Admin tabs (FR-33)", () => {
    it("moderators and support staff each see only their own tabs", () => {
        expect(moderator.getTabs()).toEqual(["flags", "reviews", "warnings", "users"]);
        expect(support.getTabs()).toEqual(["inbox"]);
        expect(() => support.requireTab("flags")).toThrow();
        expect(() => moderator.requireTab("inbox")).toThrow();
    });
});

describe("SupportTicket (FR-06, FR-37)", () => {
    it("is opened by any user through contactSupport()", () => {
        const ticket = seeker().contactSupport("Account", "  I cannot upload my ID  ", now);
        expect(ticket.getMessage()).toBe("I cannot upload my ID");
        expect(ticket.isOpen()).toBe(true);
        expect(ticket.hoursWaiting(new Date(now.getTime() + 5.5 * 60 * 60 * 1000))).toBe(5);
    });

    it("needs a known topic and a message", () => {
        expect(() => seeker().contactSupport("Pizza", "hi", now)).toThrow("topic");
        expect(() => seeker().contactSupport("Account", " ", now)).toThrow("message");
        expect(() => seeker().contactSupport("Account", "x".repeat(1001), now)).toThrow("1000");
    });

    it("gets a reply, then is closed, and a closed ticket takes no more replies", () => {
        const ticket = seeker().contactSupport("Account", "Help", now);
        expect(() => ticket.answer("a2", " ", now)).toThrow("write a reply");
        ticket.answer("a2", "Done, try again", now);
        expect(ticket.getReply()).toBe("Done, try again");
        expect(ticket.getRepliedAt()).toEqual(now);
        ticket.close("a2");
        expect(ticket.getStatus()).toBe("closed");
        expect(() => ticket.answer("a2", "more", now)).toThrow("closed");
        expect(() => ticket.close("a2")).toThrow("already closed");
    });
});

function review(overrides = {}) {
    return new Review({ matchId: "m1", reviewerId: "u2", revieweeId: "u1", stars: 4, createdAt: now, ...overrides });
}

describe("Review (FR-38 to FR-41)", () => {
    it("checks stars, tags and comment, and starts hidden", () => {
        const r = review({ tags: ["Rude", "Rude"], comment: "  Late  " });
        r.submit();
        expect(r.getStatus()).toBe("hidden");
        expect(r.getTags()).toEqual(["Rude"]);
        expect(r.getComment()).toBe("Late");
        expect(() => review({ stars: 0 }).submit()).toThrow("1 to 5");
        expect(() => review({ stars: 2.5 }).submit()).toThrow("1 to 5");
        expect(() => review({ tags: ["Lazy"] }).submit()).toThrow("Unknown tag");
        expect(() => review({ comment: "x".repeat(301) }).submit()).toThrow("300");
    });

    it("isSerious() for Ghosted, No-show or Fake, not for Rude", () => {
        expect(review({ tags: ["Ghosted"] }).isSerious()).toBe(true);
        expect(review({ tags: ["Fake job / fake profile"] }).isSerious()).toBe(true);
        expect(review({ tags: ["Rude"] }).isSerious()).toBe(false);
    });

    it("is revealed after 14 days (blind until then)", () => {
        const r = review();
        expect(r.isRevealDue(later(13))).toBe(false);
        expect(r.isRevealDue(later(14))).toBe(true);
        r.reveal();
        expect(r.isVisible()).toBe(true);
    });

    it("takes one reply, only from the reviewed person, once visible", () => {
        const r = review();
        expect(() => r.addReply("u1", "Hi")).toThrow("visible");
        r.reveal();
        expect(() => r.addReply("u2", "Hi")).toThrow("Only the reviewed person");
        expect(() => r.addReply("u1", " ")).toThrow("write a reply");
        r.addReply("u1", " Sorry, my train was late ");
        expect(r.getReply()).toBe("Sorry, my train was late");
        expect(() => r.addReply("u1", "again")).toThrow("already replied");
    });

    it("dispute: only the reviewed person, only a visible review, stops counting for flags", () => {
        const r = review();
        expect(() => r.dispute("u1")).toThrow("cannot be disputed");
        r.reveal();
        expect(() => r.dispute("u2")).toThrow("Only the reviewed person");
        expect(r.countsTowardFlags()).toBe(true);
        r.dispute("u1");
        expect(r.getStatus()).toBe("disputed");
        expect(r.countsTowardFlags()).toBe(false);
        expect(() => r.dispute("u1")).toThrow("already");
    });

    it("the moderator keeps or removes a disputed review (FR-43)", () => {
        const kept = review({ status: "disputed" });
        moderator.moderateReview(kept, "keep");
        expect(kept.getStatus()).toBe("visible");
        const removed = review({ status: "disputed" });
        moderator.moderateReview(removed, "remove");
        expect(removed.getStatus()).toBe("removed");
        expect(removed.countsTowardFlags()).toBe(false);
        expect(() => moderator.moderateReview(review({ status: "visible" }), "keep")).toThrow("Only disputed");
        expect(() => moderator.moderateReview(review({ status: "disputed" }), "maybe")).toThrow("keep or remove");
        expect(() => support.moderateReview(review({ status: "disputed" }), "keep")).toThrow();
    });
});

describe("Flag (FR-34)", () => {
    it("adds reasons to an open flag and counts the hits", () => {
        const flag = new Flag({ userId: "u1", source: "spam", reasons: ["A"] });
        flag.addReasons(["A", "B"]);
        expect(flag.getReasons()).toEqual(["A", "B"]);
        expect(flag.hitCount()).toBe(2);
    });

    it("can be dismissed once, and must be spam or review", () => {
        const flag = new Flag({ userId: "u1", source: "review" });
        flag.dismiss("a1", now);
        expect(flag.getStatus()).toBe("dismissed");
        expect(flag.getDismissedBy()).toBe("a1");
        expect(() => flag.dismiss("a1", now)).toThrow("already dismissed");
        expect(() => new Flag({ userId: "u1", source: "other" })).toThrow();
    });
});

describe("User.anonymise (FR-05)", () => {
    it("leaves only 'Deleted user' and blocks log-in", () => {
        const user = seeker();
        user.anonymise();
        expect(user.getFullName()).toBe("Deleted user");
        expect(user.getEmail()).toBeNull();
        expect(user.getProfileFields()).toEqual({ headline: "", city: "", skills: [] });
        expect(() => user.logIn()).toThrow();
    });

    it("clears a company's profile too", () => {
        const company = new Company({ userId: "c1", fullName: "HR", email: "hr@n.co", companyName: "Nile", logoId: "f1" });
        company.anonymise();
        expect(company.getCompanyName()).toBe("");
        expect(company.getLogoId()).toBeNull();
    });
});

describe("Interview.hasHappened (FR-38)", () => {
    it("a test counts once it has a result", () => {
        const test = new Interview({ matchId: "m1", type: "test" });
        expect(test.hasHappened(now)).toBe(false);
        expect(new Interview({ matchId: "m1", type: "test", result: "3/5" }).hasHappened(now)).toBe(true);
    });

    it("a meeting counts once it is confirmed and its time has passed", () => {
        const at = later(-1);
        expect(new Interview({ matchId: "m1", type: "video", status: "confirmed", dateTime: at }).hasHappened(now)).toBe(true);
        expect(new Interview({ matchId: "m1", type: "video", status: "invited", dateTime: at }).hasHappened(now)).toBe(false);
        expect(new Interview({ matchId: "m1", type: "video", status: "confirmed", dateTime: later(1) }).hasHappened(now)).toBe(false);
    });
});
