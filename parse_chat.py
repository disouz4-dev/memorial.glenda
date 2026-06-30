#!/usr/bin/env python3
"""
Parser do chat do WhatsApp para o Memorial da Glenda.
Gera chat_data.json com todas as mensagens organizadas.
"""
import re
import json
import os
from pathlib import Path

CHAT_FILE = "../Glenda arquivos/bkp Conversa do WhatsApp com Glenda/Conversa do WhatsApp com Glenda.txt"
MEDIA_SOURCE = "../Glenda arquivos/bkp Conversa do WhatsApp com Glenda"
OUTPUT_JSON = "assets/chat_data.json"

# Nomes dos participantes (como aparecem no .txt)
MAE = "🖤🖤 SIMONE 🖤🖤"
FILHA = "Glenda"

# Extensões de mídia reconhecidas
AUDIO_EXT = {".opus", ".mp3", ".aac", ".ogg", ".m4a"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXT = {".mp4", ".mov", ".avi", ".mkv"}
DOC_EXT   = {".pdf", ".doc", ".docx", ".xls"}
STICKER_EXT = {".webp"}

LINE_PATTERN = re.compile(
    r"^(\d{2}/\d{2}/\d{4}) (\d{2}:\d{2}) - ([^:]+): (.+)$",
    re.DOTALL
)
SYSTEM_PATTERN = re.compile(
    r"^(\d{2}/\d{2}/\d{4}) (\d{2}:\d{2}) - (.+)$"
)
ATTACHMENT_PATTERN = re.compile(
    r"\u200E?(.+?) \(arquivo anexado\)"
)

def classify_file(filename):
    ext = Path(filename).suffix.lower()
    if ext in STICKER_EXT and "STK" in filename:
        return "sticker"
    if ext in IMAGE_EXT:
        return "image"
    if ext in VIDEO_EXT:
        return "video"
    if ext in AUDIO_EXT or filename.startswith("PTT") or filename.startswith("AUD"):
        return "audio"
    if ext in DOC_EXT:
        return "document"
    if ext == ".vcf":
        return "contact"
    return "file"

def sender_key(name):
    if name == FILHA:
        return "glenda"
    if name == MAE:
        return "mae"
    return "outro"

def parse_chat(filepath):
    messages = []

    with open(filepath, encoding="utf-8") as f:
        lines = f.readlines()

    current = None

    for line in lines:
        line = line.rstrip("\n")

        m = LINE_PATTERN.match(line)
        if m:
            if current:
                messages.append(current)
            date, time, sender, text = m.groups()
            sender = sender.strip()

            attachment = ATTACHMENT_PATTERN.match(text.strip())
            if attachment:
                fname = attachment.group(1).strip().lstrip("\u200E")
                ftype = classify_file(fname)
                current = {
                    "date": date,
                    "time": time,
                    "sender": sender_key(sender),
                    "type": ftype,
                    "filename": fname,
                    "text": None
                }
            elif text.strip() in ("localização em tempo real compartilhada", "Ligação de voz perdida", "Ligação de vídeo perdida"):
                current = {
                    "date": date,
                    "time": time,
                    "sender": sender_key(sender),
                    "type": "system_msg",
                    "text": text.strip(),
                    "filename": None
                }
            else:
                clean = text.strip()
                # Remove marcadores de edição
                clean = re.sub(r"\s*<Mensagem editada>$", "", clean)
                current = {
                    "date": date,
                    "time": time,
                    "sender": sender_key(sender),
                    "type": "text",
                    "text": clean if clean else None,
                    "filename": None
                }
            continue

        # Linha de continuação (mensagem multi-linha)
        if current and not SYSTEM_PATTERN.match(line) and line:
            if current["type"] == "text" and current["text"] is not None:
                current["text"] += "\n" + line
            continue

    if current:
        messages.append(current)

    return messages

def main():
    script_dir = Path(__file__).parent
    chat_path = (script_dir / CHAT_FILE).resolve()
    output_path = script_dir / OUTPUT_JSON

    print(f"Lendo: {chat_path}")
    messages = parse_chat(chat_path)

    # Filtrar mensagens vazias e de sistema puro
    messages = [m for m in messages if m.get("type") != "system_msg" or m.get("text")]

    print(f"Total de mensagens: {len(messages)}")

    # Contar tipos
    by_type = {}
    for m in messages:
        t = m["type"]
        by_type[t] = by_type.get(t, 0) + 1
    for t, c in sorted(by_type.items()):
        print(f"  {t}: {c}")

    os.makedirs(output_path.parent, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"messages": messages}, f, ensure_ascii=False, indent=2)

    print(f"\nSalvo em: {output_path}")

if __name__ == "__main__":
    main()
