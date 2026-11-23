const mongoose = require("mongoose");
const MatchModel = require("../models/MatchModel");
const Match = require("../domain/Match");

class MatchRepository {
    // If both sides pressed Interested at the same moment, the unique index lets only one match in
    async createOrGet(match) {
        try {
            const doc = await MatchModel.create({
                seeker: match.getSeekerId(),
                job: match.getJobId(),
                company: match.getCompanyId(),
                status: match.getStatus(),
                matchedAt: match.getMatchedAt(),
                lastActivity: match.getLastActivity(),
                stepDates: match.getStepDates()
            });
            return this.#toDomain(doc);
        } catch (err) {
            if (err.code !== 11000) throw err;
            return this.findBySeekerAndJob(match.getSeekerId(), match.getJobId());
        }
    }

    async findById(matchId) {
        if (!mongoose.isValidObjectId(matchId)) return null;
        const doc = await MatchModel.findById(matchId);
        return doc ? this.#toDomain(doc) : null;
    }

    async findBySeekerAndJob(seekerId, jobId) {
        const doc = await MatchModel.findOne({ seeker: seekerId, job: jobId });
        return doc ? this.#toDomain(doc) : null;
    }

    async findForUser(userId) {
        const docs = await MatchModel.find({ $or: [{ seeker: userId }, { company: userId }] })
            .sort({ lastActivity: -1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-28: open matches with no activity since the cutoff. The domain decides who is waiting.
    async findQuietSince(cutoff) {
        const docs = await MatchModel.find({
            status: { $nin: ["closed", "hired"] },
            lastActivity: { $lte: cutoff }
        });
        return docs.map(doc => this.#toDomain(doc));
    }

    async save(match) {
        await MatchModel.updateOne({ _id: match.getMatchId() }, {
            status: match.getStatus(),
            lastActivity: match.getLastActivity(),
            lastActor: match.getLastActor(),
            closeReason: match.getCloseReason(),
            closedBy: match.getClosedBy(),
            stepDates: match.getStepDates(),
            nudgedAt: match.getNudgedAt()
        });
        return match;
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Match({
            ...data,
            matchId: data._id.toString(),
            seekerId: data.seeker.toString(),
            jobId: data.job.toString(),
            companyId: data.company.toString()
        });
    }
}

module.exports = MatchRepository;
