const express = require("express");
const fs = require("fs");

const router = express.Router();

router.route("/").get((req, res) => {
  const allowedSources = "https://www.google.com https://www.gstatic.com https://unpkg.com";
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self' 'unsafe-inline' ${allowedSources}; ` +
    `script-src 'self' 'unsafe-inline' ${allowedSources}; ` +
    `frame-src 'self' 'unsafe-inline' ${allowedSources}; ` +
    `style-src 'self' 'unsafe-inline' ${allowedSources}; ` +
    `img-src 'self' data: ${allowedSources};`
  );
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>API Documentation</title>
      <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      <script>
          let token = "";
          function onCaptchaCorrectSet (response) {
             token = response;
          }
          async function onSubmit () {
            if (token) {
              const res = await fetch("/swagger/verify-captcha", {
                body: JSON.stringify({
                  recaptchaToken: token,
                }),
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });
              if (res.status === 200) {
                document.getElementById("captcha-container").remove();
                SwaggerUIBundle({
                  layout: "StandaloneLayout",
                  url: "/swagger/config.yaml",
                  dom_id: "#swagger-ui",
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                  ],
                  deepLinking: true
                });
              }
            } else {
              alert("Please verify you are not a robot.");
            }
          }
      </script>
      <style>
        body { font-family: sans-serif; margin: 0; }
        .container { max-width: 400px; margin: auto; }
        .captcha-container { margin-top: 80px; text-align: center; }
        .g-recaptcha { display: flex; justify-content: center; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <div class="captcha-container" id="captcha-container">
        <h2>Verify Access to API Docs</h2>
        <form onsubmit="onSubmit(); return false;">
          <div class="g-recaptcha" 
               data-callback="onCaptchaCorrectSet"
               data-sitekey="${process.env.RECAPTCHA_SITE_KEY}"></div>
          <br/>
          <button type="submit">Continue to Docs</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

router.route("/verify-captcha").post(async (req, res) => {
  const token = req.body["recaptchaToken"];
  if (!token) return res.status(400).send("CAPTCHA required.");

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
      res.status(200).send({});
    } else {
      res.status(403).send({ message: "Failed CAPTCHA verification. Please go back and try again." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error verifying CAPTCHA" });
  }
});

router.get("/config.yaml", (req, res) => {
  res.setHeader("Content-Type", "application/x-yaml");
  res.send(fs.readFileSync("./swagger.yaml", "utf8"));
});

module.exports = router;
