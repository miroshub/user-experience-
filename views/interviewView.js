// side: "seeker" or "company". The seeker never gets the right answers, and only sees
// the questions once the timer has started (FR-26), so nobody can read the test first.
function interviewToJson(interview, side, now = new Date()) {
    const json = {
        id: interview.getInterviewId(),
        matchId: interview.getMatchId(),
        type: interview.getType(),
        status: interview.getStatus(),
        dateTime: interview.getDateTime(),
        requestedTime: interview.getRequestedTime(),
        note: interview.getNote(),
        link: interview.getLink(),
        result: interview.getResult()
    };
    if (!interview.isTest()) return json;

    const questions = interview.getQuestions();
    json.title = interview.getTitle();
    json.timeLimit = interview.getTimeLimit();
    json.questionCount = questions.length;
    json.score = interview.getScore();

    if (side === "company") {
        json.questions = questions;
        json.answers = interview.getAnswers();
    } else if (interview.getStatus() === "started") {
        json.questions = questions.map(q => ({ question: q.question, options: q.options }));
        json.secondsLeft = interview.secondsLeft(now);
    }
    return json;
}

function presentInterview(interview, side) {
    return { data: interviewToJson(interview, side) };
}

function presentSlots(slots) {
    return { data: slots.map(slot => slot.toISOString()) };
}

module.exports = { interviewToJson, presentInterview, presentSlots };
