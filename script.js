/**
 * छठ पूजा • Chhath Puja - Sacred Devotional Music Experience
 * Plain Vanilla JavaScript Audio Engine with YouTube IFrame API
 */

// =============================================================================
// APP STATE MANAGEMENT
// =============================================================================

const state = {
  songs: [],
  filteredSongs: [],
  currentSongIndex: 0,
  isPlaying: false,
  isShuffle: false,
  loopMode: 'all', // 'off' | 'all' | 'one'
  volume: 80,
  isMuted: false,
  previousVolume: 80,
  favorites: new Set(),
  currentCategory: 'ALL',
  searchQuery: '',
  viewMode: 'evening', // 'morning' (Usha Arghya) | 'evening' (Sandhya Arghya)
  displayMode: 'disc', // 'disc' | 'video'
  isPlayerVisible: true,
  isPlaylistVisible: true,
  isZenMode: false,
  targetDownloadSong: null,
  offlineSongs: new Set(),
  ytPlayer: null,
  ytReady: false,
  progressInterval: null,
  visualizerInterval: null,
  duration: 0,
  currentTime: 0
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initParticles();
  initVisualizerBars();
  loadSongs();
  setupEventListeners();
  loadYouTubeAPI();
});

// =============================================================================
// LOCAL STORAGE PERSISTENCE
// =============================================================================

function initStorage() {
  try {
    const savedView = localStorage.getItem('chhath_view_mode');
    if (savedView === 'morning' || savedView === 'evening') {
      state.viewMode = savedView;
    }
    applyViewMode(state.viewMode);

    const savedDisplay = localStorage.getItem('chhath_player_display_mode');
    if (savedDisplay === 'video' || savedDisplay === 'disc') {
      setPlayerDisplayMode(savedDisplay, false);
    } else {
      setPlayerDisplayMode('disc', false);
    }

    const savedVol = localStorage.getItem('chhath_player_vol');
    if (savedVol !== null) state.volume = parseInt(savedVol, 10);

    const savedLoop = localStorage.getItem('chhath_player_loop');
    if (savedLoop) state.loopMode = savedLoop;

    const savedShuffle = localStorage.getItem('chhath_player_shuffle');
    if (savedShuffle !== null) state.isShuffle = savedShuffle === 'true';

    const savedFavs = localStorage.getItem('chhath_player_favorites');
    if (savedFavs) {
      const arr = JSON.parse(savedFavs);
      state.favorites = new Set(arr);
    }

    const savedPlaylist = localStorage.getItem('chhath_playlist_visible');
    if (savedPlaylist !== null) {
      state.isPlaylistVisible = savedPlaylist === 'true';
    }
    applyPlaylistVisibility(state.isPlaylistVisible);

    const savedPlayer = localStorage.getItem('chhath_player_visible');
    if (savedPlayer !== null) {
      state.isPlayerVisible = savedPlayer === 'true';
    }
    applyPlayerVisibility(state.isPlayerVisible);

    const savedOffline = localStorage.getItem('chhath_offline_songs');
    if (savedOffline) {
      state.offlineSongs = new Set(JSON.parse(savedOffline));
    }
  } catch (err) {
    console.warn('Could not read from localStorage:', err);
  }
}

