function getUserInfo(user) {
  return {
    id: user._id, // Corregido para usar _id de mongo
    name: user.name,
    username: user.username,
    empresaId: user.empresaId, // Añadido para la lógica multi-empresa
  };
}

module.exports = getUserInfo;
