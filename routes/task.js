const express = require("express");

const router = express.Router();
const {
  index,
  create,
  update,
  show,
  deleteTask,
} = require("../controllers/taskController");

router.route("/").post(create).get(index);

router.route("/:id").get(show).delete(deleteTask).patch(update);

module.exports = router;
