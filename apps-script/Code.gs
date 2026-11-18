/**
 * Auditoría Visual - Backend (Google Apps Script)
 *
 * Auditorías internas de tiendas: plantillas de criterios por empresa, auditorías
 * con puntaje por criterio y su informe (el PDF lo arma el frontend con el mismo
 * formato del Excel). Los datos viven en Google Sheets.
 *
 * Despliegue:
 *   Extensiones > Apps Script > pegar este archivo
 *   > Implementar > Aplicación web
 *   > Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
 *
 * Primera vez: ejecuta la función `instalar` (botón Ejecutar en el editor, o menú
 * "Auditoría Visual" de la hoja tras recargarla). Crea las pestañas, una empresa,
 * una sucursal y una plantilla de ejemplo (la del Excel original) y un admin
 * inicial (la contraseña queda en la pestaña Usuarios). Es seguro volver a ejecutarla.
 * Funciona vinculado a un Sheet (Extensiones > Apps Script) o como proyecto
 * independiente (script.google.com): en ese caso crea el Sheet "Auditoría Visual"
 * en tu Drive y guarda su ID en SPREADSHEET_ID.
 *
 * Pestañas (fila 1 = encabezados exactos):
 *   "Usuarios":    usuario | password | rol | activo | empresas | nombre
 *   "Empresas":    id | nombre | activo | color
 *   "Sucursales":  id | empresaId | nombre | encargada | direccion | activo
 *   "Plantillas":  id | empresaId | nombre | codigo | titulo | escalaMax | activo |
 *                  estructura | creadoPor | fechaCreacion
 *   "Auditorias":  id | folio | plantillaId | empresaId | sucursalId | encargada |
 *                  auditor | fecha | estado | estructura | respuestas | maximo |
 *                  obtenido | creadoPor | fechaCreacion | fechaFinalizada
 *
 * "estructura" y "respuestas" son JSON. La estructura de una auditoría es una COPIA
 * de la plantilla al crearla: editar la plantilla después no cambia auditorías hechas.
 *
 * Roles:
 *   admin     control total (empresas, sucursales, plantillas, usuarios, reabrir y borrar).
 *   auditor   crea y completa auditorías de sus empresas.
 *   consulta  solo ve auditorías y descarga el informe.
 * "empresas" en Usuarios son ids separados por coma; vacío = todas.
 */

var SHEET_USUARIOS = 'Usuarios';
var SHEET_EMPRESAS = 'Empresas';
var SHEET_SUCURSALES = 'Sucursales';
var SHEET_PLANTILLAS = 'Plantillas';
var SHEET_AUDITORIAS = 'Auditorias';

var COL_USR = { usuario: 0, password: 1, rol: 2, activo: 3, empresas: 4, nombre: 5 };
var COL_EMP = { id: 0, nombre: 1, activo: 2, color: 3 };
var COL_SUC = { id: 0, empresaId: 1, nombre: 2, encargada: 3, direccion: 4, activo: 5 };
var COL_PLA = { id: 0, empresaId: 1, nombre: 2, codigo: 3, titulo: 4, escalaMax: 5, activo: 6,
                estructura: 7, creadoPor: 8, fechaCreacion: 9 };
var COL_AUD = { id: 0, folio: 1, plantillaId: 2, empresaId: 3, sucursalId: 4, encargada: 5,
                auditor: 6, fecha: 7, estado: 8, estructura: 9, respuestas: 10, maximo: 11,
                obtenido: 12, creadoPor: 13, fechaCreacion: 14, fechaFinalizada: 15 };

var ROLES = ['admin', 'auditor', 'consulta'];
var ESTADOS = ['borrador', 'finalizada'];
var COLOR_DEFECTO = '#193B59';
// Una celda de Sheets admite 50.000 caracteres.
var MAX_JSON = 45000;

var ENCABEZADOS = {
  Usuarios: ['usuario', 'password', 'rol', 'activo', 'empresas', 'nombre'],
  Empresas: ['id', 'nombre', 'activo', 'color'],
  Sucursales: ['id', 'empresaId', 'nombre', 'encargada', 'direccion', 'activo'],
  Plantillas: ['id', 'empresaId', 'nombre', 'codigo', 'titulo', 'escalaMax', 'activo', 'estructura', 'creadoPor', 'fechaCreacion'],
  Auditorias: ['id', 'folio', 'plantillaId', 'empresaId', 'sucursalId', 'encargada', 'auditor', 'fecha', 'estado',
               'estructura', 'respuestas', 'maximo', 'obtenido', 'creadoPor', 'fechaCreacion', 'fechaFinalizada']
};

function doGet() {
  return jsonOut_({ ok: true, service: 'auditoria-visual' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Solicitud inválida' });
  }

  try {
    switch (body.action) {
      case 'login':             return handleLogin_(body);
      case 'getRevisions':      return handleGetRevisions_(body);
      case 'listEmpresas':      return handleListEmpresas_(body);
      case 'createEmpresa':     return handleSaveEmpresa_(body, false);
      case 'updateEmpresa':     return handleSaveEmpresa_(body, true);
      case 'deleteEmpresa':     return handleDeleteEmpresa_(body);
      case 'listSucursales':    return handleListSucursales_(body);
      case 'createSucursal':    return handleSaveSucursal_(body, false);
      case 'updateSucursal':    return handleSaveSucursal_(body, true);
      case 'deleteSucursal':    return handleDeleteSucursal_(body);
      case 'listPlantillas':    return handleListPlantillas_(body);
      case 'createPlantilla':   return handleSavePlantilla_(body, false);
      case 'updatePlantilla':   return handleSavePlantilla_(body, true);
      case 'deletePlantilla':   return handleDeletePlantilla_(body);
      case 'listAuditorias':    return handleListAuditorias_(body);
      case 'getAuditoria':      return handleGetAuditoria_(body);
      case 'createAuditoria':   return handleCreateAuditoria_(body);
      case 'saveAuditoria':     return handleSaveAuditoria_(body);
      case 'reabrirAuditoria':  return handleReabrirAuditoria_(body);
      case 'deleteAuditoria':   return handleDeleteAuditoria_(body);
      case 'listUsuarios':      return handleListUsuarios_(body);
      case 'createUsuario':     return handleCreateUsuario_(body);
      case 'updateUsuario':     return handleUpdateUsuario_(body);
      case 'deleteUsuario':     return handleDeleteUsuario_(body);
      case 'cambiarMiPassword': return handleCambiarMiPassword_(body);
      default:                  return jsonOut_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    // "codigo" deja que el frontend distinga una sesión caída de cualquier otro error.
    return jsonOut_({
      ok: false,
      error: err.message || ('Error del servidor: ' + err),
      codigo: err.codigo || ''
    });
  }
}

// ---------- Autenticación ----------

function handleLogin_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) return jsonOut_({ ok: false, error: 'Usuario o contraseña incorrectos' });
  return jsonOut_({ ok: true, usuario: user.usuario, nombre: user.nombre, rol: user.rol, empresas: user.empresas });
}

/** Valida credenciales y devuelve el usuario, o lanza un error con codigo 'SESION'. */
function requireAuth_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) {
    var e = new Error('Sesión no válida. Vuelve a iniciar sesión.');
    e.codigo = 'SESION';
    throw e;
  }
  return user;
}

function requireRol_(body, roles) {
  var user = requireAuth_(body);
  if (roles.indexOf(user.rol) === -1) throw new Error('No autorizado para esta acción.');
  return user;
}

