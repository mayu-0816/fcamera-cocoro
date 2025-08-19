// script.js（全文）
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
    const video = document.getElementById('video');        // 入力用（非表示にして使う）
    const rawCanvas = document.getElementById('canvas');   // 既存（撮影用に使う、表示しない）

    // プレビュー用canvasをJSで自動生成（画面に見せるのはこれ）
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');
    // 画面全面に敷く
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = '0';
    previewCanvas.style.left = '0';
    previewCanvas.style.width = '100%';
    previewCanvas.style.height = '100%';
    previewCanvas.style.objectFit = 'cover';
    previewCanvas.style.zIndex = '1';
    // カメラ画面の一番奥（videoより前）に配置
    screens.camera.insertBefore(previewCanvas, screens.camera.firstChild);

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = null;

    // rAFループ管理
    let rafId = null;
    function startPreviewLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        const render = () => {
            // videoのメタデータが来るまで待つ
            if (video.videoWidth && video.videoHeight) {
                // 内部解像度は毎フレーム動画サイズに合わせる
                if (previewCanvas.width !== video.videoWidth || previewCanvas.height !== video.videoHeight) {
                    previewCanvas.width  = video.videoWidth;
                    previewCanvas.height = video.videoHeight;
                }
                // フィルターを適用して描画
                previewCtx.filter = getFilter(selectedFValue ?? 5.6);
                previewCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);
            }
            rafId = requestAnimationFrame(render);
        };
        rafId = requestAnimationFrame(render);
    }
    function stopPreviewLoop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // カメラ起動
    async function startCamera(facingMode = 'environment') {
        try {
            // 既存ストリーム停止
            if (currentStream) currentStream.getTracks().forEach(t => t.stop());

            const constraints = {
                video: {
                    facingMode: facingMode === 'environment' ? { exact: "environment" } : "user"
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');

            // videoは裏方なので非表示
            video.style.display = 'none';

            // プレビュー開始
            startPreviewLoop();
        } catch (err) {
            console.error('カメラへのアクセス拒否/失敗:', err);
            alert('カメラを起動できませんでした。端末のカメラ権限を許可してください。');
        }
    }

    // --- F値 → フィルター文字列 ---
    function getFilter(fValue) {
        if (fValue >= 1.2 && fValue < 5.6) return 'saturate(1.5) contrast(1.2)';
        if (fValue >= 16.0) return 'brightness(0.9) contrast(1.1)';
        return 'none';
    }

    // --- 画面遷移ボタン ---
    document.getElementById('initial-next-btn')?.addEventListener('click', () => {
        showScreen('introduction');
    });
    document.getElementById('intro-next-btn')?.addEventListener('click', () => {
        showScreen('fvalue');
    });

    // --- F値決定でカメラ画面へ ---
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('camera');
        await startCamera('environment');
        const fHud = document.getElementById('fvalue-display-camera');
        if (fHud) fHud.textContent = 'F: ' + fValue.toFixed(1);
    });

    // --- カメラ切替 ---
    document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
        const newMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newMode);
    });

    // --- F値ピンチ操作（F=小 → 明るい/彩度UP, F=大 → 落ち着いた） ---
    const apertureControl = document.querySelector('.aperture-control');
    const fValueDisplay   = document.getElementById('f-value-display');
    const apertureInput   = document.getElementById('aperture');

    const MIN_F = 1.2, MAX_F = 32.0;
    const MIN_SIZE = 100, MAX_SIZE = 250; // 画面上の円サイズ

    function fToSize(f) {
        // Fが小さいほど円が大きい（直感に合わせる）
        return MIN_SIZE + ((MAX_F - f) / (MAX_F - MIN_F)) * (MAX_SIZE - MIN_SIZE);
    }
    function sizeToF(size) {
        return MAX_F - ((size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * (MAX_F - MIN_F);
    }

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
            const currentSize = apertureControl.offsetWidth;
            const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, currentSize + delta));
            const newF = sizeToF(newSize);

            apertureControl.style.width = apertureControl.style.height = `${newSize}px`;
            fValueDisplay.textContent = newF.toFixed(1);
            apertureInput.value = newF.toFixed(1);
            lastDistance = current;
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => { lastDistance = null; });

    // --- 撮影（プレビューと同じフィルターで保存） ---
    const shutterBtn = document.getElementById('camera-shutter-btn');

    // ギャラリーコンテナ（なければ作る）
    function ensureGallery() {
        let g = document.getElementById('camera-gallery');
        if (!g) {
            g = document.createElement('div');
            g.id = 'camera-gallery';
            g.style.position = 'absolute';
            g.style.bottom = '20px';
            g.style.left = '50%';
            g.style.transform = 'translateX(-50%)';
            g.style.display = 'flex';
            g.style.gap = '10px';
            g.style.maxWidth = '90%';
            g.style.overflowX = 'auto';
            g.style.zIndex = '10';
            screens.camera.appendChild(g);
        }
        return g;
    }

    shutterBtn?.addEventListener('click', () => {
        if (!video.videoWidth) return;

        // 保存用canvas（内部描画）
        const captureCanvas = rawCanvas || document.createElement('canvas');
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const ctx = captureCanvas.getContext('2d');

        // プレビューと同じフィルターを適用して描画
        ctx.filter = getFilter(selectedFValue ?? 5.6);
        ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

        // PNGで書き出し（iOS/Android/PCで同じ色味になる）
        const dataURL = captureCanvas.toDataURL('image/png');

        // ギャラリーに追加
        const gallery = ensureGallery();
        const thumb = document.createElement('img');
        thumb.src = dataURL;
        thumb.style.width = '80px';
        thumb.style.border = '2px solid white';
        thumb.style.cursor = 'pointer';
        thumb.addEventListener('click', () => window.open(dataURL, '_blank'));
        gallery.appendChild(thumb);

        // 自動ダウンロード（モバイルでは保存ダイアログが出ない場合あり）
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'cocoro_photo.png';
        a.click();
    });

    // 初期画面へ
    showScreen('initial');
});
