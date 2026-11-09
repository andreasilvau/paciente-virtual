/* Paciente 3D: cuerpo de la paciente con respiración, movimiento de cabeza y boca sincronizada con su voz.
   Se carga solo cuando el módulo está activado; si WebGL o el modelo fallan, la app sigue con el avatar circular. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Gira un hueso alrededor de un eje expresado en coordenadas del mundo.
function rotarMundo(hueso, eje, angulo) {
  const padre = new THREE.Quaternion();
  hueso.parent.getWorldQuaternion(padre);
  const q = new THREE.Quaternion().setFromAxisAngle(eje, angulo);
  const local = padre.clone().invert().multiply(q).multiply(padre);
  hueso.quaternion.premultiply(local);
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export async function montarPaciente3D(contenedor, { modelo = "/paciente.glb", tonos = {} } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.className = "lienzo3d";
  lienzo.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xfff6ee, 0x6f7f8f, 1.5));
  const clave = new THREE.DirectionalLight(0xffffff, 2.1); clave.position.set(3, 5, 6); escena.add(clave);
  const relleno = new THREE.DirectionalLight(0xcfe3ff, 0.7); relleno.position.set(-5, 2, 3); escena.add(relleno);

  const camara = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const objetivo = new THREE.Vector3(0, 12.4, 0.5);
  camara.position.set(0, 12.7, 10.5);
  camara.lookAt(objetivo);

  const gltf = await new GLTFLoader().loadAsync(modelo);
  const cuerpo = gltf.scene;
  escena.add(cuerpo);

  // Colores opcionales por caso (piel, pelo, ropa).
  const materiales = {};
  cuerpo.traverse(n => { if (n.isMesh) { materiales[n.material.name] = n.material; n.frustumCulled = false; } });
  if (tonos.piel && materiales.female1605) materiales.female1605.color.set(tonos.piel);
  if (tonos.pelo) { materiales.ponytail01 && materiales.ponytail01.color.set(tonos.pelo); materiales.eyebrow009 && materiales.eyebrow009.color.set(tonos.pelo); }
  if (tonos.ropa && materiales.female_casualsuit01) materiales.female_casualsuit01.color.set(tonos.ropa);

  const hueso = n => cuerpo.getObjectByName(n);
  const H = {
    cabeza: hueso("head"), cuello: hueso("neck_01"), pecho: hueso("spine_03"), torso: hueso("spine_02"),
    brazoI: hueso("upperarm_l"), brazoD: hueso("upperarm_r"), antebrazoI: hueso("lowerarm_l"), antebrazoD: hueso("lowerarm_r"),
    claviculaI: hueso("clavicle_l"), claviculaD: hueso("clavicle_r"),
  };
  // Postura de reposo: brazos abajo, codos algo flectados y manos hacia adelante.
  cuerpo.updateMatrixWorld(true);
  rotarMundo(H.brazoI, Z, -0.62); rotarMundo(H.brazoD, Z, 0.62);
  cuerpo.updateMatrixWorld(true);
  rotarMundo(H.antebrazoI, X, -0.35); rotarMundo(H.antebrazoD, X, -0.35);
  rotarMundo(H.antebrazoI, Z, -0.25); rotarMundo(H.antebrazoD, Z, 0.25);
  // Cavidad oral oscura detrás de los labios: se ve cuando la boca se abre.
  if (H.cabeza) {
    const cavidad = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x2a0f10 }));
    cavidad.scale.set(0.3, 0.2, 0.32);
    const pos = H.cabeza.worldToLocal(new THREE.Vector3(0, 12.47, 0.82));
    cavidad.position.copy(pos);
    H.cabeza.add(cavidad);
  }
  const base = {};
  for (const [k, b] of Object.entries(H)) if (b) base[k] = b.quaternion.clone();

  const caras = [];
  cuerpo.traverse(n => { if (n.morphTargetInfluences && n.morphTargetInfluences.length) caras.push(n); });

  // Nivel de voz: un analizador sobre una copia de cada reproductor (captureStream), sin desviar la salida de sonido.
  // Firefox (mozCaptureStream silencia el audio) y Safari (no lo tiene) usan un movimiento aproximado.
  let ctx = null;
  const fuentes = [];
  function prepararAnalisis(audio, f) {
    if (typeof audio.captureStream !== "function") return;
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
      if (f.confiable) return rms < 0.012 ? 0 : Math.min(0.5, (rms - 0.012) * 4.5);
    }
    // Sin analizador: ritmo silábico aproximado mientras suena la voz.
    const sil = Math.max(0, Math.sin(t * 11.5) * 0.6 + Math.sin(t * 7.3 + 1.1) * 0.4);
    return 0.08 + sil * 0.32;
  }
  const hablando = () => fuentes.some(f => !f.audio.paused && !f.audio.ended);

  let bocaFija = null, boca = 0, ancho = 0, alto = 0, cuadro = 0, vivo = true, visible = true;
  const reloj = new THREE.Clock();
  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h || (w === ancho && h === alto)) return;
    ancho = w; alto = h;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // En formatos verticales se aleja un poco para que entren hombros y torso.
    camara.position.z = w / h < 0.8 ? 13 : 10.5;
    camara.updateProjectionMatrix();
  }
  contenedor.appendChild(lienzo);
  const observador = new ResizeObserver(ajustar);
  observador.observe(contenedor);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; });
  io.observe(contenedor);

  // Movimiento en ejes del mundo (X: asentir, Y: girar, Z: inclinar), siempre desde la postura de reposo.
  function mover(k, eje, ang) { if (H[k] && ang) rotarMundo(H[k], eje, ang); }

  function animar() {
    if (!vivo) return;
    cuadro = requestAnimationFrame(animar);
    if (!visible || document.hidden) return;
    ajustar();
    const t = reloj.getElapsedTime();
    const objetivoBoca = bocaFija ?? nivelVoz(t);
    boca += (objetivoBoca - boca) * (objetivoBoca > boca ? 0.55 : 0.3);
    for (const m of caras) m.morphTargetInfluences[0] = boca;
    const habla = hablando() ? 1 : 0;
    for (const k in base) H[k].quaternion.copy(base[k]);
    const resp = Math.sin(t * 1.6);
    mover("torso", Y, Math.sin(t * 0.31) * 0.025);
    mover("pecho", X, -resp * 0.012);
    mover("claviculaI", Z, resp * 0.012);
    mover("claviculaD", Z, -resp * 0.012);
    mover("cuello", Y, Math.sin(t * 0.43) * 0.04 + Math.sin(t * 0.17) * 0.03);
    mover("cabeza", X, Math.sin(t * 0.7) * 0.02 + habla * boca * 0.035);
    mover("cabeza", Y, Math.sin(t * 0.37 + 2) * 0.05);
    mover("cabeza", Z, Math.sin(t * 0.29) * 0.025 + habla * Math.sin(t * 2.1) * 0.015);
    renderer.render(escena, camara);
  }
  animar();

  return {
    lienzo,
    fijarBoca(v) { bocaFija = v; },
    conectarAudio,
    destruir() {
      vivo = false; cancelAnimationFrame(cuadro); observador.disconnect(); io.disconnect();
      for (const f of fuentes) try { f.nodo && f.nodo.disconnect(); } catch (e) {}
      if (ctx) ctx.close().catch(() => {});
      renderer.dispose(); lienzo.remove();
    },
  };
}
