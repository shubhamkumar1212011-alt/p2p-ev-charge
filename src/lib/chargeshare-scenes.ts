import * as THREE from "three";

const getReduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeRenderer(canvas: HTMLCanvasElement) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  } catch {
    return null;
  }
}

function fitToParent(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, parent: HTMLElement) {
  const w = Math.max(1, parent.clientWidth);
  const h = Math.max(1, parent.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function runLoop(parent: HTMLElement, step: (t: number, dt: number) => void) {
  let raf = 0;
  let visible = true;
  const io = new IntersectionObserver((e) => {
    visible = e[0]?.isIntersecting ?? true;
  });
  io.observe(parent);
  const clock = new THREE.Clock();
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    step(clock.getElapsedTime(), clock.getDelta());
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}

function dragRotate(canvas: HTMLCanvasElement) {
  const s = { yaw: 0, vel: 0, dragging: false };
  let lx = 0;
  canvas.style.touchAction = "pan-y";
  canvas.style.cursor = "grab";
  const onDown = (e: PointerEvent) => {
    s.dragging = true;
    lx = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    if (!s.dragging) return;
    s.vel = (e.clientX - lx) * 0.008;
    s.yaw += s.vel;
    lx = e.clientX;
  };
  const up = () => {
    s.dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  return s;
}

function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
      o.geometry?.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose(); x.dispose(); });
    }
  });
  renderer.dispose();
}

function textTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number, ...args: number[]) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const update = (...a: number[]) => {
    draw(ctx, w, h, ...a);
    tex.needsUpdate = true;
  };
  return { tex, update };
}

