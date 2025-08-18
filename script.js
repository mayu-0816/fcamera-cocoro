document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        splash: document.getElementById('screen-splash'),
        introduction: document.getElementById('screen-introduction'),
        fvalue: document.getElementById('screen-fvalue-input'),
        camera: document.getElementById('screen-camera'),
    };

    function showScreen(key) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[key]?.classList.add('active');
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
            await video.play();
            currentStream = stream;
            isFrontCamera = (facingMode === 'user');
        } catch (err) {
            console.error("カメラへのアクセス拒否:", err);
            alert("カメラを起動できませんでした。アクセスを許可してください。");
        }
    }

    function applyFilter(fValue) {
        const video = document.getElementById('video');
        if (fValue >= 1.2 && fValue < 5.6) video.style.filter = 'saturate(1.5) contrast(1.2)';
        else if (fValue >= 5.6 && fValue < 16.0) video.style.filter = 'none';
        else video.style.filter = 'brightness(0.9) contrast(1.1)';
    }

    // スプラッシュ画面
    document.getElementById('splash-next-btn')?.addEventListener('click', () => {
        showScreen('introduction');
    });

    // 紹介画面クリックでF値画面
    screens.introduction?.addEventListener('click', () => showScreen('fvalue'));

    // F値決定ボタン
    document.getElementById('f-value-decide-btn')?.addEventListener('click', async () => {
        const fValue = parseFloat(document.getElementById('aperture').value);
        selectedFValue = fValue;
        showScreen('camera');
        await startCamera('environment');
        applyFilter(fValue);
        document.getElementById('fvalue-display-camera').textContent = "F: " + fValue.toFixed(1);
    });

    // カメラ切替
    document.getElementById('camera-switch-btn')?.addEventListener('click', async () => {
        const newMode = isFrontCamera ? 'environment' : 'user';
        await startCamera(newMode);
        if (selectedFValue !== null) applyFilter(selectedFValue);
    });

    // F値ピンチ操作
    const apertureControl = document.querySelector('.aperture-control');
    const fValueDisplay = document.getElementById('f-value-display');
    const apertureInput = document.getElementById('aperture');

    const minF = 1.2, maxF = 32.0;
    const minSize = 100, maxSize = 250;

    // F値と円サイズを対応させる関数
    function fToSize(f) {
        // F32 = 小さい円, F1.2 = 大きい円
        return minSize + ((maxF - f) / (maxF - minF)) * (maxSize - minSize);
    }
    function sizeToF(size) {
        return maxF - ((size - minSize) / (maxSize - minSize)) * (maxF - minF);
    }

    // 初期値をF32に設定（小さい円）
    if (apertureControl && fValueDisplay && apertureInput) {
        const initialF = 32.0;
        const initialSize = fToSize(initialF);
        apertureControl.style.width = apertureControl.style.height = `${initialSize}px`;
        fValueDisplay.textContent = initialF.toFixed(1);
        apertureInput.value = initialF.toFixed(1);
    }

    let lastDistance = null;
    function getDistance(t1,t2){return Math.hypot(t1.pageX-t2.pageX,t1.pageY-t2.pageY);}

    document.body.addEventListener('touchstart', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2) { e.preventDefault(); lastDistance = getDistance(e.touches[0],e.touches[1]); }
    }, {passive:false});

    document.body.addEventListener('touchmove', e => {
        if (!screens.fvalue?.classList.contains('active')) return;
        if (e.touches.length === 2 && lastDistance) {
            e.preventDefault();
            const delta = getDistance(e.touches[0],e.touches[1]) - lastDistance;
            const newSize = Math.max(minSize, Math.min(maxSize, apertureControl.offsetWidth + delta));
            const newF = sizeToF(newSize);
            apertureControl.style.width = apertureControl.style.height = `${newSize}px`;
            fValueDisplay.textContent = newF.toFixed(1);
            apertureInput.value = newF.toFixed(1);
            lastDistance = getDistance(e.touches[0],e.touches[1]);
        }
    }, {passive:false});

    document.body.addEventListener('touchend', () => lastDistance=null);

    showScreen('splash');
});
