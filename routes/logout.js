const express = require("express");
const router = express.Router();
const RefreshTokenFamily = require("../schema/refreshTokenFamily");
const { verifyRefreshToken } = require("../auth/verify");

router.delete("/", async function (req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        // Revocar la familia al cerrar sesión por seguridad
        await RefreshTokenFamily.findByIdAndUpdate(payload.familyId, { revoked: true });
      } catch (e) {
        // Token inválido o expirado, ignorar
      }
    }

    res.clearCookie('refreshToken');
    res.json({ success: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
});

module.exports = router;
