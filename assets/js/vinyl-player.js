/* ── Vinyl Player ── */
(function () {
  'use strict';

  const ALBUMS = [
    { title: 'Wyoming (Piano Works)', artist: 'Elijah Fox', cover: 'assets/img/album-1.jpg', ytId: 'DYGeRCfAO0A', ytUrl: 'https://youtu.be/DYGeRCfAO0A' },
    { title: 'Always in a Hurry',    artist: 'Medasin',    cover: 'assets/img/album-2.jpg', ytId: 'bxRMtZGDbZE', ytUrl: 'https://youtu.be/bxRMtZGDbZE' },
    { title: 'Dramatic Girl',        artist: 'Baby Keem',  cover: 'assets/img/album-3.jpg', ytId: '7H8DIb_8ePo', ytUrl: 'https://youtu.be/7H8DIb_8ePo' },
  ];

  // DOM refs
  const playerEl      = document.getElementById('vinyl-player');
  const scene         = document.getElementById('vp-scene');
  const card          = document.getElementById('vp-card');
  const cover         = document.getElementById('vp-cover');
  const lottieWrap    = document.getElementById('vp-lottie-wrap');
  const changeBtn     = document.getElementById('vp-change-btn');
  const cursorWrap    = document.getElementById('cursor-vinyl-wrap');
  const cursorLottieEl = document.getElementById('cursor-vinyl-lottie');

  let albumIndex   = 0;
  let state        = 'idle';
  let hoverTimer   = null;
  let lottieAnim   = null;
  let cursorLottie = null;

  // ── Lottie (card back) ───────────────────────────────────────────────────────

  lottieAnim = lottie.loadAnimation({
    container: document.getElementById('vp-lottie'),
    renderer:  'svg',
    loop:      true,
    autoplay:  false,
    path:      'assets/img/spinning-vinyl.json',
  });

  // ── Cursor vinyl ─────────────────────────────────────────────────────────────

  cursorLottie = lottie.loadAnimation({
    container: cursorLottieEl,
    renderer: 'svg', loop: true, autoplay: false,
    path: 'assets/img/spinning-vinyl.json',
  });

  // Freeze at last frame once loaded
  cursorLottie.addEventListener('DOMLoaded', () => {
    cursorLottie.goToAndStop(cursorLottie.totalFrames - 1, true);
  });

  function moveCursor(e) {
    cursorWrap.style.left = e.clientX + 'px';
    cursorWrap.style.top  = e.clientY + 'px';
  }

  scene.addEventListener('mousemove', moveCursor);

  scene.addEventListener('mouseenter', () => {
    if (state === 'idle' || state === 'hovering') {
      cursorWrap.classList.add('is-visible');
      scene.classList.add('cursor-vinyl-active');
    }
  });

  scene.addEventListener('mouseleave', () => {
    if (state !== 'playing') {
      cursorWrap.classList.remove('is-visible');
      scene.classList.remove('cursor-vinyl-active');
    }
  });

  // ── State machine ─────────────────────────────────────────────────────────────

  function setState(next) {
    state = next;
    playerEl.classList.remove('is-playing', 'is-ended');

    if (next === 'hovering') {
      scene.classList.add('is-hovering');
    }

    if (next === 'idle') {
      scene.classList.remove('is-hovering');
      cursorWrap.classList.remove('is-visible');
      scene.classList.remove('cursor-vinyl-active');
      document.body.classList.remove('cursor-vinyl-active');
      document.removeEventListener('mousemove', moveCursor);
    }

    if (next === 'flipping') {
      loadAlbum(albumIndex);
      card.classList.add('is-flipped');
      // After flip (0.6s) → start vinyl slide-out
      setTimeout(() => setState('vinyl-out'), 600);
    }

    if (next === 'vinyl-out') {
      // Vinyl slides up from below the cover over 1.8s
      lottieWrap.classList.add('is-out');
      setTimeout(() => setState('playing'), 1800);
    }

    if (next === 'playing') {
      playerEl.classList.add('is-playing');
      if (lottieAnim) lottieAnim.play();
      window.dispatchEvent(new CustomEvent('vp:activate', { detail: { albumIndex } }));
      // Cursor vinyl: play + follow globally
      if (cursorLottie) cursorLottie.play();
      cursorWrap.classList.add('is-visible');
      document.body.classList.add('cursor-vinyl-active');
      document.addEventListener('mousemove', moveCursor);
    }

    if (next === 'ended') {
      playerEl.classList.add('is-ended');
      if (lottieAnim) lottieAnim.pause();
      if (cursorLottie) cursorLottie.pause();
      document.body.classList.remove('cursor-vinyl-active');
      cursorWrap.classList.remove('is-visible');
      document.removeEventListener('mousemove', moveCursor);
    }

    if (next === 'reversing') {
      if (lottieAnim) lottieAnim.stop();

      // Immediately begin un-flipping the card
      card.classList.remove('is-flipped');

      setTimeout(() => {
        // Snap lottie wrap back behind cover (off-screen below) without transition
        lottieWrap.style.transition = 'none';
        lottieWrap.classList.remove('is-out');
        // Re-enable transition on next paint for future slide-out
        requestAnimationFrame(() => requestAnimationFrame(() => {
          lottieWrap.style.transition = '';
        }));

        window.dispatchEvent(new CustomEvent('vp:change-record', { detail: { albumIndex: (albumIndex + 1) % ALBUMS.length } }));
        albumIndex = (albumIndex + 1) % ALBUMS.length;
        setState('flipping');
      }, 650);  // just after un-flip completes
    }
  }

  // ── Album loader ──────────────────────────────────────────────────────────────

  function loadAlbum(idx) {
    const a = ALBUMS[idx];
    cover.src = a.cover;
    cover.alt = a.title;
  }

  // ── Hover interaction ─────────────────────────────────────────────────────────

  scene.addEventListener('mouseenter', () => {
    if (state !== 'idle') return;
    hoverTimer = setTimeout(() => setState('hovering'), 2000);
  });

  scene.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    if (state === 'hovering') setState('idle');
  });

  scene.addEventListener('click', () => {
    if (state === 'idle' || state === 'hovering') {
      clearTimeout(hoverTimer);
      hoverTimer = null;
      setState('flipping');
    }
  });

  // ── Change record ──────────────────────────────────────────────────────────────

  changeBtn.addEventListener('click', () => {
    if (state === 'ended') setState('reversing');
  });

  // ── Listen for player-bar events ─────────────────────────────────────────────

  window.addEventListener('vp:track-ended', () => setState('ended'));
  window.addEventListener('vp:paused', () => {
    if (cursorLottie) cursorLottie.pause();
  });
  window.addEventListener('vp:playing', () => {
    if (state === 'playing' && cursorLottie) cursorLottie.play();
  });
})();
