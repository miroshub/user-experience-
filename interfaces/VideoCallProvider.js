// Interface: makes the video call link for a match (FR-25).
// Jitsi today; another provider would be one new class in container.js (Open/Closed).
class VideoCallProvider {
    constructor() {
        if (new.target === VideoCallProvider) throw new Error("VideoCallProvider is an interface");
    }

    linkFor(matchId) {
        throw new Error("linkFor not implemented");
    }
}

module.exports = VideoCallProvider;
