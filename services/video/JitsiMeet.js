const crypto = require("crypto");
const VideoCallProvider = require("../../interfaces/VideoCallProvider");

// FR-25: one Jitsi Meet room per match. Jitsi needs no account or key: any room name works.
// The name is a keyed hash of the match id, so people cannot guess another match's room.
class JitsiMeet extends VideoCallProvider {
    #secret;

    constructor(secret) {
        super();
        this.#secret = secret;
    }

    linkFor(matchId) {
        const room = crypto.createHmac("sha256", this.#secret).update(String(matchId)).digest("hex").slice(0, 20);
        return `https://meet.jit.si/wuzzufny-${room}`;
    }
}

module.exports = JitsiMeet;
