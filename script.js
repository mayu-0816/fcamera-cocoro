// ココロカメラ：F値 → BPM → シャッタースピード反映 撮影
document.addEventListener('DOMContentLoaded', () => {
  // -------- 画面管理 --------
  const screens = {
    initial: document.getElementById('screen-initial'),
    introduction: document.getElementById('screen-introduction'),
    fvalue: document.getElementById('screen-fvalue-input'),
    bpm: document.getElementById('screen-bpm'),
    camera: document.getElementById('screen-camera'),
  };
  function showScreen(key) {
    Object.values(screens).forEach(s => s?.classList.remove('active'));
    Object.values(screens).forEach(s => s?.setAttribute('aria-hidden','true'));
    screens[key]?.classList.add('active');
    screens[key]?.setAttribute('aria-hidden','false');
  }

  // -------- カメラ（撮影プレビュー） --------
  const video = document.getElementById('video');
  const rawCanvas = document.getElementById('canvas');

  // プレビュー用 Canvas（フィルタ適用はstyle.filterで軽量に）
  const previewCanvas = document.createElement('canvas');
  const previewCtx = previewCanvas.getContext('2d');
  if (screens.camera) {
    Object.assign(previewCanvas.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '1'
    });
    screens.camera.insertBefore(previewCanvas, screens.camera.firstChild);
  }

  let currentStream = null;
  let isFrontCamera = false;
  let selectedFValue = 32.0;    // F値
  let lastMeasuredBpm = 0;      // BPM（計測結果）
  const defaultBpm = 60;        // 失敗時のフォールバック

  // F値→フィルタ
  function getFilter(fValue) {
    const brightness = Math.max(0.7, Math.min(1.5, 2.5 / fValue));
    const saturate  = Math.max(0.5, Math.min(2.0, 2.0 - fValue / 32));
    const contrast  = Math.max(0.8, Math.min(1.3, 1.0 + (8 / fValue) * 0.05));
    const blur      = Math.max(0, 8 * (1.2 / fValue)); // F小 → ぼかし大（擬似的）
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`;
  }

  // プレビューループ
  let rafId = null;
  function startPreviewLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    const render = () => {
      if (video.videoWidth && video.videoHeight) {
        if (previewCanvas.width !== video.videoWidth || previewCanvas.height !== video.videoHeight) {
          previewCanvas.width = video.videoWidth;
          previewCanvas.height = video.videoHeight;
        }
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.style.filter = getFilter(selectedFValue);
        previewCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
  }
  function stopPreviewLoop(){ if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  // カメラ起動
  async function startCamera(facingMode = 'environment') {
    try {
      if (currentStream) currentStream.getTracks().forEach(t => t.stop());
      const constraints = {
        video: { facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user' },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();
      currentStream = stream;
      isFrontCamera = (facingMode === 'user');
      // 実際に描画するのは previewCanvas
      video.style.display = 'none';
      startPreviewLoop();
    } catch (err) {
      console.error('カメラエラー:', err);
      alert('カメラを起動できません。権限を許可してください。');
    }
  }

  // -------- 画面遷移 --------
  document.getElementById('initial-next-btn')?.addEventListener('click', () => showScreen('introduction'));
  document.getElementById('intro-next-btn')?.addEventListener('click', () => showScreen('fvalue'));

  // F値決定 → BPM計測へ
  document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
    const f = parseFloat(document.getElementById('aperture').value);
    selectedFValue = f;
    document.querySelector('.aperture-control')?.setAttribute('aria-valuenow', f.toFixed(1));
    showScreen('bpm');
    await startBpmCamera(); // BPM計測用カメラ起動
  });

  // カメラ切替（撮影画面）
  document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
    const newMode = isFrontCamera ? 'environment' : 'user';
    await startCamera(newMode);
  });

  // -------- F値（ピンチ操作） --------
  const apertureControl = document.querySelector('.aperture-control');
  const fValueDisplay = document.getElementById('f-value-display');
  const apertureInput = document.getElementById('aperture');
  const MIN_F = 1.2, MAX_F = 32.0, MIN_SIZE = 100, MAX_SIZE = 250;

  const fToSize = f => MIN_SIZE + ((MAX_F - f) / (MAX_F - MIN_F)) * (MAX_SIZE - MIN_SIZE);
  const sizeToF = size => MAX_F - ((size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * (MAX_F - MIN_F);

  if (apertureControl && fValueDisplay && apertureInput) {
    const initialSize = fToSize(selectedFValue);
    apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
    fValueDisplay.textContent = selectedFValue.toFixed(1);
    apertureInput.value = selectedFValue.toFixed(1);
  }

  let lastDistance = null;
  const getDistance = (t1, t2) => Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);

  document.body.addEventListener('touchstart', e => {
    if (!screens.fvalue?.classList.contains('active')) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      lastDistance = getDistance(e.touches[0], e.touches[1]);
    }
  }, { passive: false });

  document.body.addEventListener('touchmove', e => {
    if (!screens.fvalue?.classList.contains('active')) return;
    if (e.touches.length === 2 && lastDistance) {
      e.preventDefault();
      const current = getDistance(e.touches[0], e.touches[1]);
      const delta = current - lastDistance;
      const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, apertureControl.offsetWidth + delta));
      const newF = sizeToF(newSize);
      apertureControl.style.width = apertureControl.style.height = `${newSize}px`;
      fValueDisplay.textContent = newF.toFixed(1);
      apertureInput.value = newF.toFixed(1);
      lastDistance = current;
    }
  }, { passive: false });

  document.body.addEventListener('touchend', () => { lastDistance = null; });

  // -------- BPM 計測 --------
  const bpmVideo = document.getElementById('bpm-video');
  const bpmCanvas = document.getElementById('bpm-canvas');
  const bpmCtx = bpmCanvas.getContext('2d');
  const bpmStatus = document.getElementById('bpm-status');
  let bpmStream = null;
  let bpmLoopId = null;

  async function startBpmCamera() {
    try {
      if (bpmStream) bpmStream.getTracks().forEach(t => t.stop());
      bpmStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      bpmVideo.srcObject = bpmStream;
      await bpmVideo.play();
      bpmStatus.textContent = '指をカメラに軽く当ててください。明るさが一定になるように。';
    } catch (e) {
      console.error(e);
      bpmStatus.textContent = 'カメラ起動に失敗しました。スキップも可能です。';
    }
  }

  function stopBpmCamera() {
    if (bpmLoopId) cancelAnimationFrame(bpmLoopId);
    bpmLoopId = null;
    if (bpmStream) {
      bpmStream.getTracks().forEach(t => t.stop());
      bpmStream = null;
    }
  }

  function estimateBpmFromSeries(values, durationSec) {
    // 簡易ローパス：移動平均で平滑化
    const k = 4;
    const smooth = values.map((_, i, arr) => {
      let s = 0, c = 0;
      for (let j = -k; j <= k; j++) {
        const idx = i + j;
        if (arr[idx] != null) { s += arr[idx]; c++; }
      }
      return s / c;
    });

    // 微分のゼロクロス（下降に転じる点）をピークとみなす
    const diffs = smooth.map((v, i) => i ? v - smooth[i - 1] : 0);
    const peaks = [];
    for (let i = 1; i < diffs.length - 1; i++) {
      if (diffs[i - 1] > 0 && diffs[i] <= 0) peaks.push(i);
    }
    if (peaks.length < 2) return null;

    const intervals = [];
    for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const fps = values.length / durationSec;
    const bpm = Math.round((60 * fps) / avgInterval);
    if (!isFinite(bpm) || bpm <= 20 || bpm >= 220) return null;
    return bpm;
  }

  async function measureBpm(durationSec = 15) {
    if (!bpmVideo) return;
    const vals = [];
    const start = performance.now();

    const loop = () => {
      if (!bpmVideo.videoWidth || !bpmVideo.videoHeight) {
        bpmLoopId = requestAnimationFrame(loop);
        return;
      }
      // 小さめにサンプリングして軽量化（中心付近）
      const w = 160, h = 120;
      bpmCanvas.width = w; bpmCanvas.height = h;

      bpmCtx.drawImage(bpmVideo,
        (bpmVideo.videoWidth - w) / 2, (bpmVideo.videoHeight - h) / 2, w, h,
        0, 0, w, h);
      const frame = bpmCtx.getImageData(0, 0, w, h).data;

      // R成分の平均
      let sum = 0;
      for (let i = 0; i < frame.length; i += 4) sum += frame[i];
      vals.push(sum / (frame.length / 4));

      const t = (performance.now() - start) / 1000;
      if (t < durationSec) {
        // 進捗表示
        const remain = Math.max(0, durationSec - t);
        bpmStatus.textContent = `計測中… 残り ${Math.ceil(remain)} 秒`;
        bpmLoopId = requestAnimationFrame(loop);
      } else {
        const bpm = estimateBpmFromSeries(vals, durationSec) ?? defaultBpm;
        lastMeasuredBpm = bpm;
        bpmStatus.textContent = `推定BPM: ${bpm}`;
        // 次：撮影画面へ
        setTimeout(async () => {
          showScreen('camera');
          // 撮影画面のHUD更新 & カメラ起動
          const fHud = document.getElementById('fvalue-display-camera');
          if (fHud) fHud.textContent = `F: ${parseFloat(apertureInput.value).toFixed(1)}`;
          updateCameraHudBpm();
          await startCamera('environment');
        }, 800);
        stopBpmCamera();
      }
    };
    loop();
  }

  document.getElementById('bpm-start-btn')?.addEventListener('click', () => {
    bpmStatus.textContent = '計測中…';
    measureBpm(15);
  });
  document.getElementById('bpm-skip-btn')?.addEventListener('click', async () => {
    lastMeasuredBpm = defaultBpm;
    stopBpmCamera();
    showScreen('camera');
    updateCameraHudBpm();
    await startCamera('environment');
  });

  // -------- 撮影（BPM→シャッタースピード反映） --------
  const shutterBtn = document.getElementById('camera-shutter-btn');
  const bpmHud = document.getElementById('bpm-display-camera');
  function exposureTimeSec() {
    const bpm = lastMeasuredBpm || defaultBpm;
    // 1拍の長さ（秒）を露光時間に
    // 極端に長すぎたり短すぎたりしないようにクランプ
    return Math.min(2.0, Math.max(0.1, 60 / bpm));
  }
  function exposureLabel(sec) {
    return sec >= 1 ? `${sec.toFixed(1)}s` : `1/${Math.round(1 / sec)}s`;
  }
  function updateCameraHudBpm() {
    const sec = exposureTimeSec();
    bpmHud.textContent = `BPM: ${lastMeasuredBpm || '--'} / SS: ${exposureLabel(sec)}`;
  }
  updateCameraHudBpm();

  const ensureGallery = () => {
    let g = document.getElementById('camera-gallery');
    if (!g) {
      g = document.createElement('div');
      g.id = 'camera-gallery';
      screens.camera.appendChild(g);
    }
    return g;
  };

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  shutterBtn?.addEventListener('click', async () => {
    if (!video.videoWidth) return;

    const captureCanvas = rawCanvas || document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext('2d');

    // 露光シミュレーション：露光時間中、複数フレームを平均合成
    ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
    ctx.filter = getFilter(selectedFValue);

    const sec = exposureTimeSec();
    const frameRate = 30;                             // 仮想フレームレート
    const frameCount = Math.max(1, Math.round(sec * frameRate));
    const alpha = 1 / frameCount;

    for (let i = 0; i < frameCount; i++) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      await sleep(1000 / frameRate);
    }
    ctx.globalAlpha = 1;

    const dataURL = captureCanvas.toDataURL('image/png');

    // ギャラリー
    const gallery = ensureGallery();
    const thumb = document.createElement('img');
    thumb.src = dataURL;
    thumb.style.width = '80px';
    thumb.style.border = '2px solid white';
    thumb.style.cursor = 'pointer';
    thumb.alt = '撮影画像サムネイル';
    thumb.addEventListener('click', () => window.open(dataURL, '_blank'));
    gallery.appendChild(thumb);

    // ダウンロード
    const a = document.createElement('a');
    a.href = dataURL; a.download = 'cocoro_photo.png'; a.click();
  });

  // -------- 初期表示 --------
  showScreen('initial');
});
