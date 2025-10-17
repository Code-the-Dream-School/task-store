const { StatusCodes } = require("http-status-codes");
const errorHandlerMiddleware = (err, req, res) => {
  console.log(
    "Internal server error",
    err.constructor.name,
    JSON.stringify(err, ["name", "message", "stack"])
  );
  if (!res.headerSent) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

module.exports = errorHandlerMiddleware;
