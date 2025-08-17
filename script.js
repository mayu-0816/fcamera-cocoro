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

    // カメラを起動する関数
    function startCamera() {
        const video = document.getElementById('video');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            return navigator.mediaDevices.getUserMedia({ video: true })
                .then((stream) => {
                    video.srcObject = stream;
                    video.play();
                    console.log("カメラが正常に起動しました。");
                })
                .catch((err) => {
                    console.error("カメラへのアクセスが拒否されました: ", err);
                    alert("カメラを起動できませんでした。アクセスを許可してください。");
                });
        }
        return Promise.reject(new Error("getUserMediaがサポートされていません。"));
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
        fValueDecideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fValue = parseFloat(document.getElementById('aperture').value);
            showScreen('screen-camera');
            startCamera().then(() => {
                applyFilterWithFValue(fValue);
            });
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
