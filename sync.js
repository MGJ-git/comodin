// Sincronización con Firebase (Firestore con caché local: funciona sin conexión y sube los cambios al volver).
// La app (index.html) mantiene el estado S en memoria y llama a window.alGuardar(S) tras cada cambio.
// Aquí se calcula qué ha cambiado y se escribe solo eso; los cambios de otros dispositivos llegan
// por onSnapshot y se aplican con window.aplicarRemoto().
//
// Estructura en Firestore (solo accesible por el propio usuario):
//   users/{uid}/estado/general   modo, temas, tocado, repaso, habitos, revision
//   users/{uid}/estado/koppi     objetivo, fecha, criterios, activa
//   users/{uid}/tareas/{id}
//   users/{uid}/eventos/{id}
//   users/{uid}/koppiItems/{id}  (con campo orden)
//   users/{uid}/koppiSesiones/{id}
import { firebaseConfig } from "./firebase-config.js";

const VERSION_SDK = "10.12.2";
const MAPAS = ["temas", "tocado", "repaso", "habitos", "revision", "eventosSembrados"];
const $ = id => document.getElementById(id);

// ---------- indicador de estado ----------
let modo = "local", pendientes = 0;
function pintar(){
  const el = $("sync"); if (!el) return;
  const offline = !navigator.onLine;
  const [txt, cls] =
    modo === "local"  ? ["Solo este dispositivo", "local"] :
    modo === "login"  ? ["Sin sesión", "warn"] :
    modo === "error"  ? ["Error de sincronización", "err"] :
    offline           ? [pendientes ? `Sin conexión · ${pendientes} cambio${pendientes > 1 ? "s" : ""} por subir` : "Sin conexión", "warn"] :
    pendientes        ? ["Sincronizando…", "warn"] :
                        ["Sincronizado", "ok"];
  el.textContent = txt; el.className = "sync " + cls;
}
addEventListener("online", pintar);
addEventListener("offline", pintar);

// JSON con claves ordenadas, para comparar sin falsos cambios
const ordenar = v => Array.isArray(v) ? v.map(ordenar)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordenar(v[k])])) : v;
const igual = (a, b) => JSON.stringify(ordenar(a ?? null)) === JSON.stringify(ordenar(b ?? null));
const clon = o => JSON.parse(JSON.stringify(o ?? null));

if (!firebaseConfig){
  window.syncInfo = { modo: "local" };
  pintar();
} else {
  iniciar().catch(err => { console.error("[sync]", err); modo = "error"; pintar(); });
}

async function iniciar(){
  const base = `https://www.gstatic.com/firebasejs/${VERSION_SDK}`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });

  let desuscribir = [];
  window.syncInfo = { modo: "firebase", cerrarSesion: () => A.signOut(auth), email: null };

  A.onAuthStateChanged(auth, usuario => {
    desuscribir.forEach(f => f()); desuscribir = [];
    window.alGuardar = null;
    window.syncInfo.email = usuario?.email || null;
    dispatchEvent(new Event("syncinfo"));
    if (!usuario){
      if (localStorage.getItem("comodin.sinSync") === "1"){ modo = "local"; pintar(); return; }
      modo = "login"; pintar(); mostrarLogin(auth, A); return;
    }
    ocultarLogin();
    modo = "firebase"; pintar();
    conectar(usuario.uid, db, F, desuscribir);
  });
  window.syncInfo.iniciarSesion = () => { localStorage.removeItem("comodin.sinSync"); modo = "login"; pintar(); mostrarLogin(auth, A); };
}

