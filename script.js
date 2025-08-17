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
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');

    let lastDistance = null;
    const minFValue = 1.2;
    const maxFValue = 32.0;

    // F値と円のサイズのマッピング
    const minSize = 250; // 最小F値（1.2）に対応する円のサイズ
    const maxSize = 100; // 最大F値（32.0）に対応する円のサイズ
    const sizeRange = minSize - maxSize;
    
    // F値を円のサイズに変換する関数
    function fValueToSize(fValue) {
        const fValueRange = maxFValue - minFValue;
        return minSize - ((fValue - minFValue) / fValueRange) * sizeRange;
    }

    // 円のサイズをF値に変換する関数
    function sizeToFValue(size) {
        const fValueRange = maxFValue - minFValue;
        const normalizedSize = (minSize - size) / sizeRange;
        return minFValue + (normalizedSize * fValueRange);
    }
    
    if (fValueDisplay && apertureInput) {
        // 初期状態をF32.0に設定
        const initialFValue = 32.0;
        const initialSize = fValueToSize(initialFValue);
        const apertureControl = document.querySelector('.aperture-control');
        apertureControl.style.width = `${initialSize}px`;
        apertureControl.style.height = `${initialSize}px`;
        fValueDisplay.textContent = initialFValue.toFixed(1);
        apertureInput.value = initialFValue.toFixed(1);
    }

    // ピンチジェスチャーのイベントリスナーをbody全体に設定
    document.body.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
        // F値画面がアクティブな時のみ処理を行う
        const fValueScreen = document.getElementById('screen-fvalue-input');
        if (!fValueScreen || !fValueScreen.classList.contains('active')) {
            return;
        }

        if (e.touches.length === 2) {
            e.preventDefault(); // 画面全体の動きを無効化
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const apertureControl = document.querySelector('.aperture-control');
            
            if (lastDistance && apertureControl) {
                const delta = currentDistance - lastDistance; // 指の距離の変化量

                // 円の新しいサイズを計算
                const currentSize = apertureControl.offsetWidth;
                const newSize = Math.max(maxSize, Math.min(minSize, currentSize + delta * 1.0)); // 感度を調整

                // F値も更新
                const newFValue = sizeToFValue(newSize);

                // サイズとF値の表示を更新
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

    // 2点間の距離を計算するヘルパー関数
    function getDistance(touch1, touch2) {
        const dx = touch1.pageX - touch2.pageX;
        const dy = touch1.pageY - touch2.pageY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showScreen('screen-splash');
});
