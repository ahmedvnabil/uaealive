# Al Fahidi WebAR in Mattercraft — build guide

A step-by-step recipe for an **image-tracked** WebAR experience (Zappar
[Mattercraft](https://zap.works/mattercraft/)) where pointing the phone at the
printed barjeel marker makes a 3D wind tower rise with floating POI labels.

> Mattercraft is a browser 3D editor; publishing is instant (no review). It
> signs in through a ZapWorks account — **you must log in yourself** (Claude
> cannot complete the OAuth sign-in). Project:
> `https://app.mattercraft.io/?state=5774339167407484582`

## Ready-made assets (in this repo)

| Asset | Path | Use |
|---|---|---|
| **Barjeel 3D model** | `apps/web/public/ar/alfahidi-barjeel.glb` | The anchored 3D object (10 KB, 280 verts, Y-up, ~3 units tall) |
| **Tracking target** | `apps/web/public/markers/alfahidi-marker.png` | The ImageTracker target image (1024², high-contrast, feature-rich) |
| **District panorama** | `apps/web/public/images/district-panorama.jpg` | Optional skybox / backdrop |
| POI data (labels) | `data/pois.json` | 17 POIs with bilingual names + coords for label text |

Regenerate the model with `python scripts/gen_barjeel_glb.py` (needs `trimesh scipy`).

## Steps in Mattercraft

1. **Open the project** and create a new scene (or open the existing one).
2. **Add the Zappar Camera.** In the Hierarchy, `+` → *AR* → **Zappar Camera**
   (this replaces the default camera and feeds the device camera).
   Ref: [Zappar Camera docs](https://docs.zap.works/mattercraft/augmented-reality/zappar-camera/).
3. **Add an ImageTracker.** `+` on a Group node → *AR* → **ImageTracker**.
   In its properties, upload `alfahidi-marker.png` as the **target image**.
   Ref: [Image Tracking docs](https://docs.zap.works/mattercraft/augmented-reality/image-tracking/).
4. **Import the barjeel model.** Drag `alfahidi-barjeel.glb` into the project
   media, then make it a **child of the ImageTracker** so it anchors to the
   marker. Position at origin, rotate so it stands up out of the marker plane
   (the model is Y-up; the tracker plane is typically X/Z — rotate -90° on X if
   it lies flat). Scale to taste (start ~0.3–0.5).
5. **Add a reveal animation** (optional, on-tracker-found): scale the model
   0 → 1 over ~0.6s with an ease, so it "grows" when the marker is seen.
6. **Floating POI labels** (optional): add Text nodes as children of the tracker
   for a few nearby POIs (names from `data/pois.json`, e.g. «متحف القهوة» /
   Coffee Museum). Billboard them toward the camera. Keep it to 3–5 labels.
7. **Preview** with the in-editor Zappar preview (or scan the QR with a phone).
8. **Publish** — hit Publish; Mattercraft gives a WebAR URL + QR instantly.

## Print & tips

- Print `alfahidi-marker.png` at a decent size (A5+), matte paper, flat and
  well-lit — see [image-tracking best practices](https://docs.zap.works/mattercraft/augmented-reality/image-tracking/best-practices/).
- The marker is deliberately high-contrast and asymmetric for robust tracking.
- Keep the total scene light for mobile: the barjeel is low-poly on purpose.

## Relationship to the in-app AR

The app already ships a no-login WebAR fallback at `/ar-experience` (MindAR
marker tracking + magic-window + desktop simulator). This Mattercraft build is
the **premium, published** path; the same `alfahidi-barjeel.glb` can also be
dropped into the app's React-Three-Fiber scenes (`/twin`, `/ar-experience`) for
a consistent wind-tower asset across both.
