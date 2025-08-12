// UI要素
const introScreen = document.getElementById('screen-intro');
const descScreen = document.getElementById('screen-desc');
const fValueInputScreen = document.getElementById('screen-fvalue-input');
const cameraScreen = document.getElementById('screen-camera');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const bpmDisplay = document.getElementById('bpm');
const aperture = document.getElementById('aperture');
const captureBtn = document.getElementById('capture');
const album = document.getElementById('album');

// --- 画面切り替えのロジック ---
/**
 * 指定された画面を表示し、他の画面を非表示にします。
 * @param {string} screenId - 表示する画面のID
 */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// 画面のイベントリスナーを設定
introScreen.addEventListener('click', () => {
  showScreen('screen-desc');
});

descScreen.addEventListener('click', () => {
  showScreen('screen-fvalue-input');
});

// F値入力画面のイベントリスナー
fValueInputScreen.addEventListener('click', () => {
  showScreen('screen-camera');
  startCamera(); // カメラ画面に移動したらカメラを起動
});

// --- カメラ機能 ---
/**
 * カメラを起動し、映像をvideo要素にストリーミングします。
 */
async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
  }catch(e){
    console.error('カメラ起動失敗', e);
    alert('カメラへのアクセスが必要です。ブラウザの許可を確認してください。');
  }
}


// --- 心拍（簡易）計測ロジック ---
// 原理: カメラに指を置いたときのフレーム内の赤成分変化をピーク検出してBPM算出
let bpm = 0;
let redBuffer = [];
let lastPeakTime = 0;

// 設定（調整可能）:
const SAMPLE_INTERVAL_MS = 60;    // 取得間隔（ms）
const BUFFER_LEN = 30;            // 平均用バッファ長
const PEAK_THRESHOLD = 2.5;       // 前フレームとの差分ピーク閾値（経験値で調整）

setInterval(() => {
  if (video.videoWidth === 0 || video.videoHeight === 0) return;
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 中央小領域だけ取って軽量化（指を置いている想定）
  const w = Math.floor(canvas.width * 0.4);
  const h = Math.floor(canvas.height * 0.4);
  const sx = Math.floor((canvas.width - w) / 2);
  const sy = Math.floor((canvas.height - h) / 2);
  const frame = ctx.getImageData(sx, sy, w, h);
  let redSum = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    redSum += frame.data[i]; // R
  }
  const avgRed = redSum / (frame.data.length / 4);
  redBuffer.push(avgRed);
  if (redBuffer.length > BUFFER_LEN) redBuffer.shift();

  // シンプル差分ピーク検出
  if (redBuffer.length >= 3) {
    const len = redBuffer.length;
    const prev = redBuffer[len - 2];
    const last = redBuffer[len - 1];
    if (last - prev > PEAK_THRESHOLD && Date.now() - lastPeakTime > 400) {
      const now = Date.now();
      const interval = now - lastPeakTime;
      lastPeakTime = now;
      if (interval > 300 && interval < 2000) {
        bpm = Math.round(60000 / interval);
        bpmDisplay.textContent = bpm;
        applyVisuals();
      }
    }
  }
}, SAMPLE_INTERVAL_MS);

// --- 視覚表現(シャッタースピード=明暗、F値=ぼけ) ---
function applyVisuals(){
  // F値が低いほどボケる（F=1 → 強ボケ, F=16 → ほぼ無し）
  const f = parseInt(aperture.value, 10);
  // ボケ量計算（単純マッピング）
  const blurAmount = Math.max(0, (16 - f) / 2.2); // 経験則で調整
  // シャッタースピード（BPM）を明暗に反映: BPMが高いほど明るめ
  // 正規化: bpm 40〜160 を 0.6〜1.6 にマップ
  const normalized = Math.min(160, Math.max(40, bpm || 100));
  const brightness = ( (normalized - 40) / (160 - 40) ) * (1.6 - 0.6) + 0.6;
  // 色調（早いと暖色、遅いと寒色）も付ける
  let colorFilter = '';
  if (bpm > 100) {
    colorFilter = 'contrast(1.05) saturate(1.2) sepia(0.15) hue-rotate(-10deg)';
  } else if (bpm < 60) {
    colorFilter = 'hue-rotate(160deg) saturate(0.9)';
  }
  video.style.filter = `blur(${blurAmount}px) brightness(${brightness}) ${colorFilter}`;
}

// F値スライダーの変更を視覚効果に反映
aperture.addEventListener('input', applyVisuals);

// --- 撮影・アルバム（メタデータ付き） ---
captureBtn.addEventListener('click', () => {
  if (video.videoWidth === 0 || video.videoHeight === 0) return alert('カメラ準備中です');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 保存用画像
  const imgURL = canvas.toDataURL('image/png');
  const dateStr = new Date().toLocaleString();

  const photoData = {
    url: imgURL,
    bpm: bpm || null,
    fValue: aperture.value,
    date: dateStr
  };

  addPhotoToAlbum(photoData);

  // localStorageに保存
  const saved = JSON.parse(localStorage.getItem('album') || '[]');
  saved.push(photoData);
  localStorage.setItem('album', JSON.stringify(saved));
});

function addPhotoToAlbum(photo){
  const card = document.createElement('div');
  card.className = 'photo-card';
  const img = document.createElement('img');
  img.src = photo.url;
  const meta = document.createElement('div');
  meta.className = 'photo-meta';
  meta.innerHTML = `BPM: ${photo.bpm ?? '-'}<br>F値: ${photo.fValue}<br>${photo.date}`;
  card.appendChild(img);
  card.appendChild(meta);
  album.prepend(card);
}

// ページ読み込み時に復元
window.addEventListener('load', () => {
  const saved = JSON.parse(localStorage.getItem('album') || '[]');
  saved.reverse().forEach(p => addPhotoToAlbum(p));
});
