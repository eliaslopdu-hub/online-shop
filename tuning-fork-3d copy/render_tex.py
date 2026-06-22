"""Texture-AWARE diagnostic render of udara_fork_textured.glb.
Samples the GLB's roughness + normal + AO + base maps via UVs so we can SEE
exactly what the web/model-viewer surface looks like (seams, normal artifacts).
"""
import numpy as np, trimesh
from trimesh.ray.ray_pyembree import RayMeshIntersector
from PIL import Image

np.random.seed(7)
M = trimesh.load('udara_fork_textured.glb', force='mesh')
RI = RayMeshIntersector(M)
FN = M.face_normals
UVv = np.asarray(M.visual.uv)
mat = M.visual.material
def teximg(t):
    return np.asarray(t.convert('RGB'), float)/255.0 if t is not None else None
ROUGH = teximg(mat.metallicRoughnessTexture)   # G = roughness
NRM = teximg(mat.normalTexture)
BASE = teximg(mat.baseColorTexture)
AOt = teximg(mat.occlusionTexture)
Hh, Ww = ROUGH.shape[:2]

def sample(img, uv):
    u = np.clip(uv[:, 0], 0, 1)*(Ww-1); v = np.clip(1-uv[:, 1], 0, 1)*(Hh-1)
    return img[v.astype(int), u.astype(int)]

SUN = np.array([-0.40, 0.62, 0.68]); SUN /= np.linalg.norm(SUN)
KEY = SUN; FILL = np.array([0.55, 0.25, -0.55]); FILL /= np.linalg.norm(FILL)
F0 = np.array([0.82, 0.83, 0.85]); UP = np.array([0.0, 1.0, 0.0])
def nz(a): return a/(np.linalg.norm(a, axis=-1, keepdims=True)+1e-9)
def env(d):
    y = d[..., 1]; t = np.clip(y*.5+.5, 0, 1)[..., None]
    sky = np.array([.72, .70, .66])*(1-t)+np.array([.40, .46, .60])*t
    col = np.where((y < 0)[..., None], np.array([.12, .11, .10])+0*sky, sky)
    ck = np.clip((d*KEY).sum(-1), -1, 1)[..., None]
    col = col+np.clip((ck-.55)/.45, 0, 1)**3*np.array([1.15, 1.08, .98])*3.2
    cf = np.clip((d*FILL).sum(-1), -1, 1)[..., None]
    col = col+np.clip((cf-.6)/.4, 0, 1)**2*np.array([.50, .58, .72])*.7
    cs = np.clip((d*SUN).sum(-1), -1, 1); disc = np.cos(np.radians(2.4))
    col = col+(np.clip((cs-disc)/(1-disc), 0, 1)[..., None]**1.3)*np.array([1, .93, .8])*85
    return col
