require("dotenv").config();
if (process.env.NODE_ENV === "test")
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("./db/prisma");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");
const swaggerUI = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./swagger/swagger.yaml");
const app = express();

// error handler
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),
);
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");
app.use(cookieParser(process.env.JWT_SECRET)); // we don't really need signed cookies
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(xss());
app.use(helmet());
const port = process.env.PORT || 3000;
// const origins = [];
const origins = true;
// if (process.env.ALLOWED_ORIGINS) {
//   const originArray = process.env.ALLOWED_ORIGINS.split(",");
//   originArray.forEach((orig) => {
//     orig = orig.trim();
//     if (orig.length > 4) {
//       origins.push(orig);
//     }
//   });
// }
// if (origins.length) {
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: "GET,POST,PATCH,DELETE",
      allowedHeaders: "CONTENT-TYPE, X-CSRF-TOKEN",
    }),
  );
// }
// app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
app.use('/api-docs', swaggerUI.serve, (req, res, next) => {
  // Create a fresh spec object dynamically per request
  const spec = {
    ...swaggerDocument,
    servers: [
      { url: `${req.protocol}://${req.get('host')}` }
    ]
  };

  // Serve Swagger UI with the dynamic spec
  swaggerUI.setup(spec)(req, res, next);
});

const jwtMiddleware = require("./middleware/jwtMiddleware");
const userRouter = require("./routes/user");
app.use("/user", userRouter);
const taskRouter = require("./routes/task");
app.use("/tasks", jwtMiddleware, taskRouter);
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
// app.use("/api/analytics", require("./routes/analyticsRoutes"));

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

let server = null;
try {
  server = app.listen(port, () =>
    console.log(`Server is listening on port ${port}...`),
  );
} catch (error) {
  console.log(error);
}

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  server.close();
  try {
    console.log("disconnecting prisma");
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error disconnecting Prisma:", err);
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown();
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown();
});

module.exports = { app, server };
