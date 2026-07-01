'use strict';

const PLAYLIST = [
  { title: "Stitches",                  artist: "Shawn Mendes",       file: "Shawn Mendes - Stitches.mp3" },
  { title: "Treat You Better",          artist: "Shawn Mendes",       file: "Shawn Mendes - Treat You Better.mp3" },
  { title: "Nothing Holding Me Back",   artist: "Shawn Mendes",       file: "Shawn Mendes - Nothing Holding Me.mp3" },
  { title: "In My Blood",               artist: "Shawn Mendes",       file: "Shawn Mendes - In My Blood.mp3" },
  { title: "Mercy",                     artist: "Shawn Mendes",       file: "Shawn Mendes - Mercy.mp3" },
  { title: "Thank U, Next",             artist: "Ariana Grande",      file: "Ariana Grande - Thank U, Next.mp3" },
  { title: "7 Rings",                   artist: "Ariana Grande",      file: "Ariana Grande - 7 Rings.mp3" },
  { title: "Problem",                   artist: "Ariana Grande",      file: "Ariana Grande - Problem .mp3" },
  { title: "Break Free",                artist: "Ariana Grande",      file: "Zedd feat Ariana Grande - Break Free - [9cb34e].mp3" },
  { title: "Into You",                  artist: "Ariana Grande",      file: "Ariana Grande - Into You.mp3" },
  { title: "As It Was",                 artist: "Harry Styles",       file: "Harry Styles - As It Was.mp3" },
  { title: "Watermelon Sugar",          artist: "Harry Styles",       file: "Harry Styles - Watermelon Sugar.mp3" },
  { title: "Adore You",                 artist: "Harry Styles",       file: "Harry Styles - Adore You.mp3" },
  { title: "Golden",                    artist: "Harry Styles",       file: "Harry Styles - Golden.mp3" },
  { title: "Sign of the Times",         artist: "Harry Styles",       file: "Harry Styles - Sign of the Times.mp3" },
];

const MEDIA_BASE = 'assets/media/musicas/';
const STORAGE_KEY = 'memorial_player';

let audio        = new Audio();
let shuffleOn    = true;
let isPlaying    = false;
let currentIdx   = 0;
let shuffleOrder = [];
let shufflePos   = 0;
let playerReady  = false;

// ── Persistência entre páginas ──────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentIdx, shuffleOn, shuffleOrder, shufflePos,
    currentTime: audio.currentTime,
    isPlaying
  }));
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!s) return;
    currentIdx   = s.currentIdx   ?? 0;
    shuffleOn    = s.shuffleOn    ?? true;
    shuffleOrder = s.shuffleOrder ?? [];
    shufflePos   = s.shufflePos   ?? 0;
    if (s.currentTime > 0) {
      audio.addEventListener('canplay', () => { audio.currentTime = s.currentTime; }, { once: true });
    }
  } catch(e) {}
}

// ── Shuffle ─────────────────────────────────────────────────────
function buildShuffle(startIdx) {
  shuffleOrder = [...Array(PLAYLIST.length).keys()].filter(i => i !== startIdx);
  for (let i = shuffleOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
  }
  shuffleOrder.unshift(startIdx);
  shufflePos = 0;
}

// ── Playback ────────────────────────────────────────────────────
function loadTrack(idx, autoplay) {
  currentIdx  = idx;
  const track = PLAYLIST[idx];
  audio.src   = MEDIA_BASE + encodeURIComponent(track.file);
  audio.volume = parseFloat(document.getElementById('mp-vol')?.value ?? 0.7);
  updateUI();
  if (autoplay) audio.play().catch(() => {});
  saveState();
}

function play() {
  audio.play().catch(() => {});
  isPlaying = true;
  updatePlayBtn();
  saveState();
}

function pause() {
  audio.pause();
  isPlaying = false;
  updatePlayBtn();
  saveState();
}

function playNext() {
  if (shuffleOn) {
    shufflePos = (shufflePos + 1) % shuffleOrder.length;
    if (shufflePos === 0) buildShuffle(shuffleOrder[0]);
    loadTrack(shuffleOrder[shufflePos], true);
  } else {
    loadTrack((currentIdx + 1) % PLAYLIST.length, true);
  }
}

