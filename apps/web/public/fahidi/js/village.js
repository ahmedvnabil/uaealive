// village.js — نسيج حي الفهيدي: بيوت جبس وبراجيل وسِكك وسوق وعبرة وفناء المجلس
import * as THREE from 'three';
import { groundHeight, DOCK, obstacles } from './world.js';

const M = {
  gypsum:  new THREE.MeshStandardMaterial({ color: '#d6c9ae', flatShading: true, roughness: 1 }),
  gypsum2: new THREE.MeshStandardMaterial({ color: '#c8b997', flatShading: true, roughness: 1 }),
  gypsumDark: new THREE.MeshStandardMaterial({ color: '#b3a284', flatShading: true, roughness: 1 }),
  wood:   new THREE.MeshStandardMaterial({ color: '#5b4632', flatShading: true, roughness: 1 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#43331f', flatShading: true, roughness: 1 }),
  dark:   new THREE.MeshStandardMaterial({ color: '#241d16', flatShading: true, roughness: 1 }),
  cloth:  new THREE.MeshStandardMaterial({ color: '#7a3b3b', flatShading: true, roughness: 1, side: THREE.DoubleSide }),
  cloth2: new THREE.MeshStandardMaterial({ color: '#3d5661', flatShading: true, roughness: 1, side: THREE.DoubleSide }),
  cloth3: new THREE.MeshStandardMaterial({ color: '#8a6a2f', flatShading: true, roughness: 1, side: THREE.DoubleSide }),
  palm:   new THREE.MeshStandardMaterial({ color: '#4a5a35', flatShading: true, roughness: 1, side: THREE.DoubleSide }),
  trunk:  new THREE.MeshStandardMaterial({ color: '#6b5238', flatShading: true, roughness: 1 }),
  windowLit: new THREE.MeshStandardMaterial({ color: '#3a2c18', emissive: '#e8a15c', emissiveIntensity: 1.6 }),
  lantern:   new THREE.MeshStandardMaterial({ color: '#5c4425', emissive: '#f0b46a', emissiveIntensity: 2.2 }),
  flameA: new THREE.MeshBasicMaterial({ color: '#f5a94b' }),
  flameB: new THREE.MeshBasicMaterial({ color: '#e8683a' }),
  canvasTop: new THREE.MeshStandardMaterial({ color: '#d8cbb0', flatShading: true, roughness: 1, side: THREE.DoubleSide }),
};

function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
function place(obj, x, z, extraY = 0) { obj.position.set(x, groundHeight(x, z) + extraY, z); return obj; }

// ── برجيل (برج هواء) — أيقونة الفهيدي ─────────────────────
function makeBarjeel(tw = 2.4, th = 5.8) {
  const t = new THREE.Group();
  const shaft = box(tw, th, tw, M.gypsum);
  shaft.position.y = th / 2;
  t.add(shaft);
  const cap = box(tw + 0.4, 0.35, tw + 0.4, M.gypsumDark);
  cap.position.y = th + 0.15;
  t.add(cap);
  for (let s = 0; s < 4; s++) {
    const op = box(tw * 0.62, th * 0.32, 0.1, M.dark);
    const a = (s * Math.PI) / 2;
    op.position.set(Math.sin(a) * (tw / 2 + 0.03), th * 0.76, Math.cos(a) * (tw / 2 + 0.03));
    op.rotation.y = a;
    t.add(op);
  }
  // الزعانف المتقاطعة (X) داخل الفتحات
  const finA = box(0.14, th * 0.36, tw * 1.35, M.wood);
  finA.position.y = th * 0.76; finA.rotation.y = Math.PI / 4;
  const finB = finA.clone(); finB.rotation.y = -Math.PI / 4;
  t.add(finA, finB);
  return t;
}

// ── بيت فهيدي (جبس ومرجان، اختياريًا ببرجيل أو برجيلين) ──
function makeHouse({ w = 6, d = 5, h = 3.6, towers = 0, litWindows = 1, rot = 0, mat = null }) {
  const g = new THREE.Group();
  const wall = mat || (Math.random() > 0.5 ? M.gypsum : M.gypsum2);
  const body = box(w, h, d, wall);
  body.position.y = h / 2;
  g.add(body);
  // سور السطح (parapet) مع فتحات تهوية صغيرة
  const par = box(w + 0.3, 0.5, d + 0.3, M.gypsumDark);
  par.position.y = h + 0.22;
  g.add(par);
  // باب خشبي
  const door = box(1.15, 2.0, 0.12, M.woodDark);
  door.position.set(0, 1.0, d / 2 + 0.05);
  g.add(door);
  const lintel = box(1.5, 0.22, 0.14, M.wood);
  lintel.position.set(0, 2.12, d / 2 + 0.05);
  g.add(lintel);
  // شبابيك عالية صغيرة (بعضها مضيء)
  for (let i = 0; i < 2; i++) {
    const win = box(0.65, 0.85, 0.1, i < litWindows ? M.windowLit : M.dark);
    win.position.set((i === 0 ? -1 : 1) * w * 0.28, h * 0.62, d / 2 + 0.05);
    g.add(win);
  }
  // مراوس خشبية بارزة (دنشل)
  for (let i = 0; i < Math.floor(w / 1.2); i++) {
    const beam = box(0.18, 0.18, d + 1.2, M.woodDark);
    beam.position.set(-w / 2 + 0.8 + i * 1.2, h - 0.35, 0);
    g.add(beam);
  }
  // البراجيل
  for (let k = 0; k < towers; k++) {
    const t = makeBarjeel(2.3, 5.4 + Math.random() * 1.2);
    const px = towers === 1 ? w / 2 - 1.35 : (k === 0 ? -1 : 1) * (w / 2 - 1.35);
    t.position.set(px, h, -d / 2 + 1.35);
    g.add(t);
  }
  g.rotation.y = rot;
  return g;
}

// يضيف بيتًا للمجموعة ويسجّل حاجز تصادم دائريًا حوله
function addHouse(g, def) {
  const house = makeHouse(def);
  place(house, def.x, def.z);
  g.add(house);
  obstacles.push({ x: def.x, z: def.z, r: Math.max(def.w ?? 6, def.d ?? 5) / 2 + 0.5 });
  return house;
}

// ── فانوس معلق ────────────────────────────────────────────
function makeLantern() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), M.lantern);
  const capT = box(0.2, 0.1, 0.2, M.dark); capT.position.y = 0.32;
  g.add(body, capT);
  return g;
}

