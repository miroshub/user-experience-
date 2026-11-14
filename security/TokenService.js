const jwt = require("jsonwebtoken");

class TokenService {
    #secret;
    #expiresIn;

    constructor(secret, expiresIn = "7d") {
        if (!secret) throw new Error("JWT_SECRET is missing. Add it to .env.");
        this.#secret = secret;
        this.#expiresIn = expiresIn;
    }

    sign(user) {
        return jwt.sign({ sub: user.getUserId(), role: user.getRole() }, this.#secret, {
            algorithm: "HS256",
            expiresIn: this.#expiresIn
        });
    }

    // Returns the payload, or null when the token is fake, changed or expired
    verify(token) {
        try {
            return jwt.verify(token, this.#secret, { algorithms: ["HS256"] });
        } catch {
            return null;
        }
    }
}

module.exports = TokenService;
