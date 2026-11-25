const mongoose = require("mongoose");
const WarningModel = require("../models/WarningModel");
const Warning = require("../domain/Warning");

class WarningRepository {
    async create(warning) {
        const doc = await WarningModel.create({
            user: warning.getUserId(),
            admin: warning.getAdminId(),
            review: warning.getReviewId(),
            reason: warning.getReason(),
            deadline: warning.getDeadline(),
            status: warning.getStatus(),
            createdAt: warning.getCreatedAt()
        });
        return this.#toDomain(doc);
    }

    async save(warning) {
        await WarningModel.updateOne({ _id: warning.getWarningId() }, { status: warning.getStatus() });
        return warning;
    }

    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await WarningModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    async findForUser(userId) {
        const docs = await WarningModel.find({ user: userId }).sort({ createdAt: -1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    async findForUsers(userIds) {
        const docs = await WarningModel.find({ user: { $in: userIds } }).sort({ createdAt: -1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // The Warnings tab: every warning, newest first
    async findRecent(limit = 100) {
        const docs = await WarningModel.find().sort({ createdAt: -1 }).limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Warning({
            ...data,
            warningId: data._id.toString(),
            userId: data.user.toString(),
            adminId: data.admin.toString(),
            reviewId: data.review ? data.review.toString() : null
        });
    }
}

module.exports = WarningRepository;
