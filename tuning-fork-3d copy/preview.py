"""Shaded multi-view preview of the exported GLB (sanity render)."""
import numpy as np, trimesh
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

m = trimesh.load('udara_tuning_fork.glb', force='mesh')
v = m.vertices * 1000.0                      # mm
f = m.faces
fn = m.face_normals

def shade(light):
    light = np.array(light); light = light/np.linalg.norm(light)
    lam = np.clip(fn @ light, 0, 1)
    base = np.array([0.80, 0.81, 0.85])      # satin steel
    amb = 0.30
    col = amb + (1-amb)*lam[:, None]
    return np.clip(base[None, :]*col + 0.12*lam[:, None]**8, 0, 1)

views = [(-55, 18, 'three-quarter', [ -0.5, 0.8, 0.9]),
         (-90,  0, 'front',         [ -0.3, 0.6, 1.0]),
         (  0,  0, 'side',          [  1.0, 0.6, 0.3])]

fig = plt.figure(figsize=(9, 6), facecolor='white')
for i, (az, el, ttl, light) in enumerate(views):
    ax = fig.add_subplot(1, 3, i+1, projection='3d')
    # map model up-axis (Y) -> matplotlib vertical (Z): reorder cols X,Z,Y
    vp = v[:, [0, 2, 1]]
    tris = vp[f]
    pc = Poly3DCollection(tris, linewidths=0)
    pc.set_facecolor(shade(light))
    ax.add_collection3d(pc)
    ax.set_xlim(-50, 50); ax.set_ylim(-50, 50); ax.set_zlim(0, 200)
    ax.set_box_aspect((1, 1, 2))
    ax.view_init(elev=el, azim=az)
    ax.set_title(ttl, fontsize=10); ax.set_axis_off()
plt.tight_layout()
plt.savefig('preview_render.png', dpi=140, bbox_inches='tight', facecolor='white')
print('wrote preview_render.png')