const basic = (color: number, opacity = 1, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, ...extra });
const std = (color: number, metalness = 0.2, roughness = 0.5, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const powerClass = (kw: number) =>
  kw <= 7.4 ? { name: "AC · Standard", color: 0x19c37d, hex: "#19c37d" }
  : kw <= 22 ? { name: "AC · Fast", color: 0x3ea6ff, hex: "#3ea6ff" }
  : kw <= 60 ? { name: "DC · Rapid", color: 0xffb020, hex: "#ffb020" }
  : { name: "DC · Ultra-rapid", color: 0xff4d6d, hex: "#ff4d6d" };

export function createHeroScene(canvas: HTMLCanvasElement) {
  const renderer = makeRenderer(canvas);
  if (!renderer || !canvas.parentElement) return null;
  const parent = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 3.6, 11);

  scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x0b1c3a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 8, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x3ea6ff, 1.4);
  rim.position.set(-6, 3, -5);
  scene.add(rim);
  const portLight = new THREE.PointLight(0x19c37d, 2, 6);
  portLight.position.set(1.6, 0.9, 1.4);
  scene.add(portLight);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(8.5, 72), std(0x0d2a55, 0.1, 0.9, { transparent: true, opacity: 0.92 }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  const grid = new THREE.GridHelper(17, 34, 0x2f78c8, 0x17407c);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  grid.position.y = 0.01;
  root.add(grid);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.5, 5.58, 128), basic(0x19c37d, 0.8, { side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);

  // EV coupe
  const car = new THREE.Group();
  const depth = 1.8;
  const body = new THREE.Shape();
  [[-2.1, 0.3], [2.1, 0.3], [2.1, 0.78], [1.35, 0.96], [0.75, 1.46], [-0.95, 1.46], [-1.75, 1.02], [-2.1, 0.86]]
    .forEach(([x, y], i) => (i ? body.lineTo(x, y) : body.moveTo(x, y)));
  const bodyGeo = new THREE.ExtrudeGeometry(body, { depth, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3 });
  bodyGeo.translate(0, 0, -depth / 2);
  car.add(new THREE.Mesh(bodyGeo, std(0xf4f8ff, 0.65, 0.22)));

  const glass = new THREE.Shape();
  [[1.2, 1.0], [0.72, 1.4], [-0.9, 1.4], [-1.55, 1.02]].forEach(([x, y], i) => (i ? glass.lineTo(x, y) : glass.moveTo(x, y)));
  const glassGeo = new THREE.ExtrudeGeometry(glass, { depth: 2.1, bevelEnabled: false });
  glassGeo.translate(0, 0, -1.05);
  car.add(new THREE.Mesh(glassGeo, std(0x0d1b34, 0.9, 0.08)));

  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 36);
  wheelGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.36, 24);
  rimGeo.rotateX(Math.PI / 2);
  [[-1.35, 1], [1.35, 1], [-1.35, -1], [1.35, -1]].forEach(([x, s]) => {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(wheelGeo, std(0x0c0f16, 0.1, 0.9)));
    w.add(new THREE.Mesh(rimGeo, std(0xd5deec, 0.9, 0.25)));
    w.position.set(x, 0.44, s * 0.93);
    car.add(w);
  });
  [-0.6, 0.6].forEach((z) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.36), basic(0xe6f6ff));
    hl.position.set(2.18, 0.7, z);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.36), basic(0xff3b4e));
    tl.position.set(-2.18, 0.8, z);
    car.add(tl);
  });
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), basic(0x19c37d));
  port.position.set(1.5, 0.72, 0.99);
  car.add(port);
  root.add(car);

  // Charging pedestal
  const charger = new THREE.Group();
  charger.position.set(3.5, 0, 1.55);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.12, 32), std(0x2a3b5c, 0.5, 0.5));
  base.position.y = 0.06;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.64, 2.1, 0.46), std(0xeaf0fb, 0.3, 0.35));
  post.position.y = 1.17;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.52), std(0x19c37d, 0.4, 0.4));
  cap.position.y = 2.3;
  const scr = textTexture(256, 320, (ctx, w, h, pct) => {
    ctx.fillStyle = "#071a36";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#19c37d";
    ctx.font = "700 26px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚡ CHARGING", w / 2, 56);
    ctx.fillStyle = "#fff";
    ctx.font = "800 82px Inter, sans-serif";
    ctx.fillText(`${pct}%`, w / 2, 160);
    ctx.fillStyle = "#7fb8ff";
    ctx.font = "600 26px Inter, sans-serif";
    ctx.fillText("7.4 kW · Type 2", w / 2, 210);
    ctx.fillStyle = "#17407c";
    ctx.fillRect(34, 250, w - 68, 16);
    ctx.fillStyle = "#19c37d";
    ctx.fillRect(34, 250, ((w - 68) * pct) / 100, 16);
  });
  scr.update(42);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), basic(0xffffff, 1, { map: scr.tex }));
  screen.position.set(0, 1.5, 0.235);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), basic(0x19c37d));
  led.position.set(0, 1.97, 0.235);
  charger.add(base, post, cap, screen, led);
  root.add(charger);

  // Floating map pin
  const pin = new THREE.Group();
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), std(0x19c37d, 0.3, 0.3, { emissive: 0x0a6b43, emissiveIntensity: 0.6 }));
  const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.6, 32), std(0x19c37d, 0.3, 0.3, { emissive: 0x0a6b43, emissiveIntensity: 0.6 }));
  pinTip.rotation.x = Math.PI;
  pinTip.position.y = -0.42;
  const pinDot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), basic(0xffffff));
  pinDot.position.z = 0.22;
  pin.add(pinHead, pinTip, pinDot);
  pin.position.set(3.5, 3.35, 1.55);
  root.add(pin);

  // Power cable + pulses
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.22, 1.15, 1.6),
    new THREE.Vector3(3.3, 0.45, 2.0),
    new THREE.Vector3(2.7, 0.12, 2.05),
    new THREE.Vector3(2.0, 0.45, 1.7),
    new THREE.Vector3(1.55, 0.72, 1.05),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.045, 10), std(0x1a2740, 0.3, 0.6)));
  const glowTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.07, 10),
    basic(0x19c37d, 0.18, { blending: THREE.AdditiveBlending, depthWrite: false })
  );
  root.add(glowTube);
  const pulses = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), basic(0x9dffd2));
    root.add(m);
    return m;
  });

  // Particles
  const N = 420;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 5 + Math.random() * 9;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.3 + Math.random() * 8;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8cc4ff, size: 0.055, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(particles);

  const drag = dragRotate(canvas);
  const mouse = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    const b = parent.getBoundingClientRect();
    mouse.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
    mouse.y = ((e.clientY - b.top) / b.height - 0.5) * 2;
  };
  parent.addEventListener("pointermove", onMove);
  const ro = new ResizeObserver(() => fitToParent(renderer, camera, parent));
  ro.observe(parent);
  fitToParent(renderer, camera, parent);

  let lastPct = -1;
  const reduceMotion = getReduceMotion();
  const stop = runLoop(parent, (t) => {
    const m = reduceMotion ? 0 : 1;
    if (!drag.dragging) {
      drag.vel *= 0.94;
      drag.yaw += drag.vel;
    }
    root.rotation.y = -0.6 + drag.yaw + Math.sin(t * 0.25) * 0.22 * m;
    camera.position.x += (mouse.x * 1.1 - camera.position.x) * 0.04;
    camera.position.y += (3.6 - mouse.y * 0.7 - camera.position.y) * 0.04;
    camera.lookAt(0.8, 1.0, 0.4);
    pin.position.y = 3.35 + Math.sin(t * 1.6) * 0.14 * m;
    pin.rotation.y = t * 0.9 * m;
    ring.material.opacity = 0.55 + Math.sin(t * 2) * 0.25 * m;
    portLight.intensity = 1.6 + Math.sin(t * 5) * 0.7 * m;
    glowTube.material.opacity = 0.14 + Math.sin(t * 4) * 0.08 * m;
    pulses.forEach((p, i) => {
      p.position.copy(curve.getPointAt(((t * 0.35 * m) + i / pulses.length) % 1));
    });
    particles.rotation.y = t * 0.02 * m;
    const pct = 20 + Math.floor((t * 4) % 79);
    if (pct !== lastPct) {
      lastPct = pct;
      scr.update(pct);
    }
    renderer.render(scene, camera);
  });

  return () => {
    stop();
    ro.disconnect();
    parent.removeEventListener("pointermove", onMove);
    disposeScene(scene, renderer);
  };
}

