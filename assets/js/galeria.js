'use strict';

const MEDIA_BASE = 'assets/media/';
const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let allItems  = [];
let filtered  = [];
let curView   = 'meses';
let curType   = 'image';
let lbIdx     = 0;

// ── Carrega dados ──────────────────────────────────────────────
fetch('assets/chat_data.json')
  .then(r => r.json())
  .then(data => {
    allItems = data.messages
      .filter(m => m.type === 'image' || m.type === 'video')
      .sort((a, b) => {
        const toMs = m => {
          const [d,mo,y] = m.date.split('/');
          return new Date(`${y}-${mo}-${d}T${m.time}`).getTime();
        };
        return toMs(a) - toMs(b);
      });

    applyFilters();
    updateCount();
  });

function updateCount() {
  const fotos   = allItems.filter(m => m.type === 'image').length;
  const videos  = allItems.filter(m => m.type === 'video').length;
  const el      = document.getElementById('galeria-count');
  if (el) el.textContent = `${fotos.toLocaleString('pt-BR')} fotos · ${videos} vídeos`;
}

// ── Filtros ────────────────────────────────────────────────────
function applyFilters() {
  filtered = curType === 'all'
    ? allItems
    : allItems.filter(m => m.type === curType);
  render();
}

// ── Tabs ───────────────────────────────────────────────────────
document.querySelectorAll('.type-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curType = btn.dataset.type;
    applyFilters();
  });
});

document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curView = btn.dataset.view;
    render();
  });
});

// ── Render ─────────────────────────────────────────────────────
function render() {
  const main = document.getElementById('galeria-main');
  main.innerHTML = '';

  if (!filtered.length) {
    main.innerHTML = '<p style="text-align:center;padding:3rem;color:rgba(255,255,255,0.4)">Nenhum arquivo encontrado.</p>';
    return;
  }

  if (curView === 'todos')  renderTodos(main);
  else if (curView === 'anos')  renderAnos(main);
  else renderMeses(main);
}

function renderTodos(container) {
  const grid = document.createElement('div');
  grid.className = 'photo-grid';
  grid.style.gap = '1px';
  filtered.forEach((m, i) => grid.appendChild(makeCell(m, i)));
  container.appendChild(grid);
}

function renderMeses(container) {
  const groups = groupBy(filtered, m => {
    const [d,mo,y] = m.date.split('/');
    return `${y}-${mo.padStart(2,'0')}`;
  });

  Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).forEach(([key, items]) => {
    const [y, mo] = key.split('-');
    const label   = `${MONTHS_PT[parseInt(mo,10)-1]} de ${y}`;

    const group = document.createElement('div');
    group.className = 'month-group';

    const header = document.createElement('div');
    header.className = 'month-label';
    header.innerHTML = `${label} <span class="month-count">${items.length}</span>`;
    group.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    items.forEach((m) => {
      const globalIdx = filtered.indexOf(m);
      grid.appendChild(makeCell(m, globalIdx));
    });
    group.appendChild(grid);
    container.appendChild(group);
  });
}

function renderAnos(container) {
  const groups = groupBy(filtered, m => m.date.split('/')[2]);

  Object.entries(groups).sort(([a],[b]) => b.localeCompare(a)).forEach(([year, items]) => {
    const group = document.createElement('div');
    group.className = 'year-group';

    const label = document.createElement('div');
    label.className = 'year-label';
    label.textContent = year;
    group.appendChild(label);

    const preview = document.createElement('div');
    preview.className = 'year-preview';
    items.slice(0, 5).forEach((m) => {
      const globalIdx = filtered.indexOf(m);
      preview.appendChild(makeCell(m, globalIdx));
    });
    preview.addEventListener('click', () => {
      // Muda para vista meses filtrando esse ano
      curView = 'meses';
      document.querySelectorAll('.view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === 'meses');
      });
      filtered = filtered.filter(m => m.date.split('/')[2] === year);
      render();
    });
    group.appendChild(preview);

    const countEl = document.createElement('div');
    countEl.style.cssText = 'padding:0.3rem 1rem 0.5rem;font-size:0.8rem;color:rgba(255,255,255,0.4)';
    countEl.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;
    group.appendChild(countEl);

    container.appendChild(group);
  });
}

