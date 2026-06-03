/**
 * Tests de integración para las rutas de autenticación.
 *
 * Cubre los flujos críticos de login y signup usando Supertest.
 * La BD está en memoria (MongoMemoryServer) — ver tests/setup.js.
 *
 * Campos requeridos por /api/signup: username, password, name, identification
 */
const request = require('supertest')
const app = require('../index')

// ─── POST /api/signup ────────────────────────────────────────────────────────

describe('POST /api/signup', () => {
  const datosValidos = {
    username: 'usuario_test',
    password: 'Password123!',
    name: 'Usuario de Prueba',
    identification: '1234567890',  // campo obligatorio en el modelo SGDEA
  }

  it('crea un nuevo usuario correctamente → 200', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send(datosValidos)

    expect(res.status).toBe(200)
    expect(res.body.body).toHaveProperty('message')
  })

  it('rechaza el registro si falta el campo identification → 400', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({ username: 'test', password: 'test123', name: 'Test' }) // sin identification

    expect(res.status).toBe(400)
    expect(res.body.body).toHaveProperty('error')
  })

  it('rechaza el registro si faltan todos los campos → 400', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({})

    expect(res.status).toBe(400)
  })

  it('rechaza el registro con username duplicado → 409', async () => {
    // Primer registro
    await request(app).post('/api/signup').send(datosValidos)

    // Segundo registro con el mismo username (identification diferente)
    const res = await request(app).post('/api/signup').send({
      ...datosValidos,
      identification: '9999999999',
    })

    expect(res.status).toBe(409)
  })
})

// ─── POST /api/login ─────────────────────────────────────────────────────────

describe('POST /api/login', () => {
  const credenciales = {
    username: 'login_test',
    password: 'Password123!',
  }

  // Crea un usuario antes de los tests de login
  beforeEach(async () => {
    await request(app).post('/api/signup').send({
      ...credenciales,
      name: 'Usuario Login',
      identification: '5555555555',
    })
  })

  it('devuelve 400 si faltan credenciales', async () => {
    const res = await request(app).post('/api/login').send({})

    expect(res.status).toBe(400)
    expect(res.body.body).toHaveProperty('error')
  })

  it('devuelve 401 si el usuario no existe', async () => {
    const res = await request(app).post('/api/login').send({
      username: 'usuario_inexistente',
      password: 'cualquier-password',
    })

    expect(res.status).toBe(401)
  })

  it('devuelve 401 si la contraseña es incorrecta', async () => {
    const res = await request(app).post('/api/login').send({
      username: 'login_test',
      password: 'password-incorrecto',
    })

    expect(res.status).toBe(401)
  })

  it('devuelve 200 con accessToken si las credenciales son correctas', async () => {
    const res = await request(app).post('/api/login').send(credenciales)

    expect(res.status).toBe(200)
    expect(res.body.body).toHaveProperty('accessToken')
    expect(res.body.body.user).toHaveProperty('username', 'login_test')
  })
})