// ── نخلة ──────────────────────────────────────────────────
function makePalm(x, z) {
  const g = new THREE.Group();
  const lean = (Math.random() - 0.5) * 0.25;
  const H = 5 + Math.random() * 2.5;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, H, 6), M.trunk);
  trunk.position.y = H / 2;
  trunk.rotation.z = lean;
  g.add(trunk);
  const top = new THREE.Vector3(Math.sin(lean) * -H, Math.cos(lean) * H, 0);
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.4, 4), M.palm);
    const a = (i / 7) * Math.PI * 2;
    frond.position.copy(top);
    frond.rotation.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25 + lean);
    frond.geometry.translate(0, -1.5, 0);
    g.add(frond);
  }
  place(g, x, z);
  return g;
}

// ── سوق السكة: مظلات تعبر السكة بين البيوت وحبال فوانيس ──
function makeSikkaSouk(g, cx, zFrom, zTo) {
  const cloths = [M.cloth, M.cloth2, M.cloth3];
  let i = 0;
  for (let z = zFrom; z <= zTo; z += 4.5) {
    // مظلة قماشية تمتد فوق السكة كلها
    const awn = box(11, 0.07, 3.2, cloths[i % 3]);
    const gy = groundHeight(cx, z);
    awn.position.set(cx, gy + 3.5, z);
    awn.rotation.z = (i % 2 ? 1 : -1) * 0.05;
    g.add(awn);
    // حبل فوانيس تحت كل مظلة
    for (let k = 0; k < 3; k++) {
      const lx = cx - 2.4 + k * 2.4;
      const sag = Math.sin(((k + 0.5) / 3) * Math.PI) * 0.35;
      const l = makeLantern();
      l.position.set(lx, gy + 3.1 - sag, z + 2.2);
      g.add(l);
    }
    i++;
  }
  // بضائع على جانبي السكة: صناديق وجرار ولفّات قماش
  for (let z = zFrom + 1; z <= zTo; z += 3.5) {
    const side = z % 7 < 3.5 ? -1 : 1;
    const bx = cx + side * 4.1;
    const gy = groundHeight(bx, z);
    const crate = box(1, 0.8, 1, M.woodDark); crate.position.set(bx, gy + 0.4, z);
    g.add(crate);
    if (z % 10.5 < 3.5) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 6), cloths[(z | 0) % 3]);
      roll.position.set(bx - side * 0.8, gy + 0.25, z + 0.5);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
    } else {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.9, 7), M.gypsumDark);
      jar.position.set(bx - side * 0.7, gy + 0.45, z - 0.4);
      g.add(jar);
    }
  }
}

