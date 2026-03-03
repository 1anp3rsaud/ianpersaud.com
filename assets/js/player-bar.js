(function () {
  'use strict';

  // Detect depth for relative asset paths
  const inMusings = location.pathname.includes('/musings/');
  const base = inMusings ? '../' : '';

  // ── Inject bar & popup HTML ───────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
    <div id="np-bar" class="np-bar">
      <div class="np-idle" id="np-idle">
        <div class="np-container">
          <button class="np-idle-play" id="np-idle-play" aria-label="Start music">▶</button>
        </div>
      </div>
      <div class="np-active" id="np-active" hidden>
        <div class="np-container">
          <div class="np-left">
            <div class="np-vinyl" id="np-vinyl-lottie"></div>
            <div class="np-thumb-wrap" id="np-thumb-wrap">
              <div class="np-thumb-card" id="np-thumb-card">
                <div class="np-thumb-front"><img id="np-thumb-front-img" src="" alt=""></div>
                <div class="np-thumb-back"><img id="np-thumb-back-img" src="" alt=""></div>
              </div>
            </div>
          </div>
          <div class="np-info" id="np-info">
            <span class="np-track" id="np-track"></span>
            <span class="np-album" id="np-album"></span>
            <span class="np-artist" id="np-artist"></span>
          </div>
          <div class="np-seek">
            <div class="np-seek-track"><div class="np-seek-fill" id="np-seek-fill"></div></div>
            <input type="range" class="np-seek-input" id="np-seek-input" min="0" max="100" value="0" step="0.1">
            <span class="np-time" id="np-time">0:00</span>
          </div>
          <div class="np-ctrl">
            <button id="np-prev" aria-label="Previous album">⏮</button>
            <button id="np-pp" aria-label="Play/Pause">▶</button>
            <button id="np-next" aria-label="Next album">⏭</button>
            <a id="np-now-link" href="#" hidden>now playing →</a>
            <button id="np-close" aria-label="Close player">✕</button>
          </div>
        </div>
      </div>
      <div id="np-yt-player"></div>
    </div>
    <div id="np-popup" class="np-popup" hidden>
      <img id="np-popup-img" src="" alt="">
      <div id="np-popup-meta" hidden>
        <p id="np-pm-track"></p>
        <p id="np-pm-album-artist"></p>
        <p id="np-pm-time-year"></p>
        <p id="np-pm-emotion"></p>
        <p id="np-pm-notes"></p>
        <a id="np-pm-yt" href="" target="_blank" rel="noopener">↗ Stream on YouTube</a>
      </div>
    </div>`);

  const ALBUMS = [
    {
      track:   'Old Pasadena',
      album:   'Wyoming (Piano Works)',
      artist:  'Elijah Fox',
      duration:'1:40',
      year:    'March 2025',
      ytId:    'j66SXs8vdcM',
      cover:   base + 'assets/img/COVER ART_Wyoming (Piano Works) - Elijah Fox.jpg',
      emotion: 'Serenity, yet deep. I am reminded that as a person, my complexity is a blessing and a curse, but it is beautiful nonetheless.',
      notes:   "The chord progressions in this song stir a movement deep in my soul. When I heard this song for the first time, I was reminded that when you truly connect with a song, it is something you can deeply feel in your body. The light melody sets a stage for you, and then this compelling chord progression rises up, bringing your energy with it. This track seamlessly flows into the next track \"Alamosa, CO\" in a beautiful way, bring a more somber charge. A masterclass in how a composition can flow."
    },
    {
      track:   'Always in a Hurry',
      album:   'Always in a Hurry',
      artist:  'Medasin',
      duration:'2:35',
      year:    'April 2023',
      ytId:    'bxRMtZGDbZE',
      cover:   base + 'assets/img/COVER ART_Always in a Hurry - Medasin.jpg',
      emotion: 'Joy, A forward lean into life. Like the bullet train is moving fast, but I can sit back as a passenger and enjoy the speed.',
      notes:   "The drums are grass fed all natural in this track, those live drums sound sonically lush, and they always bring an incredible groove. The rising energy and the suspense makes me lean into absorb in full HD the moment I'm experiencing as this plays in my headphones. Then I am launched into action, into progression, with a twinge of joy and gratitude that the moment, the journey, the pursuit could be blessed with such a soundtrack."
    },
    {
      track:   'Ca$ino',
      album:   'Ca$ino',
      artist:  'Baby Keem',
      duration:'4:20',
      year:    'February 2026',
      ytId:    'osdQCYqZHkY',
      cover:   base + 'assets/img/COVER ART_ Casino - Baby Keem .png',
      emotion: 'Confidence, grit, feelings of power that I am capable of hard work, and that my hard work is something I can stand on.',
      notes:   "The song starts with a synth that has edge, like a warning siren that you're about to go into overdrive. The groove of the drums urges movement and Keem's flow encourages you to float around as you move around the world with it playing. The beat switch introduces a little light absurdity while Keem sings his praises. His confidence is contagious."
    }
  ];

  let albumIdx      = 0;
  let ytPlayer      = null;
  let barLottie     = null;
  let progressTimer = null;
  let popupState    = 'hidden'; // 'hidden' | 'cover' | 'meta'
  let pendingAlbumId = null;
  let pendingSeek   = null; // { time, paused, duration }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const bar           = document.getElementById('np-bar');
  const idleSection   = document.getElementById('np-idle');
  const activeSection = document.getElementById('np-active');
  const idlePlayBtn   = document.getElementById('np-idle-play');
  const thumbCard     = document.getElementById('np-thumb-card');
  const thumbWrap     = document.getElementById('np-thumb-wrap');
  const thumbFrontImg = document.getElementById('np-thumb-front-img');
  const thumbBackImg  = document.getElementById('np-thumb-back-img');
  const infoEl        = document.getElementById('np-info');
  const trackEl       = document.getElementById('np-track');
  const albumEl       = document.getElementById('np-album');
  const artistEl      = document.getElementById('np-artist');
  const seekFill      = document.getElementById('np-seek-fill');
  const seekInput     = document.getElementById('np-seek-input');
  const timeEl        = document.getElementById('np-time');
  const prevBtn       = document.getElementById('np-prev');
  const ppBtn         = document.getElementById('np-pp');
  const nextBtn       = document.getElementById('np-next');
  const nowLink       = document.getElementById('np-now-link');
  const closeBtn      = document.getElementById('np-close');
  const popup         = document.getElementById('np-popup');
  const popupImg      = document.getElementById('np-popup-img');
  const popupMeta     = document.getElementById('np-popup-meta');
  const pmTrack       = document.getElementById('np-pm-track');
  const pmAlbumArtist = document.getElementById('np-pm-album-artist');
  const pmTimeYear    = document.getElementById('np-pm-time-year');
  const pmEmotion     = document.getElementById('np-pm-emotion');
  const pmNotes       = document.getElementById('np-pm-notes');
  const pmYt          = document.getElementById('np-pm-yt');
  const lottieWrap    = document.getElementById('np-vinyl-lottie');

  // ── Session state ─────────────────────────────────────────────────────────
  const STATE_KEY = 'vp_state';

  function saveState() {
    if (!isYtReady('getPlayerState')) return;
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        active:      true,
        albumIdx:    albumIdx,
        playing:     ytPlayer.getPlayerState() === 1,
        currentTime: ytPlayer.getCurrentTime(),
        duration:    ytPlayer.getDuration()
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearState() {
    sessionStorage.removeItem(STATE_KEY);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function isYtReady(method) {
    return ytPlayer && typeof ytPlayer[method] === 'function';
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function updateMeta(idx) {
    const a = ALBUMS[idx];
    trackEl.textContent       = a.track;
    albumEl.textContent       = a.album;
    artistEl.textContent      = a.artist;
    thumbFrontImg.src         = a.cover;
    thumbFrontImg.alt         = a.album;
    pmTrack.textContent       = a.track;
    pmAlbumArtist.textContent = a.album + ' · ' + a.artist;
    pmTimeYear.textContent    = a.duration + ' · ' + a.year;
    pmEmotion.textContent     = a.emotion;
    pmNotes.textContent       = a.notes;
    pmYt.href                 = 'https://www.youtube.com/watch?v=' + a.ytId;
    pmYt.textContent          = '↗ Stream on YouTube';
    popupImg.src              = a.cover;
    popupImg.alt              = a.album;
  }

  // ── Lottie ────────────────────────────────────────────────────────────────
  function ensureLottie(cb) {
    if (window.lottie) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function initBarLottie() {
    if (barLottie) return;
    barLottie = window.lottie.loadAnimation({
      container: lottieWrap,
      renderer:  'svg',
      loop:      true,
      autoplay:  false,
      path:      base + 'assets/img/spinning-vinyl.json'
    });
  }

  // ── YouTube IFrame API ────────────────────────────────────────────────────
  function ensureYT() {
    if (window.YT && window.YT.Player) return;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  window.onYouTubeIframeAPIReady = function () {
    ytPlayer = new YT.Player('np-yt-player', {
      height: '1',
      width:  '1',
      playerVars: { autoplay: 1, controls: 0, playsinline: 1 },
      events: {
        onReady: function (e) {
          if (pendingAlbumId) {
            if (pendingSeek) {
              if (pendingSeek.paused) {
                // cueVideoById loads at startSeconds WITHOUT autoplaying
                e.target.cueVideoById({ videoId: pendingAlbumId, startSeconds: pendingSeek.time });
                // Pre-populate seek bar since updateProgress won't run until play
                if (pendingSeek.duration) {
                  const pct = (pendingSeek.time / pendingSeek.duration) * 100;
                  seekFill.style.width = pct + '%';
                  seekInput.value = pct;
                  timeEl.textContent = formatTime(pendingSeek.time);
                }
              } else {
                e.target.loadVideoById({ videoId: pendingAlbumId, startSeconds: pendingSeek.time });
              }
              pendingSeek = null;
            } else {
              e.target.loadVideoById(pendingAlbumId);
            }
            pendingAlbumId = null;
          }
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            ppBtn.textContent = '⏸';
            bar.classList.add('is-playing');
            if (barLottie) barLottie.play();
            startProgress();
          } else if (e.data === YT.PlayerState.PAUSED) {
            ppBtn.textContent = '▶';
            bar.classList.remove('is-playing');
            if (barLottie) barLottie.pause();
            stopProgress();
            saveState();
          } else if (e.data === YT.PlayerState.ENDED) {
            ppBtn.textContent = '▶';
            bar.classList.remove('is-playing');
            if (barLottie) barLottie.pause();
            stopProgress();
            autoAdvance();
          }
        }
      }
    });
  };

  // ── Progress ──────────────────────────────────────────────────────────────
  function startProgress() {
    if (progressTimer) return;
    progressTimer = setInterval(updateProgress, 500);
  }

  function stopProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  }

  function updateProgress() {
    if (!isYtReady('getCurrentTime')) return;
    try {
      const cur = ytPlayer.getCurrentTime();
      const dur = ytPlayer.getDuration();
      if (!dur) return;
      const pct = (cur / dur) * 100;
      seekFill.style.width = pct + '%';
      seekInput.value      = pct;
      timeEl.textContent   = formatTime(cur);
    } catch (_) {}
  }

  // ── Flip to album ─────────────────────────────────────────────────────────
  function flipToAlbum(idx) {
    thumbBackImg.src = ALBUMS[idx].cover;
    thumbBackImg.alt = ALBUMS[idx].album;
    thumbCard.classList.add('is-flipping');
    thumbCard.addEventListener('transitionend', function onFlipEnd() {
      thumbCard.removeEventListener('transitionend', onFlipEnd);
      thumbCard.style.transition = 'none';
      thumbFrontImg.src = ALBUMS[idx].cover;
      thumbFrontImg.alt = ALBUMS[idx].album;
      thumbCard.classList.remove('is-flipping');
      thumbCard.offsetHeight; // force reflow
      thumbCard.style.transition = '';
      albumIdx = idx;
      updateMeta(idx);
      if (ytPlayer) { try { ytPlayer.loadVideoById(ALBUMS[idx].ytId); } catch (_) {} }
      saveState();
    }, { once: true });
  }

  function autoAdvance() {
    flipToAlbum((albumIdx + 1) % ALBUMS.length);
  }

  // ── Activate ──────────────────────────────────────────────────────────────
  function activatePlayer() {
    idleSection.hidden   = true;
    activeSection.hidden = false;
    document.body.classList.add('has-np-bar');
    nowLink.href = base + 'now-playing.html';
    nowLink.hidden = false;
    updateMeta(albumIdx);
    ensureLottie(function () {
      initBarLottie();
      ensureYT();
      pendingAlbumId = ALBUMS[albumIdx].ytId;
    });
  }

  // ── Close ─────────────────────────────────────────────────────────────────
  function closePlayer() {
    if (ytPlayer) { try { ytPlayer.stopVideo(); } catch (_) {} }
    bar.classList.remove('is-playing');
    if (barLottie) barLottie.pause();
    stopProgress();
    setPopupState('hidden');
    bar.classList.add('is-retracting');
    setTimeout(function () {
      bar.classList.remove('is-retracting');
      idleSection.hidden   = false;
      activeSection.hidden = true;
      document.body.classList.remove('has-np-bar');
      seekFill.style.width = '0';
      seekInput.value      = 0;
      timeEl.textContent   = '0:00';
      ppBtn.textContent    = '▶';
      albumIdx  = 0;
      ytPlayer  = null;
      barLottie = null;
      clearState();
    }, 1000);
  }

  // ── Popup ─────────────────────────────────────────────────────────────────
  function positionPopup() {
    popup.style.bottom = bar.offsetHeight + 'px';
    popup.style.left   = thumbWrap.getBoundingClientRect().left + 'px';
  }

  function setPopupState(state) {
    if (state === 'cover') {
      positionPopup();
      popupMeta.hidden = true;
      popup.hidden = false;
    } else if (state === 'meta') {
      positionPopup();
      popupMeta.hidden = false;
      popup.hidden = false;
      infoEl.classList.add('is-hidden');
    } else {
      popup.hidden = true;
      infoEl.classList.remove('is-hidden');
      popupMeta.hidden = true;
    }
    popupState = state;
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  idlePlayBtn.addEventListener('click', activatePlayer);

  ppBtn.addEventListener('click', function () {
    if (!isYtReady('getPlayerState')) return;
    try {
      if (ytPlayer.getPlayerState() === 1) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    } catch (_) {}
  });

  prevBtn.addEventListener('click', function () {
    flipToAlbum((albumIdx - 1 + ALBUMS.length) % ALBUMS.length);
  });

  nextBtn.addEventListener('click', function () {
    flipToAlbum((albumIdx + 1) % ALBUMS.length);
  });

  closeBtn.addEventListener('click', closePlayer);

  seekInput.addEventListener('input', function () {
    if (!isYtReady('getDuration')) return;
    try {
      const dur = ytPlayer.getDuration();
      if (dur) {
        ytPlayer.seekTo((seekInput.value / 100) * dur, true);
        seekFill.style.width = seekInput.value + '%';
      }
    } catch (_) {}
  });

  thumbWrap.addEventListener('mouseenter', function () {
    if (popupState === 'hidden') setPopupState('cover');
  });

  thumbWrap.addEventListener('mouseleave', function (e) {
    if (popupState === 'cover' && !popup.contains(e.relatedTarget)) setPopupState('hidden');
  });

  thumbWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popupState === 'meta') setPopupState('hidden');
    else setPopupState('meta');
  });

  popup.addEventListener('mouseleave', function (e) {
    if (popupState === 'cover' && !thumbWrap.contains(e.relatedTarget)) setPopupState('hidden');
  });

  popupImg.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popupState === 'meta') setPopupState('hidden');
    else setPopupState('meta');
  });

  document.addEventListener('click', function (e) {
    if (popupState !== 'hidden' && !popup.contains(e.target) && !thumbWrap.contains(e.target)) {
      setPopupState('hidden');
    }
  });

  window.addEventListener('beforeunload', saveState);

  // ── Restore session on page load ──────────────────────────────────────────
  const saved = loadState();
  if (saved && saved.active) {
    albumIdx = saved.albumIdx || 0;
    if (saved.currentTime) {
      pendingSeek = { time: saved.currentTime, paused: !saved.playing, duration: saved.duration };
    }
    activatePlayer();
  }

})();
