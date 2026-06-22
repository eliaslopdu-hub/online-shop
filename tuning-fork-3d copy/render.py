"""
Offline reflection renderer for the UDARABALI tuning fork.
Directional 'sun' + studio sky, anisotropic brushed-metal reflections,
ambient occlusion in the crevices, soft contact shadow on a studio floor.
Pure numpy + Embree (via trimesh) ray queries.  Outputs PNG hero renders.
"""
import numpy as np, trimesh
from trimesh.ray.ray_pyembree import RayMeshIntersector
from scipy.ndimage import gaussian_filter
from PIL import Image

np.random.seed(7)
M = trimesh.load('udara_tuning_fork.glb', force='mesh')
RI = RayMeshIntersector(M)
FN = M.face_normals
VN = M.vertex_normals            # smooth (matches the exported GLB / three.js)
FACES = M.faces; VERTS = M.vertices

# ---- look / light ----------------------------------------------------
SUN  = np.array([-0.40, 0.62, 0.68]); SUN /= np.linalg.norm(SUN)   # sun in one direction
KEY  = SUN                                                         # key softbox = sun side
FILL = np.array([0.55, 0.25, -0.55]); FILL /= np.linalg.norm(FILL) # cool fill / rim
RIM  = np.array([0.30, 0.55, -1.0]);  RIM /= np.linalg.norm(RIM)   # cool back rim -> edge separation
F0   = np.array([0.82, 0.83, 0.85])                               # brushed-aluminium spec
UP   = np.array([0.0, 1.0, 0.0])

# ---- theme (cream studio = default; dark = luxe) ---------------------
SKY_SCALE  = 1.0
BG_TOP     = np.array([0.80, 0.81, 0.85]); BG_BOT  = np.array([0.95, 0.94, 0.93])
FLOOR_BASE = np.array([0.86, 0.86, 0.88]); FLOOR_BG = np.array([0.93, 0.92, 0.91])
def set_theme(name):
    global SKY_SCALE, BG_TOP, BG_BOT, FLOOR_BASE, FLOOR_BG
    if name == 'dark':
        SKY_SCALE = 0.34
        BG_TOP = np.array([0.045, 0.045, 0.055]); BG_BOT = np.array([0.115, 0.11, 0.105])
        FLOOR_BASE = np.array([0.11, 0.11, 0.12]); FLOOR_BG = np.array([0.05, 0.05, 0.055])
    else:
        SKY_SCALE = 1.0
        BG_TOP = np.array([0.80, 0.81, 0.85]); BG_BOT = np.array([0.95, 0.94, 0.93])
        FLOOR_BASE = np.array([0.86, 0.86, 0.88]); FLOOR_BG = np.array([0.93, 0.92, 0.91])

def normalize(a):
    return a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-9)

EXPOSURE = 0.62

def env(d):
    """analytic HDR environment radiance for directions d (...,3)."""
    y = d[..., 1]
    t = np.clip(y * 0.5 + 0.5, 0, 1)[..., None]
    horizon = np.array([0.72, 0.70, 0.66]); zenith = np.array([0.40, 0.46, 0.60])
    sky = horizon * (1 - t) + zenith * t
    ground = np.array([0.12, 0.11, 0.10])              # dark floor -> dark reflections below
    col = np.where((y < 0)[..., None], ground + 0 * sky, sky) * SKY_SCALE
    # narrow bright key softbox (sunlit side) -> a long highlight streak, not a flood
    ck = np.clip((d * KEY).sum(-1), -1, 1)[..., None]
    col = col + np.clip((ck - 0.55) / 0.45, 0, 1) ** 3 * np.array([1.15, 1.08, 0.98]) * 3.2
    # cool fill / rim opposite (subtle)
    cf = np.clip((d * FILL).sum(-1), -1, 1)[..., None]
    col = col + np.clip((cf - 0.6) / 0.4, 0, 1) ** 2 * np.array([0.50, 0.58, 0.72]) * 0.7
    # cool back rim -> bright separation line on the far edges
    cr = np.clip((d * RIM).sum(-1), -1, 1)[..., None]
    col = col + np.clip((cr - 0.55) / 0.45, 0, 1) ** 2 * np.array([0.88, 0.94, 1.06]) * 1.5
    # crisp sun disc sparkle
    cs = np.clip((d * SUN).sum(-1), -1, 1)
    disc = np.cos(np.radians(2.4))
    sun = np.clip((cs - disc) / (1 - disc), 0, 1)[..., None] ** 1.3
    col = col + sun * np.array([1.0, 0.93, 0.80]) * 85.0
    return col

def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)

LUMA = np.array([0.2126, 0.7152, 0.0722])