function makeCell(m, idx) {
  const cell = document.createElement('div');
  cell.className = 'photo-cell';

  const isVideo = m.type === 'video';
  const src = isVideo
    ? `${MEDIA_BASE}videos/${m.filename}`
    : `${MEDIA_BASE}fotos/${m.filename}`;

  if (isVideo) {
    const vid = document.createElement('video');
    vid.src     = src;
    vid.preload = 'metadata';
    vid.onerror = () => cell.style.display = 'none';
    cell.appendChild(vid);

    const badge = document.createElement('div');
    badge.className = 'video-badge';
    badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    cell.appendChild(badge);
  } else {
    const img = document.createElement('img');
    img.src     = src;
    img.alt     = m.date;
    img.loading = 'lazy';
    img.onerror = () => cell.style.display = 'none';
    cell.appendChild(img);
  }

  cell.addEventListener('click', () => openLightbox(idx));
  return cell;
}

// ── Lightbox ───────────────────────────────────────────────────
function openLightbox(idx) {
  lbIdx = idx;
  document.getElementById('iphone-lb').classList.add('active');
  document.body.style.overflow = 'hidden';
  renderLbMedia();
  renderStrip();
}

function closeLightbox() {
  const vid = document.querySelector('#lb-media video');
  if (vid) vid.pause();
  document.getElementById('iphone-lb').classList.remove('active');
  document.body.style.overflow = '';
}

function renderLbMedia() {
  const m   = filtered[lbIdx];
  const src = m.type === 'video'
    ? `${MEDIA_BASE}videos/${m.filename}`
    : `${MEDIA_BASE}fotos/${m.filename}`;

  const mediaEl = document.getElementById('lb-media');
  const prevVid = mediaEl.querySelector('video');
  if (prevVid) prevVid.pause();

  if (m.type === 'video') {
    mediaEl.innerHTML = `<video src="${src}" controls autoplay playsinline style="max-width:100%;max-height:80vh"></video>`;
  } else {
    mediaEl.innerHTML = `<img src="${src}" alt="${m.date}" style="max-width:100%;max-height:80vh;object-fit:contain">`;
  }

  document.getElementById('lb-date').textContent = formatDate(m.date);
  document.getElementById('lb-counter').textContent = `${lbIdx + 1} de ${filtered.length}`;

  const dl = document.getElementById('lb-download');
  dl.onclick = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = m.filename;
    a.click();
  };

  // Atualiza thumb ativo
  document.querySelectorAll('.lb-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === lbIdx);
  });
  const active = document.querySelector('.lb-thumb.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function renderStrip() {
  const strip = document.getElementById('lb-strip');
  strip.innerHTML = '';
  filtered.forEach((m, i) => {
    const src = m.type === 'video'
      ? `${MEDIA_BASE}videos/${m.filename}`
      : `${MEDIA_BASE}fotos/${m.filename}`;
    const thumb = document.createElement('div');
    thumb.className = `lb-thumb${i === lbIdx ? ' active' : ''}`;
    thumb.innerHTML = `<img src="${src}" loading="lazy" onerror="this.parentElement.style.display='none'">`;
    thumb.addEventListener('click', () => { lbIdx = i; renderLbMedia(); });
    strip.appendChild(thumb);
  });
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', () => {
  lbIdx = (lbIdx - 1 + filtered.length) % filtered.length;
  renderLbMedia();
});
document.getElementById('lb-next').addEventListener('click', () => {
  lbIdx = (lbIdx + 1) % filtered.length;
  renderLbMedia();
});

document.addEventListener('keydown', e => {
  if (!document.getElementById('iphone-lb').classList.contains('active')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  { lbIdx = (lbIdx-1+filtered.length)%filtered.length; renderLbMedia(); }
  if (e.key === 'ArrowRight') { lbIdx = (lbIdx+1)%filtered.length; renderLbMedia(); }
});

// Swipe touch
let touchStartX = 0;
document.getElementById('lb-media-wrap').addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
document.getElementById('lb-media-wrap').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 50) return;
  if (dx < 0) { lbIdx = (lbIdx+1) % filtered.length; }
  else        { lbIdx = (lbIdx-1+filtered.length) % filtered.length; }
  renderLbMedia();
});

// ── Helpers ────────────────────────────────────────────────────
function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

function formatDate(d) {
  const [day,mo,y] = d.split('/');
  return `${day} de ${MONTHS_PT[parseInt(mo,10)-1]} de ${y}`;
}