function saveStorage() {
  try {
    localStorage.setItem('chhath_view_mode', state.viewMode);
    localStorage.setItem('chhath_player_vol', state.volume.toString());
    localStorage.setItem('chhath_player_loop', state.loopMode);
    localStorage.setItem('chhath_player_shuffle', state.isShuffle.toString());
    localStorage.setItem('chhath_player_favorites', JSON.stringify(Array.from(state.favorites)));
    if (state.songs.length > 0 && state.songs[state.currentSongIndex]) {
      localStorage.setItem('chhath_player_last_song_id', state.songs[state.currentSongIndex].id.toString());
    }
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
}

// =============================================================================
// MORNING & EVENING VIEW SWITCHER
// =============================================================================

function toggleViewMode() {
  state.viewMode = state.viewMode === 'evening' ? 'morning' : 'evening';
  applyViewMode(state.viewMode);
  const msg = state.viewMode === 'morning' 
    ? '🌅 Morning View: उषा अर्घ्य (Dawn Arghya & Sunrise Ghat)' 
    : '🌆 Evening View: संध्या अर्घ्य (Sunset Arghya & Glowing Lamps)';
  showToast(msg);
  saveStorage();
}

function applyViewMode(mode) {
  const body = document.body;
  const label = document.getElementById('view-label');
  const icon = document.getElementById('view-icon');

  if (mode === 'morning') {
    body.classList.remove('view-evening');
    body.classList.add('view-morning');
    if (label) label.textContent = 'Morning View';
    if (icon) icon.textContent = '🌅';
  } else {
    body.classList.remove('view-morning');
    body.classList.add('view-evening');
    if (label) label.textContent = 'Evening View';
    if (icon) icon.textContent = '🌆';
  }
}

// =============================================================================
// PLAYER DISPLAY MODE: SACRED DIYA DISC VS PLAY VIDEO (IFRAME)
// =============================================================================

function setPlayerDisplayMode(mode, notify = true) {
  state.displayMode = mode;
  const card = document.getElementById('now-playing-card');
  const tabDisc = document.getElementById('tab-disc-mode');
  const tabVideo = document.getElementById('tab-video-mode');

  if (mode === 'video') {
    if (card) card.classList.add('mode-show-video');
    if (tabDisc) {
      tabDisc.classList.remove('active');
      tabDisc.setAttribute('aria-selected', 'false');
    }
    if (tabVideo) {
      tabVideo.classList.add('active');
      tabVideo.setAttribute('aria-selected', 'true');
    }
    if (notify) showToast('📺 Video Mode: Watching Song Video in Iframe');
  } else {
    if (card) card.classList.remove('mode-show-video');
    if (tabDisc) {
      tabDisc.classList.add('active');
      tabDisc.setAttribute('aria-selected', 'true');
    }
    if (tabVideo) {
      tabVideo.classList.remove('active');
      tabVideo.setAttribute('aria-selected', 'false');
    }
    if (notify) showToast('🪔 Sacred Diya Mode: Spinning Disc & Visualizer');
  }

  try {
    localStorage.setItem('chhath_player_display_mode', mode);
  } catch (err) {}
}

// =============================================================================
// PLAYER HIDE & SHOW SYSTEM (COLLAPSIBLE / FOCUSED LIST VIEW)
// =============================================================================

function togglePlayerVisibility() {
  state.isPlayerVisible = !state.isPlayerVisible;
  applyPlayerVisibility(state.isPlayerVisible);
  showToast(state.isPlayerVisible ? '🎵 Music Player Shown' : '👁️ Music Player Hidden (Press H to restore)');
  try {
    localStorage.setItem('chhath_player_visible', state.isPlayerVisible ? 'true' : 'false');
  } catch (e) {}
}

function applyPlayerVisibility(visible) {
  const layout = document.querySelector('.player-layout');
  const playerCol = document.querySelector('.player-column');
  const floatingBtn = document.getElementById('floating-show-player-btn');
  const headerBtn = document.getElementById('btn-header-toggle-player');

  if (layout) layout.classList.toggle('player-hidden', !visible);
  if (playerCol) playerCol.classList.toggle('hidden', !visible);
  if (floatingBtn) floatingBtn.classList.toggle('hidden', visible);

  if (headerBtn) {
    const btnText = headerBtn.querySelector('.btn-text');
    const btnIcon = headerBtn.querySelector('.btn-icon');
    if (btnText) btnText.textContent = visible ? 'Hide Player' : 'Show Player';
    if (btnIcon) btnIcon.textContent = visible ? '🎵' : '👁️';
    headerBtn.classList.toggle('active', !visible);
  }

  updateFloatingPlayerLabel();
}

function updateFloatingPlayerLabel() {
  const label = document.getElementById('floating-player-label');
  if (!label) return;
  const current = state.songs[state.currentSongIndex];
  if (current) {
    const shortTitle = current.title.length > 20 ? current.title.substring(0, 18) + '...' : current.title;
    label.textContent = `Show Player (${shortTitle})`;
  } else {
    label.textContent = 'Show Player';
  }
}

// =============================================================================
// PLAYLIST HIDE & SHOW SYSTEM (COLLAPSIBLE / FOCUS MODE)
// =============================================================================

function togglePlaylistVisibility() {
  state.isPlaylistVisible = !state.isPlaylistVisible;
  applyPlaylistVisibility(state.isPlaylistVisible);
  showToast(state.isPlaylistVisible ? '📜 Sacred Playlist Shown (500 Tracks)' : '👁️ Playlist Hidden (Focused Cinema Mode)');
  try {
    localStorage.setItem('chhath_playlist_visible', state.isPlaylistVisible ? 'true' : 'false');
  } catch (e) {}
}

function applyPlaylistVisibility(visible) {
  const layout = document.querySelector('.player-layout');
  const playlistCol = document.getElementById('playlist-column');
  const floatingBtn = document.getElementById('floating-show-playlist-btn');
  const headerBtn = document.getElementById('btn-header-toggle-playlist');
  const cardPlaylistBtn = document.getElementById('btn-card-toggle-playlist');

  if (layout) layout.classList.toggle('playlist-hidden', !visible);
  if (playlistCol) playlistCol.classList.toggle('hidden', !visible);
  if (floatingBtn) floatingBtn.classList.toggle('hidden', visible);

  if (headerBtn) {
    const btnText = headerBtn.querySelector('.btn-text');
    const btnIcon = headerBtn.querySelector('.btn-icon');
    if (btnText) btnText.textContent = visible ? 'Hide Playlist' : 'Show Playlist';
    if (btnIcon) btnIcon.textContent = visible ? '📜' : '👁️';
    headerBtn.classList.toggle('active', !visible);
  }

  if (cardPlaylistBtn) {
    cardPlaylistBtn.classList.toggle('active', visible);
    cardPlaylistBtn.title = visible ? 'Hide Playlist (P)' : 'Show Playlist (P)';
  }
}

function toggleZenMode() {
  state.isZenMode = !state.isZenMode;
  document.body.classList.toggle('zen-mode', state.isZenMode);
  const zenIcon = document.getElementById('zen-icon');
  const zenBtn = document.getElementById('btn-zen-mode');
  if (zenIcon) zenIcon.textContent = state.isZenMode ? '👁️‍🗨️' : '👁️';
  if (zenBtn) zenBtn.classList.toggle('active', state.isZenMode);
  showToast(state.isZenMode ? '✨ Cinema Mode: UI Hidden. Enjoy the Ghat! (Press Z to restore)' : '🌟 UI Restored');
}

// =============================================================================
// SONG DOWNLOAD & OFFLINE SYSTEM
// =============================================================================

function openDownloadModal(song) {
  if (!song) song = state.songs[state.currentSongIndex];
  if (!song) return;

  state.targetDownloadSong = song;

  const modal = document.getElementById('download-modal');
  const titleEl = document.getElementById('dl-preview-title');
  const artistEl = document.getElementById('dl-preview-artist');
  const catEl = document.getElementById('dl-preview-category');
  const openYtEl = document.getElementById('btn-dl-open-yt');
  const offlineBtnText = document.getElementById('dl-offline-btn-text');
  const offlineDesc = document.getElementById('dl-offline-desc');

  if (titleEl) titleEl.textContent = song.title;
  if (artistEl) artistEl.textContent = song.artist;
  if (catEl) catEl.textContent = song.category;
  if (openYtEl && song.youtubeId) {
    openYtEl.href = `https://www.youtube.com/watch?v=${song.youtubeId}`;
  }

  const isOffline = state.offlineSongs.has(song.id);
  if (offlineBtnText) offlineBtnText.textContent = isOffline ? '✅ Saved Offline' : '💾 Save Offline';
  if (offlineDesc) offlineDesc.textContent = isOffline ? 'This sacred geet is saved in your offline library' : 'Keep in browser offline library to play without internet';

  if (modal) modal.classList.remove('hidden');
}

function closeDownloadModal() {
  const modal = document.getElementById('download-modal');
  if (modal) modal.classList.add('hidden');
}

function downloadCurrentSongMp3() {
  const song = state.targetDownloadSong || state.songs[state.currentSongIndex];
  if (!song) return;

  showToast(`📥 Downloading MP3: ${song.title}... जय छठी मइया!`);

  const dlUrl = `https://y2mate.nu/en/download/?url=https://www.youtube.com/watch?v=${encodeURIComponent(song.youtubeId)}`;
  window.open(dlUrl, '_blank', 'noopener,noreferrer');
}

function downloadCurrentSongVideo() {
  const song = state.targetDownloadSong || state.songs[state.currentSongIndex];
  if (!song) return;

  showToast(`📺 Preparing HD Video: ${song.title}...`);

  const dlUrl = `https://9xbuddy.com/process?url=https://www.youtube.com/watch?v=${encodeURIComponent(song.youtubeId)}`;
  window.open(dlUrl, '_blank', 'noopener,noreferrer');
}

function toggleOfflineTargetSong() {
  const song = state.targetDownloadSong || state.songs[state.currentSongIndex];
  if (!song) return;

  const offlineBtnText = document.getElementById('dl-offline-btn-text');
  const offlineDesc = document.getElementById('dl-offline-desc');

  if (state.offlineSongs.has(song.id)) {
    state.offlineSongs.delete(song.id);
    if (offlineBtnText) offlineBtnText.textContent = '💾 Save Offline';
    if (offlineDesc) offlineDesc.textContent = 'Keep in browser offline library to play without internet';
    showToast(`Removed "${song.title}" from offline library`);
  } else {
    state.offlineSongs.add(song.id);
    if (offlineBtnText) offlineBtnText.textContent = '✅ Saved Offline';
    if (offlineDesc) offlineDesc.textContent = 'This sacred geet is saved in your offline library';
    showToast(`💾 "${song.title}" saved for offline listening!`);
  }

  try {
    localStorage.setItem('chhath_offline_songs', JSON.stringify([...state.offlineSongs]));
  } catch (e) {}
}

function copyTargetSongLink() {
  const song = state.targetDownloadSong || state.songs[state.currentSongIndex];
  if (!song) return;

  const url = `https://www.youtube.com/watch?v=${song.youtubeId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('📋 Official Song Link copied to clipboard!');
    }).catch(() => {
      fallbackCopyText(url);
    });
  } else {
    fallbackCopyText(url);
  }
}

function fallbackCopyText(text) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showToast('📋 Official Song Link copied to clipboard!');
}

// =============================================================================
// FLOATING EMBER & MARIGOLD PARTICLES (CANVAS)
// =============================================================================

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const maxParticles = 65;

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.radius = Math.random() * 2.5 + 0.8;
      this.speedY = Math.random() * 1.1 + 0.35;
      this.speedX = (Math.random() - 0.5) * 0.7;
      this.alpha = Math.random() * 0.75 + 0.25;
      this.decay = Math.random() * 0.003 + 0.0018;

      // Color tuned based on view mode (Morning dawn gold vs Evening sunset saffron)
      const isMorning = state.viewMode === 'morning';
      const hue = isMorning
        ? 45 + Math.random() * 15 // Golden yellow rays
        : 22 + Math.random() * 18; // Warm saffron flame
      this.color = `hsla(${hue}, 100%, ${65 + Math.random() * 25}%, `;
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.012) * 0.35;
      this.alpha -= this.decay;

      if (this.y < -10 || this.alpha <= 0) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.alpha + ')';
      ctx.shadowBlur = this.radius * 4;
      ctx.shadowColor = state.viewMode === 'morning' ? '#fcd34d' : '#ff8a1f';
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// =============================================================================
// AUDIO BARS VISUALIZER
// =============================================================================

function initVisualizerBars() {
  const container = document.getElementById('visualizer-bars');
  if (!container) return;

  container.innerHTML = '';
  const numBars = 28;

  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.height = '4px';
    container.appendChild(bar);
  }
}

function updateVisualizer(playing) {
  const bars = document.querySelectorAll('.eq-bar');
  if (!bars.length) return;

  if (state.visualizerInterval) {
    clearInterval(state.visualizerInterval);
    state.visualizerInterval = null;
  }

  if (playing) {
    state.visualizerInterval = setInterval(() => {
      bars.forEach((bar, idx) => {
        const centerDist = Math.abs(idx - 14) / 14;
        const wave = Math.sin(Date.now() * 0.008 + idx * 0.4) * 0.5 + 0.5;
        const randomFactor = Math.random() * 0.6 + 0.4;
        const height = Math.max(4, Math.floor((1 - centerDist * 0.5) * wave * randomFactor * 38));
        bar.style.height = `${height}px`;
      });
    }, 80);
  } else {
    bars.forEach((bar) => {
      bar.style.height = '4px';
    });
  }
}

// =============================================================================
// YOUTUBE IFRAME PLAYER API INTEGRATION
// =============================================================================

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
    return;
  }
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = function() {
  state.ytPlayer = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 0,
      fs: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function onPlayerReady(event) {
  state.ytReady = true;
  state.ytPlayer.setVolume(state.volume);

  const savedId = localStorage.getItem('chhath_player_last_song_id');
  if (savedId && state.songs.length > 0) {
    const idx = state.songs.findIndex(s => s.id.toString() === savedId);
    if (idx !== -1) {
      loadSongByIndex(idx, false);
      return;
    }
  }

  if (state.songs.length > 0) {
    loadSongByIndex(0, false);
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    state.isPlaying = true;
    updatePlayUI(true);
    startProgressTracker();
  } else if (event.data === YT.PlayerState.PAUSED) {
    state.isPlaying = false;
    updatePlayUI(false);
    stopProgressTracker();
  } else if (event.data === YT.PlayerState.ENDED) {
    handleSongEnded();
  } else if (event.data === YT.PlayerState.BUFFERING) {
    updateStatusText('पवित्र धुन लोड हो रही है (Buffering)...');
  }
}

function onPlayerError(event) {
  console.warn('YouTube Player error code:', event.data);
  showToast('अगला गीत लोड हो रहा है... 🪔');
  setTimeout(() => playNextSong(), 1500);
}

function handleSongEnded() {
  if (state.loopMode === 'one') {
    if (state.ytPlayer) {
      state.ytPlayer.seekTo(0);
      state.ytPlayer.playVideo();
    }
  } else if (state.isShuffle) {
    playRandomSong();
  } else {
    const nextIdx = state.currentSongIndex + 1;
    if (nextIdx < state.songs.length) {
      loadSongByIndex(nextIdx, true);
    } else if (state.loopMode === 'all') {
      loadSongByIndex(0, true);
    } else {
      state.isPlaying = false;
      updatePlayUI(false);
    }
  }
}

// =============================================================================
// PLAYBACK CONTROLS
// =============================================================================

function togglePlayPause() {
  if (!state.ytReady || !state.ytPlayer) return;

  if (state.isPlaying) {
    state.ytPlayer.pauseVideo();
  } else {
    const currentSong = state.songs[state.currentSongIndex];
    if (currentSong && currentSong.youtubeId) {
      state.ytPlayer.playVideo();
    } else {
      showToast('No valid YouTube ID for this track');
    }
  }
}

function playNextSong() {
  if (state.isShuffle) {
    playRandomSong();
    return;
  }
  let nextIdx = state.currentSongIndex + 1;
  if (nextIdx >= state.songs.length) {
    nextIdx = 0;
  }
  loadSongByIndex(nextIdx, true);
}

function playPrevSong() {
  if (state.currentTime > 3 && state.ytPlayer) {
    state.ytPlayer.seekTo(0);
    return;
  }

  let prevIdx = state.currentSongIndex - 1;
  if (prevIdx < 0) {
    prevIdx = state.songs.length - 1;
  }
  loadSongByIndex(prevIdx, true);
}

function playRandomSong() {
  if (state.songs.length <= 1) return;
  let randIdx = state.currentSongIndex;
  while (randIdx === state.currentSongIndex) {
    randIdx = Math.floor(Math.random() * state.songs.length);
  }
  loadSongByIndex(randIdx, true);
}

function loadSongByIndex(index, autoPlay = true) {
  if (index < 0 || index >= state.songs.length) return;
  state.currentSongIndex = index;
  const song = state.songs[index];

  document.getElementById('current-title').textContent = song.title;
  document.getElementById('current-artist').textContent = song.artist;
  document.getElementById('current-category').textContent = song.category;
  document.getElementById('current-track-num').textContent = `Track ${(song.id).toString().padStart(3, '0')} / ${state.songs.length || 500}`;

  const miniTitle = document.getElementById('mini-title');
  const miniArtist = document.getElementById('mini-artist');
  if (miniTitle) miniTitle.textContent = song.title;
  if (miniArtist) miniArtist.textContent = song.artist;

  updateFavoriteUI();
  highlightActiveSong();
  scrollToActiveSong();
  updateStatusText(`अब बज रहा है: ${song.title} (${song.artist})`);
  updateFloatingPlayerLabel();

  saveStorage();

  if (state.ytReady && state.ytPlayer && song.youtubeId) {
    if (autoPlay) {
      state.ytPlayer.loadVideoById(song.youtubeId);
    } else {
      state.ytPlayer.cueVideoById(song.youtubeId);
    }
  }
}

function updatePlayUI(playing) {
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const miniPlay = document.getElementById('mini-icon-play');
  const miniPause = document.getElementById('mini-icon-pause');
  const discStage = document.getElementById('now-playing-card');
  const mobileMini = document.getElementById('mobile-mini-player');

  if (playing) {
    if (iconPlay) iconPlay.classList.add('hidden');
    if (iconPause) iconPause.classList.remove('hidden');
    if (miniPlay) miniPlay.classList.add('hidden');
    if (miniPause) miniPause.classList.remove('hidden');
    if (discStage) discStage.classList.add('is-playing');
    if (mobileMini) mobileMini.classList.add('is-playing');
    updateVisualizer(true);
  } else {
    if (iconPlay) iconPlay.classList.remove('hidden');
    if (iconPause) iconPause.classList.add('hidden');
    if (miniPlay) miniPlay.classList.remove('hidden');
    if (miniPause) miniPause.classList.add('hidden');
    if (discStage) discStage.classList.remove('is-playing');
    if (mobileMini) mobileMini.classList.remove('is-playing');
    updateVisualizer(false);
  }
}

function updateStatusText(msg) {
  const statusEl = document.getElementById('player-status-text');
  if (statusEl) statusEl.textContent = msg;
}

// =============================================================================
// PROGRESS & SCRUBBER SYSTEM
// =============================================================================

function startProgressTracker() {
  stopProgressTracker();
  state.progressInterval = setInterval(updateProgress, 500);
}

function stopProgressTracker() {
  if (state.progressInterval) {
    clearInterval(state.progressInterval);
    state.progressInterval = null;
  }
}

function updateProgress() {
  if (!state.ytReady || !state.ytPlayer || !state.ytPlayer.getCurrentTime) return;

  const current = state.ytPlayer.getCurrentTime() || 0;
  const duration = state.ytPlayer.getDuration() || 0;

  state.currentTime = current;
  state.duration = duration;

  const currentEl = document.getElementById('time-current');
  const durationEl = document.getElementById('time-duration');
  const progressCurrent = document.getElementById('progress-current');
  const miniProgress = document.getElementById('mini-progress-bar');
  const progressContainer = document.getElementById('progress-container');

  if (currentEl) currentEl.textContent = formatTime(current);
  if (durationEl) durationEl.textContent = formatTime(duration);

  if (duration > 0) {
    const pct = (current / duration) * 100;
    if (progressCurrent) progressCurrent.style.width = `${pct}%`;
    if (miniProgress) miniProgress.style.width = `${pct}%`;
    if (progressContainer) progressContainer.setAttribute('aria-valuenow', Math.round(pct).toString());
  }

  if (state.ytPlayer.getVideoLoadedFraction) {
    const loaded = state.ytPlayer.getVideoLoadedFraction() * 100;
    const progressLoaded = document.getElementById('progress-loaded');
    if (progressLoaded) progressLoaded.style.width = `${loaded}%`;
  }
}

function formatTime(seconds) {
  const sec = Math.floor(seconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function seekToRatio(ratio) {
  if (!state.ytReady || !state.ytPlayer) return;
  const duration = state.ytPlayer.getDuration() || 0;
  if (duration > 0) {
    const target = ratio * duration;
    state.ytPlayer.seekTo(target, true);
    updateProgress();
  }
}

// =============================================================================
// VOLUME CONTROL SYSTEM
// =============================================================================

function setVolume(val) {
  state.volume = Math.max(0, Math.min(100, val));
  if (state.volume > 0) state.isMuted = false;

  if (state.ytReady && state.ytPlayer) {
    state.ytPlayer.setVolume(state.volume);
    if (state.isMuted) state.ytPlayer.mute();
    else state.ytPlayer.unMute();
  }

  const slider = document.getElementById('volume-slider');
  const text = document.getElementById('vol-level-text');
  if (slider) slider.value = state.volume;
  if (text) text.textContent = `${state.volume}%`;

  updateVolumeIcons();
  saveStorage();
}

function toggleMute() {
  if (state.isMuted) {
    state.isMuted = false;
    setVolume(state.previousVolume > 0 ? state.previousVolume : 50);
  } else {
    state.previousVolume = state.volume;
    state.isMuted = true;
    if (state.ytReady && state.ytPlayer) state.ytPlayer.mute();
    const text = document.getElementById('vol-level-text');
    if (text) text.textContent = `0%`;
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = 0;
    updateVolumeIcons();
  }
}

function updateVolumeIcons() {
  const iconHigh = document.getElementById('icon-vol-high');
  const iconMute = document.getElementById('icon-vol-mute');
  if (!iconHigh || !iconMute) return;

  if (state.isMuted || state.volume === 0) {
    iconHigh.classList.add('hidden');
    iconMute.classList.remove('hidden');
  } else {
    iconHigh.classList.remove('hidden');
    iconMute.classList.add('hidden');
  }
}

// =============================================================================
// SHUFFLE & LOOP MODES
// =============================================================================

function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  const btn = document.getElementById('btn-shuffle');
  if (btn) btn.classList.toggle('active', state.isShuffle);
  showToast(state.isShuffle ? '🔀 Shuffle On' : '➡️ Shuffle Off');
  saveStorage();
}

function cycleLoopMode() {
  const modes = ['off', 'all', 'one'];
  const curIdx = modes.indexOf(state.loopMode);
  state.loopMode = modes[(curIdx + 1) % modes.length];

  const badge = document.getElementById('loop-badge');
  const btn = document.getElementById('btn-loop');
  if (badge) badge.textContent = state.loopMode.toUpperCase();
  if (btn) btn.classList.toggle('active', state.loopMode !== 'off');

  const names = { off: 'Loop Off', all: 'Loop All Playlist', one: 'Repeat Track' };
  showToast(`🔁 ${names[state.loopMode]}`);
  saveStorage();
}

// =============================================================================
// FAVORITES SYSTEM
// =============================================================================

function toggleFavoriteCurrent() {
  const song = state.songs[state.currentSongIndex];
  if (!song) return;
  toggleFavorite(song.id);
}

function toggleFavorite(songId) {
  if (state.favorites.has(songId)) {
    state.favorites.delete(songId);
    showToast('Removed from Sacred Favorites 🤍');
  } else {
    state.favorites.add(songId);
    showToast('Added to Sacred Favorites ❤️');
  }

  updateFavoriteUI();
  updateCategoryCounts();

  if (state.currentCategory === 'FAVORITES') {
    filterAndRenderSongs();
  }

  saveStorage();
}

function updateFavoriteUI() {
  const currentSong = state.songs[state.currentSongIndex];
  const isFav = currentSong && state.favorites.has(currentSong.id);
  const btn = document.getElementById('btn-favorite');
  if (btn) {
    btn.classList.toggle('favorited', !!isFav);
    btn.classList.toggle('active', !!isFav);
  }

  const listFavBtn = document.querySelector(`.song-fav-btn[data-id="${currentSong?.id}"]`);
  if (listFavBtn) {
    listFavBtn.classList.toggle('favorited', !!isFav);
  }
}

// =============================================================================
// SONGS LOADING & PLAYLIST RENDERING
// =============================================================================

async function loadSongs() {
  try {
    const res = await fetch('songs.json');
    if (!res.ok) throw new Error('Failed to load songs.json');
    state.songs = await res.json();
    state.filteredSongs = [...state.songs];

    updateCategoryCounts();
    renderPlaylist();

    const brandBadgeCount = document.getElementById('brand-badge-count');
    if (brandBadgeCount) {
      brandBadgeCount.textContent = `${state.songs.length} Verified Songs`;
    }

    const loopBadge = document.getElementById('loop-badge');
    const loopBtn = document.getElementById('btn-loop');
    if (loopBadge) loopBadge.textContent = state.loopMode.toUpperCase();
    if (loopBtn) loopBtn.classList.toggle('active', state.loopMode !== 'off');

    const shuffleBtn = document.getElementById('btn-shuffle');
    if (shuffleBtn) shuffleBtn.classList.toggle('active', state.isShuffle);

    if (state.songs.length > 0) {
      loadSongByIndex(0, false);
    }
  } catch (err) {
    console.error('Error loading songs:', err);
    showToast('Failed to load songs playlist');
  }
}

function updateCategoryCounts() {
  const countAll = document.getElementById('count-all');
  const countFav = document.getElementById('count-fav');
  const countArghya = document.getElementById('count-arghya');
  const countSurya = document.getElementById('count-surya');
  const countBahangi = document.getElementById('count-bahangi');
  const countDevo = document.getElementById('count-devotional');
  const countModern = document.getElementById('count-modern');

  if (countAll) countAll.textContent = state.songs.length;
  if (countFav) countFav.textContent = state.favorites.size;

  let arghya = 0, surya = 0, bahangi = 0, devotional = 0, modern = 0;
  state.songs.forEach(s => {
    if (s.category === 'Arghya / Sandhya Ghat') arghya++;
    else if (s.category === 'Morning Surya') surya++;
    else if (s.category === 'Bahangi') bahangi++;
    else if (s.category === 'Devotional') devotional++;
    else if (s.category === 'Modern') modern++;
  });

  if (countArghya) countArghya.textContent = arghya;
  if (countSurya) countSurya.textContent = surya;
  if (countBahangi) countBahangi.textContent = bahangi;
  if (countDevo) countDevo.textContent = devotional;
  if (countModern) countModern.textContent = modern;
}

function filterAndRenderSongs() {
  const query = state.searchQuery.trim().toLowerCase();

  state.filteredSongs = state.songs.filter(song => {
    let matchCat = true;
    if (state.currentCategory === 'FAVORITES') {
      matchCat = state.favorites.has(song.id);
    } else if (state.currentCategory !== 'ALL') {
      matchCat = song.category === state.currentCategory;
    }

    if (!matchCat) return false;

    if (!query) return true;
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      song.category.toLowerCase().includes(query)
    );
  });

  const countBadge = document.getElementById('playlist-count');
  if (countBadge) {
    countBadge.textContent = `${state.filteredSongs.length} Tracks`;
  }

  renderPlaylist();
}

function renderPlaylist() {
  const listEl = document.getElementById('songs-list');
  const emptyEl = document.getElementById('empty-state');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (state.filteredSongs.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  const currentSong = state.songs[state.currentSongIndex];

  state.filteredSongs.forEach((song, idx) => {
    const isCurrent = currentSong && currentSong.id === song.id;
    const isFav = state.favorites.has(song.id);

    const li = document.createElement('li');
    li.className = `song-item ${isCurrent ? 'active' : ''}`;
    li.setAttribute('data-id', song.id);
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', isCurrent ? 'true' : 'false');

    let catIcon = '🪔';
    let catThemeClass = 'theme-devo';
    if (song.category === 'Morning Surya') {
      catIcon = '☀️';
      catThemeClass = 'theme-surya';
    } else if (song.category === 'Arghya / Sandhya Ghat') {
      catIcon = '🌅';
      catThemeClass = 'theme-arghya';
    } else if (song.category === 'Bahangi') {
      catIcon = '🎋';
      catThemeClass = 'theme-bahangi';
    } else if (song.category === 'Modern') {
      catIcon = '✨';
      catThemeClass = 'theme-modern';
    }

    li.innerHTML = `
      <div class="song-num-box">
        ${isCurrent ? `
          <div class="mini-eq" aria-label="Playing">
            <span class="mini-eq-bar"></span>
            <span class="mini-eq-bar"></span>
            <span class="mini-eq-bar"></span>
          </div>
        ` : `
          <span class="song-index-num">${(idx + 1).toString().padStart(3, '0')}</span>
          <span class="song-hover-play">▶</span>
        `}
      </div>

      <div class="song-thumb ${catThemeClass}">${catIcon}</div>

      <div class="song-details">
        <div class="song-row-top">
          <span class="song-title-text" title="${song.title}">${song.title}</span>
        </div>
        <div class="song-row-bot">
          <span class="song-artist-text">🎙️ ${song.artist}</span>
          <span class="song-cat-tag ${catThemeClass}">${song.category}</span>
        </div>
      </div>

      <div class="song-item-actions">
        <button class="song-download-btn" data-id="${song.id}" aria-label="Download song" title="Download Song / MP3">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="song-fav-btn ${isFav ? 'favorited' : ''}" data-id="${song.id}" aria-label="Favorite song" title="Toggle Favorite">
          <svg class="heart-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
          </svg>
        </button>
      </div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.song-download-btn')) {
        openDownloadModal(song);
        return;
      }
      if (e.target.closest('.song-fav-btn')) {
        toggleFavorite(song.id);
        return;
      }
      const originalIdx = state.songs.findIndex(s => s.id === song.id);
      if (originalIdx !== -1) {
        loadSongByIndex(originalIdx, true);
      }
    });

    listEl.appendChild(li);
  });
}

