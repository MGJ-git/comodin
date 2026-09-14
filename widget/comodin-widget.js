// Comodín · widget para Scriptable (iOS)
// Tamaños: pequeño, mediano, grande (con eventos de hoy y hábitos) y pantalla de bloqueo.
// Parámetro del widget (opcional): "entregas" o "examenes" para ver ese modo de semana.
// Lee el horario de la app publicada y, si conectas tu cuenta (Firebase), tus eventos, hábitos y tareas.
// Guarda copias para funcionar sin conexión.

const BASE = "https://mgj-git.github.io/comodin/";
const fm = FileManager.local();
const ruta = n => fm.joinPath(fm.documentsDirectory(), n);
const CACHE_DATOS = ruta("comodin-datos-cache.js");
const CACHE_CONFIG = ruta("comodin-config-cache.js");
const CACHE_USUARIO = ruta("comodin-usuario-cache.json");
const K_REFRESH = "comodin.refreshToken", K_UID = "comodin.uid", K_EMAIL = "comodin.email";

const COLORES = {
  clase: "#3b82f6", estudio: "#a78bfa", actividad: "#e879f9", koppi: "#fb923c", revision: "#94a3b8",
  deporte: "#4ade80", descanso: "#78716c", sueno: "#8f9dcc", evento: "#a3e635",
};
const C = { bg: "#141413", tarjeta: "#232220", texto: "#ecebe7", suave: "#a09c94", koppi: "#fb923c", ok: "#4ccf85", peligro: "#ff6b5e" };
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_C = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = n => String(n).padStart(2, "0");
const min = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diaSem = d => d.getDay() || 7;
const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ---------- descargas con copia local ----------
async function descargar(url, cache, valido){
  try {
    const r = new Request(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
    r.timeoutInterval = 8;
    const txt = await r.loadString();
    if (!valido(txt)) throw new Error("respuesta inesperada");
    fm.writeString(cache, txt);
    return txt;
  } catch (e){
    return fm.fileExists(cache) ? fm.readString(cache) : null;
  }
}
async function cargarDatos(){
  const txt = await descargar(BASE + "datos.js", CACHE_DATOS, t => t.includes("window.DATOS"));
  if (!txt) return null;
  const win = {};
  new Function("window", txt)(win);
  return win.DATOS;
}
async function cargarConfigFirebase(){
  const txt = await descargar(BASE + "firebase-config.js", CACHE_CONFIG, t => t.includes("firebaseConfig"));
  if (!txt) return null;
  try { return new Function(txt.replace(/export\s+const\s+firebaseConfig\s*=/, "return ")) () || null; } catch (e){ return null; }
}

// ---------- cuenta (Firestore por REST) ----------
function valorFS(v){
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, valorFS(x)]));
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valorFS);
  return undefined;
}
const docFS = d => d && d.fields ? valorFS({ mapValue: { fields: d.fields } }) : null;

