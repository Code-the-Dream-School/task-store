const prisma = require("../db/prisma");
const crypto = require("crypto");
const util = require("util");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");

  const derivedKey = await scrypt(inputPassword, salt, 64);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function createUser(data) {
  const hashed = await hashPassword(data.password);
  delete data.password;
  return await prisma.user.create({
    data: { ...data, hashedPassword: hashed },
  });
}

async function verifyUserPassword(email, inputPassword) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) return { user: null, isValid: false };

  return {
    user,
    isValid: await comparePassword(inputPassword, user.hashedPassword),
  };
}

// https://stackoverflow.com/questions/9719570/generate-random-password-string-with-5-letters-and-3-numbers-in-javascript
const generateUserPassword = (
  length = 12,
  characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"
) => {
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join("");
};

const googleGetAccessToken = async (code) => {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "authorization_code",
      // https://stackoverflow.com/questions/74189161/google-identity-services-sdk-authorization-code-model-in-popup-mode-how-to-r
      redirect_uri: "postmessage",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error("Authentication failed.");
  }
  const { id_token } = await tokenRes.json();
  return id_token;
};

const googleGetUserInfo = async (id_token) => {
  // const userInfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
  // const userInfoRes = await fetch(
  //   `${userInfoUrl}?access_token=${accessToken}`
  // );
  // const {name, email, email_verified} = await userInfoRes.json();
  // return {name, email, isEmailVerified: email_verified};
  const { name, email, email_verified: isEmailVerified } = id_token;
  return { name, email, isEmailVerified };
};

module.exports = {
  createUser,
  verifyUserPassword,
  generateUserPassword,
  googleGetAccessToken,
  googleGetUserInfo,
};
