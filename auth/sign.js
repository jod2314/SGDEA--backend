const jwt = require("jsonwebtoken");
require("dotenv").config();

function sign(payload, isAccessToken) {
  return jwt.sign(
    payload,
    isAccessToken
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: isAccessToken ? '1h' : '30d', // Access: 1h, Refresh: 30d
      algorithm: "HS256",
    }
  );
}

function generateAccessToken(user) {
  // El access token solo lleva la info básica del usuario
  return sign({ user }, true);
}

/**
 * Genera un Refresh Token vinculado a una familia y un contador.
 */
function generateRefreshToken(user, familyId, counter) {
  return sign({ user, familyId, counter }, false);
}

module.exports = { generateAccessToken, generateRefreshToken };
