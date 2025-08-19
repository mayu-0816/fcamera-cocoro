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
    function sizeToF(size){ return MAX_F - ((size-MIN_SIZE)/(MAX_SIZE-MIN_SIZE))*(MAX_F-MIN_F); }

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
