// Services throw this. They say what went wrong and which HTTP status fits;
// the error middleware turns it into a JSON response.
class AppError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "AppError";
        this.status = status;
    }
}

module.exports = AppError;
