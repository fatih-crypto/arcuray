// Standalone prototip — backend yok, hepsi statik dosyalardan.

const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ============================================================
// GÖRSEL
// ============================================================
let protoImgAnimal = "kurt";
let protoImgSeason = "yaz";

function updateProtoImage() {
  const img = $("#proto-img");
  img.src = `data/images/${protoImgAnimal}_${protoImgSeason}.jpg`;
  img.onerror = () => { $("#proto-img-meta").textContent = `dosya yok: ${protoImgAnimal}_${protoImgSeason}.jpg`; };
  img.onload  = () => { $("#proto-img-meta").textContent = `${protoImgAnimal} · ${protoImgSeason}`; };
}
$$("#proto-img-animal .seg-btn").forEach(b => {
  b.addEventListener("click", () => {
    $$("#proto-img-animal .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    protoImgAnimal = b.dataset.animal;
    updateProtoImage();
  });
});
$$("#proto-img-season .seg-btn").forEach(b => {
  b.addEventListener("click", () => {
    $$("#proto-img-season .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    protoImgSeason = b.dataset.season;
    updateProtoImage();
  });
});

// ============================================================
// MOBESE / CCTV
// ============================================================
const cctv = {
  animal: "kurt",
  fps: 12,
  playing: false,
  frameIdx: 0,
  frames: [],
  framesData: {},
  imgs: {},
  preloaded: false,
  lastFrameTime: 0,
  rafId: null,
  alertDismissed: false,
};

let annCache = null;
async function loadAnn() {
  if (annCache) return annCache;
  const r = await fetch("data/annotations.json");
  annCache = await r.json();
  return annCache;
}

async function cctvLoadAnimal(animal) {
  cctv.animal = animal;
  cctv.frameIdx = 0;
  cctv.alertDismissed = false;
  cctv.preloaded = false;
  cctv.imgs = {};
  cctv.framesData = {};

  cctvShowLive();
  cctvSetStatus("yükleniyor...");

  const ann = await loadAnn();
  const list = animal === "kurt" ? ann.kurt_frames : ann.tilki_frames;
  cctv.frames = list;
  list.forEach(fn => { cctv.framesData[fn] = ann.frames[fn] || { bboxes: [] }; });

  // preload images
  let done = 0;
  const total = list.length;
  await Promise.all(list.map(fn => new Promise((resolve) => {
    const im = new Image();
    im.onload  = () => { cctv.imgs[fn] = im; done++; cctvSetStatus(`yükleniyor ${done}/${total}`); resolve(); };
    im.onerror = () => { done++; resolve(); };
    im.src = `data/frames/${fn}`;
  })));
  cctv.preloaded = true;
  cctvSetStatus("canlı");
}

function cctvShowLive() {
  const v = $("#cctv-live");
  v.src = `data/live/${cctv.animal}.mp4`;
  v.classList.remove("hidden");
  v.play().catch(() => {});
  $("#cctv-canvas").classList.add("hidden");
  $("#cctv-alert").classList.add("hidden");
  $("#cctv-frame-label").textContent = "CANLI";
  $("#cctv-detection").textContent = "—";
  $("#cctv-conf").textContent = "—";
  cctvClearROI();
}
function cctvShowDetection() {
  const v = $("#cctv-live");
  v.pause();
  v.classList.add("hidden");
  $("#cctv-canvas").classList.remove("hidden");
}

function cctvSetStatus(s) { $("#cctv-status").textContent = s; }

function cctvFitCanvas() {
  const c = $("#cctv-canvas");
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
}

function cctvDrawFrame() {
  cctvFitCanvas();
  const c = $("#cctv-canvas");
  const ctx = c.getContext("2d");
  const cw = c.width, ch = c.height;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch);

  if (!cctv.frames.length) return;
  const fn = cctv.frames[cctv.frameIdx];
  const im = cctv.imgs[fn];
  if (!im) return;

  const iw = im.naturalWidth, ih = im.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.drawImage(im, dx, dy, dw, dh);

  const data = cctv.framesData[fn] || { bboxes: [] };
  const detected = data.bboxes.length > 0;

  data.bboxes.forEach((b, i) => {
    const [bx, by, bw, bh] = b.bbox;
    const x = dx + bx * scale, y = dy + by * scale, w = bw * scale, h = bh * scale;
    ctx.strokeStyle = "#00ff7f"; ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,255,127,0.7)"; ctx.shadowBlur = 10;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    const cl = 10; ctx.lineWidth = 3;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([px,py,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(px, py + sy*cl);
      ctx.lineTo(px, py);
      ctx.lineTo(px + sx*cl, py);
      ctx.stroke();
    });
    const conf = (0.82 + Math.random() * 0.16).toFixed(2);
    const label = `${b.cat.toUpperCase()} ${conf}`;
    ctx.font = "11px ui-monospace, monospace";
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = "rgba(0,255,127,0.9)";
    ctx.fillRect(x, y - 18, tw, 16);
    ctx.fillStyle = "#001a0d"; ctx.fillText(label, x + 5, y - 6);

    if (i === 0) {
      $("#cctv-detection").textContent = b.cat;
      $("#cctv-conf").textContent = conf;
    }
  });

  const alertEl = $("#cctv-alert");
  if (detected) {
    if (!cctv.alertDismissed && alertEl.classList.contains("hidden")) {
      alertEl.classList.remove("hidden");
    }
    cctvDrawROI(im, data.bboxes[0].bbox);
  } else {
    if (!alertEl.classList.contains("hidden")) alertEl.classList.add("hidden");
    cctv.alertDismissed = false;
    $("#cctv-detection").textContent = "—";
    $("#cctv-conf").textContent = "—";
    cctvClearROI();
  }

  $("#cctv-frame-label").textContent = fn;
  $("#cctv-timeline-bar").style.width = `${(cctv.frameIdx + 1) / cctv.frames.length * 100}%`;
  $("#cctv-timeline-label").textContent = `${cctv.frameIdx + 1} / ${cctv.frames.length}`;
  const elapsedMs = cctv.frameIdx * (1000 / cctv.fps);
  const t = new Date(elapsedMs);
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const ss = String(t.getUTCSeconds()).padStart(2, "0");
  $("#cctv-time").textContent = `${hh}:${mm}:${ss}`;
}

