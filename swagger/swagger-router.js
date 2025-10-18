const express = require("express");
const fs = require("fs").promises;

const router = express.Router();

router.route("/").get(async (req, res) => {
  const trustedSources = "https://www.google.com https://www.gstatic.com https://unpkg.com/swagger-ui-dist/";
  const html = await fs.readFile("./swagger/index.html", "utf8");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self' 'unsafe-inline' ${trustedSources}; ` +
    `script-src 'self' 'unsafe-inline' ${trustedSources}; ` +
    `frame-src 'self' 'unsafe-inline' ${trustedSources}; ` +
    `style-src 'self' 'unsafe-inline' ${trustedSources}; ` +
    `img-src 'self' data: ${trustedSources};`
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(
    html.replace(/\${process.env.RECAPTCHA_SITE_KEY}/, process.env.RECAPTCHA_SITE_KEY)
  );
});

router.get("/config.yaml", async (req, res) => {
  const token = req.query["recaptchaToken"];
  if (!token) {
    return res.status(400).send({ message: "CAPTCHA required." });
  }

  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET,
      response: token,
    });

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await response.json();

    if (data.success) {
      res.setHeader("Content-Type", "application/x-yaml");
      const yamlData = await fs.readFile("./swagger/swagger.yaml", "utf8");
      res.status(200).send(yamlData);
    } else {
      res.status(403).send({ message: "Failed CAPTCHA verification. Please go back and try again." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error verifying CAPTCHA" });
  }
});

module.exports = router;