async function peticionJSON(url, { metodo = "GET", cabeceras = {}, cuerpo = null } = {}){
  const r = new Request(url);
  r.method = metodo; r.headers = cabeceras; r.timeoutInterval = 10;
  if (cuerpo !== null) r.body = cuerpo;
  const json = await r.loadJSON();
  const codigo = r.response && r.response.statusCode;
  if (codigo && codigo >= 400){ const err = new Error(json?.error?.message || "HTTP " + codigo); err.codigo = codigo; err.json = json; throw err; }
  return json;
}
async function iniciarSesion(cfg, email, pass){
  const j = await peticionJSON(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}`, {
    metodo: "POST", cabeceras: { "Content-Type": "application/json" },
    cuerpo: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  Keychain.set(K_REFRESH, j.refreshToken); Keychain.set(K_UID, j.localId); Keychain.set(K_EMAIL, email);
}
async function tokenActual(cfg){
  const j = await peticionJSON(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
    metodo: "POST", cabeceras: { "Content-Type": "application/x-www-form-urlencoded" },
    cuerpo: `grant_type=refresh_token&refresh_token=${encodeURIComponent(Keychain.get(K_REFRESH))}`,
  });
  if (j.refresh_token) Keychain.set(K_REFRESH, j.refresh_token);
  return j.id_token;
}
// Devuelve { estado: "sin-sync" | "sin-cuenta" | "ok" | "offline", eventos, habitos, tareas }
async function cargarUsuario(cfg){
  if (!cfg) return { estado: "sin-sync" };
  if (!Keychain.contains(K_REFRESH)) return { estado: "sin-cuenta" };
  const uid = Keychain.get(K_UID);
  try {
    const token = await tokenActual(cfg);
    const raiz = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${uid}`;
    const auth = { cabeceras: { Authorization: "Bearer " + token } };
    const lista = async col => ((await peticionJSON(`${raiz}/${col}?pageSize=500`, auth)).documents || []).map(docFS);
    let general = {};
    try { general = docFS(await peticionJSON(`${raiz}/estado/general`, auth)) || {}; } catch (e){ if (e.codigo !== 404) throw e; }
    const datos = { eventos: await lista("eventos"), tareas: await lista("tareas"), habitos: general.habitos || {} };
    fm.writeString(CACHE_USUARIO, JSON.stringify(datos));
    return { estado: "ok", ...datos };
  } catch (e){
    if (fm.fileExists(CACHE_USUARIO)) return { estado: "offline", ...JSON.parse(fm.readString(CACHE_USUARIO)) };
    return { estado: "offline", error: String(e.message || e) };
  }
}

// ---------- horario (misma lógica que la app) ----------
function bloquesDia(D, fecha, modo, eventos){
  const dia = diaSem(fecha);
  const A = Object.fromEntries((D.asignaturas || []).map(a => [a.id, a]));
  const clases = modo === "examenes" ? [] : (D.horario || []).filter(h => h.dias.includes(dia)).map(h => ({
    inicio: h.inicio, fin: h.fin, tipo: "clase", titulo: A[h.asig]?.sigla || h.asig,
    color: A[h.asig]?.color || COLORES.clase, practica: h.tipo === "practica",
  }));
  const plantilla = ((D.bloques || {})[modo] || (D.bloques || {}).normal || [])
    .filter(b => b.dias.includes(dia)).map(b => ({ ...b, color: COLORES[b.tipo] || C.suave }));
  let res = [...clases, ...plantilla];
  const evs = (eventos || []).filter(e => e.fecha === ymd(fecha)).map(e => ({ ...e, tipo: "evento", color: COLORES.evento }));
  for (const ev of evs){
    const a = min(ev.inicio), b = min(ev.fin);
    res = res.flatMap(bl => {
      const x = min(bl.inicio), y = min(bl.fin);
      if (bl.tipo === "clase" || y <= a || x >= b) return [bl];
      return [...(x < a ? [{ ...bl, fin: ev.inicio }] : []), ...(y > b ? [{ ...bl, inicio: ev.fin }] : [])];
    });
  }
  return [...res, ...evs].sort((p, q) => min(p.inicio) - min(q.inicio));
}

function racha(hb, habitos, hoy){
  let d = new Date(hoy), n = 0;
  if (!habitos[ymd(d)]?.[hb.id]) d = addDias(d, -1);
  for (let i = 0; i < 400; i++, d = addDias(d, -1)){
    if (!hb.dias.includes(diaSem(d))) continue;
    if (habitos[ymd(d)]?.[hb.id]) n++; else break;
  }
  return n;
}

