const mongoose = require("mongoose");
const FlagModel = require("../models/FlagModel");
const Flag = require("../domain/Flag");

class FlagRepository {
    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await FlagModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    // The newest flag of one kind for one user, open or dismissed
    async findLatest(userId, source) {
        const doc = await FlagModel.findOne({ user: userId, source }).sort({ createdAt: -1 });
        return doc ? this.#toDomain(doc) : null;
    }

    async findOpen(limit = 100) {
        const docs = await FlagModel.find({ status: "open" }).sort({ createdAt: -1 }).limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    async create(flag) {
        const doc = await FlagModel.create({
            user: flag.getUserId(),
            source: flag.getSource(),
            reasons: flag.getReasons(),
            status: flag.getStatus(),
            createdAt: flag.getCreatedAt()
        });
        return this.#toDomain(doc);
    }

    async save(flag) {
        await FlagModel.updateOne({ _id: flag.getFlagId() }, {
            reasons: flag.getReasons(),
            status: flag.getStatus(),
            dismissedBy: flag.getDismissedBy(),
            dismissedAt: flag.getDismissedAt()
        });
        return flag;
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Flag({
            ...data,
            flagId: data._id.toString(),
            userId: data.user.toString(),
            dismissedBy: data.dismissedBy ? data.dismissedBy.toString() : null
        });
    }
}

module.exports = FlagRepository;
