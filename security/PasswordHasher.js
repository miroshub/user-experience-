const bcrypt = require("bcryptjs");

// Wraps bcrypt so services never call the library directly (and tests can use fewer rounds)
class PasswordHasher {
    #rounds;

    constructor(rounds = 10) {
        this.#rounds = rounds;
    }

    hash(plainPassword) {
        return bcrypt.hash(plainPassword, this.#rounds);
    }

    compare(plainPassword, hash) {
        return bcrypt.compare(plainPassword, hash);
    }
}

module.exports = PasswordHasher;
