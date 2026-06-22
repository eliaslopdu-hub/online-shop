"""
Parametric 3D model of the UDARABALI tuning fork  —  v4 (premium).
Upgrades over v3 (same dimensions / silhouette / volume):
  * real CHAMFERED edges (front/back) + softly ROUNDED vertical corners
    -> every edge catches a highlight line instead of reading razor-sharp CG
  * smoothly LOFTED foot: round stem morphs into the flat rectangular blade
    (a forged/swaged transition, not a glued boolean collar)
  * higher resolution on all curved areas
  * "UDARABALI" engraved on the yoke front
  * UV-ready, exported as GLB (material/anisotropy/textures added downstream)

Vertical axis = +Y.  Units: mm, scaled to metres on export.
"""
import numpy as np
import trimesh
from functools import reduce
from trimesh.creation import extrude_polygon, triangulate_polygon
from shapely.geometry import Polygon, box
from shapely.geometry.polygon import orient
from shapely import affinity

# ---- dimensions (mm) — UNCHANGED from v3 -----------------------------
WP, WS, DEPTH = 8.5, 7.5, 7.5
HALF_OUT, INNER = WP + WS/2, WS/2
Y_TOP, Y_SLOTBOT, Y_SH_TOP, Y_SH_BOT = 150.0, 25.0, 14.0, 7.0
X_STEM, STEM_R = 4.0, 3.9
STEM_TOP, STEM_BOT = 9.0, -27.0
BLADE_W, BLADE_D, BLADE_TOP, BLADE_LEN = 8.0, 4.2, -25.0, 14.0
BLADE_BOT = -39.0
CHAMFER, CORNER_R = 0.38, 0.5          # edge break + rounded vertical corners

# ---- helpers ---------------------------------------------------------
def resample(poly, N):
    ext = np.asarray(poly.exterior.coords)[:-1]
    loop = np.vstack([ext, ext[0]])
    seg = np.linalg.norm(np.diff(loop, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)]); total = cum[-1]
    out, j = [], 0
    for t in np.linspace(0, total, N, endpoint=False):
        while cum[j+1] < t:
            j += 1
        f = (t - cum[j]) / (cum[j+1] - cum[j] + 1e-12)
        out.append(ext[j]*(1-f) + ext[(j+1) % len(ext)]*f)
    return np.asarray(out)

def inward_normals(ring):
    nxt = np.roll(ring, -1, 0); prv = np.roll(ring, 1, 0)
    tang = nxt - prv
    nrm = np.stack([tang[:, 1], -tang[:, 0]], 1)
    nrm /= (np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12)
    c = ring.mean(0)
    flip = ((c - ring) * nrm).sum(1) < 0          # make it point inward
    nrm[flip] *= -1
    return nrm

def band(va, vb):
    """quad strip between two equal-length closed vertex rings (index arrays)."""
    N = len(va); f = []
    for i in range(N):
        a0, a1 = va[i], va[(i+1) % N]; b0, b1 = vb[i], vb[(i+1) % N]
        f += [[a0, b0, b1], [a0, b1, a1]]
    return f

# ---- 1) front silhouette (prongs + slot + chamfered yoke) ------------
pts = [(-HALF_OUT, Y_TOP), (-INNER, Y_TOP), (-INNER, Y_SLOTBOT)]
for th in np.linspace(np.pi, 2*np.pi, 72)[1:-1]:
    pts.append((INNER*np.cos(th), Y_SLOTBOT + INNER*np.sin(th)))
pts += [(INNER, Y_SLOTBOT), (INNER, Y_TOP), (HALF_OUT, Y_TOP),
        (HALF_OUT, Y_SH_TOP), (X_STEM, Y_SH_BOT),
        (-X_STEM, Y_SH_BOT), (-HALF_OUT, Y_SH_TOP)]
profile = orient(Polygon(pts), 1.0)
profile = profile.buffer(CORNER_R, join_style=1).buffer(-CORNER_R, join_style=1)  # round convex corners

# ---- 2) flat body with a 2-SEGMENT ROUNDED front/back edge -----------
N = 460
outer = resample(orient(profile, 1.0), N)
nin = inward_normals(outer)
zf, zb = DEPTH/2, -DEPTH/2
BR, SEG = CHAMFER, 2                       # rounded-edge radius + segments (quarter-round)
V, F = [], []
def add(ring2d, z):
    base = len(V)
    V.extend([[p[0], p[1], z] for p in ring2d])
    return np.arange(base, base+len(ring2d))
def off(s):                               # inset the outer profile inward by s
    return outer - nin*s
front, back = [], []                      # rings sweeping the quarter-round
for k in range(SEG+1):
    th = np.pi - (np.pi/2)*(k/SEG)        # 180deg -> 90deg
    s = BR + BR*np.cos(th)                # inward offset: 0 -> BR
    front.append(add(off(s), (zf-BR) + BR*np.sin(th)))   # z: zf-BR -> zf
    back.append(add(off(s), (zb+BR) - BR*np.sin(th)))    # z: zb+BR -> zb
F += band(back[0], front[0])              # straight side wall (s=0)
for k in range(SEG):
    F += band(front[k], front[k+1])       # front rounded bevel (2 facets)
    F += band(back[k+1], back[k])         # back rounded bevel
inner = off(BR)                           # inset cap outline
cv, cf = triangulate_polygon(Polygon(inner), engine='earcut')
fb = len(V); V.extend([[p[0], p[1], zf] for p in cv]); F += (cf+fb).tolist()      # front cap
bb = len(V); V.extend([[p[0], p[1], zb] for p in cv]); F += (cf[:, ::-1]+bb).tolist()  # back cap
body = trimesh.Trimesh(np.asarray(V, float), np.asarray(F, int), process=True)
body.fix_normals()

