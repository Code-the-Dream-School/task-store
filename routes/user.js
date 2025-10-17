const express = require("express");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();
const { register, logoff, login, googleLogon } = require("../controllers/userController");

router.route("/logon").post(login);
router.route("/googleLogon").post(googleLogon);
router.route("/logoff").post(jwtMiddleware, logoff);
router.route("/").post(register);

module.exports = router;
