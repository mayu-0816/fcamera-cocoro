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

    // カメラを起動する関数
    async function startCamera(facingMode = 'environment') {
        const video = document.getElementById('video');
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: { exact: facingMode }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
        } catch (err) {
            console.error("カメラへのアクセスが拒否されました: ", err);
            // 外カメラで失敗した場合、内カメラを試みる
            if (facingMode === 'environment' && err.name === 'OverconstrainedError') {
                console.log('外カメラの起動に失敗。内カメラを試行します。');
                return startCamera('user');
            }
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    // カメラを切り替える関数
    async function switchCamera() {
        const video = document.getElementById('video');
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        const constraints = {
            video: {
                facingMode: newFacingMode
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            currentStream = stream;
            isFrontCamera = !isFrontCamera;
        } catch (err) {
            console.error("カメラの切り替えに失敗しました: ", err);
            alert("カメラを切り替えることができませんでした。");
        }
    }

    // フィルターを適用する関数
    function applyFilterWithFValue(fValue) {
        const video = document.getElementById('video');
        
        if (fValue >= 1.2 && fValue < 5.6) {
            video.style.filter = 'saturate(1.5) contrast(1.2)';
        } else if (fValue >= 5.6 && fValue < 16.0) {
            video.style.filter = 'none';
        } else {
            video.style.filter = 'grayscale(100%)';
        }
    }

    // スプラッシュ画面と導入画面へのクリックイベントリスナー
    document.body.addEventListener('click', (e) => {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const nextScreenId = activeScreen.dataset.nextScreen;
            if (nextScreenId) {
                showScreen(nextScreenId);
            }
        }
    });

    // F値入力画面の「決定」ボタンへのクリックイベント
    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    if (fValueDecideBtn) {
        fValueDecideBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fValue = parseFloat(document.getElementById('aperture').value);
            showScreen('screen-camera');
            await startCamera('environment'); // ここで外カメラを優先して起動
            applyFilterWithFValue(fValue);
        });
    }
    
    // カメラ切り替えボタンへのクリックイベントリスナー
    const cameraSwitchBtn = document.getElementById('camera-switch-btn');
    if (cameraSwitchBtn) {
        cameraSwitchBtn.addEventListener('click', () => {
            switchCamera();
        });
    }

    // F値決定円のピンチイン・アウト機能
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');

    let lastDistance = null;
    const minFValue = 1.2;
    const maxFValue = 32.0;

    const minSize = 250;
    const maxSize = 100;
    const sizeRange = minSize - maxSize;

    function fValueToSize(fValue) {
        const fValueRange = maxFValue - minFValue;
        return minSize - ((fValue - minFValue) / fValueRange) * sizeRange;
    }

    function sizeToFValue(size) {
        const fValueRange = maxFValue - minFValue;
        const normalizedSize = (minSize - size) / sizeRange;
        return minFValue + (normalizedSize * fValueRange);
    }
    
    if (fValueDisplay && apertureInput) {
        const initialFValue = 32.0;
        const initialSize = fValueToSize(initialFValue);
        const apertureControl = document.querySelector('.aperture-control');
        apertureControl.style.width = `${initialSize}px`;
        apertureControl.style.height = `${initialSize}px`;
        fValueDisplay.textContent = initialFValue.toFixed(1);
        apertureInput.value = initialFValue.toFixed(1);
    }

    document.body.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
        const fValueScreen = document.getElementById('screen-fvalue-input');
        if (!fValueScreen || !fValueScreen.classList.contains('active')) {
            return;
        }

        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const apertureControl = document.querySelector('.aperture-control');
            
            if (lastDistance && apertureControl) {
                const delta = currentDistance - lastDistance;
                const currentSize = apertureControl.offsetWidth;
                const newSize = Math.max(maxSize, Math.min(minSize, currentSize + delta * 1.0));

                const newFValue = sizeToFValue(newSize);

                apertureControl.style.width = `${newSize}px`;
                apertureControl.style.height = `${newSize}px`;
                fValueDisplay.textContent = newFValue.toFixed(1);
                apertureInput.value = newFValue.toFixed(1);
            }
            lastDistance = currentDistance;
        }
    }, { passive: false });

    document.body.addEventListener('touchend', () => {
        lastDistance = null;
    });

    function getDistance(touch1, touch2) {
        const dx = touch1.pageX - touch2.pageX;
        const dy = touch1.pageY - touch2.pageY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showScreen('screen-splash');
});
