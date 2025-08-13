// UI要素を全て取得
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

// F値の円操作用
const apertureControl = document.querySelector('.aperture-control');
const fValueDisplay = document.getElementById('f-value-display');
const fValueDecideBtn = document.getElementById('f-value-decide-btn');

// ピンチジェスチャーのための変数
let touchStartDistance = null;
let currentFValue = 1.2;

// F値の最小・最大値
const F_VALUE_MIN = 1.2;
const F_VALUE_MAX = 32.0;

// --- 画面切り替えのロジック ---
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// 各画面のイベントリスナー（クリックしたら次の画面へ）
introScreen.addEventListener('click', () => {
  showScreen('screen-desc');
});

descScreen.addEventListener('click', () => {
  showScreen('screen-fvalue-input');
});

// F値決定ボタンのイベントリスナー
fValueDecideBtn.addEventListener('click', () => {
  showScreen('screen-camera');
  startCamera();
});

// --- カメラ起動機能 ---
async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
  }catch(e){
    console.error('カメラ起動失敗', e);
    alert('カメラへのアクセスが必要です。ブラウザの許可を確認してください。');
  }
}

// --- ピンチジェスチャーでのF値変更ロジック ---
fValueInputScreen.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    touchStartDistance = getTouchDistance(e.touches);
    e.preventDefault();
  }
});

fValueInputScreen.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && touchStartDistance !== null) {
    const currentDistance = getTouchDistance(e.touches);
    const distanceDiff = currentDistance - touchStartDistance;
    
    // 距離の差分をF値の変更量にマッピング
    const sensitivity = 0.05; // 感度を調整
    const fValueChange = distanceDiff * sensitivity; 
    let newFValue = currentFValue + fValueChange;
    
    // F値の最小値・最大値の範囲内に収める
    newFValue = Math.max(F_VALUE_MIN, Math.min(F_VALUE_MAX, newFValue));
    
    updateFValueDisplay(newFValue);
    
    touchStartDistance = currentDistance;
    e.preventDefault();
  }
});

fValueInputScreen.addEventListener('touchend', () => {
  touchStartDistance = null;
  currentFValue = parseFloat(aperture.value);
});

// 2本の指の間の距離を計算
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// F値の表示と円のサイズを更新する関数
function updateFValueDisplay(fValue) {
  const formattedFValue = fValue.toFixed(1);
  fValueDisplay.textContent = `F${formattedFValue}`;
  aperture.value = formattedFValue;
  currentFValue = fValue;
  
  // F値の変更に合わせて円のサイズも変更
  const minSize = 100;
  const maxSize = 350;
  const size = ((fValue - F_VALUE_MIN) / (F_VALUE_MAX - F_VALUE_MIN)) * (maxSize - minSize) + minSize;
  apertureControl.style.width = `${size}px`;
  apertureControl.style.height = `${size}px`;
  
  applyVisuals();
}

// --- 心拍（簡易）計測ロジック ---
let bpm = 0;
let redBuffer = [];
let lastPeakTime = 0;

const SAMPLE_INTERVAL_MS = 60;
const BUFFER_LEN = 30;
const PEAK_THRESHOLD = 2.5;

setInterval(() => {
  if (!cameraScreen.classList.contains('active') || video.videoWidth === 0 || video.videoHeight === 0) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const w = Math.floor(canvas.width * 0.4);
  const h = Math.floor(canvas.height * 0.4);
  const sx = Math.floor((canvas.width - w) / 2);
  const sy = Math.floor((canvas.height - h) / 2);
  const frame = ctx.getImageData(sx, sy, w, h);
  let redSum = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    redSum += frame.data[i];
  }
  const avgRed = redSum / (frame.data.length / 4);
  redBuffer.push(avgRed);
  if (redBuffer.length > BUFFER_LEN) redBuffer.shift();

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
  const f = parseFloat(aperture.value);
  const blurAmount = Math.max(0, (F_VALUE_MAX - f) / 10);
  const normalized = Math.min(160, Math.max(40, bpm || 100));
  const brightness = ( (normalized - 40) / (160 - 40) ) * (1.6 - 0.6) + 0.6;
  let colorFilter = '';
  if (bpm > 100) {
    colorFilter = 'contrast(1.05) saturate(1.2) sepia(0.15) hue-rotate(-10deg)';
  } else if (bpm < 60) {
    colorFilter = 'hue-rotate(160deg) saturate(0.9)';
  }
  video.style.filter = `blur(${blurAmount}px) brightness(${brightness}) ${colorFilter}`;
}

// --- 撮影・アルバム（メタデータ付き） ---
captureBtn.addEventListener('click', () => {
  if (video.videoWidth === 0 || video.videoHeight === 0) return alert('カメラ準備中です');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imgURL = canvas.toDataURL('image/png');
  const dateStr = new Date().toLocaleString();

  const photoData = {
    url: imgURL,
    bpm: bpm || null,
    fValue: aperture.value,
    date: dateStr
  };

  addPhotoToAlbum(photoData);

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

// ページ読み込み時に初期F値を表示
window.addEventListener('load', () => {
  showScreen('screen-intro');
  updateFValueDisplay(F_VALUE_MIN); // 初期F値を設定
  const saved = JSON.parse(localStorage.getItem('album') || '[]');
  saved.reverse().forEach(p => addPhotoToAlbum(p));
});
