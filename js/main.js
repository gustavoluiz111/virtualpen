import { STATE, on, EVENTS, setMode } from './state.js';
import { GestureEngine } from './gestures.js';
import { DrawMode } from './draw-mode.js';
import { CommandMode } from './command-mode.js';
import { speak } from './voice.js';

// --- Elements ---
const videoElement = document.getElementById('inputVideo');
const bgCanvas = document.getElementById('bgCanvas');
const uiCanvas = document.getElementById('uiCanvas');
const bgCtx = bgCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');
const startBtn = document.getElementById('startBtn');

// --- Initialization ---
const engine = new GestureEngine();
const drawMode = new DrawMode(bgCtx, uiCtx);
const commandMode = new CommandMode(uiCtx);

// --- MediaPipe ---
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// --- Main Loop ---
let lastOpenHandTime = 0;

function onResults(results) {
    resizeCanvasIfNeeded();

    // Clear UI layer every frame
    uiCtx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const { gesture, x, y } = engine.process(landmarks);

    // Global Mode Switch Logic (Open Hand for 1s)
    if (gesture === 'OPEN_HAND') {
        if (lastOpenHandTime === 0) lastOpenHandTime = Date.now();
        else if (Date.now() - lastOpenHandTime > 1000) {
            toggleMode();
            lastOpenHandTime = 0; // Reset
        }
    } else {
        lastOpenHandTime = 0;
    }

    // Process Modes
    if (STATE.mode === 'COMMAND') {
        commandMode.update(gesture, x, y);
    } else {
        drawMode.update(gesture, x, y);
    }
}

function toggleMode() {
    if (STATE.mode === 'DRAW') {
        setMode('COMMAND');
        speak('Modo Comando Ativado');
    } else {
        setMode('DRAW');
        speak('Modo Desenho Ativado');
    }
    updateUI();
}

function updateUI() {
    const statusEl = document.getElementById('modeStatus');
    statusEl.innerText = STATE.mode === 'DRAW' ? '✏️ DESENHO' : '🪐 COMANDO';
}

function resizeCanvasIfNeeded() {
    const rect = videoElement.getBoundingClientRect();
    if (STATE.canvasWidth !== rect.width || STATE.canvasHeight !== rect.height) {
        [bgCanvas, uiCanvas].forEach(canvas => {
            canvas.width = rect.width;
            canvas.height = rect.height;
        });
        STATE.canvasWidth = rect.width;
        STATE.canvasHeight = rect.height;
    }
}

// --- Init ---
startBtn.addEventListener('click', async () => {
    document.getElementById('startOverlay').classList.add('hidden');

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 720
    });

    try {
        await camera.start();
        speak('Bem vindo ao Gesture OS');
    } catch (error) {
        console.error('Camera failed:', error);
        if (error.name === 'NotReadableError' || error.message.includes('in use')) {
            alert('Câmera ocupada! Verifique se outro programa (Discord, WhatsApp, etc) está usando a câmera e feche-o.');
        } else {
            alert('Erro ao iniciar câmera: ' + error.message);
        }
    }
});

// Helper for 'Space' key to toggle mode (debug)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') toggleMode();
});
