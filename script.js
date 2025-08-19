document.addEventListener('DOMContentLoaded', () => {
    // 画面要素をIDに合わせて定義
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

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = null;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraShutterBtn = document.getElementById('camera-shutter-btn');

    // プレビュー用canvas（videoの上に描画）
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0';
    previewCanvas.style.left = '0';
    previewCanvas.style.width = '100%';
    previewCanvas.style.height = '100%';
    screens.camera.appendChild(previewCanvas);

    let rafId = null;

    // F値に応じたフィルター
    function getFilter(fValue) {
        if (fValue >= 1.2 && fValue < 5.6) return 'saturate(1.5) contrast(1.2)';
        if (fValue >= 16.0) return 'brightness(0.9) contrast(1.1)';
        return 'none';
    }

    function applyFilterToVideo(fValue) {
        video.style.filter = getFilter(fValue);
    }

    // カメラ起動
    async function startCamera(facingMode = 'environment') {
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" } };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
            startPreviewLoop();
        } catch (err) {
            console.error("カメラへのアクセス拒否:", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // プレビューループ
    function startPreviewLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        const render = () => {
            if (video.videoWidth && video.videoHeight) {
                if (previewCanvas.width !== video.videoWidth || previewCanvas.height !== video.videoHeight) {
                    previewCanvas.width = video.videoWidth;
                    previewCanvas.height = video.videoHeight;
                }
                previewCtx.filter = getFilter(selectedFValue ?? 5.6);
                previewCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);
            }
            rafId = requestAnimationFrame(render);
        };
        rafId = requestAnimationFrame(render);
    }

    // 画面切替ボタン
    document.getElementById('initial-next-btn')?.addEventListener('click', () => showScreen('introduction'));
    document.getElementById('intro-next-btn')?.addEventListener('click', () => showScreen('fvalue'));

    // F値決定
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('camera');
        await startCamera('environment');
        applyFilterToVideo(fValue);
        document.getElementById('fvalue-display-camera').textContent = "F: " + fValue.toFixed(1);
    });

    // カメラ切替
    document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
        const newMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newMode);
        if (selectedFValue !== null) applyFilterToVideo(selectedFValue);
    });

    // F値操作
    const apertureControl = document.querySelector('.aperture-control');
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');
    const minF = 1.2, maxF = 32.0;
    const minSize = 100, maxSize = 250;

    function fToSize(f) { return minSize + ((maxF - f) / (maxF - minF)) * (maxSize - minSize); }
    function sizeToF(size) { return maxF - ((size - minSize) / (maxSize - minSize)) * (maxF - minF); }

    if (apertureControl && fValueDisplay && apertureInput) {
        const initialF = 32.0;
        const initialSize = fToSize(initialF);
        apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
        fValueDisplay.textContent = initialF.toFixed(1);
        apertureInput.value = initialF.toFixed(1);
    }

    let lastDistance = null;
    function getDistance(t1, t2) { return Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY); }

    document.body.addEventListener('touchstart', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) { e.preventDefault(); lastDistance = getDistance(e.touches[0], e.touches[1]); }
    }, { passive: false });

    document.body.addEventListener('touchmove', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2 && lastDistance) {
            e.preventDefault();
            const delta = getDistance(e.touches[0], e.touches[1]) - lastDistance;
            const newSize = Math.max(minSize, Math.min(maxSize, apertureControl.offsetWidth + delta));
            const newF = sizeToF(newSize);
            apertureControl.style.width = apertureControl.style.height = `${newSize}px`;
            fValueDisplay.textContent = newF.toFixed(1);
            apertureInput.value = newF.toFixed(1);
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => lastDistance = null);

    // 撮影ボタン
    cameraShutterBtn?.addEventListener('click', () => {
        if (!video.srcObject) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.filter = getFilter(selectedFValue ?? 5.6);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataURL = canvas.toDataURL('image/png');

        // ギャラリー追加
        let galleryContainer = document.getElementById('camera-gallery');
        if (!galleryContainer) {
            galleryContainer = document.createElement('div');
            galleryContainer.id = 'camera-gallery';
            galleryContainer.style.position = 'absolute';
            galleryContainer.style.bottom = '20px';
            galleryContainer.style.left = '50%';
            galleryContainer.style.transform = 'translateX(-50%)';
            galleryContainer.style.display = 'flex';
            galleryContainer.style.gap = '10px';
            galleryContainer.style.maxWidth = '90%';
            galleryContainer.style.overflowX = 'auto';
            galleryContainer.style.zIndex = '10';
            screens.camera.appendChild(galleryContainer);
        }

        const img = document.createElement('img');
        img.src = imageDataURL;
        img.style.width = '80px';
        img.style.border = '2px solid white';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => window.open(imageDataURL, '_blank'));
        galleryContainer.appendChild(img);

        // ダウンロード
        const link = document.createElement('a');
        link.href = imageDataURL;
        link.download = 'cocoro_photo.png';
        link.click();
    });

    showScreen('initial');
});