function playPrev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (shuffleOn) {
    shufflePos = (shufflePos - 1 + shuffleOrder.length) % shuffleOrder.length;
    loadTrack(shuffleOrder[shufflePos], true);
  } else {
    loadTrack((currentIdx - 1 + PLAYLIST.length) % PLAYLIST.length, true);
  }
}

audio.addEventListener('ended', playNext);
audio.addEventListener('timeupdate', () => {
  const bar = document.getElementById('mp-progress');
  if (bar && audio.duration) bar.value = audio.currentTime / audio.duration;
  saveState();
});

// ── UI ──────────────────────────────────────────────────────────
function updateUI() {
  const track = PLAYLIST[currentIdx];
  const title = document.getElementById('mp-title');
  const artist = document.getElementById('mp-artist');
  if (title)  title.textContent  = track.title;
  if (artist) artist.textContent = track.artist;

  document.querySelectorAll('.pl-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIdx);
  });
}

function updatePlayBtn() {
  const btn = document.getElementById('mp-play');
  if (!btn) return;
  btn.innerHTML = isPlaying
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}

// ── Injetar HTML do player ───────────────────────────────────────
function injectPlayer() {
  const playlistHTML = PLAYLIST.map((t, i) => `
    <div class="pl-item${i === currentIdx ? ' active' : ''}" data-idx="${i}">
      <div class="pl-item-info">
        <span class="pl-title">${t.title}</span>
        <span class="pl-artist">${t.artist}</span>
      </div>
      <svg class="pl-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
  `).join('');

  const html = `
  <div id="music-player" class="music-player">
    <div class="mp-hint" id="mp-hint">🎵 Toca para iniciar a música de fundo</div>

    <div class="mp-bar">
      <button class="mp-btn mp-sm" id="mp-toggle-list" title="Playlist">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
      </button>

      <div class="mp-info">
        <div id="mp-title" class="mp-title">—</div>
        <div id="mp-artist" class="mp-artist">—</div>
      </div>

      <div class="mp-controls">
        <button class="mp-btn" id="mp-prev" title="Anterior">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button class="mp-btn mp-play-btn" id="mp-play" title="Play/Pause">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="mp-btn" id="mp-next" title="Próxima">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button class="mp-btn mp-shuffle${shuffleOn ? ' on' : ''}" id="mp-shuffle" title="Aleatório">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.79 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
        </button>
      </div>

      <div class="mp-vol-wrap">
        <svg viewBox="0 0 24 24" fill="currentColor" class="mp-vol-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        <input type="range" id="mp-vol" min="0" max="1" step="0.01" value="0.7">
      </div>
    </div>

    <input type="range" id="mp-progress" class="mp-progress" min="0" max="1" step="0.001" value="0">

    <div class="mp-playlist-wrap" id="mp-playlist-wrap">
      <div class="mp-playlist-header">
        <span>Playlist — ${PLAYLIST.length} músicas</span>
        <button class="mp-btn mp-sm" id="mp-close-list">✕</button>
      </div>
      <div class="mp-playlist" id="mp-playlist">${playlistHTML}</div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  bindEvents();
  updateUI();
}

function bindEvents() {
  document.getElementById('mp-play').addEventListener('click', () => {
    dismissHint();
    isPlaying ? pause() : play();
  });
  document.getElementById('mp-prev').addEventListener('click', () => { dismissHint(); playPrev(); });
  document.getElementById('mp-next').addEventListener('click', () => { dismissHint(); playNext(); });

  document.getElementById('mp-shuffle').addEventListener('click', () => {
    shuffleOn = !shuffleOn;
    document.getElementById('mp-shuffle').classList.toggle('on', shuffleOn);
    if (shuffleOn) buildShuffle(currentIdx);
    saveState();
  });

  document.getElementById('mp-vol').addEventListener('input', e => {
    audio.volume = parseFloat(e.target.value);
    saveState();
  });

  document.getElementById('mp-progress').addEventListener('input', e => {
    if (audio.duration) audio.currentTime = parseFloat(e.target.value) * audio.duration;
  });

  document.getElementById('mp-toggle-list').addEventListener('click', () => {
    document.getElementById('mp-playlist-wrap').classList.toggle('open');
  });
  document.getElementById('mp-close-list').addEventListener('click', () => {
    document.getElementById('mp-playlist-wrap').classList.remove('open');
  });

  document.getElementById('mp-playlist').addEventListener('click', e => {
    const item = e.target.closest('.pl-item');
    if (!item) return;
    dismissHint();
    const idx = parseInt(item.dataset.idx);
    if (shuffleOn) buildShuffle(idx);
    loadTrack(idx, true);
    isPlaying = true;
    updatePlayBtn();
  });

  // Hint click
  document.getElementById('mp-hint').addEventListener('click', () => {
    dismissHint();
    play();
  });

  // Primeiro toque na página inicia música
  const startOnInteraction = () => {
    if (!playerReady) return;
    if (!isPlaying && audio.src) {
      play();
    }
    document.removeEventListener('click', startOnInteraction);
  };
  document.addEventListener('click', startOnInteraction);
}

function dismissHint() {
  const hint = document.getElementById('mp-hint');
  if (hint) hint.style.display = 'none';
  playerReady = true;
}

// ── Autoplay com fallback ─────────────────────────────────────────
function tryAutoplay() {
  audio.muted = false;
  audio.play()
    .then(() => {
      // Tocou com som direto
      isPlaying = true;
      updatePlayBtn();
      dismissHint();
      saveState();
    })
    .catch(() => {
      // Bloqueado — tenta mudo (sempre permitido)
      audio.muted = true;
      audio.play()
        .then(() => {
          // Toca mudo e tenta desmutar imediatamente
          audio.muted = false;
          if (!audio.muted) {
            // Desmutou — tudo certo
            isPlaying = true;
            updatePlayBtn();
            dismissHint();
            saveState();
          } else {
            // Ainda mudo — aguarda primeiro toque
            audio.pause();
            showHint();
            waitForInteraction();
          }
        })
        .catch(() => {
          showHint();
          waitForInteraction();
        });
    });
}

function showHint() {
  const hint = document.getElementById('mp-hint');
  if (hint) hint.style.display = '';
}

function waitForInteraction() {
  const unlock = () => {
    audio.muted = false;
    audio.play().then(() => {
      isPlaying = true;
      updatePlayBtn();
      dismissHint();
      saveState();
    }).catch(() => {});
    document.removeEventListener('click',      unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown',    unlock);
  };
  document.addEventListener('click',      unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('keydown',    unlock, { once: true });
}

// ── Ducking (abaixa player quando áudio da conversa toca) ────────
let _duckVol = null;
let _duckTimer = null;

function rampVolume(from, to, ms, onDone) {
  const steps = 20;
  const delta = (to - from) / steps;
  let step = 0;
  clearInterval(_duckTimer);
  _duckTimer = setInterval(() => {
    step++;
    audio.volume = Math.min(1, Math.max(0, from + delta * step));
    const slider = document.getElementById('mp-vol');
    if (slider) slider.value = audio.volume;
    if (step >= steps) {
      clearInterval(_duckTimer);
      if (onDone) onDone();
    }
  }, ms / steps);
}

window.playerDuck = function(duck) {
  if (duck) {
    if (_duckVol === null) _duckVol = audio.volume;
    rampVolume(audio.volume, Math.max(0.04, audio.volume * 0.15), 300);
  } else {
    const target = _duckVol ?? 0.7;
    _duckVol = null;
    rampVolume(audio.volume, target, 500);
  }
};

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (shuffleOn && shuffleOrder.length === 0) buildShuffle(0);
  injectPlayer();

  const startIdx = shuffleOn ? shuffleOrder[0] : currentIdx;
  loadTrack(startIdx, false);
  audio.volume = 0.7;

  // Tenta autoplay após carregar o áudio
  audio.addEventListener('canplay', tryAutoplay, { once: true });
});
