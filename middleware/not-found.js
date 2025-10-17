const { StatusCodes } = require("http-status-codes");
const notFound = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({ message: `There is no ${req.method} route at ${req.path}.` });
};
module.exports = notFound;