function requireAdmin_(body) {
  return requireRol_(body, ['admin']);
}

/**
 * Las credenciales ya validadas se guardan unos minutos en la caché del script (la clave es una huella SHA-256:
 * la contraseña no se guarda) para no leer la hoja Usuarios en cada llamada. Cualquier cambio de usuarios hecho
 * desde la app invalida la caché al instante (ver aplicarRevisiones_).
 */
var CACHE_AUTH_SEG = 300;
var CLAVE_VERSION_AUTH = 'auth_version';

function claveAuth_(nombre, pass) {
  var huella = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, nombre.toUpperCase() + '\n' + pass, Utilities.Charset.UTF_8);
  return 'auth_' + Utilities.base64Encode(huella);
}

function invalidarAuth_() {
  try { CacheService.getScriptCache().put(CLAVE_VERSION_AUTH, Utilities.getUuid(), 21600); } catch (e) {}
}

/** Busca un usuario activo con usuario y contraseña coincidentes. Devuelve { usuario, rol, nombre, empresas } o null. */
function findUser_(usuario, password) {
  var nombre = String(usuario || '').trim();
  var pass = String(password || '');
  if (!nombre || !pass) return null;

  var cache = null, clave = '', version = '';
  try {
    cache = CacheService.getScriptCache();
    clave = claveAuth_(nombre, pass);
    var guardado = cache.getAll([clave, CLAVE_VERSION_AUTH]);
    version = guardado[CLAVE_VERSION_AUTH] || '';
    if (!version) {
      version = Utilities.getUuid();
      cache.put(CLAVE_VERSION_AUTH, version, 21600);
    } else if (guardado[clave]) {
      var c = JSON.parse(guardado[clave]);
      if (c.v === version) return c.u;
    }
  } catch (e) {
    cache = null;
  }

  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var rowUsuario = String(rows[i][COL_USR.usuario]).trim();
    var rowPass = String(rows[i][COL_USR.password]);
    // El usuario no distingue mayúsculas/minúsculas; la contraseña sí.
    if (rowUsuario.toUpperCase() === nombre.toUpperCase() && rowPass === pass && esActivo_(rows[i][COL_USR.activo])) {
      var encontrado = {
        usuario: rowUsuario,
        rol: normalizarRol_(rows[i][COL_USR.rol]),
        activo: true,
        nombre: String(rows[i][COL_USR.nombre] || '').trim(),
        empresas: parseLista_(rows[i][COL_USR.empresas])
      };
      if (cache) { try { cache.put(clave, JSON.stringify({ v: version, u: encontrado }), CACHE_AUTH_SEG); } catch (e) {} }
      return encontrado;
    }
  }
  return null;
}

/** ¿Este usuario puede ver datos de esta empresa? Admin y usuarios sin empresas asignadas ven todas. */
function veEmpresa_(user, empresaId) {
  if (user.rol === 'admin' || user.empresas.length === 0) return true;
  return user.empresas.indexOf(empresaId) !== -1;
}

// ---------- Revisiones (caché del frontend) ----------

var REVISIONES_PENDIENTES_ = [];
var PROPS_RECIENTES_ = null;

function bumpRevision_(key) {
  if (REVISIONES_PENDIENTES_.indexOf(key) === -1) REVISIONES_PENDIENTES_.push(key);
}

function aplicarRevisiones_() {
  var claves = REVISIONES_PENDIENTES_;
  REVISIONES_PENDIENTES_ = [];
  if (!claves.length) return;
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var nuevas = {};
  claves.forEach(function (k) { nuevas['rev_' + k] = String((Number(todas['rev_' + k]) || 0) + 1); });
  props.setProperties(nuevas);
  Object.keys(nuevas).forEach(function (k) { todas[k] = nuevas[k]; });
  PROPS_RECIENTES_ = todas;
  if (claves.indexOf('usuarios') !== -1) invalidarAuth_();
}

/** Sube los contadores pendientes y suelta el lock. Va en el finally de cada escritura. */
function liberar_(lock) {
  try {
    aplicarRevisiones_();
  } finally {
    lock.releaseLock();
  }
}

function handleGetRevisions_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, revisiones: revisionesActuales_() });
}

function revisionesActuales_() {
  var props = PROPS_RECIENTES_ || PropertiesService.getScriptProperties().getProperties();
  var revisiones = {};
  ['empresas', 'sucursales', 'plantillas', 'auditorias', 'usuarios'].forEach(function (k) {
    revisiones[k] = Number(props['rev_' + k]) || 0;
  });
  return revisiones;
}

/** Ejecuta `fn` con el lock del script tomado y los contadores subidos al final. */
function conLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    liberar_(lock);
  }
}

// ---------- Empresas ----------

function rowToEmpresa_(row) {
  return {
    id: String(row[COL_EMP.id]).trim(),
    nombre: String(row[COL_EMP.nombre]).trim(),
    activo: esActivo_(row[COL_EMP.activo]),
    color: colorValido_(row[COL_EMP.color])
  };
}

function handleListEmpresas_(body) {
  var user = requireAuth_(body);
  var rows = getSheet_(SHEET_EMPRESAS).getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_EMP.id]).trim()) continue;
    var e = rowToEmpresa_(rows[i]);
    if (veEmpresa_(user, e.id)) lista.push(e);
  }
  lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  return jsonOut_({ ok: true, empresas: lista });
}

function handleSaveEmpresa_(body, edita) {
  var user = requireRol_(body, ['admin', 'auditor']);
  // Un auditor limitado a ciertas empresas no vería la nueva: solo puede crear si tiene acceso a todas.
  if (!edita && !veEmpresa_(user, '*') && user.rol !== 'admin') throw new Error('Tu usuario está limitado a ciertas empresas: pídele al Admin que la cree.');
  var nombre = String(body.nombre || '').trim().slice(0, 60);
  var color = colorValido_(body.color);
  var activo = body.activo !== false;
  if (!nombre) throw new Error('El nombre es obligatorio.');

  var sheet = getSheet_(SHEET_EMPRESAS);
  var rows = sheet.getDataRange().getValues();
  var fila = null;
  if (edita) {
    fila = filaPorId_(sheet, COL_EMP.id, body.id);
    if (!fila) throw new Error('La empresa ya no existe.');
    if (!veEmpresa_(user, String(fila.valores[COL_EMP.id]).trim())) throw new Error('No tienes acceso a esa empresa.');
  }
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_EMP.nombre]).trim().toUpperCase() === nombre.toUpperCase() && (!fila || fila.indice !== i + 1)) {
      throw new Error('Ya existe una empresa con ese nombre.');
    }
  }

  conLock_(function () {
    if (fila) {
      sheet.getRange(fila.indice, COL_EMP.nombre + 1, 1, 3).setValues([[nombre, activo, color]]);
    } else {
      sheet.appendRow([nuevoId_(), nombre, activo, color]);
    }
    bumpRevision_('empresas');
  });
  return jsonOut_({ ok: true });
}

/** Solo se borra si no tiene sucursales, plantillas ni auditorías; si tiene, hay que desactivarla. */
function handleDeleteEmpresa_(body) {
  requireAdmin_(body);
  var sheet = getSheet_(SHEET_EMPRESAS);
  var fila = filaPorId_(sheet, COL_EMP.id, body.id);
  if (!fila) throw new Error('La empresa ya no existe.');
  var id = String(body.id).trim();
  if (hayFilaCon_(SHEET_SUCURSALES, COL_SUC.empresaId, id) || hayFilaCon_(SHEET_PLANTILLAS, COL_PLA.empresaId, id) ||
      hayFilaCon_(SHEET_AUDITORIAS, COL_AUD.empresaId, id)) {
    throw new Error('La empresa tiene sucursales, plantillas o auditorías. Desactívala en lugar de borrarla.');
  }
  conLock_(function () {
    borrarFila_(sheet, fila.indice);
    bumpRevision_('empresas');
  });
  return jsonOut_({ ok: true });
}