function conectar(uid, db, F, subs){
  const ref = p => F.doc(db, `users/${uid}/${p}`);
  const col = p => F.collection(db, `users/${uid}/${p}`);
  const getS = () => window.getS();
  let foto = null;           // última versión conocida del servidor (en el formato de partes())
  let colecciones = false;

  const partes = S => {
    const k = S.koppi || {};
    return clon({
      general: { modo: S.modo || "normal", ...Object.fromEntries(MAPAS.map(m => [m, S[m] || {}])) },
      koppiMeta: { objetivo: k.objetivo || "", fecha: k.fecha || "", criterios: k.criterios || [], activa: k.activa ?? null },
      tareas: S.tareas || [],
      eventos: S.eventos || [],
      koppiItems: (k.items || []).map((it, i) => ({ ...it, orden: i })),
      koppiSesiones: (k.sesiones || []).map(s => ({ ...s, id: s.id || "s" + String(s.fin || "").replace(/\W/g, "") })),
    });
  };
  const escribir = promesa => {
    pendientes++; pintar();
    promesa.catch(err => { console.error("[sync] escritura", err); modo = "error"; })
      .finally(() => { pendientes--; pintar(); });
  };

  // Sube solo lo que ha cambiado respecto a `foto`
  function subir(S){
    const act = partes(S);
    const prev = foto || { general: {}, koppiMeta: null, tareas: [], eventos: [], koppiItems: [], koppiSesiones: [] };

    const g = {}; let hay = false;
    if (act.general.modo !== prev.general.modo){ g.modo = act.general.modo; hay = true; }
    for (const m of MAPAS){
      const a = prev.general[m] || {}, b = act.general[m] || {};
      for (const clave of new Set([...Object.keys(a), ...Object.keys(b)])){
        if (igual(a[clave], b[clave])) continue;
        (g[m] ||= {})[clave] = clave in b ? b[clave] : F.deleteField();
        hay = true;
      }
    }
    if (hay) escribir(F.setDoc(ref("estado/general"), g, { merge: true }));
    if (!igual(act.koppiMeta, prev.koppiMeta)) escribir(F.setDoc(ref("estado/koppi"), act.koppiMeta));

    for (const nombre of ["tareas", "eventos", "koppiItems", "koppiSesiones"]){
      const antes = new Map(prev[nombre].map(x => [x.id, x]));
      const ahora = new Map(act[nombre].map(x => [x.id, x]));
      for (const [id, x] of ahora) if (!igual(antes.get(id), x)) escribir(F.setDoc(F.doc(col(nombre), id), x));
      for (const id of antes.keys()) if (!ahora.has(id)) escribir(F.deleteDoc(F.doc(col(nombre), id)));
    }
    foto = act;
  }

  const aplicar = fn => { window.aplicarRemoto(fn); foto = partes(getS()); };

  subs.push(F.onSnapshot(ref("estado/general"), snap => {
    if (!snap.exists()){
      if (snap.metadata.fromCache) return;   // aún no sabemos si hay datos: esperar al servidor
      foto = null; subir(getS());            // cuenta nueva: se sube lo que haya en este dispositivo
      return;
    }
    const d = snap.data();
    aplicar(S => { S.modo = d.modo || "normal"; for (const m of MAPAS) S[m] = d[m] || {}; });
    if (!colecciones){ colecciones = true; escucharColecciones(); }
  }, err => { console.error("[sync]", err); modo = "error"; pintar(); }));

  function escucharColecciones(){
    window.alGuardar = subir;
    const k = S => (S.koppi ||= {});
    subs.push(F.onSnapshot(col("tareas"), q => aplicar(S => { S.tareas = q.docs.map(d => d.data()); })));
    subs.push(F.onSnapshot(col("eventos"), q => aplicar(S => { S.eventos = q.docs.map(d => d.data()); })));
    subs.push(F.onSnapshot(col("koppiItems"), q => aplicar(S => {
      k(S).items = q.docs.map(d => d.data()).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    })));
    subs.push(F.onSnapshot(col("koppiSesiones"), q => aplicar(S => {
      k(S).sesiones = q.docs.map(d => d.data()).sort((a, b) => String(a.fin).localeCompare(String(b.fin)));
    })));
    subs.push(F.onSnapshot(ref("estado/koppi"), s => {
      if (!s.exists()) return;
      const d = s.data();
      aplicar(S => Object.assign(k(S), { objetivo: d.objetivo || "", fecha: d.fecha || "", criterios: d.criterios || [], activa: d.activa ?? null }));
    }));
  }
}

// ---------- pantalla de acceso ----------
const ERRORES = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/user-not-found": "No hay ninguna cuenta con ese email. Usa «Crear cuenta».",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email. Usa «Entrar».",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-email": "El email no es válido.",
  "auth/network-request-failed": "Sin conexión. La primera vez que entras necesitas internet.",
  "auth/too-many-requests": "Demasiados intentos. Espera un poco.",
};
function mostrarLogin(auth, A){
  let el = $("login");
  if (!el){ el = document.createElement("div"); el.id = "login"; document.body.append(el); }
  el.hidden = false;
  el.innerHTML = `
    <div class="login-card">
      <h2>Comodín</h2>
      <p class="muted small">Entra para tener tus tareas, hábitos y Koppi sincronizados entre el móvil y el ordenador.</p>
      <form data-form="login" class="grid" style="gap:8px">
        <input type="email" name="email" placeholder="Email" required autocomplete="username">
        <input type="password" name="pass" placeholder="Contraseña" required minlength="6" autocomplete="current-password">
        <button class="btn primary">Entrar</button>
        <button type="button" class="btn" data-crear>Crear cuenta (solo la primera vez)</button>
        <div class="small login-err"></div>
      </form>
      <button type="button" class="linkbtn small" data-local>Seguir sin sincronizar</button>
    </div>`;
  const form = el.querySelector("form"), err = el.querySelector(".login-err");
  const accion = async crear => {
    if (!form.reportValidity()) return;
    err.textContent = "…";
    try {
      const { email, pass } = Object.fromEntries(new FormData(form));
      await (crear ? A.createUserWithEmailAndPassword : A.signInWithEmailAndPassword)(auth, email.trim(), pass);
      err.textContent = "";
    } catch (e){ err.textContent = ERRORES[e.code] || `No se pudo entrar (${e.code || e.message}).`; }
  };
  form.addEventListener("submit", e => { e.preventDefault(); accion(false); });
  el.querySelector("[data-crear]").addEventListener("click", () => accion(true));
  el.querySelector("[data-local]").addEventListener("click", () => {
    localStorage.setItem("comodin.sinSync", "1"); ocultarLogin(); modo = "local"; pintar();
    dispatchEvent(new Event("syncinfo"));
  });
}
function ocultarLogin(){ const el = $("login"); if (el) el.hidden = true; }
