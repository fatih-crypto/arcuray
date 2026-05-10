#!/usr/bin/env python3
"""
ARÇURAY QR Kod Üreteci
Kullanım: python3 generate_qr.py
Üretilen PNG dosyaları: qr/ klasörüne kaydedilir
"""

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont
import os

BASE_URL = "https://fatih-crypto.github.io/arcuray/"

CAMERAS = [
    {"file": "index.html",    "name": "Ana Sayfa",              "label": "ARCURAY-ANA"},
    {"file": "kamera1.html",  "name": "CAM-01 KCO Poyraz",      "label": "CAM-01"},
    {"file": "kamera2.html",  "name": "CAM-02 Kavacık Girişi",  "label": "CAM-02"},
    {"file": "kamera3.html",  "name": "CAM-03 Reşadiye Kavşağı","label": "CAM-03"},
    {"file": "kamera4.html",  "name": "CAM-04 Riva Tüneli G.",  "label": "CAM-04"},
    {"file": "kamera5.html",  "name": "CAM-05 Anadolu Feneri",  "label": "CAM-05"},
]

os.makedirs("qr", exist_ok=True)

BG_COLOR    = (5,  14,  5)   # dark green-black
FG_COLOR    = (0, 220, 100)  # arcuray green
TEXT_COLOR  = (180, 255, 200)

def make_qr(url, output_path, label, cam_name):
    qr = qrcode.QRCode(
        version=3,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        back_color=BG_COLOR,
        fill_color=FG_COLOR,
    )

    # Convert to RGBA for compositing
    img = img.convert("RGBA")
    qr_size = img.size[0]

    # Create final canvas with label area
    label_height = 70
    canvas = Image.new("RGBA", (qr_size, qr_size + label_height), BG_COLOR + (255,))
    canvas.paste(img, (0, 0))

    draw = ImageDraw.Draw(canvas)

    # Border
    draw.rectangle([0, 0, qr_size-1, qr_size+label_height-1],
                   outline=(0, 200, 80, 200), width=2)

    # Label text (using default font - no external font needed)
    try:
        font_big   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except Exception:
        font_big   = ImageFont.load_default()
        font_small = font_big

    # Label background
    draw.rectangle([0, qr_size, qr_size, qr_size+label_height], fill=(5,20,5,255))
    draw.line([(0, qr_size), (qr_size, qr_size)], fill=(0,180,70,200), width=1)

    # Camera label
    bb = draw.textbbox((0,0), label, font=font_big)
    tw = bb[2] - bb[0]
    draw.text(((qr_size-tw)//2, qr_size+8), label, fill=FG_COLOR, font=font_big)

    # Camera name
    bb2 = draw.textbbox((0,0), cam_name, font=font_small)
    tw2 = bb2[2] - bb2[0]
    draw.text(((qr_size-tw2)//2, qr_size+32), cam_name, fill=TEXT_COLOR, font=font_small)

    # ARCURAY branding
    brand = "arcuray.github.io"
    bb3 = draw.textbbox((0,0), brand, font=font_small)
    tw3 = bb3[2] - bb3[0]
    draw.text(((qr_size-tw3)//2, qr_size+50), brand, fill=(60,120,80,200), font=font_small)

    canvas = canvas.convert("RGB")
    canvas.save(output_path, "PNG", quality=95)
    print(f"  ✓ {output_path}  →  {url}")

print("\n🌿 ARÇURAY QR Kod Üreteci")
print(f"   Base URL: {BASE_URL}\n")

for cam in CAMERAS:
    url = BASE_URL + cam["file"]
    fname = cam["file"].replace(".html", "_qr.png")
    out   = os.path.join("qr", fname)
    make_qr(url, out, cam["label"], cam["name"])

print(f"\n✅ {len(CAMERAS)} QR kod üretildi → qr/ klasörü\n")
