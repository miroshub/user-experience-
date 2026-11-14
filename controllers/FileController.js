class FileController {
    #fileService;

    constructor(fileService) {
        this.#fileService = fileService;
    }

    // GET /api/files/:id
    getFile = async (req, res) => {
        const { info, stream } = await this.#fileService.getFile(req.params.id, req.user);
        res.type(info.contentType);
        res.set("Content-Length", String(info.size));
        stream.pipe(res);
    };
}

module.exports = FileController;
