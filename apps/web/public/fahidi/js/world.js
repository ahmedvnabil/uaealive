// world.js — أرض حي الفهيدي وسماؤه وخوره ونجومه (كل شيء procedural)
import * as THREE from 'three';

export const WATER_LEVEL = 0;
export const SHORE_Z = 28;   // بداية انحدار الضفة نحو الخور (الماء جهة +z)
export const BOUNDS = { x: 60, zMin: -60 };
export const DOCK = { minX: 16, maxX: 26, minZ: 26, maxZ: 48, height: 0.85 };

// حواجز التصادم (البيوت والجدران) — تملؤها village.js
export const obstacles = [];

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ارتفاع الأرض في أي نقطة — تستخدمه التضاريس واللاعب معًا
export function groundHeight(x, z) {
  const shore = 1 - smoothstep(SHORE_Z - 4, SHORE_Z + 9, z); // 1 على اليابسة → 0 في الخور
  if (shore <= 0) return -2.4;
  // أرض الحي شبه مستوية، وكثبان خفيفة كلما اتجهنا جنوبًا خلف الفريج
  let relief =
    Math.sin(x * 0.06 + 1.7) * Math.cos(z * 0.05) * 0.22 +
    Math.sin(x * 0.13) * Math.sin(z * 0.11 + 2.0) * 0.14;
  relief += smoothstep(-24, -60, z) * (0.6 + Math.sin(x * 0.09 + 2.5) * 0.55);
  return -2.4 + shore * (3.7 + relief);
}

// الارتفاع الذي يمشي عليه اللاعب (يشمل رصيف العبرة فوق الماء)
export function walkHeight(x, z) {
  const g = groundHeight(x, z);
  if (x >= DOCK.minX && x <= DOCK.maxX && z >= DOCK.minZ && z <= DOCK.maxZ) {
    return Math.max(g, DOCK.height);
  }
  return g;
}

export function isWalkable(x, z) {
  if (x >= DOCK.minX && x <= DOCK.maxX && z >= DOCK.minZ && z <= DOCK.maxZ) return true;
  if (Math.abs(x) > BOUNDS.x || z < BOUNDS.zMin) return false;
  if (groundHeight(x, z) <= WATER_LEVEL + 0.25) return false;
  for (const o of obstacles) {
    const dx = x - o.x, dz = z - o.z;
    if (dx * dx + dz * dz < o.r * o.r) return false;
  }
  return true;
}

// ── التضاريس ──────────────────────────────────────────────
function buildTerrain() {
  const geo = new THREE.PlaneGeometry(260, 260, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const sand = new THREE.Color('#c9b088');
  const packed = new THREE.Color('#bfa984');   // أرض الفريج المدكوكة
  const sandDark = new THREE.Color('#8f7451');
  const wet = new THREE.Color('#5d5344');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    // داخل الفريج لون مدكوك أفتح، وخارجه رمال
    const inDistrict = (1 - smoothstep(30, 48, Math.abs(x))) * (1 - smoothstep(-40, -56, -z));
    const c = sand.clone().lerp(packed, inDistrict * 0.8);
    c.lerp(sandDark, smoothstep(2.2, 0.6, h) * 0.5);   // أغمق قرب الضفة
    c.lerp(wet, smoothstep(0.7, -0.5, h));              // رمل مبلول تحت الماء
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  return new THREE.Mesh(geo, mat);
}

// ── الماء: خور دبي يعكس النجوم ────────────────────────────
function buildWater() {
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color('#101c33') },
    uShallow: { value: new THREE.Color('#23345c') },
    uHorizon: { value: new THREE.Color('#5c3a52') },
    uEmber: { value: new THREE.Color('#e8a15c') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep, uShallow, uHorizon, uEmber;
      varying vec2 vUv; varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // موج هادئ
        float wave = sin(vWorld.x * 0.35 + uTime * 0.6) * sin(vWorld.z * 0.3 - uTime * 0.4);
        vec3 col = mix(uDeep, uShallow, 0.5 + 0.5 * wave * 0.6);
        // توهج الأفق (بقايا الغروب)
        float d = length(vWorld.xz);
        col = mix(col, uHorizon, smoothstep(90.0, 210.0, d) * 0.55);
        // بريق النجوم على الماء
        vec2 cell = floor(vWorld.xz * 3.0);
        float h = hash(cell);
        float tw = 0.5 + 0.5 * sin(uTime * (0.8 + h * 2.2) + h * 40.0);
        float glint = step(0.965, h) * pow(tw, 14.0);
        col += vec3(0.92, 0.9, 0.8) * glint * 0.85;
        // انعكاس ذهبي خافت قرب الضفة (ضوء الفوانيس)
        col += uEmber * 0.06 * smoothstep(70.0, 30.0, vWorld.z) * (0.5 + 0.5 * wave);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_LEVEL;
  return { mesh, uniforms };
}

// ── السماء ────────────────────────────────────────────────
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new THREE.Color('#131735') },
      uHorizon: { value: new THREE.Color('#553760') },
      uGlow: { value: new THREE.Color('#d47a4a') },
      uGlowDir: { value: new THREE.Vector3(-0.7, 0.05, -0.7).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uHorizon, uGlow, uGlowDir;
      varying vec3 vDir;
      void main() {
        float up = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(up, 0.55));
        float g = pow(max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), uGlowDir), 0.0), 3.0);
        col += uGlow * g * (1.0 - up) * 0.55;   // بقايا الغروب على الأفق
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(430, 32, 20), mat);
}

