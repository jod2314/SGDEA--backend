function getUserInfo(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
  };
}

module.exports = getUserInfo;
