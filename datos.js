// ============================================================
//  DATOS DEL CURSO — fuente única del panel (panel.html)
//  Edita este archivo (o pídeselo a Claude) cuando cambie algo:
//  asignaturas, horario de clases, fechas, bloques y hábitos.
//  Días: 1=lunes ... 7=domingo. Horas en formato "HH:MM".
// ============================================================

window.DATOS = {
  // Lo que falta por completar (se muestra como aviso en el panel). Vacíalo cuando esté todo.
  pendientes: [
    "Nombre completo de DT y DYP (y confirmar el de las de Informática)",
    "Fechas del cuatrimestre en la UPV (inicio, fin de clases, exámenes)",
  ],

  curso: "2026-27 · UPV",
  cuatrimestre: {
    nombre: "1er cuatrimestre",
    inicio: "2026-09-07",       // por confirmar
    finClases: "2026-12-22",    // por confirmar
    finExamenes: "2027-01-31",  // por confirmar
  },

  // Ahora mismo no hay estudio diario: se oculta el checklist de "repaso 24h" en Hoy.
  repaso24h: false,

  // ---------- SUEÑO ----------
  // Por cada noche (la que empieza ese día): [a la cama, suena el despertador].
  // Objetivo: 7 h entre semana, 8 h las noches de viernes y sábado.
  // El panel avisa si algún bloque invade las horas de sueño.
  sueno: {
    objetivo: { semana: 7, finde: 8 },
    normal: {
      1: ["23:30", "06:30"],  // lun → mar (entras a las 8)
      2: ["23:30", "06:30"],  // mar → mié
      3: ["23:30", "06:30"],  // mié → jue
      4: ["23:30", "06:30"],  // jue → vie
      5: ["00:00", "08:00"],  // vie → sáb (8 h)
      6: ["00:00", "08:00"],  // sáb → dom (8 h)
      7: ["00:00", "08:00"],  // dom → lun (el lunes entras a las 11)
    },
    examenes: {
      1: ["00:00", "07:00"], 2: ["00:00", "07:00"], 3: ["00:00", "07:00"], 4: ["00:00", "07:00"],
      5: ["00:00", "08:00"], 6: ["00:00", "08:00"], 7: ["00:00", "07:00"],
    },
  },

  // ---------- ASIGNATURAS ----------
  // evaluacion: [["Parte", peso %], ...]. temas: el temario, en orden.
  asignaturas: [
    { id: "aic", sigla: "AIC", nombre: "Arquitectura e Ingeniería de Computadores", grado: "INF", creditos: null, color: "#3b82f6",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/AIC.md" },
    { id: "csd", sigla: "CSD", nombre: "Concurrencia y Sistemas Distribuidos", grado: "INF", creditos: null, color: "#0ea5e9",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/CSD.md" },
    { id: "eda", sigla: "EDA", nombre: "Estructuras de Datos y Algoritmos", grado: "INF", creditos: null, color: "#14b8a6",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/EDA.md" },
    { id: "ipc", sigla: "IPC", nombre: "Interfaces Persona Computador", grado: "INF", creditos: null, color: "#60a5fa",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/IPC.md" },
    { id: "tal", sigla: "TAL", nombre: "Teoría de Autómatas y Lenguajes Formales", grado: "INF", creditos: null, color: "#6366f1",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/TAL.md" },
    { id: "dt", sigla: "DT", nombre: "DT", grado: "ADE", creditos: null, color: "#ca8a04",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/DT.md" },
    { id: "dyp", sigla: "DYP", nombre: "DYP", grado: "ADE", creditos: null, color: "#e11d48",
      profesor: "", tutorias: "", evaluacion: [], temas: [], nota: "01-Asignaturas/DYP.md" },
  ],

  // ---------- HORARIO DE CLASES (MiUPV) ----------
  // tipo: "teoria" | "practica". "Vence: próxima práctica" usa las de tipo practica.
  horario: [
    // Lunes
    { dias: [1], inicio: "11:00", fin: "12:30", asig: "csd", tipo: "teoria" },
    { dias: [1], inicio: "12:30", fin: "14:00", asig: "tal", tipo: "practica" },
    { dias: [1], inicio: "15:00", fin: "16:30", asig: "csd", tipo: "practica" },
    // Martes
    { dias: [2], inicio: "08:00", fin: "09:30", asig: "aic", tipo: "teoria" },
    { dias: [2], inicio: "09:30", fin: "11:00", asig: "eda", tipo: "teoria" },
    { dias: [2], inicio: "11:30", fin: "13:00", asig: "eda", tipo: "practica" },
    { dias: [2], inicio: "13:00", fin: "15:00", asig: "ipc", tipo: "teoria" },
    // Miércoles
    { dias: [3], inicio: "08:00", fin: "09:30", asig: "csd", tipo: "teoria" },
    { dias: [3], inicio: "09:30", fin: "11:30", asig: "dt",  tipo: "teoria" },
    { dias: [3], inicio: "12:00", fin: "14:00", asig: "tal", tipo: "teoria" },
    { dias: [3], inicio: "15:00", fin: "16:30", asig: "dyp", tipo: "practica" },
    // Jueves
    { dias: [4], inicio: "08:00", fin: "09:30", asig: "aic", tipo: "practica" },
    { dias: [4], inicio: "09:30", fin: "11:00", asig: "aic", tipo: "teoria" },
    { dias: [4], inicio: "11:00", fin: "12:30", asig: "eda", tipo: "teoria" },
    // Viernes
    { dias: [5], inicio: "08:00", fin: "10:00", asig: "dt",  tipo: "teoria" },
    { dias: [5], inicio: "10:30", fin: "12:00", asig: "ipc", tipo: "practica" },
    { dias: [5], inicio: "12:00", fin: "14:00", asig: "dyp", tipo: "teoria" },
  ],

  // ---------- BLOQUES DE LA SEMANA (todo lo que no es clase) ----------
  // tipo: estudio | actividad (tareas) | koppi | revision | deporte | descanso
  // Reglas: mañanas solo para arreglarse · Koppi por la noche y en huecos entre clases · gym 19:30
  bloques: {
    // Semana estándar · Koppi 13 h · tareas de prácticas 7,5 h · gym 5 h
    normal: [
      // Lunes (entras a las 11)
      { dias: [1], inicio: "08:00", fin: "11:00", tipo: "descanso",  titulo: "Levantarse, arreglarse y trayecto" },
      { dias: [1], inicio: "14:00", fin: "14:30", tipo: "descanso",  titulo: "Comer" },
      { dias: [1], inicio: "14:30", fin: "15:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [1], inicio: "17:30", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica EDA" },
      { dias: [1], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Pecho, hombro y tríceps" },
      // Martes
      { dias: [2], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [2], inicio: "11:00", fin: "11:30", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [2], inicio: "15:00", fin: "16:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [2], inicio: "17:30", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica DYP" },
      { dias: [2], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Espalda y bíceps" },
      // Miércoles
      { dias: [3], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [3], inicio: "11:30", fin: "12:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [3], inicio: "14:00", fin: "14:30", tipo: "descanso",  titulo: "Comer" },
      { dias: [3], inicio: "14:30", fin: "15:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [3], inicio: "17:30", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica AIC" },
      { dias: [3], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Pierna" },
      // Jueves
      { dias: [4], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [4], inicio: "14:00", fin: "15:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [4], inicio: "17:30", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica IPC" },
      { dias: [4], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Tríceps y hombro" },
      // Lunes a jueves por la noche
      { dias: [1,2,3,4], inicio: "20:45", fin: "21:30", tipo: "descanso", titulo: "Ducha y cena" },
      { dias: [1,2,3,4], inicio: "21:30", fin: "23:00", tipo: "koppi",    titulo: "Koppi · noche" },
      { dias: [1,2,3,4], inicio: "23:00", fin: "23:30", tipo: "sueno",    titulo: "Pantallas fuera · a la cama" },
      // Viernes
      { dias: [5], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [5], inicio: "10:00", fin: "10:30", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [5], inicio: "14:00", fin: "15:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [5], inicio: "21:00", fin: "23:30", tipo: "koppi",     titulo: "Koppi · noche larga" },
      { dias: [5], inicio: "23:30", fin: "24:00", tipo: "sueno",     titulo: "Pantallas fuera · a la cama" },
      // Domingo (sábado libre)
      { dias: [7], inicio: "18:00", fin: "19:30", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: prácticas TAL y CSD" },
      { dias: [7], inicio: "20:00", fin: "20:30", tipo: "revision",  titulo: "Revisión semanal" },
      { dias: [7], inicio: "21:00", fin: "23:00", tipo: "koppi",     titulo: "Koppi · noche" },
      { dias: [7], inicio: "23:30", fin: "24:00", tipo: "sueno",     titulo: "Pantallas fuera · a la cama" },
    ],

    // Semana cargada de tareas · más tarde para prácticas, Koppi 12 h
    entregas: [
      { dias: [1], inicio: "08:00", fin: "11:00", tipo: "descanso",  titulo: "Levantarse, arreglarse y trayecto" },
      { dias: [1], inicio: "14:00", fin: "14:30", tipo: "descanso",  titulo: "Comer" },
      { dias: [1], inicio: "14:30", fin: "15:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [1], inicio: "17:00", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica EDA" },
      { dias: [1], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Pecho, hombro y tríceps" },
      { dias: [2], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [2], inicio: "11:00", fin: "11:30", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [2], inicio: "15:00", fin: "16:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [2], inicio: "16:00", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica DYP" },
      { dias: [2], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Espalda y bíceps" },
      { dias: [3], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [3], inicio: "11:30", fin: "12:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [3], inicio: "14:00", fin: "14:30", tipo: "descanso",  titulo: "Comer" },
      { dias: [3], inicio: "14:30", fin: "15:00", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [3], inicio: "17:00", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica AIC" },
      { dias: [3], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Pierna" },
      { dias: [4], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [4], inicio: "14:00", fin: "15:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [4], inicio: "15:30", fin: "19:00", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: práctica IPC" },
      { dias: [4], inicio: "19:30", fin: "20:45", tipo: "deporte",   titulo: "Gym · Tríceps y hombro" },
      { dias: [1,2,3,4], inicio: "20:45", fin: "21:30", tipo: "descanso", titulo: "Ducha y cena" },
      { dias: [1,2,3,4], inicio: "21:30", fin: "23:00", tipo: "koppi",    titulo: "Koppi · noche" },
      { dias: [1,2,3,4], inicio: "23:00", fin: "23:30", tipo: "sueno",    titulo: "Pantallas fuera · a la cama" },
      { dias: [5], inicio: "06:30", fin: "08:00", tipo: "descanso",  titulo: "Levantarse y arreglarse" },
      { dias: [5], inicio: "10:00", fin: "10:30", tipo: "koppi",     titulo: "Koppi · entre clases" },
      { dias: [5], inicio: "14:00", fin: "15:00", tipo: "descanso",  titulo: "Comer" },
      { dias: [5], inicio: "16:00", fin: "19:00", tipo: "actividad", titulo: "Tareas y entregas" },
      { dias: [5], inicio: "21:00", fin: "22:30", tipo: "koppi",     titulo: "Koppi · noche" },
      { dias: [5], inicio: "23:30", fin: "24:00", tipo: "sueno",     titulo: "Pantallas fuera · a la cama" },
      { dias: [7], inicio: "16:00", fin: "19:30", tipo: "actividad", titulo: "Tareas de prácticas", detalle: "Mañana: prácticas TAL y CSD" },
      { dias: [7], inicio: "20:00", fin: "20:30", tipo: "revision",  titulo: "Revisión semanal" },
      { dias: [7], inicio: "21:00", fin: "23:00", tipo: "koppi",     titulo: "Koppi · noche" },
      { dias: [7], inicio: "23:30", fin: "24:00", tipo: "sueno",     titulo: "Pantallas fuera · a la cama" },
    ],

    // Periodo de exámenes (sin clases) · Koppi en mantenimiento · gym a las 19:30
    examenes: [
      { dias: [1,2,3,4,5], inicio: "07:00", fin: "08:00", tipo: "descanso", titulo: "Levantarse y desayunar" },
      { dias: [1,2,3,4,5], inicio: "08:00", fin: "13:30", tipo: "estudio",  titulo: "Estudio" },
      { dias: [1,2,3,4,5], inicio: "13:30", fin: "15:00", tipo: "descanso", titulo: "Comer y desconectar" },
      { dias: [1,2,3,4,5], inicio: "15:00", fin: "18:30", tipo: "estudio",  titulo: "Problemas y exámenes anteriores" },
      { dias: [1], inicio: "19:30", fin: "20:45", tipo: "deporte", titulo: "Gym · Pecho, hombro y tríceps" },
      { dias: [2], inicio: "19:30", fin: "20:45", tipo: "deporte", titulo: "Gym · Espalda y bíceps" },
      { dias: [3], inicio: "19:30", fin: "20:45", tipo: "deporte", titulo: "Gym · Pierna" },
      { dias: [4], inicio: "19:30", fin: "20:45", tipo: "deporte", titulo: "Gym · Tríceps y hombro" },
      { dias: [2,4], inicio: "21:30", fin: "23:00", tipo: "koppi",  titulo: "Koppi · mantenimiento" },
      { dias: [1,2,3,4,5,6,7], inicio: "23:30", fin: "24:00", tipo: "sueno", titulo: "Pantallas fuera · a la cama" },
      { dias: [6], inicio: "10:00", fin: "13:30", tipo: "estudio",  titulo: "Simulacro de examen" },
      { dias: [7], inicio: "10:00", fin: "12:30", tipo: "estudio",  titulo: "Repaso general" },
      { dias: [7], inicio: "20:00", fin: "20:30", tipo: "revision", titulo: "Revisión semanal" },
    ],
  },

  // Horas objetivo por semana [mínimo, máximo]. "estudio" suma estudio + tareas.
  objetivos: {
    normal:   { koppi: [12, 16], estudio: [6, 10] },
    entregas: { koppi: [10, 14], estudio: [14, 20] },
    examenes: { koppi: [2, 6],   estudio: [30, 45] },
  },

  // ---------- HÁBITOS DIARIOS ----------
  // Se marcan en "Hoy" y llevan racha. porDia: texto distinto según el día.
  habitos: [
    { id: "flexiones", titulo: "30 flexiones", dias: [1,2,3,4,5,6,7], detalle: "Del tirón o en series (p. ej. 3×10)" },
    { id: "gym", titulo: "Gym 19:30", dias: [1,2,3,4], porDia: {
        1: "Pecho, hombro y tríceps",
        2: "Espalda y bíceps",
        3: "Pierna",
        4: "Tríceps y hombro (frecuencia 2)",
      } },
  ],

  // ---------- KOPPI: fases del gameplan ----------
  // Las tareas NO van aquí (el repo es público): se importan desde la pestaña Koppi.
  koppi: {
    fases: [
      { id: 1, n: "Dashboard perfecto",                  d: "16 sep–4 oct · 30 FPS reales, fondo nativo, personaje propio" },
      { id: 2, n: "Esqueleto común",                     d: "5–11 oct · conexión OBD común, plantilla de pantalla, una sola app, autoarranque" },
      { id: 3, n: "DTCs",                                d: "12–18 oct · leer, explicar, borrar y avisar" },
      { id: 4, n: "Logros y progresión",                 d: "19 oct–8 nov · detectar, desbloquear, rangos, recompensas, por coche" },
      { id: 5, n: "Arranque, apagado y microSD maestra", d: "9–22 nov · apagado real, solo lectura, clonado" },
      { id: 6, n: "Pruebas y cierre",                    d: "23–29 nov · coches de amigos · código terminado" },
    ],
    checklistPantalla: ["Funciona con OBD real", "Solo con el dedo (sin teclado)", "30 FPS en la Pi", "Explica cuándo falta un dato", "Probada en el coche"],
  },

  // ---------- EVENTOS PUNTUALES (citas, reuniones) ----------
  // Los eventos se crean desde la app (botón «+ Evento» o pulsando en el calendario).
  // Los de aquí se copian UNA vez a tus eventos (por id) y luego se editan/borran desde la app.
  eventos: [
    { id: "cafe-patentes-20260917", fecha: "2026-09-17", inicio: "17:30", fin: "18:30", titulo: "Café patentes" },
  ],

  // ---------- FECHAS CLAVE (exámenes, hitos) ----------
  // Las tareas de prácticas se apuntan desde el panel; aquí van fechas fijas del curso.
  // tipo: entrega | examen | hito. asig: id de asignatura o "koppi".
  // Ejemplo: { fecha: "2026-11-05", tipo: "examen", asig: "eda", titulo: "Parcial 1" },
  fechas: [],

  // Días antes de una entrega en que la quieres tener terminada
  margenEntregas: 3,

  // ---------- REVISIÓN SEMANAL (domingo, 30 min) ----------
  revisionSemanal: [
    "Repasar PoliformaT: ¿alguna tarea nueva sin apuntar en el panel?",
    "Vaciar la bandeja: toda tarea tiene fecha o se borra",
    "Tareas grandes (prácticas largas, trabajos): partirlas en pasos con fecha",
    "Hábitos: ¿gym 4/4 y flexiones 7/7? Si no, ¿qué lo impidió?",
    "Elegir el modo de la semana que viene (normal / entregas / exámenes)",
    "Definir el objetivo de Koppi para la semana (1 entregable concreto)",
    "Revisar la lista de ideas aparcadas de Koppi",
  ],
};
