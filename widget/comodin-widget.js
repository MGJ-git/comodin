// Comodín · widget para Scriptable (iOS)
// Tamaños: pequeño, mediano, grande y pantalla de bloqueo (rectangular e inline).
// Parámetro del widget (opcional): "entregas" o "examenes" para ver ese modo de semana.
// Lee el horario de la app publicada y guarda una copia para funcionar sin conexión.

const BASE = "https://mgj-git.github.io/comodin/";
const fm = FileManager.local();
const CACHE = fm.joinPath(fm.documentsDirectory(), "comodin-datos-cache.js");

const COLORES = {
  clase: "#3b82f6", estudio: "#a78bfa", actividad: "#e879f9", koppi: "#fb923c", revision: "#94a3b8",
  deporte: "#4ade80", descanso: "#78716c", sueno: "#8f9dcc", evento: "#a3e635",
};
const C = { bg: "#141413", tarjeta: "#232220", texto: "#ecebe7", suave: "#a09c94", koppi: "#fb923c" };
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_C = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = n => String(n).padStart(2, "0");
const min = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diaSem = d => d.getDay() || 7;

// ---------- datos ----------
async function cargarDatos(){
  let txt = null, online = true;
  try {
    const r = new Request(BASE + "datos.js?t=" + Date.now());
    r.timeoutInterval = 8;
    txt = await r.loadString();
    if (!txt.includes("window.DATOS")) throw new Error("respuesta inesperada");
    fm.writeString(CACHE, txt);
  } catch (e){
    online = false;
    txt = fm.fileExists(CACHE) ? fm.readString(CACHE) : null;
  }
  if (!txt) return null;
  const win = {};
  new Function("window", txt)(win);
  return { D: win.DATOS, online };
}

