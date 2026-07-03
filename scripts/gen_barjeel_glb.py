"""Generate a stylized Al Fahidi barjeel (wind tower) as a .glb for Mattercraft/R3F.

All boxes — a square coral-stone tower with gold wind-catcher fins on each face,
a crenellated crown, stepped base, and a small flag. Y-up, ~3 units tall,
centred on origin at the base (sits on the ground / image target).

Run:  pip install trimesh scipy  &&  python scripts/gen_barjeel_glb.py
Output: apps/web/public/ar/alfahidi-barjeel.glb  (import into Mattercraft or R3F).
"""

import numpy as np
import trimesh

SAND = [232, 220, 200, 255]
SAND_DARK = [200, 186, 162, 255]
GOLD = [201, 162, 39, 255]
NIGHT = [24, 28, 40, 255]

parts: list[trimesh.Trimesh] = []


def box(w, h, d, cx, cy, cz, color):
    m = trimesh.creation.box(extents=[w, h, d])
    m.apply_translation([cx, cy, cz])
    m.visual.face_colors = color
    parts.append(m)
    return m


# --- stepped base ---
box(1.5, 0.14, 1.5, 0, 0.07, 0, SAND_DARK)
box(1.3, 0.12, 1.3, 0, 0.20, 0, SAND)

# --- main body ---
BODY_W = 1.0
BODY_H = 1.9
body_cy = 0.26 + BODY_H / 2
box(BODY_W, BODY_H, BODY_W, 0, body_cy, 0, SAND)

# --- wind-catcher fins: 3 raised gold strips on each of the 4 faces ---
fin_w, fin_h, fin_t = 0.12, 1.5, 0.04
offs = [-0.28, 0.0, 0.28]
face = BODY_W / 2 + fin_t / 2
for o in offs:
    box(fin_w, fin_h, fin_t, o, body_cy, face, GOLD)   # front (+z)
    box(fin_w, fin_h, fin_t, o, body_cy, -face, GOLD)  # back (-z)
    box(fin_t, fin_h, fin_w, face, body_cy, o, GOLD)   # right (+x)
    box(fin_t, fin_h, fin_w, -face, body_cy, o, GOLD)  # left (-x)

# --- crenellated crown: merlons around the top rim + a lintel ---
crown_y = 0.26 + BODY_H
box(1.12, 0.14, 1.12, 0, crown_y + 0.07, 0, GOLD)  # lintel
mer = 0.18
for sx in (-0.42, -0.14, 0.14, 0.42):
    box(mer, 0.20, mer, sx, crown_y + 0.24, 0.47, GOLD)
    box(mer, 0.20, mer, sx, crown_y + 0.24, -0.47, GOLD)
for sz in (-0.42, -0.14, 0.14, 0.42):
    box(mer, 0.20, mer, 0.47, crown_y + 0.24, sz, GOLD)
    box(mer, 0.20, mer, -0.47, crown_y + 0.24, sz, GOLD)

# --- open shaft top (dark inset so it reads as a hollow wind tower) ---
box(0.7, 0.06, 0.7, 0, crown_y + 0.02, 0, NIGHT)

# --- flag pole + pennant ---
pole_y = crown_y + 0.34
box(0.03, 0.5, 0.03, 0, pole_y + 0.25, 0, SAND_DARK)
flag = trimesh.creation.box(extents=[0.02, 0.16, 0.26])
flag.apply_translation([0, pole_y + 0.42, 0.14])
flag.visual.face_colors = GOLD
parts.append(flag)

scene = trimesh.util.concatenate(parts)
# Mattercraft/three use metres + Y-up; the model is ~2.6 units tall. Keep as-is
# (creators scale on import). Export self-contained binary glTF.
out = "apps/web/public/ar/alfahidi-barjeel.glb"
scene.export(out)
print("bounds:", np.round(scene.bounds, 3).tolist())
print("verts:", len(scene.vertices), "faces:", len(scene.faces))
print("saved:", out)
