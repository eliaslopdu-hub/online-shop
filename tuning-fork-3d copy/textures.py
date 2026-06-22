"""
Material pipeline for the UDARABALI fork — v2 (CLEAN / subtle).
Lesson learned: heavy procedural normal + brushed roughness maps + UV seams made
the metal look scratched and dirty. Real brushed aluminium reads CLEAN; its
"brushed" character is best delivered by material ANISOTROPY (in three.js),
not by stamping coarse grooves into a normal map across seamful UV islands.

So this version bakes ONLY what genuinely helps and is seam-safe:
  * a gentle, smooth, well-dilated ambient-occlusion map (darkens slot/crevices)
  * a near-uniform roughness with a whisper of fine variation
  * a clean uniform base colour
  * NO normal map (anisotropy + lighting carry the brushed look cleanly)
Writes udara_fork_textured.glb (web-ready).
"""
import numpy as np, trimesh, xatlas
from trimesh.ray.ray_pyembree import RayMeshIntersector
from PIL import Image
from scipy.ndimage import gaussian_filter, grey_dilation

np.random.seed(11)
RES = 1024
SRC = trimesh.load('udara_tuning_fork.glb', force='mesh')

# ---- 1) UV unwrap ----------------------------------------------------
vmap, faces, uvs = xatlas.parametrize(SRC.vertices, SRC.faces)
V = SRC.vertices[vmap]; F = faces.astype(int); UV = uvs.astype(float)
mesh = trimesh.Trimesh(V, F, process=False)
N = mesh.vertex_normals
print('unwrapped verts', len(V))

# ---- 2) per-vertex ambient occlusion --------------------------------
RI = RayMeshIntersector(SRC)
def ao_vertices(P, Nrm, nray=48):
    ao = np.zeros(len(P))
    for _ in range(nray):
        s = np.random.randn(len(P), 3); s /= np.linalg.norm(s, axis=1, keepdims=True)
        s *= np.sign((s*Nrm).sum(1, keepdims=True))
        ao += RI.intersects_any(P + Nrm*3e-4 + s*1e-5, s).astype(float)
    return ao/nray
AO = ao_vertices(V, N)
print('AO mean=%.2f' % AO.mean())

# ---- 3) rasterise AO into the atlas ----------------------------------
ao_img = np.zeros((RES, RES)); mask = np.zeros((RES, RES), bool)
uvpx = UV*np.array([RES-1, RES-1])
for tri in F:
    p = uvpx[tri]; a = AO[tri]
    x0, y0 = np.floor(p.min(0)).astype(int); x1, y1 = np.ceil(p.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, RES-1), min(y1, RES-1)
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1+1), np.arange(y0, y1+1))
    px = np.stack([xs.ravel(), ys.ravel()], 1).astype(float)
    d = p[1]-p[0]; e = p[2]-p[0]; den = d[0]*e[1]-d[1]*e[0]
    if abs(den) < 1e-9:
        continue
    rel = px-p[0]
    u = (rel[:, 0]*e[1]-rel[:, 1]*e[0])/den; v = (d[0]*rel[:, 1]-d[1]*rel[:, 0])/den
    inside = (u >= -0.002) & (v >= -0.002) & (u+v <= 1.002)
    if not inside.any():
        continue
    bc = np.stack([1-u-v, u, v], 1)[inside]
    ao_img[px[inside, 1].astype(int), px[inside, 0].astype(int)] = bc@a
    mask[px[inside, 1].astype(int), px[inside, 0].astype(int)] = True
print('coverage %.0f%%' % (100*mask.mean()))

# ---- 4) gentle, seam-safe maps ---------------------------------------
# occlusion: smooth, mild (1 = open).  Only crevices get a soft darken.
occ = np.clip(ao_img, 0, 1)
occ = 1.0 - 0.62*occ           # a touch deeper so slot + engraving recess read
occ = gaussian_filter(occ, 1.1)

# roughness: near-uniform satin with a whisper of fine variation
fine = gaussian_filter(np.random.randn(RES, RES), 2.0)
fine = fine/ (np.abs(fine).max()+1e-9)
rough = np.clip(0.30 + 0.025*fine, 0.24, 0.38)

# base colour: clean aluminium, all but uniform
base = np.ones((RES, RES, 3))*np.array([0.855, 0.862, 0.876])

# ---- 5) dilate across seams (generous) -------------------------------
def dilate(img, mask, it=14):
    img = img.copy(); m = mask.copy()
    for _ in range(it):
        if img.ndim == 2:
            d = grey_dilation(img, size=(3, 3)); img[~m] = d[~m]
        else:
            for c in range(img.shape[-1]):
                d = grey_dilation(img[..., c], size=(3, 3)); img[~m, c] = d[~m]
        m = grey_dilation(m.astype(np.uint8), size=(3, 3)).astype(bool)
    return img
occ_d = dilate(occ, mask); rough_d = dilate(rough, mask); base_d = dilate(base, mask)

def to_img(a): return Image.fromarray((np.clip(a, 0, 1)*255).astype(np.uint8))
# glTF metallic-roughness: G = roughness, B = metalness(1)
mr = np.stack([np.ones_like(rough_d), rough_d, np.ones_like(rough_d)], -1)
base_img = to_img(base_d); mr_img = to_img(mr); occ_img = to_img(np.stack([occ_d]*3, -1))
import os; os.makedirs('textures', exist_ok=True)
base_img.save('textures/tex_basecolor.png'); mr_img.save('textures/tex_mr.png'); occ_img.save('textures/tex_ao.png')
print('wrote clean texture set')

# ---- 6) export textured GLB (NO normal map) --------------------------
mat = trimesh.visual.material.PBRMaterial(
    name='BrushedAluminium',
    baseColorFactor=[255, 255, 255, 255], metallicFactor=1.0, roughnessFactor=1.0,
    baseColorTexture=base_img, metallicRoughnessTexture=mr_img, occlusionTexture=occ_img,
    doubleSided=False)
mesh.visual = trimesh.visual.TextureVisuals(uv=UV, material=mat)
mesh.export('udara_fork_textured.glb')
print('exported clean udara_fork_textured.glb')
