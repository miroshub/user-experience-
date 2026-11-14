const view = require("../views/jobView");

class JobController {
    #jobService;

    constructor(jobService) {
        this.#jobService = jobService;
    }

    // POST /api/jobs
    create = async (req, res) => {
        const job = await this.#jobService.createJob(req.user, req.body);
        res.status(201).json(view.presentJob(job));
    };

    // GET /api/jobs/mine
    listMine = async (req, res) => {
        const jobs = await this.#jobService.listMine(req.user);
        res.json(view.presentJobs(jobs));
    };

    // GET /api/jobs/:id
    getOne = async (req, res) => {
        const job = await this.#jobService.getJob(req.params.id, req.user);
        res.json(view.presentJob(job));
    };

    // PATCH /api/jobs/:id
    edit = async (req, res) => {
        const job = await this.#jobService.editJob(req.user, req.params.id, req.body);
        res.json(view.presentJob(job));
    };

    // POST /api/jobs/:id/pause
    pause = async (req, res) => {
        const job = await this.#jobService.pauseJob(req.user, req.params.id);
        res.json(view.presentJob(job));
    };

    // POST /api/jobs/:id/resume
    resume = async (req, res) => {
        const job = await this.#jobService.resumeJob(req.user, req.params.id);
        res.json(view.presentJob(job));
    };

    // POST /api/jobs/:id/close
    close = async (req, res) => {
        const job = await this.#jobService.closeJob(req.user, req.params.id);
        res.json(view.presentJob(job));
    };

    // POST /api/jobs/:id/image (form field "image")
    uploadImage = async (req, res) => {
        const job = await this.#jobService.uploadImage(req.user, req.params.id, req.file);
        res.json(view.presentJob(job));
    };
}

module.exports = JobController;
