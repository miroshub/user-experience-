const MessageModel = require("../models/MessageModel");
const Message = require("../domain/Message");

class MessageRepository {
    async create(message) {
        const doc = await MessageModel.create({
            match: message.getMatchId(),
            sender: message.getSender(),
            text: message.getText(),
            kind: message.getKind(),
            interview: message.getInterviewId(),
            sentAt: message.getSentAt() || new Date()
        });
        return this.#toDomain(doc);
    }

    // The newest messages, returned oldest first so the chat reads top to bottom
    async findForMatch(matchId, limit = 200) {
        const docs = await MessageModel.find({ match: matchId }).sort({ sentAt: -1 }).limit(limit);
        return docs.reverse().map(doc => this.#toDomain(doc));
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Message({
            ...data,
            messageId: data._id.toString(),
            matchId: data.match.toString(),
            interviewId: data.interview ? data.interview.toString() : null
        });
    }
}

module.exports = MessageRepository;
