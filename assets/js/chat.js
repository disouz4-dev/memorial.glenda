'use strict';

const MEDIA_BASE = 'assets/media/';
const PAGE_SIZE  = 80;  // mensagens por lote de renderização

let allMessages   = [];
let filteredMsgs  = [];
let renderedCount = 0;
let isLoading     = false;
let currentAudio  = null;

const chatArea    = document.getElementById('chat-area');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const yearFilter  = document.getElementById('year-filter');
const chatInfo    = document.getElementById('chat-info');

// ── Carrega dados ──────────────────────────────────────────────
fetch('assets/chat_data.json')
  .then(r => r.json())
  .then(data => {
    allMessages  = data.messages;
    filteredMsgs = allMessages;
    chatArea.innerHTML = '';
    updateInfo();
    renderBatch(true);
    setupScrollLoader();
    injectScrollBtn();
  })
  .catch(() => {
    chatArea.innerHTML = '<p style="text-align:center;padding:2rem;color:#8696a0">Erro ao carregar dados.</p>';
  });

function updateInfo() {
  const total = filteredMsgs.length;
  if (!total) { chatInfo.textContent = 'nenhuma mensagem encontrada'; return; }
  const first = filteredMsgs[0];
  const last  = filteredMsgs[total - 1];
  chatInfo.textContent = `${total.toLocaleString('pt-BR')} mensagens · ${first.date} – ${last.date}`;
}

// ── Renderização em lotes ──────────────────────────────────────
function renderBatch(reset = false) {
  if (isLoading) return;
  isLoading = true;

  if (reset) {
    chatArea.innerHTML = '';
    renderedCount = 0;
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  }

  const start = renderedCount;
  const end   = Math.min(start + PAGE_SIZE, filteredMsgs.length);
  if (start >= filteredMsgs.length) { isLoading = false; return; }

  const frag = document.createDocumentFragment();
  let lastDate = (start > 0 && filteredMsgs[start - 1]) ? filteredMsgs[start - 1].date : null;

  for (let i = start; i < end; i++) {
    const msg = filteredMsgs[i];

    if (msg.date !== lastDate) {
      frag.appendChild(makeDateSep(msg.date));
      lastDate = msg.date;
    }

    frag.appendChild(makeRow(msg, i));
  }

  chatArea.appendChild(frag);
  renderedCount = end;
  isLoading = false;

  if (reset) setTimeout(() => chatArea.scrollTop = 0, 10);
}

function setupScrollLoader() {
  chatArea.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = chatArea;
    if (scrollTop + clientHeight >= scrollHeight - 300 && renderedCount < filteredMsgs.length) {
      renderBatch();
    }
    const btn = document.getElementById('scroll-bottom');
    if (btn) btn.classList.toggle('visible', scrollTop < scrollHeight - clientHeight - 400);
  });
}

function injectScrollBtn() {
  const btn = document.createElement('button');
  btn.id = 'scroll-bottom';
  btn.title = 'Ir para o final';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>';
  btn.addEventListener('click', () => {
    renderedCount = 0;
    filteredMsgs = [...filteredMsgs]; // força reload
    // Render all then scroll
    renderAll();
  });
  document.body.appendChild(btn);
}

function renderAll() {
  chatArea.innerHTML = '';
  renderedCount = 0;
  const frag = document.createDocumentFragment();
  let lastDate = null;
  for (let i = 0; i < filteredMsgs.length; i++) {
    const msg = filteredMsgs[i];
    if (msg.date !== lastDate) { frag.appendChild(makeDateSep(msg.date)); lastDate = msg.date; }
    frag.appendChild(makeRow(msg, i));
    if (i % 500 === 0 && i > 0) { /* yield */ }
  }
  chatArea.appendChild(frag);
  renderedCount = filteredMsgs.length;
  setTimeout(() => chatArea.scrollTop = chatArea.scrollHeight, 50);
}

// ── Construtores de DOM ────────────────────────────────────────
function makeDateSep(dateStr) {
  const el = document.createElement('div');
  el.className = 'date-sep';
  el.innerHTML = `<span>${formatDate(dateStr)}</span>`;
  return el;
}

function makeRow(msg, idx) {
  if (msg.type === 'system_msg') {
    const el = document.createElement('div');
    el.className = 'msg-system';
    el.innerHTML = `<span>${escHtml(msg.text || '')}</span>`;
    return el;
  }

  const row = document.createElement('div');
  row.className = `msg-row ${msg.sender === 'mae' ? 'out' : 'in'}`;
  row.dataset.idx = idx;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  switch (msg.type) {
    case 'text':
      bubble.innerHTML = `<span class="msg-text">${linkify(escHtml(msg.text || ''))}</span>
        <span class="msg-time">${msg.time}</span>`;
      break;

    case 'image':
      bubble.classList.add('media-bubble');
      bubble.innerHTML = `<div class="media-overlay">
        <img src="${mediaPath('fotos', msg.filename)}"
             alt="foto" loading="lazy"
             onerror="this.style.display='none'"
             onclick="openLightbox('${mediaPath('fotos', msg.filename)}','image','${escHtml(msg.date + ' ' + msg.time)}')">
        </div>
        <span class="msg-time">${msg.time}</span>`;
      break;

    case 'video':
      bubble.classList.add('media-bubble');
      const vPath = mediaPath('videos', msg.filename);
      bubble.innerHTML = `<div class="video-bubble" onclick="openLightbox('${vPath}','video','${escHtml(msg.date + ' ' + msg.time)}')">
        <video src="${vPath}" preload="none"></video>
        <div class="play-overlay">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </div>
      </div>
      <span class="msg-time">${msg.time}</span>`;
      break;

    case 'audio': {
      const aPath = mediaPath('audio', msg.filename);
      const uid   = 'aud_' + idx;
      bubble.innerHTML = buildAudioBubble(aPath, uid, msg.time);
      bubble.classList.add('audio-bubble');
      break;
    }

    case 'sticker':
      bubble.classList.add('sticker-bubble');
      bubble.innerHTML = `<img src="${mediaPath('stickers', msg.filename)}" alt="sticker" loading="lazy" onerror="this.style.display='none'">
        <span class="msg-time">${msg.time}</span>`;
      break;

    case 'document':
      bubble.innerHTML = buildDocBubble(msg);
      break;

    default:
      bubble.innerHTML = `<span class="msg-text" style="color:#8696a0;font-size:0.82rem">📎 ${escHtml(msg.filename || msg.text || '')}</span>
        <span class="msg-time">${msg.time}</span>`;
  }

  row.appendChild(bubble);
  return row;
}

