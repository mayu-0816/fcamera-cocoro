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
            video.play();
            currentStream = stream;
            isFrontCamera = !isFrontCamera;
        } catch (err) {
            console.error("カメラの切り替えに失敗しました: ", err);
            alert("カメラを切り替えることができませんでした。");
        }
    }
    
    // 📷 F値に応じた一眼レフ風フィルター
    function applyFilterWithFValue(fValue) {
        const video = document.getElementById('video');
        
        if (fValue >= 1.2 && fValue < 2.8) {
            // 開放：明るくて鮮やか、少しボケ感
            video.style.filter = 'brightness(1.2) saturate(1.4) blur(1px)';
        } else if (fValue >= 2.8 && fValue < 5.6) {
            // 明るめ＆鮮やか
            video.style.filter = 'brightness(1.1) saturate(1.2)';
        } else if (fValue >= 5.6 && fValue < 11.0) {
            // 標準：自然
            video.style.filter = 'none';
        } else if (fValue >= 11.0 && fValue < 16.0) {
            // 少し暗めでシャープ
            video.style.filter = 'brightness(0.9) contrast(1.1)';
        } else {
            // F22〜：暗めで硬い雰囲気
            video.style.filter = 'brightness(0.8) contrast(1.2) saturate(0.9)';
        }
    }
    
    // --- 画面切り替えのイベントリスナーを修正 ---
    if (screens.splash) {
        screens.splash.addEventListener('click', () => {
            showScreen('screen-introduction');
        });
    }

    if (screens.introduction) {
        screens.introduction.addEventListener('click', () => {
            showScreen('screen-fvalue-input');
        });
    }
    // ------------------------------------------

    // F値入力画面の「決定」ボタンへのクリックイベント
    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    if (fValueDecideBtn) {
        fValueDecideBtn.addEventListener('click', async () => {
            const fValue = parseFloat(document.getElementById('aperture').value);
            showScreen('screen-camera');
            await startCamera('environment');
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
        const fValueScreen = document.getElementById('screen-fvalue-input');
        if (!fValueScreen || !fValueScreen.classList.contains('active')) {
            return;
        }

        if (e.touches.length === 2) {
            e.preventDefault();
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
