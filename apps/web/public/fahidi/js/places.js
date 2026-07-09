// places.js — أربعة أماكن حقيقية من حي الفهيدي، برواة منصة «الإمارات حيّة»
// كل مكان يحمل slug حقيقيًا من خريطة المنصة (/ar/map?poi=...)
import * as THREE from 'three';
import { groundHeight } from './world.js';

export const PLACES = [
  {
    id: 'wind-tower-house',
    name: 'بيت البراجيل',
    title: 'رسالة أم راشد',
    body: 'يا وليدي، البرجيل ما كان برجًا من طين؛ كان يدًا تمسح عن جباهنا حرَّ الصيف. كنّا ننام على السطح، والنجومُ قناديلُ لا تنطفئ، وصوتُ الخور يهدهدنا كما تهدهد الأمهاتُ صغارَها. إذا ضاقت بك الدنيا يومًا، افتح للهواء بابًا يدخل منه؛ فالبيتُ الذي يتنفّس لا يشيخ قلبُه، والصدرُ الذي يسامح لا يضيق.',
    sign: '— أم راشد، من سطح بيت البراجيل',
    link: '/ar/map?poi=wind-tower-house',
    pos: new THREE.Vector3(-19, 0, -2),
  },
  {
    id: 'heritage-sikka',
    name: 'السكة التراثية',
    title: 'رسالة عبدالرحمن التاجر',
    body: 'في هذه السكّة بعتُ الحريرَ والقطن، وفتحتُ صناديقَ الهيل والزعفران، واشتريتُ حكاياتٍ من كل مرفأ. جاءنا الناسُ من الهند وزنجبار وفارس، فما سألنا أحدًا من أين جئت، بل قلنا: تفضّل، القهوة حارّة. الفانوسُ يا ولدي لا يسأل الغريبَ عن اسمه؛ يضيء له الطريقَ وكفى. كن كفوانيس سكّتنا: دفئًا للعابرين، وعتبةً لا تُغلق.',
    sign: '— عبدالرحمن التاجر، من ظلّ مظلّة السكة',
    link: '/ar/map?poi=heritage-sikka',
    pos: new THREE.Vector3(0, 0, -30),
  },
  {
    id: 'creek-edge',
    name: 'ضفة الخور',
    title: 'رسالة سالم الغوّاص',
    body: 'علّمني الغوصُ أن النَّفَسَ الطويل صلاة، وأن أثمنَ ما في البحر لا يُرى من السطح. نزلتُ حيث الظلمةُ تعصر الصدر، وصعدتُ وفي كفّي قمرٌ صغير اسمه اللؤلؤ. من هذه الضفة ودّعتُ أمي، وإليها عدتُ كلَّ موسم. يا ولدي، اصبر على العتمة مهما طالت؛ فبعضُ الظلام محارةٌ مقفلة، لو فتحتَها بهدوء المؤمنِ وجدتَ فيها ضوءَك الذي تبحث عنه.',
    sign: '— سالم الغوّاص، عند ضفة الخور',
    link: '/ar/map?poi=creek-edge',
    pos: new THREE.Vector3(8, 0, 22),
  },
  {
    id: 'arabian-tea-house',
    name: 'مجلس بيت الشاي',
    title: 'رسالة أسطى حسن البنّاء',
    body: 'بنينا هذا الفريجَ من مرجان البحر وجصِّ البرّ وسعف النخيل — ما كان معنا إسمنتٌ ولا حديد، كان معنا الصبرُ وحكمةُ من سبقونا. إذا مررتَ بسكّةٍ ضيّقة فاعلم أنّا ضيّقناها عمدًا: ليمرَّ الظلُّ قبل الناس، وليبقى الهواءُ باردًا بين البيوت. يا ولدي، البيوتُ مثل الناس؛ لا تقوم على الحجر وحده، بل على النيّة. ابنِ ما ينفع الناسَ، يذكرْك الظلُّ كلَّ ظهيرة.',
    sign: '— أسطى حسن، من فناء بيت الشاي',
    link: '/ar/map?poi=arabian-tea-house',
    pos: new THREE.Vector3(20, 0, 8),
  },
];

const NEAR_RADIUS = 5.5;    // مسافة إظهار زر القراءة
const NAME_RADIUS = 12;     // مسافة إظهار اسم المكان

export function createPlaces(world) {
  const { scene, animations } = world;
  const markers = [];

  for (const place of PLACES) {
    const g = new THREE.Group();
    const baseY = groundHeight(place.pos.x, place.pos.z);

    // حلقة على الأرض
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.06, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#e8a15c', transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    g.add(ring);

    // عمود نور صاعد
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.1, 10, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#f0b46a', transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    beam.position.y = 5;
    g.add(beam);

    // جمرة النور العائمة (الرسالة نفسها)
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({ color: '#5c4425', emissive: '#f0b46a', emissiveIntensity: 2.4 })
    );
    orb.position.y = 2.1;
    g.add(orb);

    const glow = new THREE.PointLight('#f0b46a', 9, 14, 1.8);
    glow.position.y = 2.1;
    g.add(glow);

    g.position.set(place.pos.x, baseY, place.pos.z);
    scene.add(g);

    markers.push({ place, group: g, ring, beam, orb, glow, collected: false, seed: Math.random() * 10 });
  }

  animations.push((t) => {
    for (const m of markers) {
      m.ring.rotation.z = t * 0.4 + m.seed;
      m.orb.position.y = 2.1 + Math.sin(t * 1.3 + m.seed) * 0.3;
      m.orb.rotation.y = t * 0.8;
      if (!m.collected) {
        const pulse = 0.75 + Math.sin(t * 2 + m.seed) * 0.25;
        m.beam.material.opacity = 0.13 * pulse;
        m.glow.intensity = 9 * pulse;
      }
    }
  });

  // ── فحص الاقتراب كل إطار — يُرجع أقرب مكان ──
  function nearest(playerPos) {
    let best = null, bestD = Infinity;
    for (const m of markers) {
      const d = Math.hypot(playerPos.x - m.group.position.x, playerPos.z - m.group.position.z);
      if (d < bestD) { bestD = d; best = m; }
    }
    return {
      marker: best,
      canRead: best && !best.collected && bestD < NEAR_RADIUS,
      showName: best && bestD < NAME_RADIUS,
    };
  }

  // ── عند جمع رسالة: تهدأ العلامة وتتحول لؤلؤية ──
  function collect(marker) {
    marker.collected = true;
    marker.beam.material.opacity = 0.04;
    marker.orb.material.emissive.set('#f3ead8');
    marker.orb.material.emissiveIntensity = 0.35;
    marker.orb.scale.setScalar(0.65);
    marker.glow.color.set('#f3ead8');
    marker.glow.intensity = 3;
    marker.ring.material.opacity = 0.3;
  }

  return { markers, nearest, collect };
}