def aces(x):
    return np.clip((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0, 1)

# per-face tangent from UV
tris = M.vertices[M.faces]; uvt = UVv[M.faces]
e1 = tris[:, 1]-tris[:, 0]; e2 = tris[:, 2]-tris[:, 0]
du1 = uvt[:, 1]-uvt[:, 0]; du2 = uvt[:, 2]-uvt[:, 0]
den = (du1[:, 0]*du2[:, 1]-du2[:, 0]*du1[:, 1])
den = np.where(np.abs(den) < 1e-9, 1e-9, den)
TAN = nz((e1*du2[:, 1:2]-e2*du1[:, 1:2])/den[:, None])

W, H, ss, fov = 820, 1140, 2, 25
center = np.array([0, .092, 0]); az, el, dist = 28, 8, .52
Wf, Hf = W*ss, H*ss
a, e = np.radians(az), np.radians(el)
eye = center+dist*np.array([np.cos(e)*np.sin(a), np.sin(e), np.cos(e)*np.cos(a)])
fwd = nz(center-eye); right = nz(np.cross(fwd, UP)); up = np.cross(right, fwd)
yy, xx = np.mgrid[0:Hf, 0:Wf]
px = ((xx+.5)/Wf*2-1)*np.tan(np.radians(fov)/2)*(Wf/Hf)
py = (1-(yy+.5)/Hf*2)*np.tan(np.radians(fov)/2)
D = nz(fwd[None, None]+px[..., None]*right[None, None]+py[..., None]*up[None, None]).reshape(-1, 3)
N = len(D); O = np.tile(eye, (N, 1)); img = np.zeros((N, 3))

loc, idr, idt = RI.intersects_location(O, D, multiple_hits=False)
if len(idr):
    d = np.linalg.norm(loc-eye, axis=1); order = np.argsort(d)[::-1]
    t_fork = np.full(N, np.inf); P = np.zeros((N, 3)); TRI = np.zeros(N, int); hit = np.zeros(N, bool)
    BC = np.zeros((N, 3))
    for j in order:
        r = idr[j]; t_fork[r] = d[j]; P[r] = loc[j]; TRI[r] = idt[j]; hit[r] = True
    Hh_i = np.where(hit)[0]; tri = TRI[Hh_i]; p = P[Hh_i]
    v0 = M.vertices[M.faces[tri, 0]]; v1 = M.vertices[M.faces[tri, 1]]; v2 = M.vertices[M.faces[tri, 2]]
    d00 = v1-v0; d01 = v2-v0; d0p = p-v0
    a00 = (d00*d00).sum(1); a01 = (d00*d01).sum(1); a11 = (d01*d01).sum(1)
    a20 = (d0p*d00).sum(1); a21 = (d0p*d01).sum(1)
    den2 = a00*a11-a01*a01+1e-12
    vv = (a11*a20-a01*a21)/den2; ww = (a00*a21-a01*a20)/den2; uu = 1-vv-ww
    uv = (uvt := UVv[M.faces[tri]])[:, 0]*uu[:, None]+uvt[:, 1]*vv[:, None]+uvt[:, 2]*ww[:, None]
    rough = sample(ROUGH, uv)[:, 1]
    base = sample(BASE, uv); ao = sample(AOt, uv)[:, 0]
    n = FN[tri]; v = nz(eye-p); n = n*np.sign((n*v).sum(-1, keepdims=True))
    if NRM is not None:
        nts = sample(NRM, uv)*2-1
        T = TAN[tri]; T = nz(T-n*(T*n).sum(-1, keepdims=True)); B = np.cross(n, T)
        nrm = nz(T*nts[:, 0:1]+B*nts[:, 1:2]+n*nts[:, 2:3])
    else:
        nrm = n
    r = nz(2*(nrm*v).sum(-1, keepdims=True)*nrm-v)
    bt = UP-nrm*(nrm*UP).sum(-1, keepdims=True)
    bad = np.linalg.norm(bt, axis=1) < 1e-3
    bt[bad] = np.array([1.0, 0, 0])-nrm[bad]*(nrm[bad]*np.array([1.0, 0, 0])).sum(-1, keepdims=True)
    bt = nz(bt); ax = nz(np.cross(nrm, bt))
    acc = np.zeros((len(Hh_i), 3)); Kr = 40
    spread = (0.10+rough*0.9)[:, None]
    for _ in range(Kr):
        g1 = np.random.randn(len(Hh_i), 1); g2 = np.random.randn(len(Hh_i), 1)
        rd = nz(r+bt*(spread*g1)+ax*(0.18*spread*g2))
        acc += env(rd)
    refl = acc/Kr
    fres = F0+(1-F0)*np.clip(1-(nrm*v).sum(-1, keepdims=True), 0, 1)**5
    col = refl*fres*base/np.maximum(base.mean(), 0.5)*0.9
    col *= (0.3+0.7*ao)[:, None]
    img[Hh_i] = col*0.62
# floor + bg (simple)
dy = D[:, 1]; tf = np.where(dy < -1e-6, -eye[1]/dy, np.inf)
fp = eye+D*tf[:, None]
fok = (tf < t_fork) & np.isfinite(tf) & (np.abs(fp[:, 0]) < .6) & (np.abs(fp[:, 2]) < .6)
Fi = np.where(fok & ~hit)[0]
if len(Fi):
    sh = np.zeros(len(Fi))
    for _ in range(8):
        js = nz(SUN+np.random.randn(len(Fi), 3)*.03); sh += RI.intersects_any(fp[Fi]+[0, 1e-4, 0], js)
    sh /= 8
    fade = np.clip(1-np.linalg.norm(fp[Fi][:, [0, 2]], axis=1)/.45, 0, 1)[:, None]
    img[Fi] = (np.array([.86, .86, .88])*(0.45+0.55*(1-sh)[:, None]))*fade+np.array([.93, .92, .91])*(1-fade)
Bi = np.where(~hit & ~fok)[0]
img[Bi] = np.array([.82, .83, .86])+(np.array([.95, .94, .93])-np.array([.82, .83, .86]))*((Bi//Wf)/Hf)[:, None]
out = (aces(img.reshape(Hf, Wf, 3))**(1/2.2)*255).astype(np.uint8)
Image.fromarray(out).resize((W, H), Image.LANCZOS).save('render_textured_check.png')
print('wrote render_textured_check.png')
