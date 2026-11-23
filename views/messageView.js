function messageToJson(message) {
    return {
        id: message.getMessageId(),
        matchId: message.getMatchId(),
        sender: message.getSender(),
        kind: message.getKind(),
        text: message.getText(),
        interviewId: message.getInterviewId(),
        sentAt: message.getSentAt()
    };
}

function presentMessage(message) {
    return { data: messageToJson(message) };
}

function presentMessages(messages) {
    return { data: messages.map(messageToJson) };
}

module.exports = { messageToJson, presentMessage, presentMessages };
