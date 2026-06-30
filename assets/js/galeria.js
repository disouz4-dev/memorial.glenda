'use strict';

const MEDIA_BASE = 'assets/media/';
let allItems  = [];
let curTab    = 'fotos';
let curIdx    = 0;

fetch('assets/chat_data.json')
  .then(r => r.json())
  .then(data => {
    allItems = data.messages
      .filter(m => m.type === 'image' || m.type === 'video')
      .sort((a, b) => {
        const toMs = m => {
          const [d, mo, y] = m.date.split('/');
          return new Date(`${y}-${mo}-${d}T${m.time}`).getTime();
        };
        return toMs(a) - toMs(b);
      });
    const count = document.getElementById('galeria-count');
    if (count) count.textContent = `${allItems.filter(m=>m.type==='image').length} fotos · ${allItems.filter(m=>m.type==='video').length} vídeos`;
    renderGaleria();
  });

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curTab = btn.dataset.tab;
    renderGaleria();
  });
});

function renderGaleria() {
  const grid  = document.getElementById('galeria-grid');
  const type  = curTab === 'fotos' ? 'image' : 'video';
  const items = allItems.filter(m => m.type === type);
  const visIdx = [];

  grid.innerHTML = '';

  items.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'galeria-item' + (type === 'video' ? ' video-item' : '');

    const src = type === 'image'
      ? `${MEDIA_BASE}fotos/${m.filename}`
      : `${MEDIA_BASE}videos/${m.filename}`;

    if (type === 'image') {
      const img = document.createElement('img');
      img.src    = src;
      img.alt    = m.date;
      img.loading = 'lazy';
      img.onerror = () => div.style.display = 'none';
      div.appendChild(img);
    } else {
      const vid = document.createElement('video');
      vid.src     = src;
      vid.preload = 'metadata';
      vid.onerror = () => div.style.display = 'none';
      div.appendChild(vid);
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'item-date';
    dateEl.textContent = m.date;
    div.appendChild(dateEl);

    const globalIdx = i;
    div.addEventListener('click', () => openLightbox(globalIdx, items));
    grid.appendChild(div);
  });

  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#8696a0">Nenhum arquivo encontrado.</p>';
  }
}

// ── Lightbox com navegação ────────────────────────────────────
function openLightbox(idx, items) {
  curIdx = idx;
  showItem(items);
  document.getElementById('lightbox').classList.add('active');
}

function showItem(items) {
  const m    = items[curIdx];
  const type = curTab === 'fotos' ? 'image' : 'video';
  const src  = type === 'image'
    ? `${MEDIA_BASE}fotos/${m.filename}`
    : `${MEDIA_BASE}videos/${m.filename}`;

  const content = document.getElementById('lb-content');
  content.innerHTML = type === 'video'
    ? `<video src="${src}" controls autoplay></video>`
    : `<img src="${src}" alt="foto">`;

  const cap = document.getElementById('lb-caption');
  if (cap) cap.textContent = `${m.date} às ${m.time}  (${curIdx + 1}/${items.length})`;
}

document.getElementById('lb-close').onclick = closeLightbox;
document.getElementById('lightbox').onclick = e => {
  if (e.target === e.currentTarget) closeLightbox();
};

document.getElementById('lb-prev').onclick = () => {
  const items = getItems();
  curIdx = (curIdx - 1 + items.length) % items.length;
  pauseVideo();
  showItem(items);
};
document.getElementById('lb-next').onclick = () => {
  const items = getItems();
  curIdx = (curIdx + 1) % items.length;
  pauseVideo();
  showItem(items);
};

document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('active')) return;
  if (e.key === 'Escape')       closeLightbox();
  if (e.key === 'ArrowLeft')    document.getElementById('lb-prev').click();
  if (e.key === 'ArrowRight')   document.getElementById('lb-next').click();
});

function closeLightbox() {
  pauseVideo();
  document.getElementById('lightbox').classList.remove('active');
  document.getElementById('lb-content').innerHTML = '';
}

function pauseVideo() {
  const vid = document.querySelector('#lb-content video');
  if (vid) vid.pause();
}

function getItems() {
  const type = curTab === 'fotos' ? 'image' : 'video';
  return allItems.filter(m => m.type === type);
}