// ── العبرة (قارب الخور بمظلته) ورصيف المحطة ──────────────
function makeAbraAndDock() {
  const g = new THREE.Group();
  const cx = (DOCK.minX + DOCK.maxX) / 2;
  // الرصيف: ألواح على ركائز
  for (let z = DOCK.minZ; z < DOCK.maxZ; z += 1.6) {
    const plank = box(DOCK.maxX - DOCK.minX, 0.14, 1.35, M.wood);
    plank.position.set(cx, DOCK.height, z + 0.7);
    g.add(plank);
    if (z % 4.8 < 1.6) {
      for (const px of [DOCK.minX + 0.5, DOCK.maxX - 0.5]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 5), M.woodDark);
        pile.position.set(px, DOCK.height - 1.4, z + 0.7);
        g.add(pile);
      }
    }
  }
  // فانوس على رأس الرصيف
  const lampPost = box(0.16, 2.6, 0.16, M.woodDark);
  lampPost.position.set(cx + 3.6, DOCK.height + 1.3, DOCK.maxZ - 2);
  const lamp = makeLantern();
  lamp.position.set(cx + 3.6, DOCK.height + 2.75, DOCK.maxZ - 2);
  g.add(lampPost, lamp);

  // العبرة: بدن صغير + مظلة خشبية مسطحة على أربعة قوائم
  const abra = new THREE.Group();
  const hullPts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    hullPts.push(new THREE.Vector2(0.35 + Math.sin(t * Math.PI) * 1.15, (t - 0.5) * 7));
  }
  const hull = new THREE.Mesh(new THREE.LatheGeometry(hullPts, 8), M.woodDark);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1, 1, 0.5);
  hull.position.y = 0.35;
  abra.add(hull);
  const deck = box(1.9, 0.12, 5.6, M.wood);
  deck.position.y = 0.75;
  abra.add(deck);
  // مقعد وسطي (ظهر اللاعبين للخارج كما في العبرة الحقيقية)
  const bench = box(0.8, 0.35, 4.2, M.woodDark);
  bench.position.y = 1.0;
  abra.add(bench);
  // قوائم المظلة وسقفها
  for (const [px, pz] of [[-0.8, -2.2], [0.8, -2.2], [-0.8, 2.2], [0.8, 2.2]]) {
    const post = box(0.1, 1.7, 0.1, M.wood);
    post.position.set(px, 1.65, pz);
    abra.add(post);
  }
  const canopy = box(2.3, 0.09, 5.4, M.canvasTop);
  canopy.position.y = 2.55;
  abra.add(canopy);
  abra.position.set(cx - 5.5, 0, DOCK.maxZ - 8);
  abra.rotation.y = 0.2;
  g.add(abra);
  return { group: g, abra };
}

