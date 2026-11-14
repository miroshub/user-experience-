const AppError = require("../errors/AppError");

// Last middleware in app.js. Express 5 also sends errors from async handlers here.
function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON" });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
}

module.exports = errorHandler;
