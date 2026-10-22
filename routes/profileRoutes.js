const router = require("express").Router();
const c = require("../controllers/profileController");

router.get("/profiles", c.getAllProfiles);
router.get("/profiles/:id", c.getProfile);
router.post("/profiles", c.createProfile);
router.put("/profiles/:id", c.replaceProfile);
router.patch("/profiles/:id", c.patchProfile);
router.delete("/profiles/:id", c.deleteProfile);

module.exports = router;
