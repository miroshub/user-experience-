const mongoose = require("mongoose");
const InterviewModel = require("../models/InterviewModel");
const Interview = require("../domain/Interview");

const HOUR_MS = 60 * 60 * 1000;

function toDocument(interview) {
    return {
        match: interview.getMatchId(),
        type: interview.getType(),
        status: interview.getStatus(),
        dateTime: interview.getDateTime(),
        link: interview.getLink(),
        note: interview.getNote(),
        requestedTime: interview.getRequestedTime(),
        result: interview.getResult(),
        title: interview.getTitle(),
        questions: interview.getQuestions(),
        answers: interview.getAnswers(),
        score: interview.getScore(),
        timeLimit: interview.getTimeLimit(),
        startedAt: interview.getStartedAt(),
        reminded: interview.getReminded()
    };
}

class InterviewRepository {
    async create(interview) {
        const doc = await InterviewModel.create(toDocument(interview));
        return this.#toDomain(doc);
    }

    async save(interview) {
        await InterviewModel.updateOne({ _id: interview.getInterviewId() }, toDocument(interview));
        return interview;
    }

    async findById(interviewId) {
        if (!mongoose.isValidObjectId(interviewId)) return null;
        const doc = await InterviewModel.findById(interviewId);
        return doc ? this.#toDomain(doc) : null;
    }

    async findForMatches(matchIds) {
        const docs = await InterviewModel.find({ match: { $in: matchIds } }).sort({ _id: 1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // Meetings (not tests) in these matches between two times, to hide slots that are taken
    async findMeetingsBetween(matchIds, from, to) {
        const docs = await InterviewModel.find({
            match: { $in: matchIds },
            type: { $ne: "test" },
            dateTime: { $gte: from, $lt: to }
        });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-23: confirmed meetings that start within the next hour and were not reminded yet
    async findDueForReminder(now) {
        const docs = await InterviewModel.find({
            status: "confirmed",
            reminded: false,
            dateTime: { $gt: now, $lte: new Date(now.getTime() + HOUR_MS) }
        });
        return docs.map(doc => this.#toDomain(doc));
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Interview({
            ...data,
            interviewId: data._id.toString(),
            matchId: data.match.toString()
        });
    }
}

module.exports = InterviewRepository;
