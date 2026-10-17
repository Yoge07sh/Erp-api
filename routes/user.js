const express = require("express");

const router = express.Router();

const UserController = require("../controllers/UserController");

const authMiddleware = require("../middleware/authMiddleware");



router.post("/login", (req, res) => {

    UserController.doLogin(req, res);

});



router.get("/me", authMiddleware, (req, res) => {

    UserController.getMyProfile(req, res);

});


module.exports = router;