function calcular(D, modo, usuario){
  const conCuenta = usuario.estado === "ok" || (usuario.estado === "offline" && usuario.eventos);
  // Con cuenta: tus eventos (ya incluyen los fijos copiados). Sin cuenta: solo los fijos de datos.js
  const eventos = conCuenta ? usuario.eventos : (D.eventos || []);
  const ahora = new Date(), nm = ahora.getHours() * 60 + ahora.getMinutes();
  const hoy = bloquesDia(D, ahora, modo, eventos);
  const act = hoy.find(b => min(b.inicio) <= nm && nm < min(b.fin)) || null;
  const resto = hoy.filter(b => min(b.inicio) > nm);
  const manana = addDias(ahora, 1);
  const blManana = bloquesDia(D, manana, modo, eventos);
  // «Siguiente» salta descansos (levantarse, comer…) para enseñar lo que importa
  const util = b => b.tipo !== "descanso" && b.tipo !== "sueno";
  const sigHoy = resto.find(util) || resto[0], sigManana = blManana.find(util);
  const sig = sigHoy ? { ...sigHoy, cuando: "" } : sigManana ? { ...sigManana, cuando: "mañana " } : null;
  const s = ((D.sueno || {})[modo] || (D.sueno || {}).normal || {})[diaSem(ahora)] || null;
  const fronteras = hoy.flatMap(b => [min(b.inicio), min(b.fin)]).filter(m => m > nm).sort((a, b) => a - b);
  const refresco = new Date(ahora);
  if (fronteras.length) refresco.setHours(0, fronteras[0], 5, 0); else refresco.setHours(24, 0, 5, 0);
  // si hay cuenta, refrescar también cada 30 min para ver cambios hechos en la app
  if (conCuenta){ const tope = new Date(Date.now() + 30 * 60000); if (tope < refresco) refresco.setTime(tope.getTime()); }
  const primeraClaseManana = blManana.find(b => b.tipo === "clase") || null;

  const eventosHoy = hoy.filter(b => b.tipo === "evento");
  const habitosHoy = (D.habitos || []).filter(h => h.dias.includes(diaSem(ahora))).map(h => ({
    ...h, hecho: conCuenta ? !!usuario.habitos?.[ymd(ahora)]?.[h.id] : null,
    racha: conCuenta ? racha(h, usuario.habitos || {}, ahora) : 0,
    sub: h.porDia?.[diaSem(ahora)] || "",
  }));
  const pendientes = conCuenta ? (usuario.tareas || []).filter(t => !t.hecha && t.fecha) : [];
  const tareasHoy = pendientes.filter(t => t.fecha <= ymd(ahora)).length;
  const tareasManana = pendientes.filter(t => t.fecha === ymd(manana)).length;
  return { ahora, nm, hoy, act, resto, manana, blManana, sig, sueno: s, refresco, primeraClaseManana,
           eventosHoy, habitosHoy, tareasHoy, tareasManana, conCuenta, usuario };
}

// ---------- dibujo ----------
function texto(stack, str, size, color = C.texto, bold = false, lineas = 1){
  const t = stack.addText(String(str));
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = lineas;
  t.minimumScaleFactor = 0.7;
  return t;
}
function barra(stack, color, alto){
  const b = stack.addStack();
  b.size = new Size(3, alto);
  b.backgroundColor = new Color(color);
  b.cornerRadius = 1.5;
}
function simbolo(stack, nombre, color, tam = 13){
  const s = SFSymbol.named(nombre);
  if (!s) return;
  const img = stack.addImage(s.image);
  img.imageSize = new Size(tam, tam);
  img.tintColor = new Color(color);
}
function etiquetaPractica(stack, color){
  const e = stack.addStack();
  e.backgroundColor = new Color(color, 0.9);
  e.cornerRadius = 3;
  e.setPadding(1, 4, 1, 4);
  texto(e, "PRÁCTICA", 8, "#ffffff", true);
}
function bloqueGrande(stack, etiqueta, b, tam){
  texto(stack, etiqueta, 10, C.suave, true);
  stack.addSpacer(2);
  const fila = stack.addStack();
  fila.layoutHorizontally();
  fila.centerAlignContent();
  if (!b){ texto(fila, "Libre", tam, C.texto, true); return; }
  barra(fila, b.color, tam + 6);
  fila.addSpacer(6);
  const col = fila.addStack();
  col.layoutVertically();
  texto(col, b.titulo, tam, C.texto, true, 2);
  if (b.practica){ col.addSpacer(2); etiquetaPractica(col, b.color); }
}
function filaLista(stack, b, tam = 12, conFin = false){
  const f = stack.addStack();
  f.layoutHorizontally();
  f.centerAlignContent();
  const hora = f.addStack();
  hora.size = new Size(conFin ? 76 : 40, 0);
  texto(hora, conFin ? `${b.inicio}–${b.fin}` : b.inicio, tam - 1, C.suave);
  barra(f, b.color, tam + 2);
  f.addSpacer(5);
  texto(f, b.titulo, tam, b.tipo === "descanso" || b.tipo === "sueno" ? C.suave : C.texto, b.tipo === "clase" || b.tipo === "evento");
  if (b.practica){ f.addSpacer(4); etiquetaPractica(f, b.color); }
  f.addSpacer();
}
function titulo(stack, str){ texto(stack, str, 10, C.suave, true); stack.addSpacer(3); }
const cabecera = e => `${DIAS_C[diaSem(e.ahora)]} ${e.ahora.getDate()} ${MESES[e.ahora.getMonth()]}`;
const hastaTxt = e => e.act ? `AHORA · HASTA ${e.act.fin}` : "AHORA";
const sigTxt = e => e.sig ? `SIGUIENTE · ${e.sig.cuando}${e.sig.inicio}` : "SIGUIENTE";

