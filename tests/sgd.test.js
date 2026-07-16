const request = require('supertest');
const app = require('../index');
const mongoose = require('mongoose');
const Empresa = require('../schema/empresa');
const TipoDocumental = require('../schema/tipoDocumental');
const Documento = require('../schema/documento');
const User = require('../schema/user');
const Rol = require('../schema/rol');
const UsuarioEmpresa = require('../schema/usuarioEmpresa');

describe('Pruebas de Integración del Sistema de Gestión Documental (SGD) Polimórfico', () => {
  let token;
  let empresaId;
  let headers;

  beforeEach(async () => {
    // 1. Crear un usuario y obtener el token de acceso
    const username = `sgd_user_${Date.now()}`;
    await request(app)
      .post('/api/signup')
      .send({
        username,
        password: 'Password123!',
        name: 'SGD Admin',
        identification: '1234567890'
      });

    const loginRes = await request(app)
      .post('/api/login')
      .send({
        username,
        password: 'Password123!'
      });

    token = loginRes.body.body.accessToken;

    // 2. Crear una empresa y obtener su ID
    const empresa = new Empresa({
      razonSocial: 'Empresa Test SGD S.A.S.',
      nit: `900123456-${Date.now()}`, // Nit único para evitar colisiones
      sigla: 'ETSGD',
      telefono: '3001234567',
      direccion: 'Calle Falsa 123',
      correo: 'contacto@empresatest.com',
      representanteLegal: 'Juan Perez'
    });
    await empresa.save();
    empresaId = empresa._id.toString();

    // 3. Crear Rol de Administrador para la empresa
    const rol = new Rol({
      name: 'Administrador',
      empresaId,
      permissions: { isAdmin: true }
    });
    await rol.save();

    // 4. Buscar el usuario de la BD y vincularlo
    const user = await User.findOne({ username });
    const vinculacion = new UsuarioEmpresa({
      usuarioId: user._id,
      empresaId,
      rolId: rol._id,
      estado: 'ACTIVO'
    });
    await vinculacion.save();

    // 5. Precargar el tipo documental FONDOS_ACUMULADOS_CONTRATOS de forma nativa para los tests de documentos
    const tipoDoc = new TipoDocumental({
      empresaId,
      nombre: 'FONDOS_ACUMULADOS_CONTRATOS',
      codigoClasificacionDefault: '1000-1100-001',
      gestionAniosDefault: 0,
      centralAniosDefault: 20,
      jsonSchema: {
        type: 'object',
        properties: {
          estadoConservacion: { type: 'string', enum: ['BUENO', 'REGULAR', 'MALO'] },
          numeroFolios: { type: 'integer', minimum: 1 },
          numeroCaja: { type: 'string' }
        },
        required: ['estadoConservacion', 'numeroFolios']
      }
    });
    await tipoDoc.save();

    // 6. Precargar un Documento válido para las pruebas de listado/búsqueda
    const docPre = new Documento({
      empresaId,
      codigoClasificacion: '1000-1100-001',
      fechaCreacion: new Date(),
      responsable: user._id,
      nivelAcceso: 'CONFIDENCIAL',
      soporte: 'DIGITAL',
      vigencia: {
        gestionAnios: 0,
        centralAnios: 20
      },
      tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS',
      hashIntegridad: '8f438a2e1d7a3152d1b09b1f7e0258bb27e8a93e3d93ca49b934ca49b934ca49',
      metadatosExtendidos: {
        estadoConservacion: 'BUENO',
        numeroFolios: 42,
        numeroCaja: 'C-01'
      }
    });
    await docPre.save();

    headers = {
      'Authorization': `Bearer ${token}`,
      'X-Empresa-ID': empresaId
    };
  });

  describe('POST /api/sgd/tipos-documentales', () => {
    it('crea un tipo documental con JSON Schema dinámico', async () => {
      const res = await request(app)
        .post('/api/sgd/tipos-documentales')
        .set(headers)
        .send({
          nombre: 'FONDOS_ACUMULADOS_ACTAS',
          codigoClasificacionDefault: '1000-1100-001',
          gestionAniosDefault: 0,
          centralAniosDefault: 20, // 20 años de retención precaucional según CPACA
          jsonSchema: {
            type: 'object',
            properties: {
              estadoConservacion: { type: 'string', enum: ['BUENO', 'REGULAR', 'MALO'] },
              numeroFolios: { type: 'integer', minimum: 1 },
              numeroCaja: { type: 'string' }
            },
            required: ['estadoConservacion', 'numeroFolios']
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.body.tipoDocumental.nombre).toBe('FONDOS_ACUMULADOS_ACTAS');
    });

    it('falla al crear si ya existe un tipo documental con el mismo nombre', async () => {
      const res = await request(app)
        .post('/api/sgd/tipos-documentales')
        .set(headers)
        .send({
          nombre: 'FONDOS_ACUMULADOS_CONTRATOS',
          codigoClasificacionDefault: '1000-1100-001',
          gestionAniosDefault: 0,
          centralAniosDefault: 20,
          jsonSchema: { type: 'object', properties: {} }
        });

      expect(res.status).toBe(400);
      expect(res.body.body.error).toBe('Ya existe un tipo documental con este nombre');
    });
  });

  describe('POST /api/sgd/documentos', () => {
    it('registra un documento SGD validando correctamente los metadatos polimórficos', async () => {
      const res = await request(app)
        .post('/api/sgd/documentos')
        .set(headers)
        .send({
          codigoClasificacion: '1000-1100-001',
          nivelAcceso: 'CONFIDENCIAL',
          soporte: 'DIGITAL',
          tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS',
          hashIntegridad: '8f438a2e1d7a3152d1b09b1f7e0258bb27e8a93e3d93ca49b934ca49b934ca49',
          metadatosExtendidos: {
            estadoConservacion: 'BUENO',
            numeroFolios: 42,
            numeroCaja: 'C-01'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.body.documento.nivelAcceso).toBe('CONFIDENCIAL');
      expect(res.body.body.documento.metadatosExtendidos.estadoConservacion).toBe('BUENO');
    });

    it('rechaza el registro del documento si los metadatos extendidos violan el JSON Schema', async () => {
      const res = await request(app)
        .post('/api/sgd/documentos')
        .set(headers)
        .send({
          codigoClasificacion: '1000-1100-001',
          nivelAcceso: 'PUBLICO',
          soporte: 'ELECTRONICO',
          tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS',
          hashIntegridad: '8f438a2e1d7a3152d1b09b1f7e0258bb27e8a93e3d93ca49b934ca49b934ca49',
          metadatosExtendidos: {
            estadoConservacion: 'INEXISTENTE', // no está en enum
            numeroFolios: 0 // viola minimum: 1
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.body.error).toBe('Fallo en la validación del esquema polimórfico');
    });

    it('rechaza el registro si faltan campos obligatorios de los metadatos universales', async () => {
      const res = await request(app)
        .post('/api/sgd/documentos')
        .set(headers)
        .send({
          tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS',
          // faltan campos obligatorios universales como hashIntegridad o nivelAcceso si no tienen defaults
          hashIntegridad: '' // vacío viola validación
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sgd/documentos', () => {
    it('obtiene la lista de documentos de la empresa', async () => {
      const res = await request(app)
        .get('/api/sgd/documentos')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.body.documentos.length).toBeGreaterThan(0);
    });

    it('filtra los documentos por tipo documental', async () => {
      const res = await request(app)
        .get('/api/sgd/documentos?tipoDocumental=FONDOS_ACUMULADOS_CONTRATOS')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.body.documentos[0].tipoDocumental).toBe('FONDOS_ACUMULADOS_CONTRATOS');
    });
  });

  describe('Ciclo de Retención y Disposición Final (Sprint 3)', () => {
    it('obtiene documentos listos para disposición final', async () => {
      // 1. Registrar un documento cuya retención total haya expirado
      // En este test, por defecto el documento precargado en beforeEach tiene gestionAnios = 0 y centralAnios = 20.
      // Modificaremos la fecha de creación del documento precargado en la BD a 25 años atrás para que esté listo.
      const doc = await Documento.findOne({ tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS', empresaId });
      doc.fechaCreacion = new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000); // 25 años atrás
      await doc.save();

      const res = await request(app)
        .get('/api/sgd/listos-disposicion')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.body.documentos.length).toBeGreaterThan(0);
    });

    it('procesa la eliminación masiva bajo un acta de eliminación', async () => {
      const doc = await Documento.findOne({ tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS', empresaId });
      
      const res = await request(app)
        .post('/api/sgd/eliminar')
        .set(headers)
        .send({
          documentosIds: [doc._id.toString()],
          numeroActa: 'ACTA-2026-001'
        });

      expect(res.status).toBe(200);
      expect(res.body.body.cantidad).toBe(1);
    });

    it('exporta el inventario FUID oficial de los documentos seleccionados', async () => {
      const doc = await Documento.findOne({ tipoDocumental: 'FONDOS_ACUMULADOS_CONTRATOS', empresaId });

      const res = await request(app)
        .post('/api/sgd/exportar-fuid')
        .set(headers)
        .send({
          documentosIds: [doc._id.toString()]
        });

      expect(res.status).toBe(200);
      expect(res.body.body.fuid.length).toBe(1);
      expect(res.body.body.fuid[0].codigo).toBe(doc.codigoClasificacion);
    });
  });
});
