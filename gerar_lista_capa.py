#!/usr/bin/env python3
"""
Gera assets/fotos_capa.json com a lista de arquivos em assets/media/fotos_capa/
Execute sempre que adicionar ou remover fotos da pasta.
"""
import json, os
from pathlib import Path

pasta  = Path(__file__).parent / "assets/media/fotos_capa"
saida  = Path(__file__).parent / "assets/fotos_capa.json"
exts   = {".jpg", ".jpeg", ".png", ".webp"}

fotos  = sorted(f.name for f in pasta.iterdir() if f.suffix.lower() in exts)

with open(saida, "w") as f:
    json.dump(fotos, f, ensure_ascii=False, indent=2)

print(f"{len(fotos)} foto(s) listada(s) em fotos_capa.json")
for foto in fotos:
    print(f"  • {foto}")