const CITIES: Record<string, [number, number]> = {
  Bengaluru: [12.97, 77.59],
  Mumbai: [19.08, 72.88],
  Delhi: [28.61, 77.21],
  Chennai: [13.08, 80.27],
  Hyderabad: [17.38, 78.48],
  Kolkata: [22.57, 88.36],
  Pune: [18.52, 73.86],
  Jaipur: [26.91, 75.78],
};

function latLng(lat: number, lng: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

export function createGlobeScene(canvas: HTMLCanvasElement) {
  const renderer = makeRenderer(canvas);
  if (!renderer || !canvas.parentElement) return null;
  const parent = canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);

  const tilt = new THREE.Group();
  tilt.rotation.x = 0.38;
  scene.add(tilt);
  const globe = new THREE.Group();
  tilt.add(globe);
  const R = 2;

  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 48, 32), basic(0x0a1f40, 0.92)));
  const D = 2000;
  const dp = new Float32Array(D * 3);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < D; i++) {
    const y = 1 - (i / (D - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = ga * i;
    dp[i * 3] = Math.cos(th) * r * R;
    dp[i * 3 + 1] = y * R;
    dp[i * 3 + 2] = Math.sin(th) * r * R;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  globe.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x4c8fe0, size: 0.028, transparent: true, opacity: 0.85 })));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 32), basic(0x3ea6ff, 0.09, { side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })));

  const hub = latLng(...CITIES.Bengaluru, R);
  const nodes: THREE.Mesh[] = [];
  const arcs: Array<{ curve: THREE.QuadraticBezierCurve3; pulse: THREE.Mesh; off: number }> = [];
  Object.entries(CITIES).forEach(([name, [la, lo]]) => {
    const p = latLng(la, lo, R);
    const n = new THREE.Mesh(new THREE.SphereGeometry(name === "Bengaluru" ? 0.055 : 0.04, 16, 16), basic(name === "Bengaluru" ? 0xffffff : 0x19c37d));
    n.position.copy(p);
    globe.add(n);
    nodes.push(n);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 32), basic(0x19c37d, 0.7, { side: THREE.DoubleSide }));
    halo.position.copy(p).multiplyScalar(1.004);
    halo.lookAt(p.clone().multiplyScalar(2));
    globe.add(halo);
    nodes.push(halo);
    if (name !== "Bengaluru") {
      const mid = hub.clone().add(p).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.18 + hub.distanceTo(p) * 0.09));
      const curve = new THREE.QuadraticBezierCurve3(hub, mid, p);
      globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 50, 0.006, 6), basic(0x19c37d, 0.55)));
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), basic(0xbfffe0));
      globe.add(pulse);
      arcs.push({ curve, pulse, off: Math.random() });
    }
  });

  const focus = latLng(20, 78, 1);
  const baseYaw = Math.atan2(-focus.x, focus.z);
  const drag = dragRotate(canvas);
  const ro = new ResizeObserver(() => fitToParent(renderer, camera, parent));
  ro.observe(parent);
  fitToParent(renderer, camera, parent);

  const reduceMotion = getReduceMotion();
  const stop = runLoop(parent, (t) => {
    const m = reduceMotion ? 0 : 1;
    if (!drag.dragging) {
      drag.vel *= 0.95;
      drag.yaw += drag.vel + 0.0016 * m;
    }
    globe.rotation.y = baseYaw + drag.yaw;
    arcs.forEach((a) => a.pulse.position.copy(a.curve.getPointAt(((t * 0.22 * m) + a.off) % 1)));
    nodes.forEach((n, i) => {
      if (i % 2) n.scale.setScalar(1 + 0.25 * Math.sin(t * 3 + i) * m);
    });
    renderer.render(scene, camera);
  });

  return () => {
    stop();
    ro.disconnect();
    disposeScene(scene, renderer);
  };
}

