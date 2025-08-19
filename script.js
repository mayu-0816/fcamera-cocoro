document.addEventListener('DOMContentLoaded', () => {
    // 画面要素
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
    let selectedFValue = 32.0; // 初期値

    // --- カメラ起動 ---
    async function startCamera(facingMode = 'environment') {
        const video = document.getElementById('video');
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" } };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
        } catch (err) {
            console.error("カメラへのアクセス拒否:", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // --- videoプレビューにフィルター反映 ---
    function applyVideoFilter(fValue) {
        const video = document.getElementById('video');
        if (fValue >= 1.2 && fValue < 5.6) video.style.filter = 'saturate(1.5) contrast(1.2)';
        else if (fValue >= 5.6 && fValue < 16.0) video.style.filter = 'none';
        else video.style.filter = 'brightness(0.9) contrast(1.1)';
    }

    // --- 画面切替 ---
    document.getElementById('initial-next-btn')?.addEventListener('click', () => showScreen('introduction'));
    document.getElementById('intro-next-btn')?.addEventListener('click', () => showScreen('fvalue'));

    // --- F値決定ボタン ---
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        selectedFValue = parseFloat(document.getElementById('aperture').value);
        showScreen('camera');
        await startCamera('environment');
        applyVideoFilter(selectedFValue);
        document.getElementById('fvalue-display-camera').textContent = "F: " + selectedFValue.toFixed(1);
    });

    // --- カメラ切替 ---
    document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
        const newMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newMode);
        applyVideoFilter(selectedFValue);
    });

    // --- F値操作（ピンチ対応） ---
    const apertureControl = document.querySelector('.aperture-control');
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');
    const minF = 1.2, maxF = 32.0;
    const minSize = 100, maxSize = 250;

    function fToSize(f) { return minSize + ((maxF - f) / (maxF - minF)) * (maxSize - minSize); }
    function sizeToF(size) { return maxF - ((size - minSize) / (maxSize - minSize)) * (maxF - minF); }

    if (apertureControl && fValueDisplay && apertureInput) {
        const initialSize = fToSize(selectedFValue);
        apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
        fValueDisplay.textContent = selectedFValue.toFixed(1);
        apertureInput.value = selectedFValue.toFixed(1);
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
            selectedFValue = newF;
            applyVideoFilter(selectedFValue);
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => lastDistance = null);

    // --- 撮影機能 + ギャラリー表示 ---
    const canvas = document.getElementById('canvas');
    canvas.style.display = 'none'; // 非表示
    const video = document.getElementById('video');
    const cameraShutterBtn = document.getElementById('camera-shutter-btn');

    // ギャラリーコンテナ
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

    cameraShutterBtn?.addEventListener('click', () => {
        if (!video.srcObject) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // videoと同じフィルターをcanvasに適用
        if (selectedFValue >= 1.2 && selectedFValue < 5.6) ctx.filter = 'saturate(1.5) contrast(1.2)';
        else if (selectedFValue >= 5.6 && selectedFValue < 16.0) ctx.filter = 'none';
        else ctx.filter = 'brightness(0.9) contrast(1.1)';

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataURL = canvas.toDataURL('image/png');

        // ギャラリー追加
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

    // --- 最初の画面 ---
    showScreen('initial');
});
