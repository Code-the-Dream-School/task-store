const waitForRouteHandlerCompletion = async (func, req, res) => {
  let next;
  const promise = new Promise((resolve) => {
    next = jest.fn(() => resolve());
    res.on("finish", () => {
      resolve();
    });
  });
  await func(req, res, next);
  await promise;
  return next;
};
module.exports = waitForRouteHandlerCompletion;