function validarEmpresa_(empresaId) {
  var id = String(empresaId || '').trim();
  if (!id) throw new Error('La empresa es obligatoria.');
  var fila = filaPorId_(getSheet_(SHEET_EMPRESAS), COL_EMP.id, id);
  if (!fila) throw new Error('La empresa no existe.');
  return rowToEmpresa_(fila.valores);
}

// ---------- Sucursales ----------

function rowToSucursal_(row) {
  return {
    id: String(row[COL_SUC.id]).trim(),
    empresaId: String(row[COL_SUC.empresaId]).trim(),
    nombre: String(row[COL_SUC.nombre]).trim(),
    encargada: String(row[COL_SUC.encargada]).trim(),
    direccion: String(row[COL_SUC.direccion]).trim(),
    activo: esActivo_(row[COL_SUC.activo])
  };
}

function handleListSucursales_(body) {
  var user = requireAuth_(body);
  var rows = getSheet_(SHEET_SUCURSALES).getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_SUC.id]).trim()) continue;
    var s = rowToSucursal_(rows[i]);
    if (veEmpresa_(user, s.empresaId)) lista.push(s);
  }
  lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  return jsonOut_({ ok: true, sucursales: lista });
}

function handleSaveSucursal_(body, edita) {
  var user = requireRol_(body, ['admin', 'auditor']);
  var empresa = validarEmpresa_(body.empresaId);
  if (!veEmpresa_(user, empresa.id)) throw new Error('No tienes acceso a esa empresa.');
  var nombre = String(body.nombre || '').trim().slice(0, 60);
  var encargada = String(body.encargada || '').trim().slice(0, 80);
  var direccion = String(body.direccion || '').trim().slice(0, 150);
  var activo = body.activo !== false;
  if (!nombre) throw new Error('El nombre es obligatorio.');

  var sheet = getSheet_(SHEET_SUCURSALES);
  var rows = sheet.getDataRange().getValues();
  var fila = null;
  if (edita) {
    fila = filaPorId_(sheet, COL_SUC.id, body.id);
    if (!fila) throw new Error('La sucursal ya no existe.');
    if (!veEmpresa_(user, String(fila.valores[COL_SUC.empresaId]).trim())) throw new Error('No tienes acceso a esa sucursal.');
    if (String(fila.valores[COL_SUC.empresaId]).trim() !== empresa.id &&
        hayFilaCon_(SHEET_AUDITORIAS, COL_AUD.sucursalId, String(body.id).trim())) {
      throw new Error('La sucursal ya tiene auditorías: no se puede pasar a otra empresa.');
    }
  }
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_SUC.empresaId]).trim() === empresa.id &&
        String(rows[i][COL_SUC.nombre]).trim().toUpperCase() === nombre.toUpperCase() && (!fila || fila.indice !== i + 1)) {
      throw new Error('Ya existe una sucursal con ese nombre en la empresa.');
    }
  }

  conLock_(function () {
    if (fila) {
      sheet.getRange(fila.indice, COL_SUC.empresaId + 1, 1, 5).setValues([[empresa.id, nombre, encargada, direccion, activo]]);
    } else {
      sheet.appendRow([nuevoId_(), empresa.id, nombre, encargada, direccion, activo]);
    }
    bumpRevision_('sucursales');
  });
  return jsonOut_({ ok: true });
}

/** Solo se borra si no tiene auditorías; si tiene, hay que desactivarla. */
function handleDeleteSucursal_(body) {
  requireAdmin_(body);
  var sheet = getSheet_(SHEET_SUCURSALES);
  var fila = filaPorId_(sheet, COL_SUC.id, body.id);
  if (!fila) throw new Error('La sucursal ya no existe.');
  if (hayFilaCon_(SHEET_AUDITORIAS, COL_AUD.sucursalId, String(body.id).trim())) {
    throw new Error('La sucursal tiene auditorías. Desactívala en lugar de borrarla.');
  }
  conLock_(function () {
    borrarFila_(sheet, fila.indice);
    bumpRevision_('sucursales');
  });
  return jsonOut_({ ok: true });
}

// ---------- Plantillas ----------

function rowToPlantilla_(row) {
  return {
    id: String(row[COL_PLA.id]).trim(),
    empresaId: String(row[COL_PLA.empresaId]).trim(),
    nombre: String(row[COL_PLA.nombre]).trim(),
    codigo: String(row[COL_PLA.codigo]).trim(),
    titulo: String(row[COL_PLA.titulo]).trim(),
    escalaMax: Number(row[COL_PLA.escalaMax]) || 5,
    activo: esActivo_(row[COL_PLA.activo]),
    secciones: parsearJson_(row[COL_PLA.estructura], { secciones: [] }).secciones || []
  };
}

function handleListPlantillas_(body) {
  var user = requireAuth_(body);
  var rows = getSheet_(SHEET_PLANTILLAS).getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_PLA.id]).trim()) continue;
    var p = rowToPlantilla_(rows[i]);
    if (veEmpresa_(user, p.empresaId)) lista.push(p);
  }
  lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  return jsonOut_({ ok: true, plantillas: lista });
}

/**
 * Valida y normaliza las secciones: cada sección y criterio conserva su id (así la
 * columna "Anterior" sigue funcionando entre auditorías) o recibe uno nuevo.
 */
function normalizarSecciones_(secciones, escalaMax) {
  if (!Array.isArray(secciones) || secciones.length === 0) throw new Error('La plantilla necesita al menos una sección.');
  if (secciones.length > 40) throw new Error('Máximo 40 secciones por plantilla.');
  var usados = {};
  var idUnico = function (id) {
    var v = String(id || '').trim();
    if (!/^[a-z0-9]{1,12}$/.test(v) || usados[v]) {
      do { v = Utilities.getUuid().replace(/-/g, '').slice(0, 8); } while (usados[v]);
    }
    usados[v] = true;
    return v;
  };
  var total = 0;
  var salida = secciones.map(function (s, n) {
    var titulo = String(s.titulo || '').trim().slice(0, 200);
    if (!titulo) throw new Error('La sección ' + (n + 1) + ' no tiene título.');
    var items = Array.isArray(s.items) ? s.items : [];
    return {
      id: idUnico(s.id),
      titulo: titulo,
      items: items.map(function (it, m) {
        var texto = String(it.texto || '').trim().slice(0, 600);
        if (!texto) throw new Error('Falta el texto del criterio ' + (m + 1) + ' de la sección ' + (n + 1) + '.');
        var max = Number(it.max);
        if (!isFinite(max) || max <= 0) max = escalaMax;
        if (max > 1000) throw new Error('El puntaje máximo de un criterio no puede pasar de 1000.');
        total++;
        var instrucciones = String(it.instrucciones || '').trim().slice(0, 2000);
        var crit = { id: idUnico(it.id), texto: texto, max: max };
        if (instrucciones) crit.instrucciones = instrucciones;
        return crit;
      })
    };
  });
  if (total === 0) throw new Error('La plantilla necesita al menos un criterio.');
  return salida;
}