// ── مجلس قهوة بفناء بيت الشاي: سجادة ووسائد ونار ودلّة ───
function makeMajlis(cx, cz) {
  const g = new THREE.Group();
  const gy = groundHeight(cx, cz);
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.08, 10), M.cloth);
  rug.position.set(0, 0.06, 0);
  g.add(rug);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cushion = box(1.1, 0.35, 0.8, i % 2 ? M.cloth2 : M.cloth);
    cushion.position.set(Math.cos(a) * 2.8, 0.28, Math.sin(a) * 2.8);
    cushion.rotation.y = -a;
    g.add(cushion);
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 5), M.woodDark);
    log.rotation.set(Math.PI / 2.3, (i / 4) * Math.PI * 2, 0);
    log.position.y = 0.25;
    g.add(log);
  }
  // دلّة قهوة بجوار النار
  const dallah = new THREE.Group();
  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.5, 7), M.gypsumDark);
  potBody.position.y = 0.25;
  const spout = box(0.06, 0.3, 0.06, M.gypsumDark);
  spout.position.set(0.2, 0.45, 0); spout.rotation.z = -0.5;
  dallah.add(potBody, spout);
  dallah.position.set(1.3, 0, 0.6);
  g.add(dallah);
  // ألسنة اللهب
  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), M.flameA);
  flame1.position.y = 0.9;
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 5), M.flameB);
  flame2.position.set(0.2, 0.75, 0.1);
  g.add(flame1, flame2);
  const fireLight = new THREE.PointLight('#f0913c', 18, 26, 1.8);
  fireLight.position.set(0, 1.6, 0);
  g.add(fireLight);
  g.position.set(cx, gy, cz);
  return { group: g, flames: [flame1, flame2], fireLight };
}