function widgetPequeno(w, e){
  const top = w.addStack(); top.layoutHorizontally();
  texto(top, "Comodín", 11, C.koppi, true); top.addSpacer(); texto(top, cabecera(e), 11, C.suave);
  w.addSpacer(8);
  bloqueGrande(w, hastaTxt(e), e.act, 16);
  w.addSpacer();
  bloqueGrande(w, sigTxt(e), e.sig, 13);
}
function widgetMediano(w, e){
  const fila = w.addStack(); fila.layoutHorizontally();
  const izq = fila.addStack(); izq.layoutVertically(); izq.size = new Size(135, 0);
  texto(izq, "Comodín · " + cabecera(e), 11, C.koppi, true);
  izq.addSpacer(8);
  bloqueGrande(izq, hastaTxt(e), e.act, 15);
  izq.addSpacer();
  bloqueGrande(izq, sigTxt(e), e.sig, 12);
  fila.addSpacer(10);
  const der = fila.addStack(); der.layoutVertically();
  const lista = (e.resto.length ? e.resto : e.blManana).filter(b => b.tipo !== "descanso").slice(e.resto.length ? 1 : 0, (e.resto.length ? 1 : 0) + 5);
  texto(der, e.resto.length ? "LUEGO" : "MAÑANA", 10, C.suave, true);
  der.addSpacer(4);
  if (!lista.length) texto(der, "Nada más", 12, C.suave);
  for (const b of lista){ filaLista(der, b, 12); der.addSpacer(3); }
  der.addSpacer();
}
function widgetGrande(w, e){
  // Cabecera
  const top = w.addStack(); top.layoutHorizontally(); top.centerAlignContent();
  texto(top, "Comodín", 13, C.koppi, true); top.addSpacer(6);
  texto(top, `${DIAS[diaSem(e.ahora)]} ${e.ahora.getDate()} ${MESES[e.ahora.getMonth()]}`, 13, C.texto, true);
  top.addSpacer();
  if (e.sueno) texto(top, `🌙 ${e.sueno[0]}`, 11, C.suave);
  w.addSpacer(7);

  // Ahora / siguiente
  const tarjeta = w.addStack(); tarjeta.layoutHorizontally();
  tarjeta.backgroundColor = new Color(C.tarjeta); tarjeta.cornerRadius = 12; tarjeta.setPadding(8, 10, 8, 10);
  const a = tarjeta.addStack(); a.layoutVertically(); bloqueGrande(a, hastaTxt(e), e.act, 14);
  tarjeta.addSpacer(8);
  const s = tarjeta.addStack(); s.layoutVertically(); bloqueGrande(s, sigTxt(e), e.sig, 13);
  tarjeta.addSpacer();
  w.addSpacer(8);

  // Eventos de hoy + hábitos, lado a lado
  const medio = w.addStack(); medio.layoutHorizontally();
  const ev = medio.addStack(); ev.layoutVertically(); ev.size = new Size(180, 0);
  titulo(ev, "EVENTOS DE HOY");
  if (!e.eventosHoy.length) texto(ev, "Sin eventos", 12, C.suave);
  for (const b of e.eventosHoy.slice(0, 3)){
    const pasado = min(b.fin) <= e.nm;
    const f = ev.addStack(); f.layoutHorizontally(); f.centerAlignContent();
    barra(f, b.color, 14); f.addSpacer(5);
    texto(f, `${b.inicio} ${b.titulo}`, 12, pasado ? C.suave : C.texto, !pasado);
    ev.addSpacer(3);
  }
  if (e.eventosHoy.length > 3) texto(ev, `+${e.eventosHoy.length - 3} más`, 11, C.suave);
  medio.addSpacer(8);
  const hab = medio.addStack(); hab.layoutVertically();
  titulo(hab, "HÁBITOS");
  if (!e.habitosHoy.length) texto(hab, "Hoy descanso", 12, C.suave);
  for (const h of e.habitosHoy){
    const f = hab.addStack(); f.layoutHorizontally(); f.centerAlignContent();
    if (h.hecho === null) simbolo(f, "circle.dotted", C.suave, 13);
    else simbolo(f, h.hecho ? "checkmark.circle.fill" : "circle", h.hecho ? C.ok : C.suave, 13);
    f.addSpacer(4);
    texto(f, h.titulo.replace(/\s*\d{1,2}:\d{2}$/, ""), 12, h.hecho ? C.suave : C.texto, !h.hecho);
    if (h.racha > 1){ f.addSpacer(4); texto(f, `🔥${h.racha}`, 10, C.koppi); }
    hab.addSpacer(3);
  }
  medio.addSpacer();
  w.addSpacer(8);

  // Resto del día (sin eventos, que ya salen arriba)
  const deHoy = e.resto.length > 0;
  const huecos = Math.max(3, 6 - Math.max(0, Math.min(3, e.eventosHoy.length) - 1));
  const base = (deHoy ? e.resto : e.blManana).filter(b => b.tipo !== "descanso");
  const lista = base.slice(deHoy ? 1 : 0).filter(b => b.tipo !== "evento").slice(0, huecos);
  titulo(w, deHoy ? "RESTO DEL DÍA" : "MAÑANA");
  if (!lista.length) texto(w, "Nada más hoy", 12, C.suave);
  for (const b of lista){ filaLista(w, b, 12); w.addSpacer(3); }
  w.addSpacer();

  // Pie: tareas o primera clase de mañana
  const pie = w.addStack(); pie.layoutHorizontally();
  if (e.conCuenta && (e.tareasHoy || e.tareasManana)){
    texto(pie, `📝 ${[e.tareasHoy ? `${e.tareasHoy} para hoy` : "", e.tareasManana ? `${e.tareasManana} para mañana` : ""].filter(Boolean).join(" · ")}`, 11, e.tareasHoy ? C.peligro : C.texto, true);
    pie.addSpacer();
  } else if (deHoy && e.primeraClaseManana){
    texto(pie, `Mañana: primera clase ${e.primeraClaseManana.inicio} · ${e.primeraClaseManana.titulo}`, 11, C.suave);
    pie.addSpacer();
  }
  if (e.usuario.estado === "sin-cuenta") texto(pie, "Conecta tu cuenta ↗", 10, C.koppi);
  else if (e.usuario.estado === "offline") texto(pie, "sin conexión", 10, C.suave);
}
function widgetBloqueoRect(w, e){
  const t1 = e.act ? `▶ ${e.act.titulo} · hasta ${e.act.fin}` : "Libre ahora";
  texto(w, t1, 13, "#ffffff", true);
  if (e.sig) texto(w, `${e.sig.cuando}${e.sig.inicio} ${e.sig.titulo}`, 12, "#ffffff");
  if (e.sueno) texto(w, `🌙 cama ${e.sueno[0]}`, 11, "#ffffff");
}
function widgetBloqueoInline(w, e){
  texto(w, e.sig ? `${e.sig.inicio} · ${e.sig.titulo}` : (e.act ? e.act.titulo : "Comodín"), 12);
}

