const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const originSetup = (app) => {
  // --- Configure session middleware ---
  app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );

  // --- Initialize passport ---

 
  // --- Configure passport strategy ---
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        //      callbackURL: "http://localhost:3000/auth/github/callback",
      },
      function (accessToken, refreshToken, profile, done) {
        // Here you would find or create the user in your DB
        return done(null, profile);
      }
    )
  );

  // --- Serialize and deserialize user ---
  passport.serializeUser((user, done) => done(null, user.username));
  passport.deserializeUser((obj, done) => done(null, obj));
  app.use(passport.initialize());
  app.use(passport.session());

  // --- Routes ---
  app.set("view engine", "ejs");

  app.use(express.urlencoded({ extended: true }));
  app.use(require("connect-flash")());
};

module.exports = originSetup;