function handleSavePlantilla_(body, edita) {
  var user = requireRol_(body, ['admin', 'auditor']);
  var empresa = validarEmpresa_(body.empresaId);
  if (!veEmpresa_(user, empresa.id)) throw new Error('No tienes acceso a esa empresa.');
  var nombre = String(body.nombre || '').trim().slice(0, 80);
  var codigo = String(body.codigo || '').trim().slice(0, 30);
  var titulo = String(body.titulo || '').trim().slice(0, 100) || 'INFORME DE AUDITORÍA INTERNA';
  var escalaMax = Number(body.escalaMax);
  if (!isFinite(escalaMax) || escalaMax <= 0 || escalaMax > 1000) escalaMax = 5;
  var activo = body.activo !== false;
  if (!nombre) throw new Error('El nombre es obligatorio.');
  var secciones = normalizarSecciones_(body.secciones, escalaMax);
  var json = JSON.stringify({ secciones: secciones });
  if (json.length > MAX_JSON) throw new Error('La plantilla es demasiado grande. Reduce el texto o la cantidad de criterios.');

  var sheet = getSheet_(SHEET_PLANTILLAS);
  var rows = sheet.getDataRange().getValues();
  var fila = null;
  if (edita) {
    fila = filaPorId_(sheet, COL_PLA.id, body.id);
    if (!fila) throw new Error('La plantilla ya no existe.');
    if (!veEmpresa_(user, String(fila.valores[COL_PLA.empresaId]).trim())) throw new Error('No tienes acceso a esa plantilla.');
  }
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_PLA.empresaId]).trim() === empresa.id &&
        String(rows[i][COL_PLA.nombre]).trim().toUpperCase() === nombre.toUpperCase() && (!fila || fila.indice !== i + 1)) {
      throw new Error('Ya existe una plantilla con ese nombre en la empresa.');
    }
  }

  var id = fila ? String(fila.valores[COL_PLA.id]).trim() : nuevoId_();
  conLock_(function () {
    if (fila) {
      sheet.getRange(fila.indice, COL_PLA.empresaId + 1, 1, 7).setValues([[empresa.id, nombre, codigo, titulo, escalaMax, activo, json]]);
    } else {
      sheet.appendRow([id, empresa.id, nombre, codigo, titulo, escalaMax, activo, json, user.usuario, ahoraLocal_()]);
    }
    bumpRevision_('plantillas');
  });
  return jsonOut_({ ok: true, id: id });
}

/** Las auditorías ya hechas guardan su propia copia: borrar la plantilla no las afecta. */
function handleDeletePlantilla_(body) {
  requireAdmin_(body);
  var sheet = getSheet_(SHEET_PLANTILLAS);
  var fila = filaPorId_(sheet, COL_PLA.id, body.id);
  if (!fila) throw new Error('La plantilla ya no existe.');
  var enBorrador = hayFilaCon_(SHEET_AUDITORIAS, COL_AUD.plantillaId, String(body.id).trim(), function (r) {
    return String(r[COL_AUD.estado]).trim() === 'borrador';
  });
  if (enBorrador) throw new Error('Hay auditorías en borrador con esta plantilla. Termínalas o bórralas antes.');
  conLock_(function () {
    borrarFila_(sheet, fila.indice);
    bumpRevision_('plantillas');
  });
  return jsonOut_({ ok: true });
}

// ---------- Auditorías ----------

/** Fila → resumen (sin estructura ni respuestas, que pesan). `mapas` trae los nombres actuales. */
function rowToAuditoriaResumen_(row, mapas) {
  var emp = mapas.empresas[String(row[COL_AUD.empresaId]).trim()];
  var suc = mapas.sucursales[String(row[COL_AUD.sucursalId]).trim()];
  var pla = mapas.plantillas[String(row[COL_AUD.plantillaId]).trim()];
  var maximo = Number(row[COL_AUD.maximo]) || 0;
  var obtenido = Number(row[COL_AUD.obtenido]) || 0;
  return {
    id: String(row[COL_AUD.id]).trim(),
    folio: row[COL_AUD.folio] === '' ? '' : String(row[COL_AUD.folio]),
    plantillaId: String(row[COL_AUD.plantillaId]).trim(),
    empresaId: String(row[COL_AUD.empresaId]).trim(),
    sucursalId: String(row[COL_AUD.sucursalId]).trim(),
    empresaNombre: emp ? emp.nombre : '',
    sucursalNombre: suc ? suc.nombre : '',
    plantillaNombre: pla ? pla.nombre : '',
    encargada: String(row[COL_AUD.encargada]),
    auditor: String(row[COL_AUD.auditor]),
    fecha: fechaTexto_(row[COL_AUD.fecha]),
    estado: normalizarEstado_(row[COL_AUD.estado]),
    maximo: maximo,
    obtenido: obtenido,
    cumplimiento: maximo > 0 ? obtenido / maximo : 0,
    creadoPor: String(row[COL_AUD.creadoPor]),
    fechaCreacion: normalizarFecha_(row[COL_AUD.fechaCreacion]),
    fechaFinalizada: normalizarFecha_(row[COL_AUD.fechaFinalizada])
  };
}

function mapasNombres_() {
  var mapa = function (nombre, colId, convertir) {
    var rows = getSheet_(nombre).getDataRange().getValues();
    var m = {};
    for (var i = 1; i < rows.length; i++) {
      var id = String(rows[i][colId]).trim();
      if (id) m[id] = convertir(rows[i]);
    }
    return m;
  };
  return {
    empresas: mapa(SHEET_EMPRESAS, COL_EMP.id, rowToEmpresa_),
    sucursales: mapa(SHEET_SUCURSALES, COL_SUC.id, rowToSucursal_),
    plantillas: mapa(SHEET_PLANTILLAS, COL_PLA.id, function (r) {
      return { nombre: String(r[COL_PLA.nombre]).trim() };
    })
  };
}

/** El auditor solo ve las auditorías que creó él; admin y consulta, todas las de sus empresas. */
function esAjena_(user, creadoPor) {
  return user.rol === 'auditor' && String(creadoPor).trim().toUpperCase() !== String(user.usuario).trim().toUpperCase();
}

function handleListAuditorias_(body) {
  var user = requireAuth_(body);
  var rows = getSheet_(SHEET_AUDITORIAS).getDataRange().getValues();
  var mapas = mapasNombres_();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_AUD.id]).trim()) continue;
    if (!veEmpresa_(user, String(rows[i][COL_AUD.empresaId]).trim())) continue;
    if (esAjena_(user, rows[i][COL_AUD.creadoPor])) continue;
    lista.push(rowToAuditoriaResumen_(rows[i], mapas));
  }
  // Más nuevas primero (por fecha de la auditoría y luego por folio).
  lista.sort(function (a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return (Number(b.folio) || 0) - (Number(a.folio) || 0);
  });
  return jsonOut_({ ok: true, auditorias: lista });
}

/** Busca la auditoría y comprueba que el usuario la pueda ver. Devuelve { sheet, indice, valores }. */
function auditoriaVisible_(user, id) {
  var sheet = getSheet_(SHEET_AUDITORIAS);
  var fila = filaPorId_(sheet, COL_AUD.id, id);
  if (!fila) throw new Error('La auditoría ya no existe.');
  if (!veEmpresa_(user, String(fila.valores[COL_AUD.empresaId]).trim())) throw new Error('No tienes acceso a esta auditoría.');
  if (esAjena_(user, fila.valores[COL_AUD.creadoPor])) throw new Error('Esta auditoría la hizo otro auditor.');
  return { sheet: sheet, indice: fila.indice, valores: fila.valores };
}

