const TimeSlots = require("../../../services/TimeSlots");
const JitsiMeet = require("../../../services/video/JitsiMeet");
const VideoCallProvider = require("../../../interfaces/VideoCallProvider");
const Notifier = require("../../../interfaces/Notifier");
const SocketNotifier = require("../../../realtime/SocketNotifier");

function cairo(date) {
    return date.toLocaleString("en-GB", { timeZone: "Africa/Cairo", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

describe("TimeSlots (H5 \"TIME (CAIRO)\")", () => {
    it("offers 10:00, 11:00, 13:00 and 15:00 Cairo time on the next 4 working days", () => {
        const slots = TimeSlots.next(new Date("2026-11-18T20:00:00Z")); // a Wednesday evening
        expect(slots).toHaveLength(16);
        expect(slots.slice(0, 4).map(cairo)).toEqual(["Thu 10:00", "Thu 11:00", "Thu 13:00", "Thu 15:00"]);
        // Friday and Saturday are the weekend in Egypt
        expect(slots[4].toISOString()).toBe("2026-11-22T08:00:00.000Z");
    });

    it("follows Cairo summer time", () => {
        const [first] = TimeSlots.next(new Date("2026-07-01T08:00:00Z"));
        expect(first.toISOString()).toBe("2026-07-02T07:00:00.000Z");
    });
});

describe("JitsiMeet (FR-25)", () => {
    it("makes the same room for the same match, and different rooms for others", () => {
        const jitsi = new JitsiMeet("secret");
        const room = jitsi.linkFor("m1");
        expect(room).toMatch(/^https:\/\/meet\.jit\.si\/wuzzufny-[0-9a-f]{20}$/);
        expect(jitsi.linkFor("m1")).toBe(room);
        expect(jitsi.linkFor("m2")).not.toBe(room);
        // the room name cannot be worked out from the match id without the server's secret
        expect(new JitsiMeet("other secret").linkFor("m1")).not.toBe(room);
    });

    it("the interfaces cannot be used directly", () => {
        expect(() => new VideoCallProvider()).toThrow("interface");
        expect(() => new Notifier()).toThrow("interface");
        class Half extends VideoCallProvider {}
        expect(() => new Half().linkFor("m1")).toThrow("not implemented");
        class HalfNotifier extends Notifier {}
        expect(() => new HalfNotifier().toUsers([], "x", {})).toThrow("not implemented");
        expect(() => new HalfNotifier().toMatch(null, "x", {})).toThrow("not implemented");
    });

    it("the socket notifier stays silent until Socket.io is attached", () => {
        const notifier = new SocketNotifier();
        expect(() => notifier.toUsers(["u1"], "notice:new", {})).not.toThrow();
        const sent = [];
        notifier.attach({ to: rooms => ({ emit: (event, data) => sent.push({ rooms, event, data }) }) });
        notifier.toUsers(["u1"], "notice:new", { text: "hi" });
        const match = { getMatchId: () => "m1", getSeekerId: () => "s1", getCompanyId: () => "c1" };
        notifier.toMatch(match, "message:new", { matchId: "m1" });
        expect(sent).toEqual([
            { rooms: ["user:u1"], event: "notice:new", data: { text: "hi" } },
            { rooms: ["match:m1", "user:s1", "user:c1"], event: "message:new", data: { matchId: "m1" } }
        ]);
    });
});
