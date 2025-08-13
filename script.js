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
    let initialSize = 200; // 円の初期サイズを定義

    if (apertureControl && fValueDisplay && apertureInput) {
        apertureControl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // 2本の指がタッチした瞬間の距離を記録
                lastDistance = getDistance(e.touches[0], e.touches[1]);
            }
        }, { passive: false });

        apertureControl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); // デフォルトのスクロール動作を無効化

                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                if (lastDistance) {
                    const delta = currentDistance - lastDistance; // 指の距離の変化量

                    // 円の新しいサイズを計算
                    const currentSize = apertureControl.offsetWidth;
                    const newSize = Math.max(100, Math.min(300, currentSize + delta));
                    
                    // サイズを直接CSSに適用
                    apertureControl.style.width = `${newSize}px`;
                    apertureControl.style.height = `${newSize}px`;

                    // サイズの変化に応じてF値を更新
                    const fValueRange = 32.0 - 1.2;
                    const sizeRange = 300 - 100;
                    const fValue = 1.2 + (fValueRange * (newSize - 100) / sizeRange);
                    
                    // F値の表示とinputの値を更新
                    fValueDisplay.textContent = fValue.toFixed(1);
                    apertureInput.value = fValue.toFixed(1);
                }
                lastDistance = currentDistance; // 最後の距離を更新
            }
        }, { passive: false });

        apertureControl.addEventListener('touchend', () => {
            lastDistance = null; // タッチ終了時にリセット
        });

        // 2点間の距離を計算するヘルパー関数
        function getDistance(touch1, touch2) {
            const dx = touch1.pageX - touch2.pageX;
            const dy = touch1.pageY - touch2.pageY;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    showScreen('screen-splash');
});