function cctvDrawROI(img, bbox) {
  const roi = $("#cctv-roi");
  const ctx = roi.getContext("2d");
  const W = roi.clientWidth || 180, H = roi.clientHeight || 180;
  if (roi.width !== W) roi.width = W;
  if (roi.height !== H) roi.height = H;

  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

  let [bx, by, bw, bh] = bbox;
  if (bx < 0) { bw += bx; bx = 0; }
  if (by < 0) { bh += by; by = 0; }
  bw = Math.min(bw, img.naturalWidth - bx);
  bh = Math.min(bh, img.naturalHeight - by);
  if (bw <= 0 || bh <= 0) return;

  const pad = Math.max(bw, bh) * 0.25;
  const sx = Math.max(0, bx - pad);
  const sy = Math.max(0, by - pad);
  const sw = Math.min(img.naturalWidth - sx, bw + pad * 2);
  const sh = Math.min(img.naturalHeight - sy, bh + pad * 2);

  const scale = Math.min(W / sw, H / sh);
  const dw = sw * scale, dh = sh * scale;
  const dx = (W - dw) / 2, dy = (H - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

  const rx = dx + (bx - sx) * scale;
  const ry = dy + (by - sy) * scale;
  const rw = bw * scale;
  const rh = bh * scale;
  ctx.strokeStyle = "#00ff7f"; ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(0,255,127,0.6)"; ctx.shadowBlur = 8;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.shadowBlur = 0;

  $("#cctv-roi-empty").classList.add("hidden");
}
function cctvClearROI() {
  const roi = $("#cctv-roi");
  const ctx = roi.getContext("2d");
  ctx.clearRect(0, 0, roi.width, roi.height);
  $("#cctv-roi-empty").classList.remove("hidden");
}

function cctvTick(ts) {
  if (!cctv.playing) return;
  if (!cctv.lastFrameTime) cctv.lastFrameTime = ts;
  const interval = 1000 / cctv.fps;
  if (ts - cctv.lastFrameTime >= interval) {
    cctv.lastFrameTime = ts;
    cctv.frameIdx++;
    if (cctv.frameIdx >= cctv.frames.length) {
      cctv.frameIdx = 0;
      cctv.alertDismissed = false;
    }
    cctvDrawFrame();
  }
  cctv.rafId = requestAnimationFrame(cctvTick);
}

function cctvPlay() {
  if (!cctv.preloaded || cctv.playing) return;
  cctvShowDetection();
  cctv.playing = true;
  cctv.lastFrameTime = 0;
  cctv.frameIdx = 0;
  cctvSetStatus("tespit aktif");
  cctvDrawFrame();
  cctv.rafId = requestAnimationFrame(cctvTick);
}
function cctvPause() {
  cctv.playing = false;
  if (cctv.rafId) cancelAnimationFrame(cctv.rafId);
  if (!$("#cctv-canvas").classList.contains("hidden")) cctvSetStatus("duraklatıldı");
}
function cctvRestart() {
  cctvPause();
  cctv.frameIdx = 0;
  cctv.alertDismissed = false;
  cctvShowLive();
  cctvSetStatus("canlı");
}

$$("#proto-vid-animal .seg-btn").forEach(b => {
  b.addEventListener("click", async () => {
    $$("#proto-vid-animal .seg-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    cctvPause();
    await cctvLoadAnimal(b.dataset.vanimal);
  });
});
$("#proto-vid-play").addEventListener("click", cctvPlay);
$("#proto-vid-pause").addEventListener("click", cctvPause);
$("#proto-vid-restart").addEventListener("click", cctvRestart);

$("#cctv-alert-close").addEventListener("click", () => {
  $("#cctv-alert").classList.add("hidden");
  cctv.alertDismissed = true;
});

$("#proto-vid-fullscreen").addEventListener("click", () => {
  const el = document.querySelector(".cctv-screen");
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
  }
});
document.addEventListener("fullscreenchange", () => setTimeout(() => cctvDrawFrame(), 100));
document.addEventListener("webkitfullscreenchange", () => setTimeout(() => cctvDrawFrame(), 100));
window.addEventListener("resize", () => cctvDrawFrame());

// init
updateProtoImage();
cctvLoadAnimal("kurt");
