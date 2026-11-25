const mongoose = require("mongoose");
const ReviewModel = require("../models/ReviewModel");
const Review = require("../domain/Review");
const AppError = require("../errors/AppError");

const COUNTING = ["hidden", "visible"];

class ReviewRepository {
    // The unique index on { match, reviewer } is the last line of NFR-08 "once each"
    async create(review) {
        try {
            const doc = await ReviewModel.create({
                match: review.getMatchId(),
                reviewer: review.getReviewerId(),
                reviewee: review.getRevieweeId(),
                stars: review.getStars(),
                tags: review.getTags(),
                comment: review.getComment(),
                status: review.getStatus(),
                createdAt: review.getCreatedAt()
            });
            return this.#toDomain(doc);
        } catch (err) {
            if (err.code === 11000) throw new AppError("You already reviewed this match", 409);
            throw err;
        }
    }

    async save(review) {
        await ReviewModel.updateOne({ _id: review.getReviewId() }, {
            status: review.getStatus(),
            reply: review.getReply()
        });
        return review;
    }

    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await ReviewModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    async findForMatch(matchId) {
        const docs = await ReviewModel.find({ match: matchId }).sort({ createdAt: 1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-39: the reviews about one person that others may read
    async findVisibleAbout(userId, limit = 50) {
        const docs = await ReviewModel.find({ reviewee: userId, status: { $in: ["visible", "disputed"] } })
            .sort({ createdAt: -1 }).limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-42: the reviews about one person that still count (not disputed, not removed)
    async findCountingAbout(userId) {
        const docs = await ReviewModel.find({ reviewee: userId, status: { $in: COUNTING } });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-42: who got a counting review lately, so the daily check does not scan everyone
    async findRecentReviewees(since) {
        const ids = await ReviewModel.distinct("reviewee", { createdAt: { $gte: since }, status: { $in: COUNTING } });
        return ids.map(String);
    }

    // NFR-08: the daily job reveals hidden reviews older than 14 days
    async findHiddenBefore(cutoff) {
        const docs = await ReviewModel.find({ status: "hidden", createdAt: { $lte: cutoff } });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-43: the moderators' queue, the one waiting longest first
    async findDisputed() {
        const docs = await ReviewModel.find({ status: "disputed" }).sort({ updatedAt: 1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-39: average stars and count from visible reviews, for many people in one query
    async ratingsFor(userIds) {
        const ids = userIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
        if (ids.length === 0) return new Map();
        const rows = await ReviewModel.aggregate([
            { $match: { reviewee: { $in: ids }, status: "visible" } },
            { $group: { _id: "$reviewee", average: { $avg: "$stars" }, count: { $sum: 1 } } }
        ]);
        return new Map(rows.map(row => [
            row._id.toString(),
            { average: Math.round(row.average * 10) / 10, count: row.count }
        ]));
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Review({
            ...data,
            reviewId: data._id.toString(),
            matchId: data.match.toString(),
            reviewerId: data.reviewer.toString(),
            revieweeId: data.reviewee.toString()
        });
    }
}

module.exports = ReviewRepository;