/** Auditoría completa (con estructura y respuestas), lista para llenar o imprimir. */
function auditoriaCompleta_(valores) {
  var base = rowToAuditoriaResumen_(valores, mapasNombres_());
  var est = parsearJson_(valores[COL_AUD.estructura], {});
  var resp = parsearJson_(valores[COL_AUD.respuestas], {});
  base.empresaNombre = est.empresaNombre || base.empresaNombre;
  base.sucursalNombre = est.sucursalNombre || base.sucursalNombre;
  base.plantillaNombre = est.plantillaNombre || base.plantillaNombre;
  base.color = colorValido_(est.color);
  base.codigo = est.codigo || '';
  base.titulo = est.titulo || '';
  base.anteriorFecha = est.anteriorFecha || '';
  base.secciones = est.secciones || [];
  base.respuestas = resp;
  return base;
}

function handleGetAuditoria_(body) {
  var user = requireAuth_(body);
  var a = auditoriaVisible_(user, body.id);
  return jsonOut_({ ok: true, auditoria: auditoriaCompleta_(a.valores) });
}

function handleCreateAuditoria_(body) {
  var user = requireRol_(body, ['admin', 'auditor']);
  var pfila = filaPorId_(getSheet_(SHEET_PLANTILLAS), COL_PLA.id, body.plantillaId);
  if (!pfila) throw new Error('La plantilla no existe.');
  var plantilla = rowToPlantilla_(pfila.valores);
  if (!plantilla.activo) throw new Error('La plantilla está inactiva.');
  if (!veEmpresa_(user, plantilla.empresaId)) throw new Error('No tienes acceso a esa empresa.');

  var sfila = filaPorId_(getSheet_(SHEET_SUCURSALES), COL_SUC.id, body.sucursalId);
  if (!sfila) throw new Error('La sucursal no existe.');
  var sucursal = rowToSucursal_(sfila.valores);
  if (!sucursal.activo) throw new Error('La sucursal está inactiva.');
  if (sucursal.empresaId !== plantilla.empresaId) throw new Error('La sucursal no pertenece a la empresa de la plantilla.');
  var empresa = validarEmpresa_(plantilla.empresaId);

  var fecha = String(body.fecha || '').trim();
  if (!fechaValida_(fecha)) throw new Error('La fecha no es válida.');
  // El auditor es siempre quien crea la auditoría.
  var auditor = String(user.nombre || user.usuario || '').trim().slice(0, 80);
  if (!auditor) throw new Error('El auditor es obligatorio.');
  var encargada = String(body.encargada || sucursal.encargada || '').trim().slice(0, 80);

  // "Anterior": los puntajes de la última auditoría terminada de esta sucursal con esta plantilla.
  var previa = ultimaFinalizada_(sucursal.id, plantilla.id);
  var respuestas = {};
  var anteriorFecha = '';
  if (previa) {
    anteriorFecha = fechaTexto_(previa[COL_AUD.fecha]);
    var respPrevia = parsearJson_(previa[COL_AUD.respuestas], {});
    plantilla.secciones.forEach(function (s) {
      s.items.forEach(function (it) {
        var r = respPrevia[it.id];
        if (r && r.p !== null && r.p !== undefined && r.p !== '') respuestas[it.id] = { a: Number(r.p), p: null, h: '' };
      });
    });
  }

  var estructura = {
    empresaNombre: empresa.nombre,
    color: empresa.color,
    sucursalNombre: sucursal.nombre,
    plantillaNombre: plantilla.nombre,
    codigo: plantilla.codigo,
    titulo: plantilla.titulo,
    anteriorFecha: anteriorFecha,
    secciones: plantilla.secciones
  };
  var estJson = JSON.stringify(estructura);
  if (estJson.length > MAX_JSON) throw new Error('La plantilla es demasiado grande para guardarla en una auditoría.');

  var sheet = getSheet_(SHEET_AUDITORIAS);
  var id = nuevoId_();
  conLock_(function () {
    var folio = siguienteFolio_(sheet);
    var total = sumarMaximo_(plantilla.secciones);
    sheet.appendRow([id, folio, plantilla.id, plantilla.empresaId, sucursal.id, encargada, auditor, fecha, 'borrador',
                     estJson, JSON.stringify(respuestas), total, 0, user.usuario, ahoraLocal_(), '']);
    // La fecha se guarda como texto (ver instalar), pero por si la hoja la convirtió se reescribe.
    bumpRevision_('auditorias');
  });
  return jsonOut_({ ok: true, id: id });
}

function handleSaveAuditoria_(body) {
  var user = requireRol_(body, ['admin', 'auditor']);
  var a = auditoriaVisible_(user, body.id);
  if (normalizarEstado_(a.valores[COL_AUD.estado]) !== 'borrador') {
    throw new Error('La auditoría ya está finalizada. Un admin puede reabrirla.');
  }
  var est = parsearJson_(a.valores[COL_AUD.estructura], { secciones: [] });

  var encargada = String(body.encargada || '').trim().slice(0, 80);
  var auditor = String(body.auditor || '').trim().slice(0, 80);
  var fecha = String(body.fecha || '').trim();
  if (!fechaValida_(fecha)) throw new Error('La fecha no es válida.');
  if (!auditor) throw new Error('El auditor es obligatorio.');

  // Solo se aceptan respuestas de criterios que existen en la estructura de ESTA auditoría.
  var entrada = body.respuestas && typeof body.respuestas === 'object' ? body.respuestas : {};
  var guardadas = parsearJson_(a.valores[COL_AUD.respuestas], {});
  var respuestas = {};
  var faltan = 0, maximo = 0, obtenido = 0;
  est.secciones.forEach(function (s) {
    s.items.forEach(function (it) {
      maximo += it.max;
      var r = entrada[it.id] || {};
      var p = r.p === null || r.p === undefined || r.p === '' ? null : Number(r.p);
      if (p !== null && (!isFinite(p) || p < 0 || p > it.max)) throw new Error('Un puntaje está fuera de rango (0 a ' + it.max + ').');
      // "Anterior" lo fija el sistema al crear la auditoría: lo que mande el cliente se ignora.
      var guardada = guardadas[it.id];
      var an = guardada && guardada.a !== undefined ? guardada.a : null;
      var h = String(r.h || '').slice(0, 1000);
      if (p === null) faltan++; else obtenido += p;
      if (p !== null || an !== null || h) respuestas[it.id] = { a: an, p: p, h: h };
    });
  });

  var finalizar = body.finalizar === true;
  if (finalizar && faltan > 0) throw new Error('Faltan ' + faltan + ' criterio(s) por puntuar.');
  var json = JSON.stringify(respuestas);
  if (json.length > MAX_JSON) throw new Error('Las observaciones son demasiado largas. Acórtalas.');

  conLock_(function () {
    var f = a.indice;
    a.sheet.getRange(f, COL_AUD.encargada + 1, 1, 3).setValues([[encargada, auditor, fecha]]);
    a.sheet.getRange(f, COL_AUD.respuestas + 1, 1, 3).setValues([[json, maximo, obtenido]]);
    if (finalizar) {
      a.sheet.getRange(f, COL_AUD.estado + 1).setValue('finalizada');
      a.sheet.getRange(f, COL_AUD.fechaFinalizada + 1).setValue(ahoraLocal_());
    }
    bumpRevision_('auditorias');
  });
  return jsonOut_({ ok: true });
}

