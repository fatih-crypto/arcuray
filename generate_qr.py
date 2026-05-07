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
    {"file": "kamera2.html",  "name": "CAM-02 Kavacik Girisi",  "label": "CAM-02"},
    {"file": "kamera3.html",  "name": "CAM-03 Resadiye Kavsagi","label": "CAM-03"},
    {"file": "kamera4.html",  "name": "CAM-04 Riva Tuneli G.",  "label": "CAM-04"},
    {"file": "kamera5.html",  "name": "CAM-05 Anadolu Feneri",  "label": "CAM-05"},
]

os.makedirs("qr", exist_ok=True)
BG_COLOR=(5,14,5); FG_COLOR=(0,220,100); TEXT_COLOR=(180,255,200)

def make_qr(url, output_path, label, cam_name):
    qr=qrcode.QRCode(version=3,error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=10,border=2)
    qr.add_data(url); qr.make(fit=True)
    img=qr.make_image(image_factory=StyledPilImage,module_drawer=RoundedModuleDrawer(),back_color=BG_COLOR,fill_color=FG_COLOR)
    img=img.convert("RGBA"); qr_size=img.size[0]; label_height=70
    canvas=Image.new("RGBA",(qr_size,qr_size+label_height),BG_COLOR+(255,)); canvas.paste(img,(0,0))
    draw=ImageDraw.Draw(canvas)
    draw.rectangle([0,0,qr_size-1,qr_size+label_height-1],outline=(0,200,80,200),width=2)
    try:
        font_big=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",16)
        font_small=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",12)
    except:
        font_big=font_small=ImageFont.load_default()
    draw.rectangle([0,qr_size,qr_size,qr_size+label_height],fill=(5,20,5,255))
    draw.line([(0,qr_size),(qr_size,qr_size)],fill=(0,180,70,200),width=1)
    bb=draw.textbbox((0,0),label,font=font_big); tw=bb[2]-bb[0]
    draw.text(((qr_size-tw)//2,qr_size+8),label,fill=FG_COLOR,font=font_big)
    bb2=draw.textbbox((0,0),cam_name,font=font_small); tw2=bb2[2]-bb2[0]
    draw.text(((qr_size-tw2)//2,qr_size+32),cam_name,fill=TEXT_COLOR,font=font_small)
    canvas=canvas.convert("RGB"); canvas.save(output_path,"PNG",quality=95)
    print(f"  OK {output_path}  -> {url}")

print("\nARCURAY QR Kod Ureteci")
for cam in CAMERAS:
    url=BASE_URL+cam["file"]; fname=cam["file"].replace(".html","_qr.png")
    make_qr(url,os.path.join("qr",fname),cam["label"],cam["name"])
print(f"\n{len(CAMERAS)} QR kod uretildi -> qr/ klasoru")
