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
            showScreen('screen-camera');
        });
    }

    // F値決定円のピンチイン・アウト機能
    const apertureControl = document.querySelector('.aperture-control');
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');
    let lastDistance = null;
    let initialSize = 200; // 修正箇所: 円の初期サイズを定義

    if (apertureControl && fValueDisplay && apertureInput) {
        apertureControl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastDistance = getDistance(e.touches[0], e.touches[1]);
            }
        }, { passive: false });

        apertureControl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                if (lastDistance) {
                    const delta = currentDistance - lastDistance;
                    let fValue = parseFloat(apertureInput.value);

                    // F値と円のサイズを同時に更新
                    const newSize = Math.max(100, Math.min(300, apertureControl.offsetWidth + delta));
                    apertureControl.style.width = `${newSize}px`;
                    apertureControl.style.height = `${newSize}px`;

                    if (delta > 0 && fValue < 32.0) { // ピンチアウト（拡大）
                        fValue = Math.min(32.0, fValue + 0.1);
                    } else if (delta < 0 && fValue > 1.2) { // ピンチイン（縮小）
                        fValue = Math.max(1.2, fValue - 0.1);
                    }
                    
                    fValueDisplay.textContent = fValue.toFixed(1);
                    apertureInput.value = fValue.toFixed(1);
                }
                lastDistance = currentDistance;
            }
        }, { passive: false });

        apertureControl.addEventListener('touchend', () => {
            lastDistance = null;
        });

        function getDistance(touch1, touch2) {
            const dx = touch1.pageX - touch2.pageX;
            const dy = touch1.pageY - touch2.pageY;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    showScreen('screen-splash');
});
