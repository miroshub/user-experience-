const AppError = require("../errors/AppError");

// Last middleware in app.js. Express 5 also sends errors from async handlers here.
function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        const body = { message: err.message };
        if (err.code) body.code = err.code;
        return res.status(err.status).json(body);
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON" });
    }
    if (err.name === "MulterError") {
        const message = err.code === "LIMIT_FILE_SIZE" ? "File is too big (5 MB max)" : "Upload failed";
        return res.status(400).json({ message });
    }
    // two sign-ups at the same moment can both pass the service check; the unique index catches it
    if (err.code === 11000) {
        return res.status(409).json({ message: "That already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
}

module.exports = errorHandler;