function handleReabrirAuditoria_(body) {
  var user = requireAdmin_(body);
  var a = auditoriaVisible_(user, body.id);
  conLock_(function () {
    a.sheet.getRange(a.indice, COL_AUD.estado + 1).setValue('borrador');
    a.sheet.getRange(a.indice, COL_AUD.fechaFinalizada + 1).setValue('');
    bumpRevision_('auditorias');
  });
  return jsonOut_({ ok: true });
}

/** Admin borra cualquiera; un auditor solo borradores. */
function handleDeleteAuditoria_(body) {
  var user = requireRol_(body, ['admin', 'auditor']);
  var a = auditoriaVisible_(user, body.id);
  if (user.rol !== 'admin' && normalizarEstado_(a.valores[COL_AUD.estado]) !== 'borrador') {
    throw new Error('Solo un admin puede borrar una auditoría finalizada.');
  }
  conLock_(function () {
    borrarFila_(a.sheet, a.indice);
    bumpRevision_('auditorias');
  });
  return jsonOut_({ ok: true });
}

/** Valores de la fila de la última auditoría finalizada de esa sucursal y plantilla, o null. */
function ultimaFinalizada_(sucursalId, plantillaId) {
  var rows = getSheet_(SHEET_AUDITORIAS).getDataRange().getValues();
  var mejor = null, mejorClave = '';
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[COL_AUD.sucursalId]).trim() !== sucursalId || String(r[COL_AUD.plantillaId]).trim() !== plantillaId) continue;
    if (normalizarEstado_(r[COL_AUD.estado]) !== 'finalizada') continue;
    var clave = fechaTexto_(r[COL_AUD.fecha]) + '|' + ('000000' + (Number(r[COL_AUD.folio]) || 0)).slice(-6);
    if (clave > mejorClave) { mejorClave = clave; mejor = r; }
  }
  return mejor;
}

function siguienteFolio_(sheet) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return 1;
  var folios = sheet.getRange(2, COL_AUD.folio + 1, ultima - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < folios.length; i++) max = Math.max(max, Number(folios[i][0]) || 0);
  return max + 1;
}

function sumarMaximo_(secciones) {
  var total = 0;
  secciones.forEach(function (s) { s.items.forEach(function (it) { total += it.max; }); });
  return total;
}

// ---------- Usuarios ----------

function handleListUsuarios_(body) {
  requireAdmin_(body);
  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  var usuarios = [];
  for (var i = 1; i < rows.length; i++) {
    var nombre = String(rows[i][COL_USR.usuario]).trim();
    if (!nombre) continue;
    usuarios.push({
      usuario: nombre,
      rol: normalizarRol_(rows[i][COL_USR.rol]),
      nombre: String(rows[i][COL_USR.nombre] || '').trim(),
      activo: esActivo_(rows[i][COL_USR.activo]),
      empresas: parseLista_(rows[i][COL_USR.empresas])
    });
  }
  return jsonOut_({ ok: true, usuarios: usuarios });
}

function validarEmpresasUsuario_(rol, valor) {
  if (rol === 'admin') return [];
  var lista = Array.isArray(valor) ? valor.map(function (s) { return String(s).trim(); }).filter(String) : parseLista_(valor);
  var sheet = getSheet_(SHEET_EMPRESAS);
  lista.forEach(function (id) {
    if (!filaPorId_(sheet, COL_EMP.id, id)) throw new Error('Una de las empresas no existe.');
  });
  return lista;
}

function handleCreateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var password = String(body.nuevaPassword || '');
  var rol = normalizarRol_(body.rol);
  var activo = body.activo !== false;
  var nombreCompleto = String(body.nombre || '').trim().slice(0, 80);
  var empresas = validarEmpresasUsuario_(rol, body.empresas);

  if (!nombre) throw new Error('El nombre de usuario es obligatorio.');
  if (!password) throw new Error('La contraseña inicial es obligatoria.');

  var sheet = getSheet_(SHEET_USUARIOS);
  if (usuarioPorNombre_(sheet, nombre)) throw new Error('Ya existe un usuario con ese nombre.');

  conLock_(function () {
    sheet.appendRow([nombre, password, rol, activo, empresas.join(','), nombreCompleto]);
    bumpRevision_('usuarios');
  });
  return jsonOut_({ ok: true });
}

function handleUpdateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.targetUsuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario a editar.');
  var rol = normalizarRol_(body.rol);
  var activo = body.activo !== false;
  var nombreCompleto = String(body.nombre || '').trim().slice(0, 80);
  var nuevaPassword = String(body.nuevaPassword || '');
  var nuevoNombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var empresas = validarEmpresasUsuario_(rol, body.empresas);

  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, nombre);
  if (!encontrada) throw new Error('El usuario ya no existe.');

  var eraAdminActivo = normalizarRol_(encontrada.valores[COL_USR.rol]) === 'admin' && esActivo_(encontrada.valores[COL_USR.activo]);
  if (eraAdminActivo && !(rol === 'admin' && activo) && contarAdminsActivos_(sheet) <= 1) {
    throw new Error('No puedes quitar el último Admin activo.');
  }

  var seRenombra = !!nuevoNombre && nuevoNombre !== nombre.toUpperCase();
  if (seRenombra && usuarioPorNombre_(sheet, nuevoNombre)) throw new Error('Ya existe un usuario con ese nombre.');

  conLock_(function () {
    var fila = encontrada.indice;
    if (seRenombra) sheet.getRange(fila, COL_USR.usuario + 1).setValue(nuevoNombre);
    sheet.getRange(fila, COL_USR.rol + 1, 1, 3).setValues([[rol, activo, empresas.join(',')]]);
    sheet.getRange(fila, COL_USR.nombre + 1).setValue(nombreCompleto);
    if (nuevaPassword) sheet.getRange(fila, COL_USR.password + 1).setValue(nuevaPassword);
    bumpRevision_('usuarios');
  });
  return jsonOut_({ ok: true, usuario: seRenombra ? nuevoNombre : nombre.toUpperCase() });
}

function handleDeleteUsuario_(body) {
  var actual = requireAdmin_(body);
  var nombre = String(body.targetUsuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario a borrar.');
  if (nombre.toUpperCase() === actual.usuario.toUpperCase()) throw new Error('No puedes borrarte a ti mismo.');

  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, nombre);
  if (!encontrada) throw new Error('El usuario ya no existe.');
  var esAdminActivo = normalizarRol_(encontrada.valores[COL_USR.rol]) === 'admin' && esActivo_(encontrada.valores[COL_USR.activo]);
  if (esAdminActivo && contarAdminsActivos_(sheet) <= 1) throw new Error('No puedes borrar el último Admin activo.');

  conLock_(function () {
    borrarFila_(sheet, encontrada.indice);
    bumpRevision_('usuarios');
  });
  return jsonOut_({ ok: true });
}

/** Cualquier usuario autenticado cambia su propia contraseña. */
function handleCambiarMiPassword_(body) {
  var user = requireAuth_(body);
  var nuevaPassword = String(body.nuevaPassword || '');
  if (!nuevaPassword) throw new Error('La nueva contraseña es obligatoria.');
  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, user.usuario);
  if (!encontrada) throw new Error('El usuario ya no existe.');
  conLock_(function () {
    sheet.getRange(encontrada.indice, COL_USR.password + 1).setValue(nuevaPassword);
    invalidarAuth_();
  });
  return jsonOut_({ ok: true });
}