function buildAudioBubble(path, uid, time) {
  const bars = Array.from({length: 30}, (_, i) => {
    const h = 6 + Math.floor(Math.sin(i * 0.7) * 8 + Math.random() * 8);
    return `<div class="bar" style="height:${h}px"></div>`;
  }).join('');

  return `
    <button class="audio-btn" onclick="toggleAudio('${uid}', '${path}', this)" title="Reproduzir áudio">
      <svg viewBox="0 0 24 24" id="${uid}_icon"><path d="M8 5v14l11-7z"/></svg>
    </button>
    <div class="audio-waveform" onclick="toggleAudio('${uid}', '${path}', this.previousElementSibling)">
      ${bars}
    </div>
    <span class="audio-duration" id="${uid}_dur">0:00</span>
    <span class="msg-time">${time}</span>
    <audio id="${uid}" src="${path}" preload="none"></audio>
  `;
}

function buildDocBubble(msg) {
  const name = msg.filename || 'documento';
  const ext  = (name.split('.').pop() || '').toUpperCase();
  const icon = ext === 'PDF' ? '📄' : ext === 'VCF' ? '👤' : '📎';
  const path = msg.type === 'contact'
    ? mediaPath('docs', msg.filename)
    : mediaPath('docs', msg.filename);
  return `<div class="doc-bubble">
    <a href="${path}" target="_blank" download>
      <span class="doc-icon">${icon}</span>
      <div class="doc-info">
        <div class="doc-name">${escHtml(name)}</div>
        <div class="doc-type">${ext}</div>
      </div>
    </a>
  </div>
  <span class="msg-time">${msg.time}</span>`;
}

// ── Player de áudio ────────────────────────────────────────────
window.toggleAudio = function(uid, path, btn) {
  const audio   = document.getElementById(uid);
  const iconEl  = document.getElementById(uid + '_icon');
  const durEl   = document.getElementById(uid + '_dur');
  const waveEl  = btn.closest('.bubble').querySelector('.audio-waveform');
  if (!audio) return;

  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.dispatchEvent(new Event('reset'));
  }

  if (audio.paused) {
    audio.play().catch(() => {});
    currentAudio = audio;
    iconEl.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

    audio.ontimeupdate = () => {
      durEl.textContent = formatSeconds(audio.currentTime);
      if (waveEl) {
        const pct = audio.duration ? audio.currentTime / audio.duration : 0;
        const bars = waveEl.querySelectorAll('.bar');
        bars.forEach((b, i) => b.classList.toggle('played', i / bars.length < pct));
      }
    };
    audio.onended = () => {
      iconEl.innerHTML = '<path d="M8 5v14l11-7z"/>';
      durEl.textContent = '0:00';
      if (waveEl) waveEl.querySelectorAll('.bar').forEach(b => b.classList.remove('played'));
      currentAudio = null;
    };
  } else {
    audio.pause();
    iconEl.innerHTML = '<path d="M8 5v14l11-7z"/>';
  }
};

// ── Lightbox ───────────────────────────────────────────────────
window.openLightbox = function(src, type, caption) {
  const lb      = document.getElementById('lightbox');
  const content = document.getElementById('lb-content');
  lb.classList.add('active');
  if (type === 'video') {
    content.innerHTML = `<video src="${src}" controls autoplay></video>`;
  } else {
    content.innerHTML = `<img src="${src}" alt="foto">`;
  }
  const cap = document.getElementById('lb-caption');
  if (cap) cap.textContent = caption || '';
};

document.getElementById('lb-close').onclick = closeLightbox;
document.getElementById('lightbox').onclick = e => {
  if (e.target === e.currentTarget) closeLightbox();
};

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('active');
  const vid = lb.querySelector('video');
  if (vid) vid.pause();
  document.getElementById('lb-content').innerHTML = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ── Busca ──────────────────────────────────────────────────────
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 300);
  searchClear.style.display = searchInput.value ? '' : 'none';
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  applyFilters();
});

yearFilter.addEventListener('change', applyFilters);

function applyFilters() {
  const q    = searchInput.value.trim().toLowerCase();
  const year = yearFilter.value;

  filteredMsgs = allMessages.filter(m => {
    if (year && !m.date.endsWith(year)) return false;
    if (q) {
      const text = (m.text || m.filename || '').toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  updateInfo();
  renderBatch(true);
}

// ── Helpers ────────────────────────────────────────────────────
function mediaPath(folder, filename) {
  return `${MEDIA_BASE}${folder}/${filename}`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkify(s) {
  return s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#53bdeb">$1</a>');
}

function formatDate(d) {
  const [day, mon, year] = d.split('/');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${day} de ${months[parseInt(mon,10)-1]} de ${year}`;
}

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}
