const express = require("express");
const User = require("../schema/user");
const { jsonResponse } = require("../lib/jsonResponse");
const getUserInfo = require("../lib/getUserInfo");
const router = express.Router();

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json(
      jsonResponse(400, {
        error: "Fields are required",
      })
    );
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json(
        jsonResponse(401, {
          error: "Invalid username or password",
        })
      );
    }

    const isCorrect = await user.isCorrectPassword(password, user.password);

    if (!isCorrect) {
      return res.status(401).json(
        jsonResponse(401, {
          error: "Invalid username or password",
        })
      );
    }

    const accessToken = user.createAccessToken();
    const refreshToken = await user.createRefreshToken();

    res.status(200).json(
      jsonResponse(200, {
        user: getUserInfo(user),
        accessToken,
        refreshToken,
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json(
      jsonResponse(500, {
        error: "An error occurred while logging in.",
      })
    );
  }
});

module.exports = router;