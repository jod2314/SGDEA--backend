const express = require("express");
const { jsonResponse } = require("../lib/jsonResponse");
const { verifyRefreshToken } = require("../auth/verify");
const { generateAccessToken, generateRefreshToken } = require("../auth/sign");
const RefreshTokenFamily = require("../schema/refreshTokenFamily");

// Nota de seguridad: Se exceptua registrarAuditoria aqui por ser una renovacion de token de sesion de corta duracion.

const router = express.Router();

router.post("/", async function (req, res) {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const { user, familyId, counter } = payload;

    const family = await RefreshTokenFamily.findById(familyId);

    // 1. Detectar si la familia fue revocada o el token es antiguo (detección de reuso)
    if (!family || family.revoked || family.counter !== counter) {
      if (family) {
        family.revoked = true;
        await family.save();
      }
      res.clearCookie('refreshToken');
      return res.status(403).json({ error: "Token comprometido o inválido. Reautentique." });
    }

    // 2. Rotación: Incrementar contador y generar nuevo token
    family.counter += 1;
    await family.save();

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user, family._id, family.counter);

    // 3. Actualizar Cookie con el nuevo Refresh Token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json(jsonResponse(200, { accessToken: newAccessToken }));
  } catch (error) {
    console.error("Error en refresh token:", error);
    return res.status(403).json({ error: "Token de actualización inválido" });
  }
});

module.exports = router;
