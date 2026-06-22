"""Build viewer.html: interactive 3D (sunlit HDR) + the photoreal render gallery.
GLB embedded as a data URI; hero PNGs referenced from the same folder."""
import base64, pathlib

glb = pathlib.Path('udara_fork_textured.glb').read_bytes()
data_uri = "data:model/gltf-binary;base64," + base64.b64encode(glb).decode()

ENVS = {
  "Sun":    "https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr",
  "Studio": "https://modelviewer.dev/shared-assets/environments/aircraft_workshop_01_1k.hdr",
  "Soft":   "neutral",
}
DEFAULT = ENVS["Studio"]

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UDARABALI — Tuning Fork 3D</title>
<script type="module"
  src="https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<style>
  :root {{ --cream:#F4ECE3; --brown:#3A2E26; --terra:#C17B5A; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family:-apple-system,Segoe UI,Roboto,sans-serif;
         background:radial-gradient(circle at 50% 22%, #fcf8f2, #efe5d8 70%, #e7dccd);
         color:var(--brown); min-height:100vh; }}
  header {{ text-align:center; padding:30px 16px 2px; }}
  header h1 {{ margin:0; font-weight:600; letter-spacing:.2em; font-size:24px; }}
  header p  {{ margin:7px 0 0; color:var(--terra); letter-spacing:.06em; font-size:13px; }}
  .stage {{ display:flex; flex-direction:column; align-items:center; }}
  model-viewer {{ width:min(94vw,760px); height:70vh; background:transparent; }}
  .bar {{ display:flex; gap:10px; margin:2px 0 10px; flex-wrap:wrap; justify-content:center; }}
  .bar button {{ border:1px solid #d8cab8; background:#fff8ef; color:var(--brown);
                 padding:7px 15px; border-radius:20px; font-size:12.5px; cursor:pointer;
                 letter-spacing:.03em; transition:.15s; }}
  .bar button:hover {{ background:var(--terra); color:#fff; border-color:var(--terra); }}
  .hint {{ color:#a3927f; font-size:12px; text-align:center; padding:0 0 8px; }}
  h2 {{ text-align:center; font-weight:500; letter-spacing:.14em; font-size:15px;
        color:#8a7866; margin:26px 0 4px; }}
  .gallery {{ display:flex; gap:18px; flex-wrap:wrap; justify-content:center;
              padding:8px 16px 40px; }}
  .gallery img {{ height:min(60vh,560px); border-radius:10px;
                  box-shadow:0 10px 34px rgba(58,46,38,.16); background:#eee; }}
</style>
</head>
<body>
  <header>
    <h1>UDARABALI</h1>
    <p>Tuning Fork · interactive 3D &amp; photoreal renders</p>
  </header>

  <div class="stage">
    <model-viewer id="mv"
      src="{data_uri}" alt="UDARABALI tuning fork"
      camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="20deg"
      interaction-prompt="none"
      environment-image="{DEFAULT}"
      tone-mapping="aces" exposure="1.15"
      shadow-intensity="1.0" shadow-softness="1.0"
      camera-orbit="24deg 76deg 0.85m" field-of-view="26deg"
      min-camera-orbit="auto auto 0.42m" max-camera-orbit="auto auto 1.5m"
      ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
    <div class="bar">
      <button onclick="setEnv('{ENVS['Sun']}')">☀ Sun</button>
      <button onclick="setEnv('{ENVS['Studio']}')">Studio</button>
      <button onclick="setEnv('{ENVS['Soft']}')">Soft</button>
      <button onclick="spin()">Spin on/off</button>
    </div>
    <div class="hint">drag to rotate · scroll to zoom · right-drag to pan</div>
  </div>

  <h2>PHOTOREAL RENDERS</h2>
  <div class="gallery">
    <img src="render_hero.png"      alt="hero">
    <img src="render_hero_dark.png" alt="hero dark">
    <img src="render_front.png"     alt="front">
    <img src="render_detail.png"    alt="detail">
  </div>

<script>
  const mv = document.getElementById('mv');
  function setEnv(e) {{ mv.environmentImage = e; }}
  function spin() {{ mv.autoRotate = !mv.autoRotate; }}
</script>
</body>
</html>
"""
pathlib.Path('viewer.html').write_text(html, encoding='utf-8')
print('wrote viewer.html  (%.0f KB)' % (len(html)/1024))
