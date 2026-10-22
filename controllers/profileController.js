const service = require("../services/profileService");
const view = require("../views/profileView");

// Sends 400 or 404 if the service said something went wrong. Returns true if it did.
function sendError(res, result) {
    if (result === "invalid") {
        res.status(400).json(view.presentError("Invalid data"));
        return true;
    }
    if (result === "not found") {
        res.status(404).json(view.presentError("Profile not found"));
        return true;
    }
    return false;
}

// GET /profiles
function getAllProfiles(req, res) {
    const result = service.listProfiles(req.query);
    if (sendError(res, result)) return;
    res.json(view.presentProfileList(result.profiles, result.pagination));
}

// GET /profiles/:id
function getProfile(req, res) {
    const result = service.getProfile(req.params.id);
    if (sendError(res, result)) return;
    res.json(view.presentProfile(result));
}

// POST /profiles
function createProfile(req, res) {
    const result = service.createProfile(req.body);
    if (sendError(res, result)) return;
    res.status(201).json(view.presentProfile(result));
}

// PUT /profiles/:id
function replaceProfile(req, res) {
    const result = service.replaceProfile(req.params.id, req.body);
    if (sendError(res, result)) return;
    res.json(view.presentProfile(result));
}

// PATCH /profiles/:id
function patchProfile(req, res) {
    const result = service.patchProfile(req.params.id, req.body);
    if (sendError(res, result)) return;
    res.json(view.presentProfile(result));
}

// DELETE /profiles/:id
function deleteProfile(req, res) {
    const result = service.deleteProfile(req.params.id);
    if (sendError(res, result)) return;
    res.status(204).send();
}

module.exports = { getAllProfiles, getProfile, createProfile, replaceProfile, patchProfile, deleteProfile };
