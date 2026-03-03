(function () {
  'use strict';

  // Detect depth for relative asset paths
  const inMusings = location.pathname.includes('/musings/');
  const base = inMusings ? '../' : '';

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
  let pendingSeek   = null; // { time, paused }

  // ── DOM refs ──────────────────────────────────────────────────────────────────
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

  // ── Session state ─────────────────────────────────────────────────────────────
  const STATE_KEY = 'vp_state';

  function saveState() {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
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

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
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

  // ── Lottie ────────────────────────────────────────────────────────────────────
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

  // ── YouTube IFrame API ────────────────────────────────────────────────────────
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
              e.target.loadVideoById({ videoId: pendingAlbumId, startSeconds: pendingSeek.time });
              if (pendingSeek.paused) {
                setTimeout(function () { try { e.target.pauseVideo(); } catch (_) {} }, 800);
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
            if (barLottie) barLottie.play();
            startProgress();
          } else if (e.data === YT.PlayerState.PAUSED) {
            ppBtn.textContent = '▶';
            if (barLottie) barLottie.pause();
            stopProgress();
            saveState();
          } else if (e.data === YT.PlayerState.ENDED) {
            ppBtn.textContent = '▶';
            if (barLottie) barLottie.pause();
            stopProgress();
            autoAdvance();
          }
        }
      }
    });
  };

  // ── Progress ──────────────────────────────────────────────────────────────────
  function startProgress() {
    if (progressTimer) return;
    progressTimer = setInterval(updateProgress, 500);
  }

  function stopProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  }

  function updateProgress() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    try {
      const cur = ytPlayer.getCurrentTime();
      const dur = ytPlayer.getDuration();
      if (!dur) return;
      const pct = (cur / dur) * 100;
      seekFill.style.width = pct + '%';
      seekInput.value      = pct;
      timeEl.textContent   = formatTime(cur);
      saveState();
    } catch (_) {}
  }

  // ── Flip to album ─────────────────────────────────────────────────────────────
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
    }, { once: true });
  }

  function autoAdvance() {
    flipToAlbum((albumIdx + 1) % ALBUMS.length);
  }

  // ── Activate ──────────────────────────────────────────────────────────────────
  function activatePlayer() {
    idleSection.hidden   = true;
    activeSection.hidden = false;
    document.body.classList.add('has-np-bar');
    nowLink.href = base + 'now-playing.html';
    nowLink.removeAttribute('hidden');
    updateMeta(albumIdx);
    ensureLottie(function () {
      initBarLottie();
      ensureYT();
      pendingAlbumId = ALBUMS[albumIdx].ytId;
    });
  }

  // ── Close ─────────────────────────────────────────────────────────────────────
  function closePlayer() {
    if (ytPlayer) { try { ytPlayer.stopVideo(); } catch (_) {} }
    if (barLottie) barLottie.pause();
    stopProgress();
    hidePopup();
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

  // ── Popup ─────────────────────────────────────────────────────────────────────
  function positionPopup() {
    const barH      = bar.offsetHeight;
    const thumbRect = thumbWrap.getBoundingClientRect();
    popup.style.bottom = barH + 'px';
    popup.style.left   = thumbRect.left + 'px';
  }

  function showCoverPopup() {
    positionPopup();
    popupMeta.setAttribute('hidden', '');
    popup.removeAttribute('hidden');
    popupState = 'cover';
  }

  function showMetaPopup() {
    positionPopup();
    popupMeta.removeAttribute('hidden');
    popup.removeAttribute('hidden');
    infoEl.classList.add('is-hidden');
    popupState = 'meta';
  }

  function hidePopup() {
    popup.setAttribute('hidden', '');
    infoEl.classList.remove('is-hidden');
    popupMeta.setAttribute('hidden', '');
    popupState = 'hidden';
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  idlePlayBtn.addEventListener('click', activatePlayer);

  ppBtn.addEventListener('click', function () {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
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
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    try {
      const dur = ytPlayer.getDuration();
      if (dur) {
        ytPlayer.seekTo((seekInput.value / 100) * dur, true);
        seekFill.style.width = seekInput.value + '%';
      }
    } catch (_) {}
  });

  thumbWrap.addEventListener('mouseenter', function () {
    if (popupState === 'hidden') showCoverPopup();
  });

  thumbWrap.addEventListener('mouseleave', function (e) {
    if (popupState === 'cover' && !popup.contains(e.relatedTarget)) hidePopup();
  });

  thumbWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popupState === 'meta') hidePopup();
    else showMetaPopup();
  });

  popup.addEventListener('mouseleave', function (e) {
    if (popupState === 'cover' && !thumbWrap.contains(e.relatedTarget)) hidePopup();
  });

  popupImg.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popupState === 'meta') hidePopup();
    else showMetaPopup();
  });

  document.addEventListener('click', function (e) {
    if (popupState !== 'hidden' && !popup.contains(e.target) && !thumbWrap.contains(e.target)) {
      hidePopup();
    }
  });

  window.addEventListener('beforeunload', saveState);

  // ── Restore session on page load ──────────────────────────────────────────────
  const saved = loadState();
  if (saved && saved.active) {
    albumIdx = saved.albumIdx || 0;
    if (saved.currentTime) {
      pendingSeek = { time: saved.currentTime, paused: !saved.playing };
    }
    activatePlayer();
  }

})();