function highlightActiveSong() {
  const currentSong = state.songs[state.currentSongIndex];
  if (!currentSong) return;

  const allItems = document.querySelectorAll('.song-item');
  allItems.forEach(item => {
    const songId = parseInt(item.getAttribute('data-id'), 10);
    const isActive = songId === currentSong.id;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');

    const numBox = item.querySelector('.song-num-box');
    if (numBox) {
      if (isActive) {
        numBox.innerHTML = `
          <div class="mini-eq" aria-label="Playing">
            <span class="mini-eq-bar"></span>
            <span class="mini-eq-bar"></span>
            <span class="mini-eq-bar"></span>
          </div>
        `;
      } else {
        const itemIdx = Array.from(allItems).indexOf(item);
        numBox.innerHTML = `
          <span class="song-index-num">${(itemIdx + 1).toString().padStart(3, '0')}</span>
          <span class="song-hover-play">▶</span>
        `;
      }
    }
  });
}

function scrollToActiveSong() {
  const activeEl = document.querySelector('.song-item.active');
  const container = document.getElementById('songs-list-container');
  if (activeEl && container) {
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const elemTop = activeEl.offsetTop - container.offsetTop;
    const elemBottom = elemTop + activeEl.clientHeight;

    if (elemTop < containerTop || elemBottom > containerBottom) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// =============================================================================
// EVENT LISTENERS & SHORTCUTS
// =============================================================================

function setupEventListeners() {
  // Morning / Evening View Switch
  const viewBtn = document.getElementById('view-toggle-btn');
  if (viewBtn) viewBtn.addEventListener('click', toggleViewMode);

  // Play / Pause Buttons
  const playBtn = document.getElementById('btn-play');
  if (playBtn) playBtn.addEventListener('click', togglePlayPause);

  const miniPlayBtn = document.getElementById('mini-btn-play');
  if (miniPlayBtn) miniPlayBtn.addEventListener('click', togglePlayPause);

  // Next / Previous
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.addEventListener('click', playNextSong);

  const prevBtn = document.getElementById('btn-prev');
  if (prevBtn) prevBtn.addEventListener('click', playPrevSong);

  const miniNextBtn = document.getElementById('mini-btn-next');
  if (miniNextBtn) miniNextBtn.addEventListener('click', playNextSong);

  const miniPrevBtn = document.getElementById('mini-btn-prev');
  if (miniPrevBtn) miniPrevBtn.addEventListener('click', playPrevSong);

  // Shuffle & Loop
  const shuffleBtn = document.getElementById('btn-shuffle');
  if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);

  const loopBtn = document.getElementById('btn-loop');
  if (loopBtn) loopBtn.addEventListener('click', cycleLoopMode);

  // Favorite Button
  const favBtn = document.getElementById('btn-favorite');
  if (favBtn) favBtn.addEventListener('click', toggleFavoriteCurrent);

  // Progress Bar Scrubber
  const progressContainer = document.getElementById('progress-container');
  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      seekToRatio(ratio);
    });

    progressContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        seekToRatio(Math.min(1, (state.currentTime + 5) / (state.duration || 1)));
      } else if (e.key === 'ArrowLeft') {
        seekToRatio(Math.max(0, (state.currentTime - 5) / (state.duration || 1)));
      }
    });
  }

  // Volume Controls
  const volSlider = document.getElementById('volume-slider');
  if (volSlider) {
    volSlider.value = state.volume;
    volSlider.addEventListener('input', (e) => {
      setVolume(parseInt(e.target.value, 10));
    });
  }

  const volBtn = document.getElementById('btn-volume');
  if (volBtn) volBtn.addEventListener('click', toggleMute);

  // Category Filter Chips
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      state.currentCategory = chip.getAttribute('data-category');
      filterAndRenderSongs();
    });
  });

  // Search Input
  const searchInput = document.getElementById('song-search-input');
  const searchClear = document.getElementById('search-clear-btn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (searchClear) searchClear.classList.toggle('hidden', !state.searchQuery);
      filterAndRenderSongs();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      searchClear.classList.add('hidden');
      filterAndRenderSongs();
    });
  }

  // Reset Filters Empty State Button
  const resetBtn = document.getElementById('empty-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      state.currentCategory = 'ALL';
      filterChips.forEach(c => {
        const isAll = c.getAttribute('data-category') === 'ALL';
        c.classList.toggle('active', isAll);
        c.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });
      filterAndRenderSongs();
    });
  }

  // Shortcuts Modal
  const shortcutsBtn = document.getElementById('shortcuts-btn');
  const shortcutsModal = document.getElementById('shortcuts-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  if (shortcutsBtn && shortcutsModal) {
    shortcutsBtn.addEventListener('click', () => {
      shortcutsModal.classList.remove('hidden');
    });
  }

  if (modalCloseBtn && shortcutsModal) {
    modalCloseBtn.addEventListener('click', () => {
      shortcutsModal.classList.add('hidden');
    });
  }

  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.classList.add('hidden');
      }
    });
  }

  // Quick Shuffle Button in Playlist Header
  const quickShuffleBtn = document.getElementById('quick-shuffle-btn');
  if (quickShuffleBtn) {
    quickShuffleBtn.addEventListener('click', () => {
      if (!state.isShuffle) toggleShuffle();
      if (state.songs.length > 0) {
        const randomIdx = Math.floor(Math.random() * state.songs.length);
        loadSongByIndex(randomIdx, true);
        showToast(`🔀 Shuffled! Playing: ${state.songs[randomIdx].title}`);
      }
    });
  }

  // Hide / Show Player Buttons (Header, Player Card Top Bar, Floating Pill)
  const headerPlayerBtn = document.getElementById('btn-header-toggle-player');
  if (headerPlayerBtn) headerPlayerBtn.addEventListener('click', togglePlayerVisibility);

  const playerHideBtn = document.getElementById('btn-hide-player');
  if (playerHideBtn) playerHideBtn.addEventListener('click', togglePlayerVisibility);

  const floatingShowPlayerBtn = document.getElementById('floating-show-player-btn');
  if (floatingShowPlayerBtn) floatingShowPlayerBtn.addEventListener('click', togglePlayerVisibility);

  // Download Song Triggers (Controls Row Icon & Dedicated Action Bar)
  const downloadCtrlBtn = document.getElementById('btn-download-song');
  if (downloadCtrlBtn) downloadCtrlBtn.addEventListener('click', () => openDownloadModal());

  const quickDownloadBtn = document.getElementById('btn-quick-download');
  if (quickDownloadBtn) quickDownloadBtn.addEventListener('click', () => openDownloadModal());

  // Download Modal Actions & Close Handlers
  const dlModal = document.getElementById('download-modal');
  const dlCloseBtn = document.getElementById('dl-modal-close-btn');
  if (dlCloseBtn) dlCloseBtn.addEventListener('click', closeDownloadModal);
  if (dlModal) {
    dlModal.addEventListener('click', (e) => {
      if (e.target === dlModal) closeDownloadModal();
    });
  }

  const btnDlMp3 = document.getElementById('btn-dl-mp3');
  if (btnDlMp3) btnDlMp3.addEventListener('click', downloadCurrentSongMp3);

  const btnDlVideo = document.getElementById('btn-dl-video');
  if (btnDlVideo) btnDlVideo.addEventListener('click', downloadCurrentSongVideo);

  const btnDlOffline = document.getElementById('btn-dl-offline');
  if (btnDlOffline) btnDlOffline.addEventListener('click', toggleOfflineTargetSong);

  const btnDlCopy = document.getElementById('btn-dl-copy-link');
  if (btnDlCopy) btnDlCopy.addEventListener('click', copyTargetSongLink);

  // Hide / Show Playlist Buttons (Header, Playlist Card, Player Card, Floating Pill)
  const headerPlaylistBtn = document.getElementById('btn-header-toggle-playlist');
  if (headerPlaylistBtn) headerPlaylistBtn.addEventListener('click', togglePlaylistVisibility);

  const playlistCloseBtn = document.getElementById('btn-playlist-close');
  if (playlistCloseBtn) playlistCloseBtn.addEventListener('click', togglePlaylistVisibility);

  const cardPlaylistBtn = document.getElementById('btn-card-toggle-playlist');
  if (cardPlaylistBtn) cardPlaylistBtn.addEventListener('click', togglePlaylistVisibility);

  const floatingShowPlaylistBtn = document.getElementById('floating-show-playlist-btn');
  if (floatingShowPlaylistBtn) floatingShowPlaylistBtn.addEventListener('click', togglePlaylistVisibility);

  // Cinema / Zen Mode Toggle (Hide All UI)
  const zenBtn = document.getElementById('btn-zen-mode');
  if (zenBtn) zenBtn.addEventListener('click', toggleZenMode);

  // Display Mode Tabs (Sacred Diya vs Play Video Iframe)
  const tabDisc = document.getElementById('tab-disc-mode');
  const tabVideo = document.getElementById('tab-video-mode');
  if (tabDisc) tabDisc.addEventListener('click', () => setPlayerDisplayMode('disc'));
  if (tabVideo) tabVideo.addEventListener('click', () => setPlayerDisplayMode('video'));

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === searchInput) {
      if (e.key === 'Escape') searchInput.blur();
      return;
    }

    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      if (searchInput) searchInput.focus();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      playNextSong();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      playPrevSong();
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      setVolume(state.volume + 5);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      setVolume(state.volume - 5);
    } else if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFavoriteCurrent();
    } else if (e.key === 'd' || e.key === 'D') {
      openDownloadModal();
    } else if (e.key === 'h' || e.key === 'H') {
      togglePlayerVisibility();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePlaylistVisibility();
    } else if (e.key === 'z' || e.key === 'Z') {
      toggleZenMode();
    } else if (e.key === 't' || e.key === 'T') {
      toggleViewMode();
    } else if (e.key === 'v' || e.key === 'V') {
      setPlayerDisplayMode(state.displayMode === 'disc' ? 'video' : 'disc');
    } else if (e.key === '?') {
      if (shortcutsModal) {
        shortcutsModal.classList.toggle('hidden');
      }
    } else if (e.key === 'Escape') {
      if (dlModal && !dlModal.classList.contains('hidden')) {
        closeDownloadModal();
      } else if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
        shortcutsModal.classList.add('hidden');
      } else if (state.isZenMode) {
        toggleZenMode();
      }
    }
  });
}

// =============================================================================
// TOAST NOTIFICATION UTILITY
// =============================================================================

let toastTimeout = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}
