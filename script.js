document.addEventListener('DOMContentLoaded', () => {
    // 画面要素を取得
    const screens = {
        splash: document.getElementById('screen-splash'),
        introduction: document.getElementById('screen-introduction'),
        fvalue: document.getElementById('screen-fvalue-input'),
        camera: document.getElementById('screen-camera'),
    };

    // 画面切り替え関数
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        const targetScreen = screens[screenId];
        if (targetScreen) targetScreen.classList.add('active');
    }

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = null;

    // カメラ起動
    async function startCamera(facingMode = 'environment') {
        const video = document.getElementById('video');
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());

        const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" } };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
        } catch (err) {
            console.error("カメラへのアクセスが拒否されました:", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // カメラ切替
    async function switchCamera() {
        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newFacingMode);
        if (selectedFValue !== null) applyFilterWithFValue(selectedFValue);
    }

    // F値フィルター
    function applyFilterWithFValue(fValue) {
        const video = document.getElementById('video');
        if (fValue >= 1.2 && fValue < 5.6) {
            video.style.filter = 'saturate(1.5) contrast(1.2)';
        } else if (fValue >= 5.6 && fValue < 16.0) {
            video.style.filter = 'none';
        } else {
            video.style.filter = 'brightness(0.9) contrast(1.1)';
        }
    }

    // --- スプラッシュ画面「つぎへ」 ---
    const splashNextBtn = document.getElementById('splash-next-btn');
    splashNextBtn?.addEventListener('click', () => {
        showScreen('introduction');
    });

    // --- 紹介画面クリックでF値画面 ---
    screens.introduction?.addEventListener('click', () => {
        showScreen('fvalue');
    });

    // --- F値決定ボタン ---
    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    fValueDecideBtn?.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('camera');
        await startCamera('environment');
        applyFilterWithFValue(fValue);

        // カメラ右上に表示
        const fValueDisplayCamera = document.getElementById('fvalue-display-camera');
        if (fValueDisplayCamera) fValueDisplayCamera.textContent = "F: " + fValue.toFixed(1);
    });

    // --- カメラ切替ボタン ---
    const cameraSwitchBtn = document.getElementById('camera-switch-btn');
    cameraSwitchBtn?.addEventListener('click', switchCamera);

    // --- F値ピンチ操作 ---
    const fValueDisplayElement = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');
    const apertureControl = document.querySelector('.aperture-control');

    let lastDistance = null;
    const minFValue = 1.2, maxFValue = 32.0;
    const minSize = 100, maxSize = 250;
    const sizeRange = maxSize - minSize;

    function fValueToSize(fValue) {
        return minSize + ((fValue - minFValue) / (maxFValue - minFValue)) * sizeRange;
    }
    function sizeToFValue(size) {
        return minFValue + ((size - minSize) / sizeRange) * (maxFValue - minFValue);
    }

    if (apertureControl && fValueDisplayElement && apertureInput) {
        const initialFValue = 32.0;
        const initialSize = fValueToSize(initialFValue);
        apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
        fValueDisplayElement.textContent = initialFValue.toFixed(1);
        apertureInput.value = initialFValue.toFixed(1);
    }

    function getDistance(t1, t2) {
        const dx = t1.pageX - t2.pageX;
        const dy = t1.pageY - t2.pageY;
        return Math.sqrt(dx*dx + dy*dy);
    }

    document.body.addEventListener('touchstart', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) {
            e.preventDefault();
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            if (lastDistance && apertureControl) {
                const delta = currentDistance - lastDistance;
                const currentSize = apertureControl.offsetWidth;
                const newSize = Math.max(minSize, Math.min(maxSize, currentSize + delta));
                const newFValue = sizeToFValue(newSize);

                apertureControl.style.width = apertureControl.style.height = `${newSize}px`;
                fValueDisplayElement.textContent = newFValue.toFixed(1);
                apertureInput.value = newFValue.toFixed(1);
            }
            lastDistance = currentDistance;
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => { lastDistance = null; });

    // 初期画面表示
    showScreen('splash');
});