const PIN_LAYOUT: Record<string, Array<[number, number, "s" | "l"]>> = {
  "Type 2": [[-0.5, 0.25, "s"], [-0.18, 0.42, "s"], [0.18, 0.42, "s"], [0.5, 0.25, "s"], [0, -0.05, "s"], [-0.3, -0.45, "s"], [0.3, -0.45, "s"]],
  "CCS2": [[-0.5, 0.45, "s"], [-0.18, 0.62, "s"], [0.18, 0.62, "s"], [0.5, 0.45, "s"], [0, 0.25, "s"], [-0.36, -0.42, "l"], [0.36, -0.42, "l"]],
  "CHAdeMO": [[-0.42, 0.15, "l"], [0.42, 0.15, "l"], [-0.55, -0.5, "s"], [-0.18, -0.55, "s"], [0.18, -0.55, "s"], [0.55, -0.5, "s"], [0, 0.6, "s"]],
  "15A Socket": [[-0.28, 0.2, "s"], [0.28, 0.2, "s"], [0, -0.38, "l"]],
};

export function createConnectorScene(canvas: HTMLCanvasElement, { powerKw, connector }: { powerKw: number; connector: string }) {
  const renderer = makeRenderer(canvas);
  if (!renderer || !canvas.parentElement) return null;
  const parent = canvas.parentElement;
  const cls = powerClass(powerKw);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(0, 1.8, 7.6);
  camera.lookAt(0, 1.1, 0);

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b1c3a, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const fill = new THREE.PointLight(cls.color, 3, 12);
  fill.position.set(-2, 2, 3);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.1, 64), std(0x0d2a55, 0.1, 0.9));
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.46, 96), basic(cls.color, 0.85, { side: THREE.DoubleSide }));
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.01;
  root.add(floorRing);

  const unit = new THREE.Group();
  unit.position.set(-1.55, 0, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.14, 32), std(0x2a3b5c, 0.5, 0.5));
  base.position.y = 0.07;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.25, 0.56), std(0xeaf0fb, 0.3, 0.35));
  post.position.y = 1.25;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.6), basic(cls.color));
  band.position.y = 2.3;
  const scr = textTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#071a36";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = cls.hex;
    ctx.font = "800 74px Inter, sans-serif";
    ctx.fillText(`${powerKw}`, w / 2, 108);
    ctx.fillStyle = "#fff";
    ctx.font = "700 32px Inter, sans-serif";
    ctx.fillText("kW", w / 2, 150);
    ctx.fillStyle = "#7fb8ff";
    ctx.font = "600 24px Inter, sans-serif";
    ctx.fillText(connector, w / 2, 200);
    ctx.font = "500 19px Inter, sans-serif";
    ctx.fillText(cls.name, w / 2, 232);
  });
  scr.update();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.68), basic(0xffffff, 1, { map: scr.tex }));
  screen.position.set(0, 1.5, 0.285);
  unit.add(base, post, band, screen);
  root.add(unit);

  const plug = new THREE.Group();
  plug.position.set(1.55, 1.4, 0);
  const wide = connector === "CCS2" || connector === "CHAdeMO";
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.52, 48), std(0x1d2b45, 0.4, 0.4));
  head.rotation.x = Math.PI / 2;
  head.scale.set(wide ? 1.08 : 0.92, 1, wide ? 1.12 : 0.92);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.82, 48), std(0x0a1220, 0.2, 0.7));
  face.position.z = 0.268;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.032, 12, 64), basic(cls.color));
  rim.position.z = 0.27;
  plug.add(head, face, rim);

  const gold = std(0xe9c46a, 0.9, 0.25);
  (PIN_LAYOUT[connector] || PIN_LAYOUT["Type 2"]).forEach(([x, y, k]) => {
    const g = new THREE.CylinderGeometry(k === "l" ? 0.14 : 0.06, k === "l" ? 0.14 : 0.06, 0.28, 20);
    g.rotateX(Math.PI / 2);
    const p = new THREE.Mesh(g, gold);
    p.position.set(x, y, 0.38);
    plug.add(p);
  });
  root.add(plug);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.55, 1.4, -0.26),
    new THREE.Vector3(1.75, 0.48, -0.82),
    new THREE.Vector3(0.4, 0.12, -0.55),
    new THREE.Vector3(-0.85, 0.4, 0.32),
    new THREE.Vector3(-1.55, 0.6, 0.32),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.055, 10), std(0x1a2740, 0.3, 0.6)));
  const pulses = Array.from({ length: 5 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), basic(0xffffff));
    root.add(m);
    return m;
  });
  const speed = 0.14 + (Math.min(powerKw, 120) / 120) * 0.45;
  const drag = dragRotate(canvas);
  drag.yaw = -0.3;
  const ro = new ResizeObserver(() => fitToParent(renderer, camera, parent));
  ro.observe(parent);
  fitToParent(renderer, camera, parent);

  const reduceMotion = getReduceMotion();
  const stop = runLoop(parent, (t) => {
    const m = reduceMotion ? 0 : 1;
    if (!drag.dragging) {
      drag.vel *= 0.94;
      drag.yaw += drag.vel + 0.003 * m;
    }
    root.rotation.y = drag.yaw;
    plug.rotation.y = Math.sin(t * 0.8) * 0.16 * m;
    pulses.forEach((p, i) => p.position.copy(curve.getPointAt(1 - (((t * speed * m) + i / pulses.length) % 1))));
    renderer.render(scene, camera);
  });
  return () => {
    stop();
    ro.disconnect();
    disposeScene(scene, renderer);
  };
}
