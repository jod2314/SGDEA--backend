const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const authenticateToken = require("./auth/authenticateToken");
const log = require("./lib/trace");
require("dotenv").config();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

const port = process.env.PORT || 3000;

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.DB_CONNECTION_STRING);

  console.log("Conectado a la base de datos");
}

app.use("/api/test", (req, res) => {
  res.json({ message: "¡El backend responde!" });
});
app.use("/api/signup", require("./routes/signup"));
app.use("/api/login", require("./routes/login"));
app.use("/api/signout", require("./routes/logout"));

// Ruta para renovar el token de acceso utilizando el token de actualización
app.use("/api/refresh-token", require("./routes/refreshToken"));

app.use("/api/posts", authenticateToken, require("./routes/posts"));
// Ruta protegida que requiere autenticación
/* app.get("/api/posts", authenticateToken, (req, res) => {
  res.json(posts);
}); */
/* app.post("/api/posts", authenticateToken, (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const post = {
    id: posts.length + 1,
    title: req.body.title,
    completed: false,
  };

  posts.push(post);

  res.json(post);
}); */

app.use("/api/user", authenticateToken, require("./routes/user"));
app.use("/api/diagnostico", authenticateToken, require("./routes/diagnostico"));
app.use("/api/inventario", authenticateToken, require("./routes/inventario"));
app.use("/api/tvd", authenticateToken, require("./routes/tvd"));
app.use("/api/trd", authenticateToken, require("./routes/trd"));
app.use("/api/documentos", authenticateToken, require("./routes/documentos"));
app.use("/api/expedientes", authenticateToken, require("./routes/expedientes"));
app.use("/api/importar", authenticateToken, require("./routes/importar"));
app.use("/api/exportar", authenticateToken, require("./routes/exportar"));

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});

module.exports = app;