// ---------- Instalación ----------

/** Agrega el menú "Auditoría Visual" al abrir la hoja. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Auditoría Visual')
    .addItem('Instalar / reparar hoja', 'instalar')
    .addToUi();
}

/**
 * Crea las pestañas y encabezados que falten, con validaciones y formato, y deja
 * un admin inicial y datos de ejemplo si no hay nada. Idempotente.
 */
function instalar() {
  var ss = getSpreadsheet_(true);
  var creadas = [];

  Object.keys(ENCABEZADOS).forEach(function (nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      var primera = ss.getSheets()[0];
      var vacia = ss.getSheets().length === 1 && primera.getLastRow() === 0 && primera.getName() !== nombre;
      sheet = vacia ? primera.setName(nombre) : ss.insertSheet(nombre);
      creadas.push(nombre);
    }
    var cols = ENCABEZADOS[nombre];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8eaf6');
    sheet.setFrozenRows(1);
  });

  aplicarValidaciones_(ss);

  // La fecha de la auditoría se guarda como texto: si no, Sheets la convierte en fecha.
  var aud = ss.getSheetByName(SHEET_AUDITORIAS);
  aud.getRange(1, COL_AUD.fecha + 1, aud.getMaxRows(), 1).setNumberFormat('@');

  var mensaje = creadas.length ? 'Pestañas creadas: ' + creadas.join(', ') + '. ' : 'Las pestañas ya existían. ';

  var empresas = ss.getSheetByName(SHEET_EMPRESAS);
  if (empresas.getLastRow() < 2) {
    var empId = nuevoId_();
    empresas.appendRow([empId, 'Fidelity Group', true, COLOR_DEFECTO]);
    ss.getSheetByName(SHEET_SUCURSALES).appendRow([nuevoId_(), empId, 'PATA MATRIZ', 'CYNTHIA GAVILAN', '', true]);
    ss.getSheetByName(SHEET_PLANTILLAS).appendRow([
      nuevoId_(), empId, 'Auditoría interna', 'AI-PL-07', 'INFORME DE AUDITORÍA INTERNA', 5, true,
      JSON.stringify(semilla_()), 'ADMIN', ahoraLocal_()
    ]);
    mensaje += 'Empresa, sucursal y plantilla de ejemplo creadas. ';
  }

  var usuarios = ss.getSheetByName(SHEET_USUARIOS);
  if (contarAdminsActivos_(usuarios) === 0) {
    var password = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    usuarios.appendRow(['ADMIN', password, 'admin', true, '', '']);
    mensaje += 'Admin inicial: usuario ADMIN, contraseña ' + password + ' (también está en la pestaña Usuarios; cámbiala al entrar). ';
  }

  mensaje += 'Hoja: ' + ss.getUrl();
  Logger.log(mensaje);
  try { ss.toast(mensaje, 'Auditoría Visual', 30); } catch (e) {}
  return mensaje;
}

/** Listas desplegables y casillas para que editar a mano la hoja no rompa valores. */
function aplicarValidaciones_(ss) {
  var lista = function (valores) {
    return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
  };
  var casilla = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  var filas = 1000;
  ss.getSheetByName(SHEET_USUARIOS).getRange(2, COL_USR.rol + 1, filas, 1).setDataValidation(lista(ROLES));
  ss.getSheetByName(SHEET_USUARIOS).getRange(2, COL_USR.activo + 1, filas, 1).setDataValidation(casilla);
  ss.getSheetByName(SHEET_EMPRESAS).getRange(2, COL_EMP.activo + 1, filas, 1).setDataValidation(casilla);
  ss.getSheetByName(SHEET_SUCURSALES).getRange(2, COL_SUC.activo + 1, filas, 1).setDataValidation(casilla);
  ss.getSheetByName(SHEET_PLANTILLAS).getRange(2, COL_PLA.activo + 1, filas, 1).setDataValidation(casilla);
  ss.getSheetByName(SHEET_AUDITORIAS).getRange(2, COL_AUD.estado + 1, filas, 1).setDataValidation(lista(ESTADOS));
}

/** Criterios de la auditoría original (Excel "Visual formato"), para arrancar con algo que editar. */
function semilla_() {
  return {"secciones":[{"id":"s1","titulo":"CUMPLIMIENTO DE PROCEDIMIENTO DE EXHIBICIONES","items":[{"id":"s1i1","texto":"Exhibicion de calzados, Ropas, Cintos, Medias, Carteras, Articulos (Verificacion del procedimiento y cronograma de exhibicion)","max":5},{"id":"s1i2","texto":"Tickets de importacion, referencias y precios, Procedimiento de cuidado de ropas y calzados blancos, Sensores.","max":5},{"id":"s1i3","texto":"Marketing Interno (Acrilicos de precio, A3, A4, otros articulos merchandising y gigantografias; decoracion, musica y videos de temporada )","max":5}]},{"id":"s2","titulo":"CUMPLIMIENTO DE PROCEDIMIENTO DE LIMPIEZAS","items":[{"id":"s2i1","texto":"Muebles, paredes, techos, pisos, vidrios, espejos, escalera, fachadas, veredas, baño, comedor, (Regrigerador, microondas, cubiertos, basureros)","max":5},{"id":"s2i2","texto":"Aspiradora (Limpieza de filtro y funcionamiento )","max":5},{"id":"s2i3","texto":"Hidrolavodra ( Limpieza y funcionamiento )","max":5}]},{"id":"s3","titulo":"CUMPLIMIENTO DE PROCEDIMIENTO DE VENTAS 360º","items":[{"id":"s3i1","texto":"Hablar al cliente de los productos (material, confort), asesoramiento (combinaciones, ventas de accesorios), promociones vigentes, fidelity card.","max":5},{"id":"s3i2","texto":"Evidencias de mensajes de fidelización","max":5},{"id":"s3i3","texto":"Verificación de stock físico en depósito despues de la venta.","max":5},{"id":"s3i4","texto":"Anotaciones en planilla (datos cliente/visita)","max":5},{"id":"s3i5","texto":"Evidencia de envio de informe diario de ventas (por correo)","max":5},{"id":"s3i6","texto":"Evidencias de penalizaciones","max":5}]},{"id":"s4","titulo":"CUMPLIMIENTO DE PROCEDIMIENTO DEPÓSITO","items":[{"id":"s4i1","texto":"Limpieza (piso, estantes, otros)","max":5},{"id":"s4i2","texto":"Orden general (Cambios de temporada y promocionales, Orden por Relatorio y Grade)","max":5},{"id":"s4i3","texto":"Inventario aleatorio por marca y control de carpeta de inventarios por parte del Gerente de Sucursal","max":5},{"id":"s4i4","texto":"Inventario aleatorio de mercaderías de vieja data por Auditoría Interna, verificando existencias y productos en proceso de salida","max":5},{"id":"s4i5","texto":"Separación e identificación de mercaderías por sector: impares, pendientes de arreglos y destinadas a salida","max":5},{"id":"s4i6","texto":"Estado y limpieza de las cajas de los calzados, ropas, accesorios, marketing","max":5},{"id":"s4i7","texto":"Resguardo correcto de los productos (ropas bien dobladas y en bolsas; calzados en bollas y respiracion)","max":5},{"id":"s4i8","texto":"Orden de las cajas y cartones vacios","max":5}]},{"id":"s5","titulo":"CUMPLIMIENTO DE MANTENIMIENTO CORRECTIVO Y PREVENTIVO","items":[{"id":"s5i1","texto":"Iluminacion (Focos quemados, Iluminacion de estantes, lamparas de emergencia)","max":5},{"id":"s5i2","texto":"Estado de muebles (vitrinas, puntos de ventas, Caja), Manequis, otros","max":5},{"id":"s5i3","texto":"Extintores (Operatividad, vencimiento, base, accesibilidad y uso)","max":5},{"id":"s5i4","texto":"Aires (Operatividad, Limpieza de filtros y Mantenimiento Anual s/ planilla)","max":5},{"id":"s5i5","texto":"Probador: Puff/sofas, alfombras, espejos, caja de medias","max":5},{"id":"s5i6","texto":"Fumigación: Registro, cronograma, insumos, alimañas","max":5}]},{"id":"s6","titulo":"CUMPLIMIENTO DE MANTENIMIENTO DE EQUIPOS","items":[{"id":"s6i1","texto":"Equipos Informaticos / Reloj Marcador","max":5},{"id":"s6i2","texto":"Televisores y Sonidos","max":5},{"id":"s6i3","texto":"Telefono corporativo (Estado, Procedimiento de contacto con clientes)","max":5},{"id":"s6i4","texto":"Camaras (Visibilidad, DVR) / Post","max":5},{"id":"s6i5","texto":"Generador (Mantenimiento al dia , indicar ultima fecha de mantenimiento y que empresa ejecutó) debe haber una planilla de control.","max":5}]},{"id":"s7","titulo":"CUMPLIMIENTO DE PROCEDIMIENTO DE CAJA","items":[{"id":"s7i1","texto":"Arqueo de Caja según acta","max":5},{"id":"s7i2","texto":"Verificacion del producto fisico con la nota lanzada, limpieza y embalado correcto","max":5},{"id":"s7i3","texto":"Hablar al cliente de promociones vigentes, fidelity card, horarios de atencion, etc.","max":5},{"id":"s7i4","texto":"Gestion de devoluciones según procedimiento","max":5}]},{"id":"s8","titulo":"OTRAS GESTIONES","items":[{"id":"s8i1","texto":"Uso adecuado de credenciales, vestimenta correcta, maquillaje apropiado y calzados adecuados.","max":5},{"id":"s8i2","texto":"Comunicación con el equipo, Atención al cliente.","max":5},{"id":"s8i3","texto":"Traslado de stock (Estado de transferencias y documentaciones archivados y completos).","max":5},{"id":"s8i4","texto":"Seguimiento de metas con vendedores","max":5},{"id":"s8i5","texto":"Orden de archivos digitales (maquina y corporativo)","max":5},{"id":"s8i6","texto":"Cronograma de actividades (equipo, limpieza, deposito, exhibiciones)","max":5},{"id":"s8i7","texto":"Resguardo de celulares particulares (caja, deposito, limpieza)","max":5},{"id":"s8i8","texto":"Resguardo de articulos de Marketing y limpieza.","max":5}]}]};
}

