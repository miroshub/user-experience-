const mongoose = require("mongoose");
const CvModel = require("../models/CvModel");
const AIChatModel = require("../models/AIChatModel");
const SwipeModel = require("../models/SwipeModel");
const MatchModel = require("../models/MatchModel");
const MessageModel = require("../models/MessageModel");
const InterviewModel = require("../models/InterviewModel");
const JobModel = require("../models/JobModel");
const ReviewModel = require("../models/ReviewModel");
const SupportTicketModel = require("../models/SupportTicketModel");
const WarningModel = require("../models/WarningModel");
const FlagModel = require("../models/FlagModel");

// FR-05 "Your data": the one class that knows every place a user's data lives.
// Other repositories each own one collection; this one only reads for the download
// and deletes for "Delete my account", so that list is kept in one place (SRP).
class AccountDataRepository {
    #database;

    constructor(database) {
        this.#database = database;
    }

    #bucket() {
        return new mongoose.mongo.GridFSBucket(this.#database.getConnection().db, { bucketName: "files" });
    }

    async #jobIds(userId) {
        return (await JobModel.find({ company: userId }, { _id: 1 }).lean()).map(j => j._id);
    }

    // Plain objects for the JSON download. Messages: only the ones this user wrote.
    async collect(userId) {
        const jobIds = await this.#jobIds(userId);
        const matches = await MatchModel.find({ $or: [{ seeker: userId }, { company: userId }] }).lean();
        const matchIds = matches.map(m => m._id);
        const [cv, aiChat, swipes, messages, interviews, jobs, reviewsWritten, reviewsReceived, tickets, warnings, files] = await Promise.all([
            CvModel.findOne({ seeker: userId }).lean(),
            AIChatModel.findOne({ seeker: userId }).lean(),
            SwipeModel.find({ $or: [{ seeker: userId, swipedBy: "seeker" }, { job: { $in: jobIds }, swipedBy: "company" }] }).lean(),
            MessageModel.find({ sender: String(userId) }).lean(),
            InterviewModel.find({ match: { $in: matchIds } }, { questions: 0 }).lean(),
            JobModel.find({ company: userId }).lean(),
            ReviewModel.find({ reviewer: userId }).lean(),
            ReviewModel.find({ reviewee: userId, status: { $in: ["visible", "disputed"] } }).lean(),
            SupportTicketModel.find({ user: userId }).lean(),
            WarningModel.find({ user: userId }).lean(),
            this.#bucket().find({ "metadata.ownerId": String(userId) }).toArray()
        ]);
        return {
            cv, aiChat, swipes, matches, messages, interviews, jobs,
            reviewsWritten, reviewsReceived, tickets, warnings,
            files: files.map(f => ({ id: f._id.toString(), filename: f.filename, size: f.length, uploadedAt: f.uploadDate }))
        };
    }

    // The numbers on the "Your data" page
    async counts(userId) {
        const jobIds = await this.#jobIds(userId);
        const [cv, aiTurns, swipes, matches, messages, jobs, reviewsWritten, tickets, warnings, files] = await Promise.all([
            CvModel.countDocuments({ seeker: userId }),
            AIChatModel.findOne({ seeker: userId }, { turns: 1 }).lean().then(c => (c ? c.turns.length : 0)),
            SwipeModel.countDocuments({ $or: [{ seeker: userId, swipedBy: "seeker" }, { job: { $in: jobIds }, swipedBy: "company" }] }),
            MatchModel.countDocuments({ $or: [{ seeker: userId }, { company: userId }] }),
            MessageModel.countDocuments({ sender: String(userId) }),
            JobModel.countDocuments({ company: userId }),
            ReviewModel.countDocuments({ reviewer: userId }),
            SupportTicketModel.countDocuments({ user: userId }),
            WarningModel.countDocuments({ user: userId }),
            this.#bucket().find({ "metadata.ownerId": String(userId) }).toArray().then(f => f.length)
        ]);
        return { cv, aiTurns, swipes, matches, messages, jobs, reviewsWritten, tickets, warnings, files };
    }

    // FR-05 delete: the user's own records and files. Shared things (matches, messages,
    // reviews about them) stay, and show "Deleted user". Their jobs are closed, not deleted,
    // because other people's matches point at them.
    async deleteOwnData(userId) {
        const jobIds = await this.#jobIds(userId);
        const files = await this.#bucket().find({ "metadata.ownerId": String(userId) }).toArray();
        await Promise.all([
            CvModel.deleteMany({ seeker: userId }),
            AIChatModel.deleteMany({ seeker: userId }),
            SwipeModel.deleteMany({ $or: [{ seeker: userId }, { job: { $in: jobIds }, swipedBy: "company" }] }),
            ReviewModel.deleteMany({ reviewer: userId }),
            SupportTicketModel.deleteMany({ user: userId }),
            WarningModel.deleteMany({ user: userId }),
            FlagModel.deleteMany({ user: userId }),
            JobModel.updateMany({ company: userId }, { status: "closed", imageUrl: null })
        ]);
        for (const file of files) await this.#bucket().delete(file._id);
    }
}

module.exports = AccountDataRepository;
