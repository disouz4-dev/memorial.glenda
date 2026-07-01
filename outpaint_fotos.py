#!/usr/bin/env python3
"""
Outpainting das fotos de capa: estende retratos para 16:9 (1920×1080)
usando técnica de espelhamento + blur suavizado nas bordas.
Resultado: imagens paisagem prontas pra tela cheia.
"""
from PIL import Image, ImageFilter, ImageDraw
import json
from pathlib import Path

SRC  = Path(__file__).parent / "assets/media/fotos_capa"
DEST = Path(__file__).parent / "assets/media/fotos_wide"
DEST.mkdir(exist_ok=True)

TARGET_W = 1920
TARGET_H = 1080


def extend_photo(src_path: Path) -> Path:
    img = Image.open(src_path).convert("RGB")
    ow, oh = img.size

    # --- 1. Redimensiona foto para caber em 1080px de altura
    scale = TARGET_H / oh
    nw = round(ow * scale)
    nh = TARGET_H
    photo = img.resize((nw, nh), Image.LANCZOS)

    # Se a foto já é mais larga que o alvo, só centraliza com crop
    if nw >= TARGET_W:
        left = (nw - TARGET_W) // 2
        canvas = photo.crop((left, 0, left + TARGET_W, TARGET_H))
        out = DEST / src_path.name
        canvas.save(out, quality=92)
        return out

    # --- 2. Calcula espaço a preencher em cada lado
    pad_left  = (TARGET_W - nw) // 2
    pad_right = TARGET_W - nw - pad_left

    # --- 3. Canvas base: foto espelhada + muito borrada (fundo bokeh)
    # Escala a foto original para cobrir o canvas inteiro
    scale_cover = max(TARGET_W / ow, TARGET_H / oh)
    bg_w = round(ow * scale_cover)
    bg_h = round(oh * scale_cover)
    bg = img.resize((bg_w, bg_h), Image.LANCZOS)
    # Crop centralizado
    bx = (bg_w - TARGET_W) // 2
    by = (bg_h - TARGET_H) // 2
    bg = bg.crop((bx, by, bx + TARGET_W, by + TARGET_H))
    # Blur pesado — vira bokeh/desenfoque artístico
    for _ in range(5):
        bg = bg.filter(ImageFilter.GaussianBlur(radius=28))
    # Escurece levemente para a foto principal destacar
    bg = bg.point(lambda p: int(p * 0.68))

    # --- 4. Cola a foto redimensionada centralizada
    x_offset = pad_left
    bg.paste(photo, (x_offset, 0))

    # --- 5. Blend suave nas junções (gradiente de opacidade)
    # Cria máscara de blend para cada lado
    blend_w = min(120, pad_left, pad_right)

    if blend_w > 0:
        # Lado esquerdo: gradiente transparente→opaco (bg→photo)
        for side in ("left", "right"):
            mask = Image.new("L", (blend_w, TARGET_H), 0)
            draw = ImageDraw.Draw(mask)
            for x in range(blend_w):
                if side == "left":
                    # em x=0 (borda do bg) → alpha=255 (bg visível)
                    # em x=blend_w-1 (borda da foto) → alpha=0 (foto transparente)
                    alpha = int(255 * (1 - x / blend_w))
                    px = x_offset + x
                else:
                    alpha = int(255 * (x / blend_w))
                    px = x_offset + nw - blend_w + x

                draw.line([(x, 0), (x, TARGET_H)], fill=alpha)

            # Região de bg na área de blend (já embutida no bg)
            # Região de foto na área de blend (precisa extrair)
            if side == "left":
                photo_strip = photo.crop((0, 0, blend_w, TARGET_H))
                bg_strip    = bg.crop((x_offset, 0, x_offset + blend_w, TARGET_H))
                merged = Image.composite(bg_strip, photo_strip, mask)
                bg.paste(merged, (x_offset, 0))
            else:
                rx = x_offset + nw - blend_w
                photo_strip = photo.crop((nw - blend_w, 0, nw, TARGET_H))
                bg_strip    = bg.crop((rx, 0, rx + blend_w, TARGET_H))
                # mask invertido para lado direito
                mask_inv = Image.new("L", (blend_w, TARGET_H), 0)
                draw2 = ImageDraw.Draw(mask_inv)
                for x in range(blend_w):
                    alpha = int(255 * (x / blend_w))
                    draw2.line([(x, 0), (x, TARGET_H)], fill=alpha)
                merged = Image.composite(bg_strip, photo_strip, mask_inv)
                bg.paste(merged, (rx, 0))

    # --- 6. Salva resultado
    out = DEST / src_path.name
    bg.save(out, quality=92)
    return out


# Processa todas as fotos
fotos = sorted(f for f in SRC.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
resultado = []

for foto in fotos:
    print(f"Processando {foto.name}...")
    out = extend_photo(foto)
    # Lê dimensões finais
    with Image.open(out) as fin:
        w, h = fin.size
    resultado.append({"file": foto.name, "orient": "landscape", "w": w, "h": h, "face_y": 30})
    print(f"  → {out.name} ({w}×{h})")

# Atualiza fotos_capa.json para apontar para fotos_wide
json_path = Path(__file__).parent / "assets/fotos_capa.json"
with open(json_path, "w") as f:
    json.dump(resultado, f, ensure_ascii=False, indent=2)

print(f"\n{len(resultado)} foto(s) processada(s).")
print("assets/fotos_capa.json atualizado para usar fotos_wide/")
print("\nAtualize o index.html: troque BASE para 'assets/media/fotos_wide/'")