# ---- 3) lofted stem -> flat blade foot -------------------------------
M = 112
ang = np.linspace(0, 2*np.pi, M, endpoint=False)
circ = np.stack([np.cos(ang), np.sin(ang)], 1)
def rrect_ray(a, w, d, r):                          # rounded-rect radius along angle a
    out = []
    for t in a:
        dx, dy = np.cos(t), np.sin(t)
        s = min((w/2)/ (abs(dx)+1e-9), (d/2)/(abs(dy)+1e-9))
        p = np.array([dx, dy])*s
        p = np.clip(p, [-(w/2-r), -(d/2-r)], [w/2-r, d/2-r]) + \
            np.array([dx, dy])*0  # base
        out.append([dx*s, dy*s])
    pr = np.asarray(out)
    # round corners by pulling toward an inset rounded-rect
    return pr
def section(y):
    if y >= -25:               # round stem
        return circ*STEM_R
    t = np.clip((-25 - y)/8.0, 0, 1); t = t*t*(3-2*t)        # smoothstep flatten
    # rounded-rectangle blade via a superellipse (n=4) -> soft corners, no sharp lip
    a, b, n = BLADE_W/2, BLADE_D/2, 4.0
    se = []
    for aa in ang:
        c, s = abs(np.cos(aa)), abs(np.sin(aa))
        rad = 1.0/(((c/a)**n + (s/b)**n)**(1.0/n))
        se.append([np.cos(aa)*rad, np.sin(aa)*rad])
    se = np.asarray(se)
    return circ*STEM_R*(1-t) + se*t
C_FOOT = 0.45                                    # bottom-rim edge break
ys = np.concatenate([np.linspace(STEM_TOP, -25, 40),
                     np.linspace(-25, -33, 44)[1:],
                     np.linspace(-33, BLADE_BOT + C_FOOT, 22)[1:]])
Vs, Fs, rings = [], [], []
for y in ys:
    sec = section(y); base = len(Vs)
    Vs.extend([[p[0], y, p[1]] for p in sec]); rings.append(np.arange(base, base+M))
for k in range(len(rings)-1):
    Fs += band(rings[k+1], rings[k])
# caps
tb = len(Vs); Vs.append([0, ys[0], 0])
for i in range(M):
    Fs.append([rings[0][i], rings[0][(i+1) % M], tb])
# chamfered bottom rim: bevel from the last side ring (y_b+C) inward to the
# inset bottom face at y_b, then fan-cap — no razor tip
sec_b = section(ys[-1]); nin_b = inward_normals(sec_b); cham = sec_b - nin_b*C_FOOT
base_c = len(Vs); Vs.extend([[p[0], BLADE_BOT, p[1]] for p in cham]); cring = np.arange(base_c, base_c+M)
Fs += band(cring, rings[-1])
bb2 = len(Vs); Vs.append([0, BLADE_BOT, 0])
for i in range(M):
    Fs.append([cring[(i+1) % M], cring[i], bb2])
stem = trimesh.Trimesh(np.asarray(Vs, float), np.asarray(Fs, int), process=True)
stem.fix_normals()

# ---- 4) union --------------------------------------------------------
solid = trimesh.boolean.union([body, stem], engine='manifold')

# ---- 5) engraving ----------------------------------------------------
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties
fp = FontProperties(family='DejaVu Sans', weight='bold')
tp = TextPath((0, 0), "UDARABALI", size=10, prop=fp)
glyphs = [Polygon(c).buffer(0) for c in tp.to_polygons() if len(c) >= 3]
text2d = reduce(lambda a, b: a.symmetric_difference(b), glyphs)
mnx, mny, mxx, mxy = text2d.bounds
text2d = affinity.translate(text2d, -(mnx+mxx)/2, -(mny+mxy)/2)
sc = 2.3/(mxy-mny)                          # slightly larger cap height
if (mxx-mnx)*sc > 16:
    sc = 16/(mxx-mnx)
text2d = affinity.scale(text2d, sc, sc, origin=(0, 0))
text2d = text2d.buffer(0.06)                # embolden the strokes a touch
geoms = list(text2d.geoms) if text2d.geom_type == 'MultiPolygon' else [text2d]
stamp = trimesh.util.concatenate([extrude_polygon(g, height=1.4) for g in geoms if g.area > 0])
stamp.apply_translation([0, 18.0, DEPTH/2 - 0.55])   # deeper recess -> reads clearly
solid = trimesh.boolean.difference([solid, stamp], engine='manifold')
solid.merge_vertices(); solid.fix_normals()

# ---- 6) material (placeholder; textures applied downstream) ----------
solid.visual = trimesh.visual.TextureVisuals(
    material=trimesh.visual.material.PBRMaterial(
        name='BrushedAluminium', baseColorFactor=[214, 216, 221, 255],
        metallicFactor=1.0, roughnessFactor=0.30))

# ---- 7) orient & scale ----------------------------------------------
solid.apply_translation([0, -BLADE_BOT, 0]); solid.apply_scale(0.001)
print('watertight:', solid.is_watertight, '| verts:', len(solid.vertices),
      '| faces:', len(solid.faces), '| height(m): %.3f' % solid.extents[1])
solid.export('udara_tuning_fork.glb'); solid.export('udara_tuning_fork.stl')
print('exported geometry v4')
