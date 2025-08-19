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

    const video = document.createElement('video');
    video.playsInline = true;
    video.autoplay = true;
    video.style.display = 'none'; // 非表示にしてcanvas表示

    screens.camera.appendChild(video);

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

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
            requestAnimationFrame(updateCanvas); // 描画ループ開始
        } catch (err) {
            console.error("カメラへのアクセス拒否:", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // F値に応じたフィルター（canvas用）
    function getCanvasFilter(fValue) {
        if (fValue >= 1.2 && fValue < 5.6) return 'saturate(1.5) contrast(1.2)';
        if (fValue >= 16.0) return 'brightness(0.9) contrast(1.1)';
        return 'none';
    }

    // canvas描画ループ（videoからコピー＆フィルター適用）
    function updateCanvas() {
        if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.filter = getCanvasFilter(selectedFValue || 1.2);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(updateCanvas);
    }

    // ボタンクリックで画面切替
    document.getElementById('initial-next-btn')?.addEventListener('click', () => showScreen('introduction'));
    document.getElementById('intro-next-btn')?.addEventListener('click', () => showScreen('fvalue'));

    // F値決定ボタン
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('camera');
        await startCamera('environment');
        document.getElementById('fvalue-display-camera').textContent = "F: " + fValue.toFixed(1);
    });

    // カメラ切替
    document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
        const newMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newMode);
    });

    // --- 撮影機能 + ギャラリー表示 ---
    const cameraShutterBtn = document.getElementById('camera-shutter-btn');

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

        // canvasに描画済みなのでそのまま保存
        const imageDataURL = canvas.toDataURL('image/png');

        // ギャラリーに追加
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
