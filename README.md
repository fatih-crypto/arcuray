# Synthetic Generator — Prototip (statik demo)

Backend yok, sadece statik dosyalar. GitHub Pages, Netlify, Vercel, S3 — herhangi bir statik host'ta çalışır.

## Lokal test

```bash
python3 -m http.server 8000
# tarayıcı → http://localhost:8000
```

(file:// üzerinden açılınca CORS'tan `fetch` çalışmaz, mutlaka HTTP server gerekir.)

## GitHub Pages'e deploy

```bash
git init -b main
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<KULLANICI>/<REPO>.git
git push -u origin main
```

Sonra GitHub'da: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.

Birkaç dakika içinde `https://<KULLANICI>.github.io/<REPO>/` adresinden açılır.

## İçerik

- `index.html` / `style.css` / `script.js` — tek sayfa
- `data/images/` — 4 sentetik görsel (2 hayvan × 2 mevsim)
- `data/frames/` — 287 demo frame (kurt 145 + tilki 142)
- `data/live/` — 2 mp4 canlı kamera kaydı (3 dk, 1 fps)
- `data/annotations.json` — COCO'dan üretilmiş bbox haritası
