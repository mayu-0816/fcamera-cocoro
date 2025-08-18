document.addEventListener('DOMContentLoaded', () => {
    // 画面要素を取得
    const screens = {
        splash: document.getElementById('screen-splash'),
        introduction: document.getElementById('screen-introduction'),
        fvalue: document.getElementById('screen-fvalue-input'),
        camera: document.getElementById('screen-camera'),
    };

    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) targetScreen.classList.add('active');
    }

    let currentStream = null;
    let isFrontCamera = false;
    let selectedFValue = null;

    async function startCamera(facingMode = 'environment') {
        const video = document.getElementById('video');
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());

        const constraints = { video: { facingMode: facingMode === 'environment' ? { exact: "environment" } : "user" } };

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

    async function switchCamera() {
        const video = document.getElementById('video');
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());

        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        const constraints = { video: { facingMode: newFacingMode } };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            currentStream = stream;
            isFrontCamera = !isFrontCamera;

            const fValueCameraDisplay = document.getElementById('fvalue-display-camera');
            if (fValueCameraDisplay && selectedFValue !== null) {
                fValueCameraDisplay.textContent = "F" + selectedFValue.toFixed(1);
            }
        } catch (err) {
            console.error("カメラの切り替えに失敗しました: ", err);
            alert("カメラを切り替えることができませんでした。");
        }
    }

    function applyFilterWithFValue(fValue) {
        const video = document.getElementById('video');
        if (fValue >= 1.2 && fValue < 5.6) video.style.filter = 'saturate(1.5) contrast(1.2)';
        else if (fValue >= 5.6 && fValue < 16.0) video.style.filter = 'none';
        else video.style.filter = 'brightness(0.9) contrast(1.1)';
    }

    // ボタンイベント
    const splashNextBtn = document.getElementById('splash-next-btn');
    if (splashNextBtn) splashNextBtn.addEventListener('click', () => showScreen('screen-introduction'));

    if (screens.introduction) {
        screens.introduction.addEventListener('click', () => showScreen('screen-fvalue-input'));
    }

    const fValueDecideBtn = document.getElementById('f-value-decide-btn');
    if (fValueDecideBtn) fValueDecideBtn.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('screen-camera');
        await startCamera('environment');
        applyFilterWithFValue(fValue);

        const fValueCameraDisplay = document.getElementById('fvalue-display-camera');
        if (fValueCameraDisplay) fValueCameraDisplay.textContent = "F" + fValue.toFixed(1);
    });

    const cameraSwitchBtn = document.getElementById('camera-switch-btn');
    if (cameraSwitchBtn) cameraSwitchBtn.addEventListener('click', switchCamera);

    // F値操作
    const fValueDisplayElement = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');

    const minFValue = 1.2;
    const maxFValue = 32.0;
    const minSize = 100;  // 修正
    const maxSize = 250;  // 修正
    const sizeRange = maxSize - minSize;

    function fValueToSize(fValue) {
        return minSize + ((fValue - minFValue) / (maxFValue - minFValue)) * sizeRange;
    }
    function sizeToFValue(size) {
        return minFValue + ((size - minSize) / sizeRange) * (maxFValue - minFValue);
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

    let lastDistance = null;

    document.body.addEventListener('touchstart', (e) => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) {
            e.preventDefault();
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const apertureControl = document.querySelector('.aperture-control');
            if (lastDistance && apertureControl) {
                const delta = currentDistance - lastDistance;
                const currentSize = apertureControl.offsetWidth;
                const newSize = Math.max(minSize, Math.min(maxSize, currentSize + delta));
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

    showScreen('screen-splash');
});
