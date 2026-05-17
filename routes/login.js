const express = require("express");
const User = require("../schema/user");
const RefreshTokenFamily = require("../schema/refreshTokenFamily");
const { jsonResponse } = require("../lib/jsonResponse");
const getUserInfo = require("../lib/getUserInfo");
const { generateAccessToken, generateRefreshToken } = require("../auth/sign");
const router = express.Router();

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json(jsonResponse(400, { error: "Fields are required" }));
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json(jsonResponse(401, { error: "Invalid username or password" }));
    }

    const isCorrect = await user.isCorrectPassword(password, user.password);
    if (!isCorrect) {
      return res.status(401).json(jsonResponse(401, { error: "Invalid username or password" }));
    }

    const userInfo = getUserInfo(user);

    // 1. Crear una nueva familia de Refresh Tokens para esta sesión
    const family = new RefreshTokenFamily({ userId: user._id, counter: 0 });
    await family.save();

    // 2. Generar tokens
    const accessToken = generateAccessToken(userInfo);
    const refreshToken = generateRefreshToken(userInfo, family._id, family.counter);

    // 3. Enviar Refresh Token en cookie httpOnly (BFF Pattern)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
    });

    res.status(200).json(
      jsonResponse(200, {
        user: userInfo,
        accessToken,
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json(jsonResponse(500, { error: "An error occurred while logging in." }));
  }
});

module.exports = router;
