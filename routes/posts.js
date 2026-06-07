const express = require("express");
const router = express.Router();
const Todo = require("../schema/todo");

// Nota de seguridad: Se exceptua registrarAuditoria aqui porque es una ruta interna de pruebas / posts (no operativa del core archivistico).


router.get("/", async (req, res) => {
  try {
    const items = await Todo.find({ idUser: req.user.id });
    return res.json(items);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error al obtener los todos" });
  }
});

router.post("/", async (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const todo = new Todo({
      idUser: req.user.id,
      title: req.body.title,
      completed: false,
    });
    const todoInfo = await todo.save();
    console.log({ todoInfo });
    res.json(todoInfo);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error al crear el todo" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
    if (!deletedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  try {
    const updateFields = {};
    if (title !== undefined) {
      updateFields.title = title;
    }
    if (completed !== undefined) {
      updateFields.completed = completed;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const updatedTodo = await Todo.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(updatedTodo);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