def post(hdr):
    """Filmic finish: bloom -> ACES -> split-tone grade -> vignette -> grain."""
    # bloom: bleed the bright highlights (sun glint, hot edges)
    lum = hdr @ LUMA
    bright = hdr * np.clip((lum[..., None] - 0.85) / 0.6, 0, 1)
    bloom = np.zeros_like(hdr)
    for sig, wt in [(3, 0.5), (8, 0.35), (18, 0.22)]:
        for c in range(3):
            bloom[..., c] += gaussian_filter(bright[..., c], sig) * wt
    tm = aces(hdr + bloom * 0.55)
    # split-tone: cool shadows, warm highlights (subtle)
    l = (tm @ LUMA)[..., None]
    tm = np.clip(tm * (np.array([0.985, 1.0, 1.02]) * (1 - l) +
                       np.array([1.025, 1.005, 0.98]) * l), 0, 1)
    # global vignette
    H_, W_ = tm.shape[:2]
    yy, xx = np.mgrid[0:H_, 0:W_]
    r2 = (((xx / W_) - 0.5) * 1.1) ** 2 + (((yy / H_) - 0.45) * 1.05) ** 2
    tm *= np.clip(1 - 0.16 * r2, 0.82, 1.0)[..., None]
    # subtle clarity (unsharp) so beveled edges stay crisp under bloom
    blur = np.stack([gaussian_filter(tm[..., c], 1.1) for c in range(3)], -1)
    tm = np.clip(tm + 0.35 * (tm - blur), 0, 1)
    # fine film grain
    tm += (np.random.rand(H_, W_, 1) - 0.5) * 0.010
    return np.clip(tm, 0, 1) ** (1 / 2.2)

# ---- camera ----------------------------------------------------------
def camera(az, el, dist, center, W, H, fov):
    a, e = np.radians(az), np.radians(el)
    eye = center + dist * np.array([np.cos(e)*np.sin(a), np.sin(e), np.cos(e)*np.cos(a)])
    fwd = normalize(center - eye); right = normalize(np.cross(fwd, UP)); up = np.cross(right, fwd)
    yy, xx = np.mgrid[0:H, 0:W]
    px = (xx + 0.5) / W * 2 - 1; py = 1 - (yy + 0.5) / H * 2
    px *= np.tan(np.radians(fov)/2) * (W/H); py *= np.tan(np.radians(fov)/2)
    dirs = normalize(fwd[None,None,:] + px[...,None]*right[None,None,:] + py[...,None]*up[None,None,:])
    return eye, dirs.reshape(-1, 3)