// ── النجوم ────────────────────────────────────────────────
function buildStars() {
  const COUNT = 1400;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 0.92); // نصف كرة علوية، تجنّب الأفق
    const r = 400;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) + 8;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    seeds[i] = Math.random() * 100;
    sizes[i] = 0.9 + Math.random() * 2.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed, aSize; uniform float uTime; varying float vA;
      void main() {
        vA = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed) * 1.6) + aSeed);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (0.8 + 0.35 * vA) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(0.95, 0.94, 0.86, a);
      }`,
  });
  return { mesh: new THREE.Points(geo, mat), uniforms };
}

// ── الهلال (شكل هندسي: قوس خارجي + قوس داخلي) ────────────
function buildMoon() {
  // تقاطع دائرتين: A(0,0,r=1) و B(0.5,0.30,r=0.9) — الهلال هو A ناقص B
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 1.639, 5.725, false);
  shape.absarc(0.5, 0.3, 0.9, -1.174, 2.254, true);
  const mat = new THREE.MeshBasicMaterial({ color: '#e5dabb', fog: false, side: THREE.DoubleSide });
  const moon = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), mat);
  moon.scale.setScalar(9);
  moon.position.set(130, 170, -300);
  moon.lookAt(0, 0, 0);
  moon.rotateZ(0.5);
  return moon;
}

// ── يراعات (نقاط عنبرية تسبح في السكك) ────────────────────
function buildFireflies() {
  const COUNT = 70;
  const positions = new Float32Array(COUNT * 3);
  const base = [];
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = -55 + Math.random() * 75;
    const y = Math.max(groundHeight(x, z), 0.4) + 0.8 + Math.random() * 2.4;
    positions.set([x, y, z], i * 3);
    base.push({ x, y, z, s: Math.random() * 100 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // نسيج دائري صغير حتى لا تظهر النقاط كمربعات
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c2d = cv.getContext('2d');
  const grad = c2d.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c2d.fillStyle = grad;
  c2d.fillRect(0, 0, 32, 32);
  const mat = new THREE.PointsMaterial({
    color: '#f0b46a', size: 0.35, map: new THREE.CanvasTexture(cv),
    transparent: true, opacity: 0.85, depthWrite: false,
  });
  const mesh = new THREE.Points(geo, mat);
  return {
    mesh,
    update(t) {
      const p = geo.attributes.position;
      for (let i = 0; i < COUNT; i++) {
        const b = base[i];
        p.setX(i, b.x + Math.sin(t * 0.4 + b.s) * 1.6);
        p.setY(i, b.y + Math.sin(t * 0.9 + b.s * 2.0) * 0.5);
        p.setZ(i, b.z + Math.cos(t * 0.3 + b.s) * 1.6);
      }
      p.needsUpdate = true;
    },
  };
}

// ── تجميع المشهد ──────────────────────────────────────────
export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#1b1830', 55, 210);

  scene.add(buildSky());
  scene.add(buildMoon());
  scene.add(buildTerrain());

  const water = buildWater();
  scene.add(water.mesh);

  const stars = buildStars();
  scene.add(stars.mesh);

  const fireflies = buildFireflies();
  scene.add(fireflies.mesh);

  // إضاءة: قمر + سماء + تعبئة دافئة من جهة الغروب
  const hemi = new THREE.HemisphereLight('#5d689c', '#5a4630', 1.5);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight('#93a8dd', 1.35);
  moonLight.position.set(120, 160, -200);
  scene.add(moonLight);
  const fill = new THREE.DirectionalLight('#c98a68', 0.65);
  fill.position.set(-80, 50, 160);
  scene.add(fill);
  scene.add(new THREE.AmbientLight('#383a5c', 0.7));

  const animations = [];
  function update(t, dt) {
    water.uniforms.uTime.value = t;
    stars.uniforms.uTime.value = t;
    fireflies.update(t);
    for (const fn of animations) fn(t, dt);
  }

  return { scene, update, animations };
}
