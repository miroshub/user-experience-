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
                lastActivity: match.getLastActivity()
            });
            return this.#toDomain(doc);
        } catch (err) {
            if (err.code !== 11000) throw err;
            return this.findBySeekerAndJob(match.getSeekerId(), match.getJobId());
        }
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
