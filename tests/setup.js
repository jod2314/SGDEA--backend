/**
 * Configuración global de Jest para el backend SGDEA.
 *
 * Patrón: singleton de conexión — se conecta al MongoMemoryServer
 * solo si Mongoose no tiene una conexión activa aún.
 * Esto evita el error "Can't call openUri() on an active connection"
 * cuando Jest ejecuta setupFilesAfterEnv en múltiples suites en paralelo.
 */
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

// Estado compartido entre suites (singleton en el proceso de Jest)
let mongoServer = null

beforeAll(async () => {
  // Solo conectar si no hay una conexión activa
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    await mongoose.connect(uri)
  }
}, 60000)

// Limpia todas las colecciones entre tests para evitar contaminación de datos
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const colecciones = mongoose.connection.collections
    await Promise.all(
      Object.values(colecciones).map((col) => col.deleteMany({}))
    )
  }
})

// Cierra la conexión y detiene el servidor al finalizar TODOS los tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
  }
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
}, 30000)
