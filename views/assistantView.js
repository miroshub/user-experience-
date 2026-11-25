const { presentJobCards } = require("./jobView");

// H7: the chat, the filter chips and the matching jobs
function presentAssistant({ chat, results }) {
    return {
        data: {
            turns: chat.getTurns().map(turn => ({
                userMessage: turn.userMessage,
                aiReply: turn.aiReply,
                askedAt: turn.askedAt || null
            })),
            filters: chat.getSuggestedFilters(),
            results: {
                total: results.total,
                jobs: presentJobCards(results.cards).data,
                tip: results.tip
            }
        }
    };
}

module.exports = { presentAssistant };