// Misma lógica que la app: clases + bloques del modo + eventos del día (que recortan bloques, no clases)
function bloquesDia(D, fecha, modo){
  const dia = diaSem(fecha);
  const A = Object.fromEntries((D.asignaturas || []).map(a => [a.id, a]));
  const clases = modo === "examenes" ? [] : (D.horario || []).filter(h => h.dias.includes(dia)).map(h => ({
    inicio: h.inicio, fin: h.fin, tipo: "clase", titulo: A[h.asig]?.sigla || h.asig,
    color: A[h.asig]?.color || COLORES.clase, practica: h.tipo === "practica",
  }));
  const plantilla = ((D.bloques || {})[modo] || (D.bloques || {}).normal || [])
    .filter(b => b.dias.includes(dia)).map(b => ({ ...b, color: COLORES[b.tipo] || C.suave }));
  let res = [...clases, ...plantilla];
  const evs = (D.eventos || []).filter(e => e.fecha === ymd(fecha)).map(e => ({ ...e, tipo: "evento", color: COLORES.evento }));
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

function calcular(D, modo){
  const ahora = new Date(), nm = ahora.getHours() * 60 + ahora.getMinutes();
  const hoy = bloquesDia(D, ahora, modo);
  const act = hoy.find(b => min(b.inicio) <= nm && nm < min(b.fin)) || null;
  const resto = hoy.filter(b => min(b.inicio) > nm);
  const manana = new Date(ahora); manana.setDate(manana.getDate() + 1);
  const blManana = bloquesDia(D, manana, modo);
  // «Siguiente» salta descansos (levantarse, comer…) para enseñar lo que importa
  const util = b => b.tipo !== "descanso" && b.tipo !== "sueno";
  const sigHoy = resto.find(util) || resto[0], sigManana = blManana.find(util);
  const sig = sigHoy ? { ...sigHoy, cuando: "" } : sigManana ? { ...sigManana, cuando: "mañana " } : null;
  const s = ((D.sueno || {})[modo] || (D.sueno || {}).normal || {})[diaSem(ahora)] || null;
  // refrescar en el próximo cambio de bloque (iOS decide cuándo exactamente)
  const fronteras = hoy.flatMap(b => [min(b.inicio), min(b.fin)]).filter(m => m > nm).sort((a, b) => a - b);
  const refresco = new Date(ahora);
  if (fronteras.length) refresco.setHours(0, fronteras[0], 5, 0); else refresco.setHours(24, 0, 5, 0);
  const primeraClaseManana = blManana.find(b => b.tipo === "clase") || null;
  return { ahora, nm, hoy, act, resto, manana, blManana, sig, sueno: s, refresco, primeraClaseManana };
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
function filaLista(stack, b, tam = 12){
  const f = stack.addStack();
  f.layoutHorizontally();
  f.centerAlignContent();
  const hora = f.addStack();
  hora.size = new Size(40, 0);
  texto(hora, b.inicio, tam - 1, C.suave);
  barra(f, b.color, tam + 2);
  f.addSpacer(5);
  texto(f, b.titulo, tam, b.tipo === "descanso" || b.tipo === "sueno" ? C.suave : C.texto, b.tipo === "clase" || b.tipo === "evento");
  if (b.practica){ f.addSpacer(4); etiquetaPractica(f, b.color); }
  f.addSpacer();
}
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
  const top = w.addStack(); top.layoutHorizontally(); top.centerAlignContent();
  texto(top, "Comodín", 13, C.koppi, true); top.addSpacer(6);
  texto(top, `${DIAS[diaSem(e.ahora)]} ${e.ahora.getDate()} ${MESES[e.ahora.getMonth()]}`, 13, C.texto, true);
  top.addSpacer();
  if (e.sueno) texto(top, `🌙 ${e.sueno[0]}`, 11, C.suave);
  w.addSpacer(8);

  const tarjeta = w.addStack(); tarjeta.layoutHorizontally();
  tarjeta.backgroundColor = new Color(C.tarjeta); tarjeta.cornerRadius = 12; tarjeta.setPadding(10, 10, 10, 10);
  const a = tarjeta.addStack(); a.layoutVertically(); bloqueGrande(a, hastaTxt(e), e.act, 15);
  tarjeta.addSpacer(8);
  const s = tarjeta.addStack(); s.layoutVertically(); bloqueGrande(s, sigTxt(e), e.sig, 13);
  tarjeta.addSpacer();
  w.addSpacer(10);

  const deHoy = e.resto.length > 0;
  const lista = (deHoy ? e.resto : e.blManana).filter(b => b.tipo !== "descanso").slice(deHoy ? 1 : 0, (deHoy ? 1 : 0) + 9);
  texto(w, deHoy ? "RESTO DEL DÍA" : "MAÑANA", 10, C.suave, true);
  w.addSpacer(4);
  if (!lista.length) texto(w, "Nada más hoy", 12, C.suave);
  for (const b of lista){ filaLista(w, b, 13); w.addSpacer(4); }
  w.addSpacer();
  if (deHoy && e.primeraClaseManana){
    texto(w, `Mañana: primera clase ${e.primeraClaseManana.inicio} · ${e.primeraClaseManana.titulo}`, 11, C.suave);
  }
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

// ---------- principal ----------
const familia = config.widgetFamily || "medium";
const modo = ["entregas", "examenes", "normal"].includes((args.widgetParameter || "").trim().toLowerCase())
  ? args.widgetParameter.trim().toLowerCase() : "normal";
const w = new ListWidget();
w.url = BASE;
const bloqueo = familia.startsWith("accessory");
if (!bloqueo){ w.backgroundColor = new Color(C.bg); w.setPadding(12, 12, 12, 12); }

const datos = await cargarDatos();
if (!datos){
  texto(w, "Comodín", 13, C.koppi, true);
  texto(w, "Ábrelo una vez con conexión para cargar el horario.", 12, C.suave, false, 3);
} else {
  const e = calcular(datos.D, modo);
  if (familia === "small") widgetPequeno(w, e);
  else if (familia === "large" || familia === "extraLarge") widgetGrande(w, e);
  else if (familia === "accessoryRectangular") widgetBloqueoRect(w, e);
  else if (familia === "accessoryInline" || familia === "accessoryCircular") widgetBloqueoInline(w, e);
  else widgetMediano(w, e);
  w.refreshAfterDate = e.refresco;
}

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
