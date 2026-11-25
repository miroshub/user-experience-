const mongoose = require("mongoose");
const SupportTicketModel = require("../models/SupportTicketModel");
const SupportTicket = require("../domain/SupportTicket");

class SupportTicketRepository {
    async create(ticket) {
        const doc = await SupportTicketModel.create({
            user: ticket.getUserId(),
            topic: ticket.getTopic(),
            message: ticket.getMessage(),
            status: ticket.getStatus(),
            createdAt: ticket.getCreatedAt()
        });
        return this.#toDomain(doc);
    }

    async save(ticket) {
        await SupportTicketModel.updateOne({ _id: ticket.getTicketId() }, {
            admin: ticket.getAdminId(),
            status: ticket.getStatus(),
            reply: ticket.getReply(),
            repliedAt: ticket.getRepliedAt()
        });
        return ticket;
    }

    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await SupportTicketModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    async findForUser(userId) {
        const docs = await SupportTicketModel.find({ user: userId }).sort({ createdAt: -1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-37: the shared inbox, the one waiting longest first
    async findOpenOldestFirst(limit = 100) {
        const docs = await SupportTicketModel.find({ status: "open" }).sort({ createdAt: 1 }).limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new SupportTicket({
            ...data,
            ticketId: data._id.toString(),
            userId: data.user.toString(),
            adminId: data.admin ? data.admin.toString() : null
        });
    }
}

module.exports = SupportTicketRepository;