def render(az, el, dist, center, W, H, fov, out, ss=2, Kr=44, Hao=20):
    Wf, Hf = W*ss, H*ss
    eye, D = camera(az, el, dist, center, Wf, Hf, fov)
    N = D.shape[0]; O = np.tile(eye, (N, 1))
    img = np.zeros((N, 3))

    # primary: fork
    loc, idr, idt = RI.intersects_location(O, D, multiple_hits=False)
    t_fork = np.full(N, np.inf); P = np.zeros((N,3)); TRI = np.zeros(N, int); hit = np.zeros(N, bool)
    if len(idr):
        d = np.linalg.norm(loc - eye, axis=1)
        order = np.argsort(d)                       # keep nearest per ray
        for j in order[::-1]:
            r = idr[j]; t_fork[r] = d[j]; P[r] = loc[j]; TRI[r] = idt[j]; hit[r] = True

    # primary: floor plane y=0
    dy = D[:,1]; t_floor = np.where(dy < -1e-6, -eye[1]/dy, np.inf)
    floor_pt = eye + D * t_floor[:,None]
    floor_ok = (t_floor < t_fork) & np.isfinite(t_floor) & (np.abs(floor_pt[:,0]) < 0.6) & (floor_pt[:,2] < 0.6) & (floor_pt[:,2] > -0.6)

    # ---- shade metal ----
    H_idx = np.where(hit)[0]
    if len(H_idx):
        p = P[H_idx]; v = normalize(eye - p)
        # smooth shading normal: barycentric blend of vertex normals
        tri = TRI[H_idx]; f = FACES[tri]
        v0, v1, v2 = VERTS[f[:,0]], VERTS[f[:,1]], VERTS[f[:,2]]
        d00 = v1-v0; d01 = v2-v0; d0p = p-v0
        a00=(d00*d00).sum(1); a01=(d00*d01).sum(1); a11=(d01*d01).sum(1)
        a20=(d0p*d00).sum(1); a21=(d0p*d01).sum(1); dn=a00*a11-a01*a01+1e-12
        bv=(a11*a20-a01*a21)/dn; bw=(a00*a21-a01*a20)/dn; bu=1-bv-bw
        sn = normalize(VN[f[:,0]]*bu[:,None] + VN[f[:,1]]*bv[:,None] + VN[f[:,2]]*bw[:,None])
        fn = FN[tri]
        # crease-aware: use smooth normal only where the surface is locally
        # coplanar (round stem/foot); keep FLAT shading at sharp edges/facets
        align = np.abs((sn*fn).sum(1, keepdims=True))
        w = np.clip((align-0.93)/0.05, 0, 1)
        n = normalize(fn*(1-w) + sn*w)
        n = n * np.sign((n*v).sum(-1, keepdims=True))         # face camera
        r = normalize(2*(n*v).sum(-1,keepdims=True)*n - v)
        # anisotropic tangent frame (brush along Y)
        bt = UP - n*(n*UP).sum(-1,keepdims=True)
        bad = np.linalg.norm(bt,axis=1) < 1e-3
        bt[bad] = np.array([1.0,0,0]) - n[bad]*(n[bad]*np.array([1.0,0,0])).sum(-1,keepdims=True)
        bt = normalize(bt); ax = normalize(np.cross(n, bt))
        acc = np.zeros((len(H_idx),3))
        for _ in range(Kr):
            g1 = np.random.randn(len(H_idx),1); g2 = np.random.randn(len(H_idx),1)
            rd = normalize(r + bt*(0.22*g1) + ax*(0.05*g2))   # brushed: streak along Y
            acc += env(rd)
        refl = acc / Kr
        fres = F0 + (1-F0)*np.clip(1-(n*v).sum(-1,keepdims=True),0,1)**5
        col = refl * fres
        # ambient occlusion
        ao = np.zeros(len(H_idx))
        for _ in range(Hao):
            s = np.random.randn(len(H_idx),3); s = normalize(s)
            s = s * np.sign((s*n).sum(-1,keepdims=True))
            ao += RI.intersects_any(p + n*2e-4 + s*1e-5, s).astype(float)
        ao /= Hao
        col *= (1 - 0.58*ao)[:,None]
        img[H_idx] = col * EXPOSURE

    # ---- shade floor (shadow) ----
    F_idx = np.where(floor_ok & ~hit)[0]
    if len(F_idx):
        fp = floor_pt[F_idx]
        sh = np.zeros(len(F_idx))
        for _ in range(8):                                    # soft shadow over sun disc
            js = normalize(SUN + np.random.randn(len(F_idx),3)*0.03)
            sh += RI.intersects_any(fp + np.array([0,1e-4,0]), js).astype(float)
        sh /= 8
        base = FLOOR_BASE
        amb = base*0.45 + env(np.array([0,1.0,0]))*0.04
        lit = base*np.clip(SUN[1],0,1)*1.0
        fade = np.clip(1 - (np.linalg.norm(fp[:,[0,2]],axis=1)/0.45), 0, 1)[:,None]   # vignette to bg
        fcol = (amb + lit*(1-sh)[:,None])
        bg = FLOOR_BG
        floorcol = fcol*fade + bg*(1-fade)
        # soft mirror reflection of the fork in the floor (blurred, grazing-weighted)
        rdir = D[F_idx].copy(); rdir[:,1] = -rdir[:,1]; rdir = normalize(rdir)
        rhit = np.zeros(len(F_idx))
        for _ in range(4):
            jd = normalize(rdir + np.random.randn(len(F_idx),3)*0.02)
            rhit += RI.intersects_any(fp + np.array([0,2e-4,0]), jd).astype(float)
        rhit /= 4
        graze = np.clip(1 - np.abs(D[F_idx,1]), 0, 1)[:,None]**2
        refl_str = 0.32*graze*fade*rhit[:,None]
        rtint = np.array([0.62,0.63,0.66])
        img[F_idx] = floorcol*(1-refl_str) + rtint*refl_str

    # ---- background (studio sweep with a soft radial vignette) ----
    B_idx = np.where(~hit & ~floor_ok)[0]
    if len(B_idx):
        sy = (B_idx // Wf) / Hf; sx = (B_idx % Wf) / Wf
        top = BG_TOP; bot = BG_BOT
        base = top + (bot-top)*(sy[:,None])
        r2 = ((sx-0.5)*1.15)**2 + ((sy-0.40)*1.0)**2          # pop behind the subject
        vig = np.clip(1 - 0.26*r2, 0.78, 1.0)[:,None]
        img[B_idx] = base*vig

    out_img = post(img.reshape(Hf, Wf, 3))
    im = Image.fromarray((out_img*255).astype(np.uint8))
    im = im.resize((W, H), Image.LANCZOS)
    im.save(out)
    print('wrote', out, f'({W}x{H}, fork px={int(hit.sum())//(ss*ss)})')

import sys
C = np.array([0.0, 0.092, 0.0])
if 'foot' in sys.argv:                        # foot close-up diagnostic
    render(26, -7, 0.066, np.array([0.0, 0.016, 0.0]), 760, 680, 20,
           'diag_foot.png', ss=2, Kr=34, Hao=18)
elif 'quick' in sys.argv:                     # fast iteration: hero + detail only
    render(28, 8, 0.52, C, 660, 920, 25, 'render_hero.png', ss=2, Kr=26, Hao=14)
    render(32, 2, 0.205, np.array([0.0, 0.052, 0.0]), 680, 560, 22,
           'render_detail.png', ss=2, Kr=26, Hao=14)
else:
    render(28, 8, 0.52, C, 1080, 1500, 25, 'render_hero.png',  Kr=72, Hao=28)
    render( 2, 5, 0.52, C, 940, 1480, 25, 'render_front.png', Kr=72, Hao=28)
    render(32, 2, 0.205, np.array([0.0, 0.052, 0.0]), 1100, 920, 22,
           'render_detail.png', Kr=72, Hao=28)
    # luxe dark-studio variant (additional look)
    set_theme('dark')
    render(26, 9, 0.52, C, 1080, 1500, 25, 'render_hero_dark.png', Kr=80, Hao=28)
    set_theme('cream')
