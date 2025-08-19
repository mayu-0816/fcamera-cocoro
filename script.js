// script.js（F値反映版）
document.addEventListener('DOMContentLoaded', () => {
    // --- 画面要素 ---
    const screens = {
        initial: document.getElementById('screen-initial'),
        introduction: document.getElementById('screen-introduction'),
        fvalue: document.getElementById('screen-fvalue-input'),
        camera: document.getElementById('screen-camera'),
    };

    function showScreen(key) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[key]?.classList.add('active');
    }

    // --- カメラ・プレビュー用 ---
    const video = document.getElementById('video');        // 入力用（非表示）
    const rawCanvas = document.getElementById('canvas');   // 保存用canvas

    // プレビュー用canvasを自動生成
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0';
    previewCanvas.style.left = '0';
    previewCanvas.style.width = '100%';
    previewCanvas.style.height = '100%';
    previewCanvas.style.zIndex = '1';
    screens.camera.insertBefore(previewCanvas, screens.camera.firstChild);

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = 32.0; // 初期F値

    // --- F値に応じたフィルター計算 ---
    function getFilter(fValue) {
        // 明るさ
        const brightness = Math.max(0.7, Math.min(1.5, 2.5 / fValue));
        // 彩度
        const saturate = Math.max(0.5, Math.min(2.0, 2.0 - fValue/32));
        // コントラスト
        const contrast = Math.max(0.8, Math.min(1.3, 1.0 + (8/fValue)*0.05));
        // 背景ぼかし（擬似的に被写界深度）
        const blur = Math.max(0, 8*(1.2/fValue)); // F小 → blur大
        return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`;
    }

    // --- プレビュー描画ループ ---
    let rafId = null;
    function startPreviewLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        const render = () => {
            if (video.videoWidth && video.videoHeight) {
                // canvasサイズ合わせ
                if (previewCanvas.width !== video.videoWidth || previewCanvas.height !== video.videoHeight) {
                    previewCanvas.width = video.videoWidth;
                    previewCanvas.height = video.videoHeight;
                }
                // 前のフレームをクリア
                previewCtx.clearRect(0,0,previewCanvas.width, previewCanvas.height);

                // ★プレビューにリアルタイムでフィルターを適用★
                previewCanvas.style.filter = getFilter(selectedFValue);

                // 内カメラの鏡像補正はせず自然表示
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
            const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" }, audio: false };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
            video.style.display = 'none';
            startPreviewLoop();
        } catch (err) {
            console.error('カメラエラー:', err);
            alert('カメラを起動できません。権限を許可してください。');
        }
    }

    // --- 画面遷移 ---
    document.getElementById('initial-next-btn')?.addEventListener('click', ()=>showScreen('introduction'));
    document.getElementById('intro-next-btn')?.addEventListener('click', ()=>showScreen('fvalue'));

    // --- F値決定 ---
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        const f = parseFloat(document.getElementById('aperture').value);
        selectedFValue = f;
        showScreen('camera');
        await startCamera('environment');
        const fHud = document.getElementById('fvalue-display-camera');
        if(fHud) fHud.textContent = 'F: ' + f.toFixed(1);
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
            screens.camera.appendChild(g); }
        return g;
    }

    shutterBtn?.addEventListener('click', ()=>{
    if(!video.videoWidth) return;
    
    // ★プレビュー用のcanvasから画像データを直接取得★
    const dataURL = previewCanvas.toDataURL('image/png');

    // ギャラリー追加
    const gallery = ensureGallery();
    const thumb = document.createElement('img');
    thumb.src=dataURL; thumb.style.width='80px'; thumb.style.border='2px solid white';
    thumb.style.cursor='pointer'; thumb.addEventListener('click',()=>window.open(dataURL,'_blank'));
    gallery.appendChild(thumb);

    // ダウンロード
    const a = document.createElement('a'); a.href=dataURL; a.download='cocoro_photo.png'; a.click();
});
    // 初期画面
    showScreen('initial');
});

