/* Paciente 3D: cuerpo de la paciente con respiración, parpadeo, mirada y mandíbula sincronizada con su voz.
   Modelo MakeHuman (esqueleto «default» con mandíbula y párpados). Se carga solo para los casos que tienen modelo;
   si WebGL o el modelo fallan, la app sigue con el avatar circular. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// Gira un hueso alrededor de un eje expresado en coordenadas del mundo.
const qPadre = new THREE.Quaternion(), qGiro = new THREE.Quaternion();
function rotarMundo(hueso, eje, angulo) {
  if (!hueso || !angulo) return;
  hueso.parent.getWorldQuaternion(qPadre);
  qGiro.setFromAxisAngle(eje, angulo);
  hueso.quaternion.premultiply(qPadre.clone().invert().multiply(qGiro).multiply(qPadre));
}

export async function montarPaciente3D(contenedor, { modelo } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.className = "lienzo3d";
  lienzo.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xfff4ea, 0x6f7f8f, 1.6));
  const clave = new THREE.DirectionalLight(0xffffff, 2.0); clave.position.set(1.5, 2.5, 3); escena.add(clave);
  const relleno = new THREE.DirectionalLight(0xd6e6ff, 0.6); relleno.position.set(-2.5, 1, 2); escena.add(relleno);

  const camara = new THREE.PerspectiveCamera(24, 1, 0.05, 20);

  let gltf;
  try { gltf = await new GLTFLoader().loadAsync(modelo); }
  catch (e) { renderer.dispose(); throw e; }
  const cuerpo = gltf.scene;
  escena.add(cuerpo);

  cuerpo.traverse(n => {
    if (!n.isMesh) return;
    n.frustumCulled = false;
    const m = n.material;
    // Cejas y pestañas con borde suave; el resto, opaco (así no se mezclan capas).
    if (/eyebrow|eyelash/.test(m.name)) { m.transparent = true; m.alphaTest = 0.05; m.depthWrite = false; n.renderOrder = 2; }
    else if (/ponytail|hair/.test(m.name)) { m.transparent = false; m.alphaTest = 0.5; m.side = THREE.DoubleSide; }
    else { m.transparent = false; m.depthWrite = true; }
    // La ropa se dibuja siempre por delante de la piel que queda justo debajo.
    if (/casualsuit|shoes|cloth|suit/.test(m.name)) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }
  });

  const cacheHuesos = new Map();
  const hueso = n => { if (!cacheHuesos.has(n)) cacheHuesos.set(n, cuerpo.getObjectByName(n)); return cacheHuesos.get(n); };
  const H = {
    cabeza: hueso("head"), cuello: hueso("neck02"), pecho: hueso("spine03"), torso: hueso("spine04"),
    brazoI: hueso("upperarm01L"), brazoD: hueso("upperarm01R"), antebrazoI: hueso("lowerarm01L"), antebrazoD: hueso("lowerarm01R"),
    claviculaI: hueso("clavicleL"), claviculaD: hueso("clavicleR"),
    mandibula: hueso("jaw"), ojoI: hueso("eyeL"), ojoD: hueso("eyeR"),
    parpadoI: hueso("orbicularis03L"), parpadoD: hueso("orbicularis03R"),
  };

  // Postura de reposo: brazos abajo, codos algo flectados.
  cuerpo.updateMatrixWorld(true);
  rotarMundo(H.brazoI, Z, -0.68); rotarMundo(H.brazoD, Z, 0.68);
  rotarMundo(H.brazoI, X, -0.12); rotarMundo(H.brazoD, X, -0.12);
  cuerpo.updateMatrixWorld(true);
  rotarMundo(H.antebrazoI, X, -0.3); rotarMundo(H.antebrazoD, X, -0.3);
  const base = {};
  for (const [k, b] of Object.entries(H)) if (b) base[k] = b.quaternion.clone();

  // Encuadre de medio cuerpo a partir de la cabeza.
  cuerpo.updateMatrixWorld(true);
  const pCabeza = H.cabeza ? H.cabeza.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.45, 0.04);
  const objetivo = new THREE.Vector3(0, pCabeza.y - 0.035, pCabeza.z);

  // Expresiones: desplazamientos (en metros, ejes del mundo) de los huesos faciales de MakeHuman.
  // [hueso, x hacia afuera, y hacia arriba, z hacia adelante]; se aplican en espejo a .L y .R.
  const GESTOS = {
    neutral: { cara: [] },
    alegria: { cara: [["oris07", 0.015, 0.018], ["risorius03", 0.009, 0.009], ["risorius02", 0.006, 0.006], ["orbicularis04", 0, 0.003], ["oculi01", 0, 0.002]], cabeza: -0.02 },
    alivio: { cara: [["oris07", 0.008, 0.01], ["risorius03", 0.005, 0.005], ["oculi01", -0.001, 0.003]], cabeza: 0 },
    tristeza: { cara: [["oris07", 0, -0.012], ["oris04", 0, -0.003], ["oris03", 0, -0.004], ["oculi01", -0.003, 0.009], ["oculi02", 0, -0.003]], cabeza: 0.07, mirada: 0.12 },
    preocupacion: { cara: [["oris07", -0.001, -0.006], ["oris04", 0, -0.002], ["oris03", 0, -0.002], ["oculi01", -0.004, 0.006]], cabeza: 0.03 },
    nerviosismo: { cara: [["oris07", -0.001, -0.002], ["oculi01", -0.002, 0.004], ["oculi02", 0, 0.001]], cabeza: 0.02, inquieta: true },
    molestia: { cara: [["oculi01", -0.004, -0.004], ["oculi02", 0, -0.002], ["oris07", -0.003, -0.002]], cabeza: -0.015 },
    sorpresa: { cara: [["temporalis01", 0, 0.005], ["oculi01", 0, 0.004], ["oculi02", 0, 0.005]], cabeza: -0.03, mandibula: 0.05 },
    miedo: { cara: [["oculi01", -0.003, 0.007], ["oculi02", 0, 0.002], ["oris07", 0.004, -0.004], ["oris03", 0, -0.001]], cabeza: 0.02, inquieta: true },
  };
  // Cada hueso facial guarda su posición de reposo y cómo se ve un metro del mundo en sus ejes locales.
  const huesosCara = new Map();
  for (const g of Object.values(GESTOS)) for (const [n] of g.cara) for (const lado of ["L", "R"]) {
    const b = hueso(n + lado);
    if (!b || huesosCara.has(b)) continue;
    const q = new THREE.Quaternion(); b.parent.getWorldQuaternion(q); q.invert();
    const esc = new THREE.Vector3(); b.parent.getWorldScale(esc);
    const eje = v => v.clone().applyQuaternion(q).divide(esc);
    huesosCara.set(b, { reposo: b.position.clone(), ex: eje(X), ey: eje(Y), ez: eje(Z) });
  }
  const pesos = {}, pesosObj = {};
  for (const k in GESTOS) { pesos[k] = 0; pesosObj[k] = 0; }
  pesos.preocupacion = pesosObj.preocupacion = 0.6; // estado de base de una paciente que espera un resultado
  function emocion(nombre) {
    if (!GESTOS[nombre]) return;
    for (const k in pesosObj) pesosObj[k] = 0;
    pesosObj[nombre] = nombre === "neutral" ? 0 : 1;
  }
  const tmp = new THREE.Vector3();
  let suavizado = 0.06;
  function aplicarGestos() {
    for (const [b, d] of huesosCara) b.position.copy(d.reposo);
    let cabeza = 0, mirada = 0, mandibula = 0, inquieta = 0;
    for (const k in GESTOS) {
      pesos[k] += (pesosObj[k] - pesos[k]) * suavizado;
      const w = pesos[k]; if (w < 0.002) continue;
      const g = GESTOS[k];
      cabeza += (g.cabeza || 0) * w; mirada += (g.mirada || 0) * w; mandibula += (g.mandibula || 0) * w; if (g.inquieta) inquieta += w;
      for (const [n, x, y, z = 0] of g.cara) for (const [lado, sx] of [["L", 1], ["R", -1]]) {
        const b = hueso(n + lado), d = b && huesosCara.get(b); if (!d) continue;
        tmp.copy(d.ex).multiplyScalar(x * sx * w).addScaledVector(d.ey, y * w).addScaledVector(d.ez, z * w);
        b.position.add(tmp);
      }
    }
    return { cabeza, mirada, mandibula, inquieta };
  }

  // Nivel de voz: un analizador sobre una copia de cada reproductor (captureStream), sin desviar la salida de sonido.
  // Firefox y Safari no lo permiten sin silenciar el audio; ahí la mandíbula sigue un ritmo aproximado.
  let ctx = null;
  const fuentes = [];
  function prepararAnalisis(audio, f) {
    if (typeof audio.captureStream !== "function" || /firefox/i.test(navigator.userAgent)) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const flujo = audio.captureStream();
      if (!flujo.getAudioTracks().length) return;
      if (f.nodo) try { f.nodo.disconnect(); } catch (e) {}
      f.analizador = f.analizador || Object.assign(ctx.createAnalyser(), { fftSize: 512, smoothingTimeConstant: 0.2 });
      f.datos = f.datos || new Uint8Array(f.analizador.fftSize);
      f.nodo = ctx.createMediaStreamSource(flujo);
      f.nodo.connect(f.analizador);
    } catch (e) { f.analizador = null; }
  }
  function conectarAudio(...audios) {
    for (const audio of audios) {
      if (!audio || fuentes.some(f => f.audio === audio)) continue;
      const f = { audio, analizador: null, datos: null, nodo: null, confiable: false };
      fuentes.push(f);
      audio.addEventListener("playing", () => { f.confiable = false; prepararAnalisis(audio, f); });
    }
  }
  function nivelVoz(t) {
    const f = fuentes.find(f => !f.audio.paused && !f.audio.ended && f.audio.currentTime > 0);
    if (!f) return 0;
    if (f.analizador) {
      f.analizador.getByteTimeDomainData(f.datos);
      let s = 0;
      for (let i = 0; i < f.datos.length; i++) { const v = (f.datos[i] - 128) / 128; s += v * v; }
      const rms = Math.sqrt(s / f.datos.length);
      if (rms > 0.004) f.confiable = true;
      if (f.confiable) return rms < 0.012 ? 0 : Math.min(1, (rms - 0.012) * 9);
    }
    const sil = Math.max(0, Math.sin(t * 11.5) * 0.6 + Math.sin(t * 7.3 + 1.1) * 0.4);
    return 0.15 + sil * 0.6;
  }
  const hablando = () => fuentes.some(f => !f.audio.paused && !f.audio.ended);

  let ancho = 0, alto = 0, cuadro = 0, vivo = true, visible = true, boca = 0;
  let proximoParpadeo = 2, parpadeo = -1, miradaX = 0, miradaY = 0, miradaObjX = 0, miradaObjY = 0, proximaMirada = 1.5;
  const reloj = new THREE.Clock();
  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h || (w === ancho && h === alto)) return;
    ancho = w; alto = h;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const dist = w / h < 0.8 ? 1.25 : 0.95;
    camara.position.set(0, objetivo.y + 0.04, objetivo.z + dist);
    camara.lookAt(objetivo);
    camara.updateProjectionMatrix();
  }
  contenedor.appendChild(lienzo);
  const observador = new ResizeObserver(ajustar);
  observador.observe(contenedor);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; });
  io.observe(contenedor);
  const quieta = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animar() {
    if (!vivo) return;
    cuadro = requestAnimationFrame(animar);
    if (!visible || document.hidden) return;
    ajustar();
    const t = reloj.getElapsedTime();
    const dt = Math.min(0.25, t - (animar.previo ?? t)); animar.previo = t;
    suavizado = 1 - Math.exp(-dt * 3.5); // ~0,7 s para cambiar de expresión
    const objetivoBoca = nivelVoz(t);
    boca += (objetivoBoca - boca) * (objetivoBoca > boca ? 0.5 : 0.25);
    const habla = hablando() ? 1 : 0;
    for (const k in base) H[k].quaternion.copy(base[k]);
    const amp = quieta ? 0.3 : 1;
    const gesto = aplicarGestos();

    // Respiración y balanceo suave.
    const resp = Math.sin(t * 1.5);
    rotarMundo(H.torso, Y, Math.sin(t * 0.31) * 0.02 * amp);
    rotarMundo(H.pecho, X, -resp * 0.01 * amp);
    rotarMundo(H.claviculaI, Z, resp * 0.01 * amp);
    rotarMundo(H.claviculaD, Z, -resp * 0.01 * amp);
    rotarMundo(H.cuello, Y, (Math.sin(t * 0.43) * 0.04 + Math.sin(t * 0.17) * 0.03) * amp);
    rotarMundo(H.cabeza, X, (Math.sin(t * 0.7) * 0.02 + habla * boca * 0.03) * amp + gesto.cabeza);
    rotarMundo(H.cabeza, Y, Math.sin(t * 0.37 + 2) * 0.04 * amp);
    rotarMundo(H.cabeza, Z, (Math.sin(t * 0.29) * 0.02 + habla * Math.sin(t * 2.1) * 0.012) * amp);

    // Mandíbula.
    rotarMundo(H.mandibula, X, boca * 0.2 + gesto.mandibula);

    // Mirada: pequeños desvíos y vuelta a la estudiante.
    if (t > proximaMirada) {
      const mira = Math.random() < 0.6;
      miradaObjX = mira ? 0 : (Math.random() - 0.5) * 0.35;
      miradaObjY = (mira ? 0 : (Math.random() - 0.3) * 0.18) + gesto.mirada;
      proximaMirada = t + (gesto.inquieta > 0.5 ? 0.5 + Math.random() : 1.2 + Math.random() * 2.5);
    }
    miradaX += (miradaObjX - miradaX) * 0.15; miradaY += (miradaObjY - miradaY) * 0.15;
    for (const o of [H.ojoI, H.ojoD]) { rotarMundo(o, Y, miradaX); rotarMundo(o, X, miradaY); }

    // Parpadeo cada 2 a 6 segundos.
    if (parpadeo < 0 && t > proximoParpadeo) parpadeo = t;
    let cierre = 0;
    if (parpadeo >= 0) {
      const d = (t - parpadeo) / 0.16;
      cierre = d < 1 ? d : d < 2 ? 2 - d : 0;
      if (d >= 2) { parpadeo = -1; proximoParpadeo = t + (gesto.inquieta > 0.5 ? 0.8 + Math.random() * 1.5 : 2 + Math.random() * 4); }
    }
    const lid = 0.4 * cierre + Math.max(0, miradaY) * 0.5;
    rotarMundo(H.parpadoI, X, lid); rotarMundo(H.parpadoD, X, lid);

    renderer.render(escena, camara);
  }
  animar();

  return {
    lienzo,
    conectarAudio,
    emocion,
    destruir() {
      vivo = false; cancelAnimationFrame(cuadro); observador.disconnect(); io.disconnect();
      for (const f of fuentes) try { f.nodo && f.nodo.disconnect(); } catch (e) {}
      if (ctx) ctx.close().catch(() => {});
      renderer.dispose(); lienzo.remove();
    },
  };
}
