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
        // すべての画面を非表示にする
        Object.values(screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        // 指定された画面を表示する
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
            e.stopPropagation(); // 親要素へのイベント伝播を停止
            showScreen('screen-camera');
        });
    }

    // 初期画面を表示
    showScreen('screen-splash');
});
