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
            if (screen) {
                screen.classList.remove('active');
            }
        });

        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = null; // 決定したF値を保持

    // カメラを起動する関数
    async function startCamera(facingMode = 'environment') {
        const video = document.getElementById('video');
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode === 'environment' ? { exact: "environment" } : "user"
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
        } catch (err) {
            console.error("カメラへのアクセスが拒否されました: ", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // カメラ切り替え
    async function switchCamera() {
        const video = document.getElementById('video');
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        const constraints = { video: { facingMode: newFacingMode } };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            currentStream = stream;
            isFrontCamera = !isFrontCamera;

            // 切り替え後もF値表示を維持
            const fValueDisplay = document.getElementById('fvalue-display');
            if (fValueDisplay && selectedFValue !== null) {
                fValueDisplay.textContent = "F" + selectedFValue.toFixed(1);
            }
        } catch (err) {
            console.error("カメラの切り替えに失敗しました: ", err);
            alert("カメラを切り替えることができませんでした。");
        }
    }

    // F値に応じたフィルター
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

    // --- スプラッシュ画面「つぎへ」ボタンで次画面へ ---
    const splashNextBtn = document.getElementById('splash-next-btn');
    if (splashNextBtn) {
        splashNextBtn.addEventListener('click', () => {
            showScreen('screen-introduction');
        });
    }

    // --- 紹介画面クリックでF値入力画面へ ---
    if (screens.introduction) {
        screens.introduction.addEventListener('click', () => {
            showScreen('screen-fvalue-input');
        });
    }

    // F値入力画面の決定ボタン
    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    if (fValueDecideBtn) {
        fValueDecideBtn.addEventListener('click', async () => {
            const fValue = parseFloat(document.getElementById('aperture').value);
            selectedFValue = fValue; // 保存
            showScreen('screen-camera');
            await startCamera('environment');
            applyFilterWithFValue(fValue);

            // カメラ画面右上にF値表示
            const fValueDisplay = document.getElementById('fvalue-display');
            if (fValueDisplay) {
                fValueDisplay.textContent = "F" + fValue.toFixed(1);
            }
        });
    }

    // カメラ切り替えボタン
    const cameraSwitchBtn = document.getElementById('camera-switch-btn');
    if (cameraSwitchBtn) {
        cameraSwitchBtn.addEventListener('click', switchCamera);
    }

    // F値決定円のピンチイン・アウト
    const fValueDisplayElement = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');

    let lastDistance = null;
    const minFValue = 1.2;
    const maxFValue = 32.0;
    const minSize = 250;
    const maxSize = 100;
    const sizeRange = minSize - maxSize;

    function fValueToSize(fValue) {
        return minSize - ((fValue - minFValue) / (maxFValue - minFValue)) * sizeRange;
    }
    function sizeToFValue(size) {
        return minFValue + ((minSize - size) / sizeRange) * (maxFValue - minFValue);
    }

    if (fValueDisplayElement && apertureInput) {
        const initialFValue = 32.0;
        const initialSize = fValueToSize(initialFValue);
        const apertureControl = document.querySelector('.aperture-control');
        apertureControl.style.width = `${initialSize}px`;
        apertureControl.style.height = `${initialSize}px`;
        fValueDisplayElement.textContent = initialFValue.toFixed(1);
        apertureInput.value = initialFValue.toFixed(1);
    }

    document.body.addEventListener('touchstart', (e) => {
        const fValueScreen = document.getElementById('screen-fvalue-input');
        if (!fValueScreen?.classList.contains('active')) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
        const fValueScreen = document.getElementById('screen-fvalue-input');
        if (!fValueScreen?.classList.contains('active')) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const apertureControl = document.querySelector('.aperture-control');
            if (lastDistance && apertureControl) {
                const delta = currentDistance - lastDistance;
                const currentSize = apertureControl.offsetWidth;
                const newSize = Math.max(maxSize, Math.min(minSize, currentSize + delta));
                const newFValue = sizeToFValue(newSize);

                apertureControl.style.width = `${newSize}px`;
                apertureControl.style.height = `${newSize}px`;
                fValueDisplayElement.textContent = newFValue.toFixed(1);
                apertureInput.value = newFValue.toFixed(1);
            }
            lastDistance = currentDistance;
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => { lastDistance = null; });

    function getDistance(t1, t2) {
        const dx = t1.pageX - t2.pageX;
        const dy = t1.pageY - t2.pageY;
        return Math.sqrt(dx*dx + dy*dy);
    }

    // 初期画面
    showScreen('screen-splash');
});