// ── تجميع الحي ────────────────────────────────────────────
export function buildVillage(world) {
  const { scene, animations } = world;
  const g = new THREE.Group();

  // السكة الرئيسية: صفان من البيوت من الجنوب حتى الضفة (السكة بين x=-3.5 و x=3.5)
  const westRow = [
    { x: -8, z: -46, w: 6.5, d: 6, h: 4.2, towers: 1, rot: 0 },
    { x: -8, z: -36, w: 6, d: 5.5, h: 3.4, towers: 0, rot: 0 },
    { x: -8, z: -26, w: 6.5, d: 6, h: 3.8, towers: 1, rot: 0 },
    { x: -8, z: -15, w: 6, d: 5, h: 5.2, towers: 0, rot: 0, litWindows: 2 },
    { x: -8, z: -5,  w: 6.5, d: 5.5, h: 3.6, towers: 1, rot: 0 },
    { x: -8, z: 6,   w: 6, d: 5, h: 4.4, towers: 0, rot: 0 },
    { x: -9, z: 16,  w: 7, d: 5.5, h: 3.4, towers: 1, rot: 0.1 },
  ];
  const eastRow = [
    { x: 8, z: -44, w: 6, d: 5.5, h: 3.6, towers: 1, rot: 0 },
    { x: 8, z: -34, w: 6.5, d: 6, h: 4.6, towers: 0, rot: 0, litWindows: 2 },
    { x: 8, z: -24, w: 6, d: 5.5, h: 3.5, towers: 1, rot: 0 },
    { x: 8, z: -13, w: 6.5, d: 5, h: 3.9, towers: 0, rot: 0 },
    { x: 8, z: -3,  w: 6, d: 5.5, h: 5.0, towers: 1, rot: 0 },
    { x: 9, z: 14,  w: 6.5, d: 5.5, h: 3.5, towers: 0, rot: -0.1 },
  ];
  for (const def of [...westRow, ...eastRow]) addHouse(g, def);

  // بيت البراجيل (المكان المقدس) — بيت كبير ببرجيلين غرب السكة
  addHouse(g, { x: -26, z: -2, w: 9, d: 7, h: 4.6, towers: 2, rot: 0.35, litWindows: 2, mat: M.gypsum });
  // بيوت خلفية غربية وشرقية تكمل نسيج الحي
  addHouse(g, { x: -22, z: -20, w: 6, d: 5, h: 3.4, towers: 1, rot: -0.2 });
  addHouse(g, { x: -24, z: -38, w: 5.5, d: 5, h: 3.2, towers: 0, rot: 0.15 });
  addHouse(g, { x: -20, z: 12, w: 6, d: 5.5, h: 3.7, towers: 0, rot: 0.5 });
  addHouse(g, { x: 22, z: -30, w: 6, d: 5, h: 3.5, towers: 1, rot: -0.3 });
  addHouse(g, { x: 24, z: -14, w: 5.5, d: 5, h: 3.3, towers: 0, rot: 0.2 });
  addHouse(g, { x: 32, z: -4, w: 6, d: 5.5, h: 3.8, towers: 1, rot: -0.15 });

  // سوق السكة التراثية: المقطع الأوسط من السكة الرئيسية
  makeSikkaSouk(g, 0, -38, -22);
  const soukLight1 = new THREE.PointLight('#f0b46a', 14, 22, 1.8);
  soukLight1.position.set(0, groundHeight(0, -30) + 3.2, -30);
  const soukLight2 = new THREE.PointLight('#f0b46a', 10, 18, 1.8);
  soukLight2.position.set(0, groundHeight(0, -24) + 3.0, -24);
  g.add(soukLight1, soukLight2);

  // بيت الشاي العربي: فناء مفتوح بثلاثة جدران شرق السكة + مجلس القهوة
  const teaWalls = [
    { x: 20, z: 2.5, w: 12, d: 0.8, rot: 0 },
    { x: 14.4, z: 8, w: 0.8, d: 10, rot: 0 },
    { x: 25.6, z: 8, w: 0.8, d: 10, rot: 0 },
  ];
  for (const wdef of teaWalls) {
    const wallH = 2.6;
    const wall = box(wdef.w, wallH, wdef.d, M.gypsum2);
    place(wall, wdef.x, wdef.z, wallH / 2);
    g.add(wall);
    obstacles.push({ x: wdef.x, z: wdef.z, r: Math.max(wdef.w, wdef.d) / 2 * 0.55 });
  }
  const majlis = makeMajlis(20, 8);
  g.add(majlis.group);
  animations.push((t) => {
    const f = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 23 + 1) * 0.06;
    majlis.flames[0].scale.set(f, f * (1 + Math.sin(t * 17) * 0.15), f);
    majlis.flames[1].scale.setScalar(0.8 + Math.sin(t * 13 + 2) * 0.15);
    majlis.fireLight.intensity = 15 + Math.sin(t * 19) * 4 + Math.sin(t * 7) * 2;
  });
  // فوانيس على جدار الفناء
  for (const lx of [16, 24]) {
    const l = makeLantern();
    l.position.set(lx, groundHeight(lx, 3) + 2.9, 3);
    g.add(l);
  }

  // ضفة الخور: حافة حجرية منخفضة ومرابط على طول الشاطئ
  for (let x = -40; x <= 40; x += 8) {
    const edge = box(7.5, 0.5, 1.1, M.gypsumDark);
    const ez = 25.5;
    edge.position.set(x, groundHeight(x, ez) + 0.15, ez);
    g.add(edge);
    if (x % 16 === 0) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.9, 5), M.woodDark);
      bollard.position.set(x + 3, groundHeight(x + 3, 25) + 0.55, 25);
      g.add(bollard);
    }
  }

  // محطة العبرة
  const dock = makeAbraAndDock();
  g.add(dock.group);
  const dockLight = new THREE.PointLight('#f0b46a', 12, 20, 1.8);
  dockLight.position.set(24.6, 4, DOCK.maxZ - 2);
  g.add(dockLight);
  animations.push((t) => { // العبرة تتمايل بهدوء
    dock.abra.position.y = Math.sin(t * 0.7) * 0.15;
    dock.abra.rotation.z = Math.sin(t * 0.5) * 0.03;
  });

  // نخيل: عند الضفة وبيت الشاي وأطراف الحي
  const palmSpots = [
    [28, 20], [14, 22], [-14, 22], [-30, 16], [27, 12],
    [-36, -10], [-32, -28], [34, -22], [16, -46], [-14, -52], [30, -40],
  ];
  for (const [px, pz] of palmSpots) {
    g.add(makePalm(px, pz));
    obstacles.push({ x: px, z: pz, r: 0.6 });
  }

  scene.add(g);
}
