const { taskSchema, patchTaskSchema } = require("../validation/taskSchema.js");
const { StatusCodes } = require("http-status-codes");

const prisma = require("../db/prisma");

const index = async (req, res) => {
  const options = {
    where: {
      userId: req.user.id,
    },
    omit: { userId: true },
  };
  if (req.query["sortBy"] === "creationDate") req.query["sortBy"] = "createdAt";
  if (["createdAt","priority","title","isCompleted"].includes(req.query["sortBy"])) {
    let direction = "asc";
    if (req.query["sortDirection"] == "desc") {
      direction = "desc";
    }
    const tempObj = {};
    tempObj[req.query["sortBy"]] = direction;
    options["orderBy"]=tempObj;
  }
  if (req.query["find"]) {
    options.where["title"] = { contains: req.query["find"]};
  }
  const allTasks = await prisma.Task.findMany(options);
  if (allTasks.length == 0) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks were found." });
  } else {
    res.json(allTasks);
  }
};

const create = async (req, res) => {
  if (!req.body) req.body = {};
  let maxTasksPerUser = 100;
  if (process.env.MAX_TASKS_PER_USER) maxTasksPerUser = parseInt(process.env.MAX_TASKS_PER_USER, 10);
  const existingTasksCount = await prisma.Task.count({
    where: { userId: req.user?.id }
  });
  if (existingTasksCount >= maxTasksPerUser) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      error: `Maximum tasks exceeded (${maxTasksPerUser}).`
    });
  } else {
    const { error, value } = taskSchema.validate(req.body, {abortEarly: false});
    if (error) {
      console.log(47, error.details);
      return res.status(StatusCodes.BAD_REQUEST).json({error: error.details});
    }
    value.userId = req.user.id;

    const newTask = await prisma.Task.create({
      data: value,
      omit: { userId: true },
    });
    res.status(StatusCodes.CREATED).json(newTask);
  }
};

const update = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: error.details });
  }
  const updated = await prisma.Task.updateMany({
    data: value,
    where: {
      id: parseInt(req.params.id),
      userId: req.user.id,
    },
  });
  if (!updated.count) res.status(StatusCodes.NOT_FOUND);
  res.json({});
};

const show = async (req, res) => {
  const task = await prisma.Task.findFirst({
    where: {
      userId: req.user.id,
      id: parseInt(req.params.id),
    },
    omit: { userId: true },
  });
  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found." });
  }
  res.json(task);
};
const deleteTask = async (req, res) => {
  const deleted = await prisma.Task.deleteMany({
    where: {
      id: parseInt(req.params.id),
      userId: req.user.id,
    },
  });
  if (!deleted.count) res.status(StatusCodes.NOT_FOUND);
  res.json({});
};

module.exports = { index, create, show, update, deleteTask };
