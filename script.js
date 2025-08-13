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
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        
        // 指定された画面を表示する
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // スプラッシュ画面から導入画面への遷移
    screens.splash.addEventListener('click', () => {
        showScreen('screen-introduction');
    });

    // 導入画面からF値入力画面への遷移
    screens.introduction.addEventListener('click', () => {
        showScreen('screen-fvalue-input');
    });

    // 初期画面を表示
    showScreen('screen-splash');
});
