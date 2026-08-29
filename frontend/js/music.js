const bgMusic = document.getElementById('bgMusic');
const kirbyControl = document.getElementById('kirbyControl');
const kirbyState = document.getElementById('kirbyState');
const musicProgressFill = document.getElementById('musicProgressFill');
const musicTime = document.getElementById('musicTime');
const musicBars = document.getElementById('musicBars');

function fmtTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function syncMusicUI() {
  const ready = bgMusic.readyState > 0;
  const playing = ready && !bgMusic.paused;
  kirbyControl.classList.toggle('playing', playing);
  musicBars.classList.toggle('playing', playing);
  kirbyState.textContent = ready ? (playing ? 'PAUSE' : 'PLAY') : 'NO AUDIO';
  const duration = bgMusic.duration || 0;
  const current = bgMusic.currentTime || 0;
  musicProgressFill.style.width = `${duration ? (current / duration) * 100 : 0}%`;
  musicTime.textContent = ready ? `${fmtTime(current)} / ${fmtTime(duration)}` : '--:-- / --:--';
}

kirbyControl.addEventListener('click', async event => {
  event.stopPropagation();
  if (bgMusic.readyState === 0) { syncMusicUI(); return; }
  try {
    if (bgMusic.paused) {
      await bgMusic.play();
      window.RemediosAPI?.trackEvent('music_play');
    } else {
      bgMusic.pause();
      window.RemediosAPI?.trackEvent('music_pause');
    }
  } catch (error) {
    console.warn('Audio playback is unavailable:', error);
  }
  syncMusicUI();
});
['timeupdate', 'loadedmetadata', 'play', 'pause', 'error'].forEach(event => bgMusic.addEventListener(event, syncMusicUI));
syncMusicUI();
