#!/bin/bash
# Inicia o servidor local do memorial na porta 3000
echo ""
echo "  💚 Memorial Glenda — Servidor Local"
echo "  ─────────────────────────────────────"
echo "  Acesse: http://localhost:3000"
echo "  Para encerrar: Ctrl+C"
echo ""
cd "$(dirname "$0")"
python3 -m http.server 3000
