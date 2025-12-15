const prisma = require("../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
let maxTasksPerUser = 100;
if (process.env.MAX_TASKS_PER_USER)
  maxTasksPerUser = parseInt(process.env.MAX_TASKS_PER_USER, 10);

const whereClause = (query) => {
  const filters = [];
  if (query.find) {
    filters.push({ title: { contains: query.find, mode: "insensitive" } });
  }
  if (query.isCompleted) {
    const boolToFind = query.isCompleted === "true";
    filters.push({ isCompleted: boolToFind });
  }
  if (query.priority) {
    filters.push({ priority: query.priority });
  }
  function validDate(dateString) {
    const dateObj = new Date(dateString); // Attempt to create a Date object
    // Check if the time value is NaN
    if (isNaN(dateObj.getTime())) return null;
    return dateObj;
  }
  query.max_date = validDate(query.max_date);
  query.min_date = validDate(query.min_date);
  if (query.max_date && query.min_date) {
    filters.push({ createdAt: { lte: query.max_date, gte: query.min_date } });
  } else if (query.min_date) {
    filters.push({ createdAt: { gte: new Date(query.min_date) } });
  } else if (query.max_date) {
    filters.push({ createdAt: { lte: new Date(query.max_date) } });
  }
};

const getFields = (fields) => {
  const fieldList = fields.split(",");
  const taskAttributes = ["title", "priority", "createdAt", "id"];
  const taskFields = fieldList.filter((field) =>
    taskAttributes.includes(field)
  );
  if (taskFields.length === 0) return null; // need at least one task field
  const userAttributes = ["name", "email"];
  const userFields = fieldList.filter((field) =>
    userAttributes.includes(field)
  );
  const taskSelect = Object.fromEntries(
    taskFields.map((field) => [field, true])
  );
  if (userFields.length) {
    //if we want some user fields
    const userSelect = Object.fromEntries(
      userFields.map((field) => [field, true])
    );
    taskSelect["User"] = { select: userSelect };
  }
  return taskSelect;
};

exports.index = async (req, res) => {
  let sortBy = "createdAt"; // default
  let direction = "desc"; // default if sortBy is not specified
  if (
    req.query.sortBy &&
    ["createdAt", "title", "priority", "isCompleted"].includes(req.query.sortBy)
  ) {
    sortBy = req.query.sortBy;
    direction = "asc"; // defualt if sortBy specified
  }
  if (req.query.sortDirection === "desc") direction = "desc";
  const orderBy = { [sortBy]: direction };

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let select;
  if (req.query.fields) {
    select = getFields(req.query.fields);
    if (!select) {
      // no task fields specified, not allowed
      return res.status(400).json({
        message:
          "When specifying fields, at least one task field must be included.",
      });
    }
  } else {
    select = {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    };
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: req.user.id,
      ...whereClause(req.query),
    },
    select,
    skip: skip,
    take: limit,
    orderBy,
  });
  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }
  const totalTasks = await prisma.task.count({
    where: {
      userId: req.user.id,
      ...whereClause(req.query),
    },
  });
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  // Return tasks with pagination information
  res.status(200).json({
    tasks,
    pagination,
  });
};

exports.show = async (req, res) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid task id." });
  }

  // Use global user_id (set during login/registration)
  const task = await prisma.task.findUnique({
    where: {
      id,
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      createdAt: true,
      priority: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(task);
};

exports.create = async (req, res, next) => {
  const existingTasksCount = await prisma.Task.count({
    where: { userId: req.user?.id },
  });
  if (existingTasksCount >= maxTasksPerUser) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      message: `Maximum tasks exceeded (${maxTasksPerUser}).`,
    });
  }
  // Use global user_id (set during login/registration)
  const { error, value } = taskSchema.validate(req.body);

  if (error) return next(error);

  const newTask = await prisma.task.create({
    data: {
      ...value,
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
    },
  });
  res.status(201).json(newTask);
};

exports.update = async (req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid task id." });
  }
  if (!req.body) {
    req.body = {};
  }
  const { error, value } = patchTaskSchema.validate(req.body);
  if (error) return next(error);
  let task;
  try {
    task = await prisma.task.update({
      where: { id, userId: req.user.id },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
  res.status(200).json(task);
};

exports.deleteTask = async (req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid task id." });
  }
  let task;
  try {
    task = await prisma.task.delete({
      where: { id, userId: req.user.id },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
  res.status(200).json(task);
};

exports.bulkCreate = async (req, res, next) => {
  // Validate the tasks array
  const tasks = req.body?.tasks;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }
  const existingTasksCount = await prisma.Task.count({
    where: { userId: req.user?.id },
  });
  if (existingTasksCount + tasks.length > maxTasksPerUser) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      message: `Maximum tasks exceeded (${maxTasksPerUser}).`,
    });
  }
  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) return next(error);
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  // Use createMany for batch insertion
  const result = await prisma.task.createMany({
    data: validTasks,
    skipDuplicates: false,
  });

  // Return success message with counts
  // Hint: The test expects message, tasksCreated, and totalRequested
  res.status(201).json({
    // ... you need to return the response object
    message: "success!",
    tasksCreated: result.count,
    totalRequested: validTasks.length,
  });
};
