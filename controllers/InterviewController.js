const view = require("../views/interviewView");

class InterviewController {
    #interviewService;

    constructor(interviewService) {
        this.#interviewService = interviewService;
    }

    // GET /api/matches/:id/slots, the free times for H5
    slots = async (req, res) => {
        const slots = await this.#interviewService.freeSlots(req.user, req.params.id);
        res.json(view.presentSlots(slots));
    };

    // POST /api/matches/:id/interviews { type, dateTime, note }
    book = async (req, res) => {
        const interview = await this.#interviewService.book(req.user, req.params.id, req.body);
        res.status(201).json(view.presentInterview(interview, "company"));
    };

    // POST /api/matches/:id/tests { title, timeLimit, questions }
    sendTest = async (req, res) => {
        const test = await this.#interviewService.sendTest(req.user, req.params.id, req.body);
        res.status(201).json(view.presentInterview(test, "company"));
    };

    // POST /api/interviews/:id/accept
    accept = async (req, res) => {
        const interview = await this.#interviewService.accept(req.user, req.params.id);
        res.json(view.presentInterview(interview, "seeker"));
    };

    // POST /api/interviews/:id/new-time { dateTime }
    askNewTime = async (req, res) => {
        const interview = await this.#interviewService.askNewTime(req.user, req.params.id, req.body);
        res.json(view.presentInterview(interview, "seeker"));
    };

    // POST /api/interviews/:id/reschedule { dateTime }
    reschedule = async (req, res) => {
        const interview = await this.#interviewService.reschedule(req.user, req.params.id, req.body);
        res.json(view.presentInterview(interview, "company"));
    };

    // POST /api/interviews/:id/start, answers with the questions and the seconds left
    startTest = async (req, res) => {
        const test = await this.#interviewService.startTest(req.user, req.params.id);
        res.json(view.presentInterview(test, "seeker"));
    };

    // POST /api/interviews/:id/submit { answers: [index, ...] }
    submitTest = async (req, res) => {
        const test = await this.#interviewService.submitTest(req.user, req.params.id, req.body);
        res.json(view.presentInterview(test, "seeker"));
    };
}

module.exports = InterviewController;
