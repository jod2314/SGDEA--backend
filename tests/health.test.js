/**
 * Test smoke: verifica que el servidor Express arranca y el endpoint
 * de health check responde correctamente.
 *
 * Este test es el primero en ejecutarse — si falla, algo muy fundamental está roto.
 */
const request = require('supertest')
const app = require('../index')

describe('GET /api/test — Health check', () => {
  it('responde 200 con el mensaje de bienvenida', async () => {
    const res = await request(app).get('/api/test')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.body.message).toBe('¡El backend responde!')
  })
})
