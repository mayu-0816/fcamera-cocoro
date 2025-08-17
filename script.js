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
            if (facingMode === 'environment' && (err.name === 'OverconstrainedError' || err.name === 'NotAllowedError')) {
                console.log('外カメラの起動に失敗。内カメラを試行します。');
                return startCamera('user');
            }
            // カスタムアラートを表示する関数
            showAlert("カメラを起動できませんでした。アクセスを許可してください。");
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
            // カスタムアラートを表示する関数
            showAlert("カメラを切り替えることができませんでした。");
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
    
    // カスタムアラート機能
    function showAlert(message) {
        // すでにアラートが存在する場合は何もしない
        if (document.getElementById('custom-alert-box')) return;

        const alertBox = document.createElement('div');
        alertBox.id = 'custom-alert-box';
        alertBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            z-index: 1000;
        `;
        alertBox.innerHTML = `
            <p>${message}</p>
            <button onclick="document.getElementById('custom-alert-box').remove()">OK</button>
        `;
        document.body.appendChild(alertBox);
    }
    
    // スプラッシュ画面と導入画面へのクリックイベントリスナー
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

    // F値入力画面の「決定」ボタンへのクリックイベント
    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    if (fValueDecideBtn) {
        fValueDecideBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
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