// ---------- Helpers de hoja ----------

var SS_ = null;
var HOJAS_ = {};

function getSpreadsheet_(crear) {
  if (!SS_) SS_ = abrirSpreadsheet_(crear);
  return SS_;
}

function abrirSpreadsheet_(crear) {
  var activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;

  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('No se pudo abrir la hoja (SPREADSHEET_ID). Revisa el ID y los permisos.');
    }
  }
  if (!crear) throw new Error('El backend no está configurado: ejecuta la función "instalar" una vez.');
  var ss = SpreadsheetApp.create('Auditoría Visual');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  Logger.log('Hoja creada: ' + ss.getUrl());
  return ss;
}

function getSheet_(name) {
  if (HOJAS_[name]) return HOJAS_[name];
  var sheet = getSpreadsheet_(false).getSheetByName(name);
  if (!sheet) throw new Error('No existe la pestaña "' + name + '" en la hoja de cálculo.');
  HOJAS_[name] = sheet;
  return sheet;
}

/**
 * Borra una fila. Sheets no deja eliminar todas las filas no inmovilizadas de una hoja:
 * si solo queda una fila de datos, se agrega una vacía antes de borrar.
 */
function borrarFila_(sheet, fila) {
  if (sheet.getMaxRows() - sheet.getFrozenRows() <= 1) sheet.insertRowAfter(sheet.getMaxRows());
  sheet.deleteRow(fila);
}

/** Devuelve { indice (1-based), valores } de la fila cuyo valor en `col` es `id`, o null. */
function filaPorId_(sheet, col, id) {
  var buscado = String(id || '').trim();
  if (!buscado) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][col]).trim() === buscado) return { indice: i + 1, valores: rows[i] };
  }
  return null;
}

/** ¿Hay alguna fila de la hoja con `valor` en `col` (y que cumpla `extra`, si se pasa)? */
function hayFilaCon_(nombreHoja, col, valor, extra) {
  var rows = getSheet_(nombreHoja).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][col]).trim() === valor && (!extra || extra(rows[i]))) return true;
  }
  return false;
}

function usuarioPorNombre_(sheet, nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_USR.usuario]).trim().toUpperCase() === buscado) return { indice: i + 1, valores: rows[i] };
  }
  return null;
}

function contarAdminsActivos_(sheet) {
  var rows = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < rows.length; i++) {
    if (normalizarRol_(rows[i][COL_USR.rol]) === 'admin' && esActivo_(rows[i][COL_USR.activo])) total++;
  }
  return total;
}

function nuevoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8); }

function normalizarRol_(valor) {
  var r = String(valor || '').trim().toLowerCase();
  return ROLES.indexOf(r) === -1 ? 'consulta' : r;
}

function normalizarEstado_(valor) {
  var e = String(valor || '').trim().toLowerCase();
  return ESTADOS.indexOf(e) === -1 ? 'borrador' : e;
}

/** "a1, b2" → ['a1', 'b2'] */
function parseLista_(valor) {
  return String(valor || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

function colorValido_(valor) {
  var c = String(valor || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : COLOR_DEFECTO;
}

function parsearJson_(valor, defecto) {
  try {
    var v = JSON.parse(String(valor || ''));
    return v && typeof v === 'object' ? v : defecto;
  } catch (e) {
    return defecto;
  }
}

/** Acepta TRUE, SI, SÍ o X (casilla de verificación) como "activo". */
function esActivo_(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  var texto = String(valor).trim().toUpperCase().replace('Í', 'I');
  return texto === 'TRUE' || texto === 'SI' || texto === 'X' || texto === '1';
}

function tz_() { return Session.getScriptTimeZone(); }

function ahoraLocal_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }

/** Una fecha 'yyyy-MM-dd' real (no 2026-02-31). */
function fechaValida_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Fecha de la auditoría como 'yyyy-MM-dd'; Sheets puede haber convertido la celda a Date. */
function fechaTexto_(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, tz_(), 'yyyy-MM-dd');
  return String(valor || '').trim();
}

/** Normaliza una marca de tiempo a texto; Sheets puede convertir la celda a Date. */
function normalizarFecha_(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, tz_(), 'yyyy-MM-dd HH:mm');
  return String(valor || '').trim();
}

function jsonOut_(obj) {
  // Tras una escritura que salió bien se devuelven los contadores ya incrementados: el frontend refresca sin pedirlos antes.
  if (PROPS_RECIENTES_ && obj && obj.ok === true && !obj.revisiones) obj.revisiones = revisionesActuales_();
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
