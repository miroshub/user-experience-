// One "Skip" or "Interested", from a seeker on a job or from a company on a seeker for one of its jobs
class Swipe {
    #swipeId;
    #seekerId;
    #jobId;
    #swipedBy;
    #isInterested;
    #isSpam;
    #spamReasons;
    #swipedAt;

    constructor(data) {
        this.#swipeId = data.swipeId || null;
        this.#seekerId = String(data.seekerId);
        this.#jobId = String(data.jobId);
        this.#swipedBy = data.swipedBy;
        this.#isInterested = data.isInterested === true;
        this.#isSpam = data.isSpam === true;
        this.#spamReasons = Array.isArray(data.spamReasons) ? [...data.spamReasons] : [];
        this.#swipedAt = data.swipedAt ? new Date(data.swipedAt) : new Date();
    }

    getSwipeId() { return this.#swipeId; }
    getSeekerId() { return this.#seekerId; }
    getJobId() { return this.#jobId; }

    getSwipedBy() { return this.#swipedBy; }
    setSwipedBy(value) { this.#swipedBy = value; }

    getIsInterested() { return this.#isInterested; }
    setIsInterested(value) { this.#isInterested = value; }

    getIsSpam() { return this.#isSpam; }
    setIsSpam(value) { this.#isSpam = value; }

    getSpamReasons() { return [...this.#spamReasons]; }
    setSpamReasons(value) { this.#spamReasons = [...value]; }

    getSwipedAt() { return this.#swipedAt; }
    setSwipedAt(value) { this.#swipedAt = value; }

    // FR-17: a match needs a yes from both sides, on the same seeker and the same job
    checkForMatch(otherSwipe) {
        if (!otherSwipe) return false;
        return this.#isInterested
            && otherSwipe.getIsInterested()
            && otherSwipe.getSwipedBy() !== this.#swipedBy
            && otherSwipe.getSeekerId() === this.#seekerId
            && otherSwipe.getJobId() === this.#jobId;
    }
}

module.exports = Swipe;
