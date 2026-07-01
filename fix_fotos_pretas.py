#!/usr/bin/env python3
"""
Detecta bordas pretas em fotos_wide e substitui com blur fill.
"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
from pathlib import Path

PASTA = Path(__file__).parent / "assets/media/fotos_wide"
TARGET_W, TARGET_H = 1920, 1080
BLACK_THRESH = 15  # pixel médio abaixo disso = preto


def tem_borda_preta(img: Image.Image, margem=40) -> bool:
    arr = np.array(img.convert("RGB"))
    h, w = arr.shape[:2]
    mid = h // 2
    esq = arr[mid, :margem, :].mean()
    dir_ = arr[mid, w-margem:, :].mean()
    return esq < BLACK_THRESH or dir_ < BLACK_THRESH


def detecta_conteudo(img: Image.Image) -> tuple:
    """Retorna (left, right) da área com conteúdo não-preto."""
    arr = np.array(img.convert("RGB"))
    h, w = arr.shape[:2]
    # Média de brilho por coluna (usando faixa central vertical)
    faixa = arr[h//4: 3*h//4, :, :]
    brilho = faixa.mean(axis=(0, 2))  # shape (w,)
    cols = np.where(brilho > BLACK_THRESH)[0]
    if len(cols) == 0:
        return 0, w
    return int(cols[0]), int(cols[-1])


def blur_fill(portrait: Image.Image, target_w=TARGET_W, target_h=TARGET_H) -> Image.Image:
    """Recebe imagem de conteúdo e preenche para target_w×target_h com blur nas bordas."""
    ow, oh = portrait.size

    # Redimensiona para caber em target_h
    scale = target_h / oh
    nw = round(ow * scale)
    nh = target_h
    photo = portrait.resize((nw, nh), Image.LANCZOS)

    if nw >= target_w:
        left = (nw - target_w) // 2
        return photo.crop((left, 0, left + target_w, target_h))

    pad_left = (target_w - nw) // 2

    # Fundo: foto escalada para cobrir tudo + blur pesado
    scale_cover = max(target_w / ow, target_h / oh)
    bg = portrait.resize((round(ow * scale_cover), round(oh * scale_cover)), Image.LANCZOS)
    bx = (bg.width - target_w) // 2
    by = (bg.height - target_h) // 2
    bg = bg.crop((bx, by, bx + target_w, by + target_h))
    for _ in range(5):
        bg = bg.filter(ImageFilter.GaussianBlur(radius=28))
    bg = bg.point(lambda p: int(p * 0.68))

    # Cola foto no centro
    bg.paste(photo, (pad_left, 0))

    # Blend suave nas junções
    blend_w = min(120, pad_left, target_w - nw - pad_left)
    if blend_w > 0:
        for side in ("left", "right"):
            mask = Image.new("L", (blend_w, target_h), 0)
            draw = ImageDraw.Draw(mask)
            if side == "left":
                rx = pad_left
                photo_strip = photo.crop((0, 0, blend_w, target_h))
                bg_strip = bg.crop((rx, 0, rx + blend_w, target_h))
                for x in range(blend_w):
                    draw.line([(x, 0), (x, target_h)], fill=int(255 * (1 - x / blend_w)))
                merged = Image.composite(bg_strip, photo_strip, mask)
                bg.paste(merged, (rx, 0))
            else:
                rx = pad_left + nw - blend_w
                photo_strip = photo.crop((nw - blend_w, 0, nw, target_h))
                bg_strip = bg.crop((rx, 0, rx + blend_w, target_h))
                for x in range(blend_w):
                    draw.line([(x, 0), (x, target_h)], fill=int(255 * (x / blend_w)))
                merged = Image.composite(bg_strip, photo_strip, mask)
                bg.paste(merged, (rx, 0))

    return bg


corrigidas = 0
for foto in sorted(PASTA.iterdir()):
    if foto.suffix.lower() not in {".jpg", ".jpeg", ".png"}: continue
    img = Image.open(foto).convert("RGB")
    if not tem_borda_preta(img):
        print(f"✓ ok   {foto.name}")
        continue

    print(f"✗ preto {foto.name} — corrigindo...")
    left, right = detecta_conteudo(img)
    conteudo = img.crop((left, 0, right, img.height))
    resultado = blur_fill(conteudo)
    resultado.save(foto, quality=92)
    print(f"  → salvo {foto.name} ({resultado.size[0]}×{resultado.size[1]})")
    corrigidas += 1

print(f"\n{corrigidas} foto(s) corrigida(s).")
