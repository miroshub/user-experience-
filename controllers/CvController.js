const view = require("../views/cvView");

class CvController {
    #cvService;

    constructor(cvService) {
        this.#cvService = cvService;
    }

    // GET /api/cv
    get = async (req, res) => {
        res.json(view.presentCvCheck(await this.#cvService.check(req.user)));
    };

    // PATCH /api/cv  { summary?, experience?, education?, skills? }
    update = async (req, res) => {
        res.json(view.presentCvCheck(await this.#cvService.updateSections(req.user, req.body)));
    };

    // POST /api/cv/fixes  { type: "addSkill", skill } or { type: "shortenSummary" }
    fix = async (req, res) => {
        res.json(view.presentCvCheck(await this.#cvService.applyFix(req.user, req.body)));
    };

    // POST /api/cv/pdf (form field "cv")
    uploadPdf = async (req, res) => {
        res.json(view.presentCvCheck(await this.#cvService.uploadPdf(req.user, req.file)));
    };

    // GET /api/cv/export  (?download=1 saves the file instead of showing it)
    exportPdf = async (req, res) => {
        const pdf = await this.#cvService.exportPdf(req.user);
        const name = `${req.user.getFullName().replace(/[^a-zA-Z0-9]+/g, "-")}-CV.pdf`;
        res.type("application/pdf");
        res.set("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename="${name}"`);
        res.send(pdf);
    };
}

module.exports = CvController;
