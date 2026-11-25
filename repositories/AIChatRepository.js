const AIChatModel = require("../models/AIChatModel");
const AIChat = require("../domain/AIChat");

const KEEP_TURNS = 50; // the whole chat is kept for the page, only the last 6 turns go to the model

function filtersFromDoc(filters) {
    if (!filters) return {};
    return {
        role: filters.role,
        skills: [...filters.skills],
        level: filters.level,
        places: [...filters.places],
        minPay: filters.minPay
    };
}

class AIChatRepository {
    #model;

    // The AIModel is given to every AIChat this repository builds (chosen in container.js)
    constructor(model) {
        this.#model = model;
    }

    // A seeker who never asked anything gets a new, empty chat (saved on the first question)
    async findOrStart(seekerId) {
        const doc = await AIChatModel.findOne({ seeker: seekerId });
        if (!doc) return new AIChat({ seekerId }, this.#model);
        return this.#toDomain(doc);
    }

    async save(chat) {
        const turns = chat.getTurns().slice(-KEEP_TURNS);
        const doc = await AIChatModel.findOneAndUpdate(
            { seeker: chat.getSeekerId() },
            { filters: chat.getSuggestedFilters(), turns },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        );
        return this.#toDomain(doc);
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new AIChat({
            chatId: data._id.toString(),
            seekerId: data.seeker.toString(),
            filters: filtersFromDoc(data.filters),
            turns: data.turns.map(turn => ({ ...turn, filters: filtersFromDoc(turn.filters) }))
        }, this.#model);
    }
}

module.exports = AIChatRepository;
