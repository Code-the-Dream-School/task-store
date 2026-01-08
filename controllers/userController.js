const { userSchema } = require("../validation/userSchema");
const { StatusCodes } = require("http-status-codes");
const {
  createUser,
  verifyUserPassword,
  generateUserPassword,
  googleGetUserInfo,
} = require("../services/userService");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const prisma = require("../db/prisma");
const cookieFlags = (req) => {
  if (req.get("Origin") === req.get("Host")) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };
  }
  return {
    ...(process.env.NODE_ENV === "production" && { domain: req.hostname }), // add domain into cookie for production only
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  req.user = payload; // this is a convenient way to return the csrf token to the caller.
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration

  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by login() or register()
};

const login = async (req, res) => {
  const { user, isValid } = await verifyUserPassword(
    req?.body?.email,
    req?.body?.password
  );
  if (!isValid) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed." });
  }
  const csrfToken = setJwtCookie(req, res, user);
  res.status(StatusCodes.OK).json({ name: user.name, csrfToken });
};

const googleLogon = async (req, res) => {
  try {
    if (!req.body.code) {
      // throw new Error("Required body parameter missing: 'code'.");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "The Google authentication code was not provided." });
    }
    let googleUserInfo;
    try {
      googleUserInfo = await googleGetUserInfo(req.body.code);
    } catch {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Authentication failed." });
    }
    if (!googleUserInfo.email || !googleUserInfo.isEmailVerified) {
      // throw new Error("The email is either missing or not verified.");
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message:
          "Google did not include the email, or it hasn't been verified.",
      });
    }
    if (!googleUserInfo.name) {
      // throw new Error("The name is missing.");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Google did not include the user name." });
    }

    let user = await prisma.user.findFirst({
      where: {
        email: {
          equals: googleUserInfo.email,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      const randomPassword = generateUserPassword();
      // TODO: notify user with generated password
      console.log("Creating user with a random password.");
      user = await createUser({
        name: googleUserInfo.name,
        email: googleUserInfo.email,
        password: randomPassword,
      });
    }
    setJwtCookie(req, res, user);
    return res.json({ name: user.name, csrfToken: req.user.csrfToken });
  } catch (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Google auth error: " + error?.message,
    });
  }
};

const register = async (req, res) => {
  if (!req.body) req.body = {};
  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      // might throw an error that would cause a 500 from the error handler
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "We can't tell if you're a person or a bot." });
  }
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  let user = null;
  try {
    user = await createUser(value);
  } catch (e) {
    if (e.name === "PrismaClientKnownRequestError" && e.code == "P2002") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "A user record already exists with that email." });
    } else {
      throw e;
    }
  }
  const csrfToken = setJwtCookie(req, res, user);
  return res.status(StatusCodes.CREATED).json({ name: value.name, csrfToken });
};

const logoff = async (req, res) => {
  res.clearCookie("jwt", cookieFlags(req));
  res.sendStatus(StatusCodes.OK);
};

module.exports = { login, googleLogon, register, logoff };
