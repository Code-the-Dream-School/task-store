const { randomUUID } = require("crypto");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");
const passport = require("passport");

const logon = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/origin/addOrigin");
  }
  res.render("logon", { info: req.flash("info"), errors: req.flash("error") });
};

const githubAuth = (req, res, next) => {
  const callbackURL = `${req.protocol}://${req.get("host")}/origin/auth/github/callback`;

  passport.authenticate("github", {
    scope: [],
    callbackURL,
  })(req, res, next);
};
const githubCallback = (req, res, next) => {
  passport.authenticate("github", async (err, user) => {
    try {
      if (err || !user) {
        req.flash("error", "GitHub logon failed.");
        return res.redirect("/origin");
      }

      const account = await prisma.githubAccount.findFirst({
        where: { githubName: user.username.toLowerCase() },
      });

      if (!account) {
        req.flash(
          "error",
          "Your GitHub account is not authorized. Contact your Cohort Instructional Lead."
        );
        return req.logout(() => res.redirect("/origin"));
      }

      // Success — user exists in authorized list
      req.session._csrf = randomUUID();
      return res.redirect("/origin/addOrigin");
    } catch (error) {
      console.error("GitHub callback error:", error);
      req.flash("error", "Unexpected error during GitHub login.");
      return res.redirect("/origin");
    }
  })(req, res, next);
};

const logoff = (req, res) => {
  req.logout(() => res.redirect("/origin"));
};

const newOrigin = (req, res) => {
  res.render("newOrigin", {
    info: req.flash("info"),
    errors: req.flash("error"),
    _csrf: req.session._csrf,
    username: req.user.username,
  });
};

const createOrigin = async (req, res) => {
  if (req?.body?._csrf != req.session._csrf) {
    return res.sendStatus(StatusCodes.UNAUTHORIZED);
  }
  try {
    const url = new URL(req?.body?.newOrigin);
    if (url.protocol != "https:") {
      req.flash(
        "error",
        "You can only register an origin starting with https:."
      );
    } else {
      try {
        await prisma.origin.create(url.origin.toLowerCase());
        req.flash("info", `The origin ${url.origin} has been added.`);
      } catch (e) {
        if (e.name === "PrismaClientKnownRequestError" && e.code == "P2002") {
          req.flash("info", `The origin ${url.origin} was already registered.`);
        } else {
          req.flash(
            "error",
            "A server error occurred, and the origin was not added."
          );
        }
      }
    }
  } catch {
    req.flash(
      "error",
      "That was not a valid origin.  It should be of the format https://this.that.com."
    );
  }
  res.render("newOrigin", {
    info: req.flash("info"),
    errors: req.flash("error"),
    _csrf: req.session._csrf,
    username: req.user.username,
  });
};

module.exports = {
  logon,
  githubAuth,
  githubCallback,
  logoff,
  newOrigin,
  createOrigin,
};
