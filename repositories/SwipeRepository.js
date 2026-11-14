const SwipeModel = require("../models/SwipeModel");
const Swipe = require("../domain/Swipe");
const AppError = require("../errors/AppError");

class SwipeRepository {
    async create(swipe) {
        try {
            const doc = await SwipeModel.create({
                seeker: swipe.getSeekerId(),
                job: swipe.getJobId(),
                swipedBy: swipe.getSwipedBy(),
                isInterested: swipe.getIsInterested(),
                isSpam: swipe.getIsSpam(),
                spamReasons: swipe.getSpamReasons(),
                swipedAt: swipe.getSwipedAt()
            });
            return this.#toDomain(doc);
        } catch (err) {
            // the unique index: this side already swiped on this seeker + job
            if (err.code === 11000) throw new AppError("You already swiped on this", 409);
            throw err;
        }
    }

    async findOne(seekerId, jobId, swipedBy) {
        const doc = await SwipeModel.findOne({ seeker: seekerId, job: jobId, swipedBy });
        return doc ? this.#toDomain(doc) : null;
    }

    async findLastBySeeker(seekerId) {
        const doc = await SwipeModel.findOne({ seeker: seekerId, swipedBy: "seeker" }).sort({ swipedAt: -1 });
        return doc ? this.#toDomain(doc) : null;
    }

    async findJobIdsSwipedBySeeker(seekerId) {
        const docs = await SwipeModel.find({ seeker: seekerId, swipedBy: "seeker" }, { job: 1 });
        return docs.map(doc => doc.job);
    }

    async findSeekerIdsSwipedByCompany(jobId) {
        const docs = await SwipeModel.find({ job: jobId, swipedBy: "company" }, { seeker: 1 });
        return docs.map(doc => doc.seeker);
    }

    // The seekers' own swipes on one job, to see which of them were flagged as spam
    async findSeekerSwipesForJob(jobId) {
        const docs = await SwipeModel.find({ job: jobId, swipedBy: "seeker" });
        return docs.map(doc => this.#toDomain(doc));
    }

    async countInterestedSince(seekerId, since) {
        return SwipeModel.countDocuments({
            seeker: seekerId,
            swipedBy: "seeker",
            isInterested: true,
            swipedAt: { $gte: since }
        });
    }

    async remove(swipeId) {
        await SwipeModel.deleteOne({ _id: swipeId });
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Swipe({
            ...data,
            swipeId: data._id.toString(),
            seekerId: data.seeker.toString(),
            jobId: data.job.toString()
        });
    }
}

module.exports = SwipeRepository;
