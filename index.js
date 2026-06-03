const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const mongoose = require("mongoose");
const authenticateToken = require("./auth/authenticateToken");
const verifyEmpresaContext = require("./middleware/verifyEmpresaContext");
const log = require("./lib/trace");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Asegurar existencia del directorio de uploads para imágenes locales
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "https://sgdea-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como herramientas de testing)
      if (!origin) return callback(null, true);

      const isVercel = origin.endsWith(".vercel.app");
      const isLocal =
        origin.includes("localhost:") || origin.includes("127.0.0.1:");
      const isInList = allowedOrigins.includes(origin);

      if (isVercel || isLocal || isInList) {
        callback(null, true);
      } else {
        console.warn(`CORS bloqueado para el origen: ${origin}`);
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Empresa-ID"],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const port = process.env.PORT || 3000;

// En entorno test, la conexión la gestiona MongoMemoryServer (tests/setup.js)
// para evitar el conflicto "Can't call openUri() on an active connection"
if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => console.log(err));
}

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
app.use("/api/empresas", authenticateToken, require("./routes/empresas"));

// Rutas operativas protegidas por contexto de empresa
app.use("/api/plantillas", authenticateToken, verifyEmpresaContext, require("./routes/plantillas"));
app.use("/api/entidades", authenticateToken, verifyEmpresaContext, require("./routes/entidades"));
app.use("/api/archivistica", authenticateToken, verifyEmpresaContext, require("./routes/archivistica"));
app.use("/api/documentos", authenticateToken, verifyEmpresaContext, require("./routes/documentos"));
app.use("/api/audit", authenticateToken, verifyEmpresaContext, require("./routes/audit"));
app.use("/api/consecutivos", authenticateToken, verifyEmpresaContext, require("./routes/consecutivos"));
app.use("/api/datos-maestros", authenticateToken, verifyEmpresaContext, require("./routes/datosMaestros"));
app.use("/api/expedientes", authenticateToken, verifyEmpresaContext, require("./routes/expedientes"));
app.use("/api/transferencias", authenticateToken, verifyEmpresaContext, require("./routes/transferencias"));
app.use("/api/disposicion", authenticateToken, verifyEmpresaContext, require("./routes/disposicion"));
app.use("/api/onboarding", authenticateToken, verifyEmpresaContext, require("./routes/onboarding"));
app.use("/api/reports", authenticateToken, verifyEmpresaContext, require("./routes/reports"));
app.use("/api/fondos-acumulados", authenticateToken, verifyEmpresaContext, require("./routes/fondosAcumulados"));

// Solo levantamos el servidor HTTP en entornos que no sean testing
// En tests, Supertest crea su propio servidor efímero desde el objeto `app`
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is up on port ${port} - Deploy verification: ${new Date().toISOString()}`);
  });
}

module.exports = app;
