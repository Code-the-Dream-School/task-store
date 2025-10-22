const express = require("express");

const router = express.Router();

const {
  logon,
  githubAuth,
  githubCallback,
  logoff,
  newOrigin,
  createOrigin,
} = require("../controllers/originController.js");

const checkAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect("/origin");
  next();
};
router.route("/").get(logon);
router
  .route("/addOrigin")
  .get(checkAuth, newOrigin)
  .post(checkAuth, createOrigin);
router.route("/auth/github").get(githubAuth);
router.route("/auth/github/callback").get(githubCallback);
router.route("/logoff").get(logoff);

module.exports = router;
