const { StatusCodes } = require("http-status-codes");
const errorHandlerMiddleware = (err, _req, res, _next) => {
  if (err?.name === "PrismaClientInitializationError") {
    console.log("Couldn't connect to the database.  Is it running?");
  } else {
    const isPrismaError = err.name && err.name.startsWith("Prisma");

    if (isPrismaError) {
      console.log(err);
      console.error(
        `Prisma error: ${err.name} ${err.errorCode || "error code not provided"}`
      );
      console.error(err.stack); // fallback for other Prisma errors
    } else {
      // For all other errors
      console.error("Internal server error", err.name, err.message);
      console.error(err.stack);
    }
  }
  if (!res.headerSent) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

module.exports = errorHandlerMiddleware;