function construir(familia, D, modo, usuario){
  const w = new ListWidget();
  w.url = BASE;
  const bloqueo = familia.startsWith("accessory");
  if (!bloqueo){ w.backgroundColor = new Color(C.bg); w.setPadding(12, 12, 12, 12); }
  if (!D){
    texto(w, "Comodín", 13, C.koppi, true);
    texto(w, "Ábrelo una vez con conexión para cargar el horario.", 12, C.suave, false, 3);
    return w;
  }
  const e = calcular(D, modo, usuario);
  if (familia === "small") widgetPequeno(w, e);
  else if (familia === "large" || familia === "extraLarge") widgetGrande(w, e);
  else if (familia === "accessoryRectangular") widgetBloqueoRect(w, e);
  else if (familia === "accessoryInline" || familia === "accessoryCircular") widgetBloqueoInline(w, e);
  else widgetMediano(w, e);
  w.refreshAfterDate = e.refresco;
  return w;
}

// ---------- menú al abrirlo desde Scriptable ----------
async function menu(cfg, D, modo){
  const conectado = Keychain.contains(K_REFRESH);
  const m = new Alert();
  m.title = "Comodín";
  m.message = !cfg ? "La sincronización aún no está activada en la app: el widget muestra tu horario."
    : conectado ? `Cuenta conectada: ${Keychain.contains(K_EMAIL) ? Keychain.get(K_EMAIL) : "sí"}` : "Conecta tu cuenta para ver tus eventos, hábitos y tareas.";
  m.addAction("Vista previa grande");
  m.addAction("Vista previa mediana");
  m.addAction("Vista previa pequeña");
  if (cfg) m.addAction(conectado ? "Cerrar sesión" : "Conectar cuenta");
  m.addCancelAction("Salir");
  const i = await m.presentSheet();
  if (i === -1) return;
  if (i === 3){
    if (conectado){ [K_REFRESH, K_UID, K_EMAIL].forEach(k => Keychain.contains(k) && Keychain.remove(k)); if (fm.fileExists(CACHE_USUARIO)) fm.remove(CACHE_USUARIO); }
    else {
      const a = new Alert();
      a.title = "Conectar cuenta";
      a.message = "El mismo email y contraseña con los que entras en la app.";
      a.addTextField("Email", "");
      a.addSecureTextField("Contraseña", "");
      a.addAction("Conectar"); a.addCancelAction("Cancelar");
      if (await a.presentAlert() === 0){
        try { await iniciarSesion(cfg, a.textFieldValue(0).trim(), a.textFieldValue(1)); }
        catch (err){ const x = new Alert(); x.title = "No se pudo conectar"; x.message = String(err.message || err); x.addAction("Vale"); await x.presentAlert(); return; }
      } else return;
    }
    return menu(cfg, D, modo);
  }
  const usuario = await cargarUsuario(cfg);
  const fam = ["large", "medium", "small"][i];
  const w = construir(fam, D, modo, usuario);
  if (fam === "large") await w.presentLarge(); else if (fam === "medium") await w.presentMedium(); else await w.presentSmall();
}

// ---------- principal ----------
const modo = ["entregas", "examenes", "normal"].includes((args.widgetParameter || "").trim().toLowerCase())
  ? args.widgetParameter.trim().toLowerCase() : "normal";
const [D, cfg] = await Promise.all([cargarDatos(), cargarConfigFirebase()]);

if (config.runsInWidget){
  const usuario = await cargarUsuario(cfg);
  Script.setWidget(construir(config.widgetFamily || "medium", D, modo, usuario));
} else {
  await menu(cfg, D, modo);
}
Script.complete();
