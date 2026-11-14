// Services throw this. They say what went wrong and which HTTP status fits;
// the error middleware turns it into a JSON response.
// code is optional, for cases the front end must react to (e.g. "VERIFY_REQUIRED").
class AppError extends Error {
    constructor(message, status, code = null) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
    }
}

module.exports = AppError;
