<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ココロカメラ</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            font-family: sans-serif;
            background-color: #f0f0f0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            /* 修正点: 画面の中央に配置するためのFlexboxプロパティを再確認 */
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            touch-action: pan-y;
            overscroll-behavior-y: none;
        }

        .app-container {
            width: 100%;
            height: 100%;
            max-width: 375px;
            max-height: 812px;
            background: #fff;
            position: relative;
            overflow: hidden;
            /* 修正点: コンテナ自体が中央に配置されるように調整 */
            margin: auto;
        }

        .screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            pointer-events: none;
        }

        .screen.active {
            opacity: 1;
            pointer-events: auto;
        }

        /* F値入力画面 */
        #screen-fvalue-input {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
        }

        .f-value-title-container {
            width: 100%;
            text-align: center;
            padding-top: 20px;
        }

        .aperture-control-container {
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
            width: 100%;
        }

        .description-text-container {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            padding-bottom: 20px;
        }

        .f-value-title {
            font-size: 2rem;
            font-weight: 700;
        }

        .aperture-control {
            position: relative;
            width: 200px;
            height: 200px;
            transition: all 0.2s ease-in-out;
        }

        .aperture-ring {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 4px solid #ccc;
            box-sizing: border-box;
            background: #f0f0f0;
            box-shadow:
                inset 0 0 10px rgba(0,0,0,0.1),
                0 5px 15px rgba(0,0,0,0.2),
                0 0 0 4px rgba(255,255,255,0.5),
                0 0 0 8px rgba(0,0,0,0.05);
        }

        .aperture-value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2.5rem;
            font-weight: bold;
        }

        .description-text p {
            font-size: 0.9rem;
            line-height: 1.5;
            color: #555;
            margin: 0;
        }

        #f-value-decide-btn, #splash-next-btn, .camera-btn {
            padding: 15px 40px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 999px;
            cursor: pointer;
            background-color: black;
            color: white;
            border: none;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        #screen-camera {
            background-color: #000;
            justify-content: center;
            align-items: center;
        }

        #video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        }

        #canvas {
            display: none;
        }

        .camera-ui {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            z-index: 2;
        }

        .camera-ui-top {
            width: 100%;
            display: flex;
            justify-content: space-between;
            padding: 10px;
            color: white;
            font-weight: bold;
        }

        .camera-ui-bottom {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
        }
        
        #screen-bpm-measure .video-container {
            position: relative;
            width: 100%;
            height: 50%;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        
        #bpm-video {
            width: 100%;
            height: auto;
            object-fit: contain;
        }
        
        #bpm-canvas {
            display: none;
        }

        #screen-bpm-measure .control-panel {
            width: 100%;
            height: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #fff;
            gap: 20px;
        }

        #bpm-display {
            font-size: 3rem;
            font-weight: bold;
            color: #333;
        }

        #bpm-start-btn, #bpm-stop-btn, #bpm-next-btn {
            padding: 15px 40px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 999px;
            cursor: pointer;
            background-color: #4CAF50;
            color: white;
            border: none;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        #bpm-stop-btn {
            background-color: #f44336;
            display: none; /* 初期は非表示 */
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- 画面１：スプラッシュ -->
        <div id="screen-initial" class="screen active">
            <h1>ココロカメラ</h1>
            <p>あなたの心のシャッターを切る</p>
            <button id="initial-next-btn" class="camera-btn">始める</button>
        </div>

        <!-- 画面２：使い方説明 -->
        <div id="screen-introduction" class="screen">
            <h2>使い方</h2>
            <p>
                「ココロカメラ」は、あなたの今の心の状態を写真に映し出します。<br>
                まずは今の心の状態に近い「絞り値(F値)」を選んでください。
            </p>
            <button id="intro-next-btn" class="camera-btn">次へ</button>
        </div>

        <!-- 画面３：F値入力 -->
        <div id="screen-fvalue-input" class="screen">
            <div class="f-value-title-container">
                <p>現在のF値を入力</p>
            </div>
            <div class="aperture-control-container">
                <div class="aperture-control">
                    <div class="aperture-ring"></div>
                    <div class="aperture-value" id="f-value-display">1.2</div>
                </div>
            </div>
            <div class="description-text-container">
                <div class="description-text">
                    <p>F値が小さいほど「開放的」に、</p>
                    <p>大きいほど「集中している」状態を表します。</p>
                </div>
                <input type="hidden" id="aperture" value="1.2">
                <button id="f-value-decide-btn" class="camera-btn">決定</button>
            </div>
        </div>

        <!-- 画面４：BPM計測 -->
        <div id="screen-bpm-measure" class="screen">
            <div class="video-container">
                <video id="bpm-video" autoplay playsinline></video>
                <canvas id="bpm-canvas" width="640" height="480"></canvas>
            </div>
            <div class="control-panel">
                <h2>心拍数を計測</h2>
                <p>指先をカメラに乗せてください</p>
                <div id="bpm-display">-- bpm</div>
                <button id="bpm-start-btn">計測開始</button>
                <button id="bpm-stop-btn">停止</button>
                <button id="bpm-next-btn" class="camera-btn">次へ</button>
            </div>
        </div>

        <!-- 画面５：カメラ -->
        <div id="screen-camera" class="screen">
            <video id="video" autoplay playsinline></video>
            <div class="camera-ui">
                <div class="camera-ui-top">
                    <span id="fvalue-display-camera">F: 1.2</span>
                    <span id="bpm-display-camera">BPM: --</span>
                </div>
                <div class="camera-ui-bottom">
                    <button id="camera-switch-btn" class="camera-btn">切り替え</button>
                    <button id="camera-shutter-btn" class="camera-btn">撮影</button>
                    <button id="camera-info-btn" class="camera-btn">情報</button>
                </div>
            </div>
        </div>
    </div>
    <script>
        // script.js
        document.addEventListener('DOMContentLoaded', () => {
            // --- 画面要素の定義 ---
            const screens = {
                initial: document.getElementById('screen-initial'),
                introduction: document.getElementById('screen-introduction'),
                fvalue: document.getElementById('screen-fvalue-input'),
                bpm: document.getElementById('screen-bpm-measure'),
                camera: document.getElementById('screen-camera'),
            };

            function showScreen(key) {
                Object.values(screens).forEach(s => s?.classList.remove('active'));
                screens[key]?.classList.add('active');
            }

            // --- カメラ・プレビュー用 ---
            const video = document.getElementById('video');
            const previewCanvas = document.createElement('canvas');
            const previewCtx = previewCanvas.getContext('2d');
            
            // NOTE: Add a check before appending the canvas to prevent errors if the element doesn't exist.
            if (screens.camera) {
                previewCanvas.style.position = 'absolute';
                previewCanvas.style.top = '0';
                previewCanvas.style.left = '0';
                previewCanvas.style.width = '100%';
                previewCanvas.style.height = '100%';
                previewCanvas.style.zIndex = '1';
                screens.camera.insertBefore(previewCanvas, screens.camera.firstChild);
            }

            let currentStream = null;
            let isFrontCamera = false;
            let selectedFValue = 1.2;
            let measuredBPM = '--';

            // --- F値に応じたフィルター計算 ---
            function getFilter(fValue) {
                const brightness = Math.max(0.7, Math.min(1.5, 2.5 / fValue));
                const saturate = Math.max(0.5, Math.min(2.0, 2.0 - fValue/32));
                const contrast = Math.max(0.8, Math.min(1.3, 1.0 + (8/fValue)*0.05));
                const blur = Math.max(0, 8*(1.2/fValue));
                return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`;
            }

            // --- プレビュー描画ループ ---
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
            function stopPreviewLoop() {
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            }

            // --- カメラ起動 ---
            async function startCamera(facingMode = 'environment') {
                try {
                    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
                    // NOTE: Check for navigator.mediaDevices before calling getUserMedia.
                    if (navigator.mediaDevices) {
                        const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" }, audio: false };
                        const stream = await navigator.mediaDevices.getUserMedia(constraints);
                        video.srcObject = stream;
                        await video.play();
                        currentStream = stream;
                        isFrontCamera = (facingMode === 'user');
                        video.style.display = 'none';
                        startPreviewLoop();
                    } else {
                        throw new Error('WebRTC not supported on this browser.');
                    }
                } catch (err) {
                    console.error('カメラエラー:', err);
                    // NOTE: Use a custom alert function to avoid window.alert in the iframe.
                    showCustomAlert('カメラを起動できません。権限を許可してください。');
                }
            }

            // --- 画面遷移 ---
            document.getElementById('initial-next-btn')?.addEventListener('click', ()=>showScreen('introduction'));
            document.getElementById('intro-next-btn')?.addEventListener('click', ()=>showScreen('fvalue'));
            
            document.getElementById('f-value-decide-btn')?.addEventListener('click', () => {
                const f = parseFloat(document.getElementById('aperture').value);
                selectedFValue = f;
                showScreen('bpm');
            });
            
            // --- BPM計測 ---
            const bpmVideo = document.getElementById('bpm-video');
            const bpmCanvas = document.getElementById('bpm-canvas');
            const bpmDisplay = screens.bpm.querySelector('#bpm-display');
            const bpmStartBtn = document.getElementById('bpm-start-btn');
            const bpmStopBtn = document.getElementById('bpm-stop-btn');
            const bpmNextBtn = document.getElementById('bpm-next-btn');
            
            let bpmStream = null;
            let bpmMeasurement = null;

            async function startBPMMeasurement() {
                try {
                    // NOTE: Check for navigator.mediaDevices before calling getUserMedia.
                    if (navigator.mediaDevices) {
                        const constraints = { video: { facingMode: { exact: "environment" } } };
                        bpmStream = await navigator.mediaDevices.getUserMedia(constraints);
                        bpmVideo.srcObject = bpmStream;
                        await bpmVideo.play();
                        
                        bpmStartBtn.style.display = 'none';
                        bpmStopBtn.style.display = 'block';
                        bpmNextBtn.style.display = 'none';
                        bpmDisplay.textContent = '計測中...';

                        // ダミーのBPM計測ロジック
                        let counter = 0;
                        bpmMeasurement = setInterval(() => {
                            const dummyBPM = Math.floor(Math.random() * (120 - 60 + 1) + 60);
                            bpmDisplay.textContent = `${dummyBPM} bpm`;
                            counter++;
                            if(counter >= 10){
                                measuredBPM = dummyBPM;
                                stopBPMMeasurement();
                            }
                        }, 1000);
                    } else {
                        throw new Error('WebRTC not supported on this browser.');
                    }
                } catch (err) {
                    console.error('BPM計測エラー:', err);
                    // NOTE: Use a custom alert function to avoid window.alert in the iframe.
                    showCustomAlert('カメラを起動できません。指を置く部分なので、バックカメラが有効になるよう設定してください。');
                    stopBPMMeasurement();
                }
            }

            function stopBPMMeasurement() {
                if (bpmStream) {
                    bpmStream.getTracks().forEach(track => track.stop());
                    bpmStream = null;
                }
                if (bpmMeasurement) {
                    clearInterval(bpmMeasurement);
                    bpmMeasurement = null;
                }
                
                if (bpmStartBtn) bpmStartBtn.style.display = 'block';
                if (bpmStopBtn) bpmStopBtn.style.display = 'none';
                if (bpmNextBtn) bpmNextBtn.style.display = 'block';
                if (bpmDisplay) bpmDisplay.textContent = `${measuredBPM} bpm`;
                if (document.getElementById('bpm-display-camera')) {
                    document.getElementById('bpm-display-camera').textContent = `BPM: ${measuredBPM}`;
                }
            }

            bpmStartBtn?.addEventListener('click', startBPMMeasurement);
            bpmStopBtn?.addEventListener('click', stopBPMMeasurement);
            bpmNextBtn?.addEventListener('click', () => {
                stopBPMMeasurement();
                showScreen('camera');
                startCamera('environment');
                document.getElementById('fvalue-display-camera').textContent = `F: ${selectedFValue}`;
            });
            
            // --- カメラ切替 ---
            document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
                const newMode = isFrontCamera ? 'environment' : 'user';
                await startCamera(newMode);
            });

            // --- F値ピンチ操作 ---
            const apertureControl = document.querySelector('.aperture-control');
            const fValueDisplay = document.getElementById('f-value-display');
            const apertureInput = document.getElementById('aperture');
            const MIN_F=1.2, MAX_F=32.0, MIN_SIZE=100, MAX_SIZE=250;

            function fToSize(f){ return MIN_SIZE + ((MAX_F-f)/(MAX_F-MIN_F))*(MAX_SIZE-MIN_SIZE); }
            function sizeToF(size){ return MAX_F - ((size-MIN_SIZE)/(MAX_SIZE-MIN_F))*(MAX_F-MIN_F); }

            if(apertureControl && fValueDisplay && apertureInput){
                const initialSize = fToSize(selectedFValue);
                apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
                fValueDisplay.textContent = selectedFValue.toFixed(1);
                apertureInput.value = selectedFValue.toFixed(1);
            }

            let lastDistance=null;
            function getDistance(t1,t2){ return Math.hypot(t1.pageX-t2.pageX, t1.pageY-t2.pageY); }

            document.body.addEventListener('touchstart', e=>{
                if(!screens.fvalue?.classList.contains('active')) return;
                if(e.touches.length===2){ e.preventDefault(); lastDistance=getDistance(e.touches[0],e.touches[1]); }
            },{passive:false});
            document.body.addEventListener('touchmove', e=>{
                if(!screens.fvalue?.classList.contains('active')) return;
                if(e.touches.length===2 && lastDistance){
                    e.preventDefault();
                    const current=getDistance(e.touches[0],e.touches[1]);
                    const delta=current-lastDistance;
                    const newSize=Math.max(MIN_SIZE,Math.min(MAX_SIZE,apertureControl.offsetWidth+delta));
                    const newF=sizeToF(newSize);
                    apertureControl.style.width=apertureControl.style.height=`${newSize}px`;
                    fValueDisplay.textContent=newF.toFixed(1);
                    apertureInput.value=newF.toFixed(1);
                    lastDistance=current;
                }
            },{passive:false});
            document.body.addEventListener('touchend',()=>{lastDistance=null;});

            // --- 撮影・保存 ---
            const shutterBtn = document.getElementById('camera-shutter-btn');
            function ensureGallery(){
                let g = document.getElementById('camera-gallery');
                if(!g){ g=document.createElement('div'); g.id='camera-gallery';
                    g.style.position='absolute'; g.style.bottom='20px'; g.style.left='50%';
                    g.style.transform='translateX(-50%)'; g.style.display='flex'; g.style.gap='10px';
                    g.style.maxWidth='90%'; g.style.overflowX='auto'; g.style.zIndex='10';
                    if (screens.camera) { screens.camera.appendChild(g); }
                }
                return g;
            }

            shutterBtn?.addEventListener('click', ()=>{
                if(!video.videoWidth) return;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = video.videoWidth;
                tempCanvas.height = video.videoHeight;
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCtx.filter = previewCanvas.style.filter;
                tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                
                const dataURL = tempCanvas.toDataURL('image/png');

                // ギャラリーにサムネイルを追加
                const gallery = ensureGallery();
                const thumb = document.createElement('img');
                thumb.src=dataURL; 
                thumb.style.width='80px'; 
                thumb.style.border='2px solid white';
                thumb.style.cursor='pointer'; 
                thumb.addEventListener('click',()=>window.open(dataURL,'_blank'));
                gallery.appendChild(thumb);

                // ダウンロード
                const a = document.createElement('a'); 
                a.href=dataURL; 
                a.download='cocoro_photo.png'; 
                a.click();
            });

            // --- カスタムアラート機能（window.alertの代替） ---
            function showCustomAlert(message) {
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '50%';
                modal.style.left = '50%';
                modal.style.transform = 'translate(-50%, -50%)';
                modal.style.padding = '20px';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                modal.style.color = 'white';
                modal.style.borderRadius = '10px';
                modal.style.zIndex = '9999';
                modal.style.textAlign = 'center';

                const text = document.createElement('p');
                text.textContent = message;
                text.style.margin = '0';
                modal.appendChild(text);

                const okButton = document.createElement('button');
                okButton.textContent = 'OK';
                okButton.style.marginTop = '10px';
                okButton.style.padding = '8px 20px';
                okButton.style.border = 'none';
                okButton.style.borderRadius = '5px';
                okButton.style.cursor = 'pointer';
                okButton.onclick = () => {
                    document.body.removeChild(modal);
                };
                modal.appendChild(okButton);

                document.body.appendChild(modal);
            }

            // 初期画面表示
            showScreen('initial');
        });
    </script>
</body>
</html>
