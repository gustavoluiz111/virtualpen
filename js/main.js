import { STATE, on, EVENTS, setMode } from './state.js';
import { GestureEngine } from './gestures.js';
import { DrawMode } from './draw-mode.js';
import { CommandMode } from './command-mode.js';
import { speak } from './voice.js';

// --- Setup ---
const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const ctx = canvasElement.getContext('2d');
const startBtn = document.getElementById('startBtn');
const uiOverlay = document.getElementById('uiOverlay');

const engine = new GestureEngine();
const drawMode = new DrawMode(ctx);
const commandMode = new CommandMode(ctx);

// --- MediaPipe ---
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

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

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // No hand logic needed here, maybe pause?
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

    // Clear canvas before drawing new frame (unless in draw mode where we persist?)
    // Actually, DrawMode needs persistence, CommandMode needs clear.
    // Solution: DrawMode manages its own persistence or we use separate layers?
    // For simplicity: We use the same canvas.
    // In DRAW mode, we DO NOT clear every frame (only sticky drawing).
    // In COMMAND mode, we MUST clear every frame.
    
    if (STATE.mode === 'COMMAND') {
        ctx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);
        commandMode.update(gesture, x, y);
    } else {
        // In DRAW mode, update handles drawing on top. 
        // We only clear if FIST is detected inside update()
        drawMode.update(gesture, x, y);
    }
}

function toggleMode() {
    if (STATE.mode === 'DRAW') {
        setMode('COMMAND');
        speak('Modo Comando Ativado');
        // Clear canvas when switching to command
        ctx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);
    } else {
        setMode('DRAW');
        speak('Modo Desenho Ativado');
        // Clear again for fresh drawing
        ctx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);
    }
    updateUI();
}

function updateUI() {
    const statusEl = document.getElementById('modeStatus');
    statusEl.innerText = STATE.mode === 'DRAW' ? '✏️ DESENHO' : '🪐 COMANDO';
}

function resizeCanvasIfNeeded() {
    const rect = canvasElement.getBoundingClientRect();
    if (canvasElement.width !== rect.width || canvasElement.height !== rect.height) {
        canvasElement.width = rect.width;
        canvasElement.height = rect.height;
        STATE.canvasWidth = rect.width;
        STATE.canvasHeight = rect.height;
    }
}

// --- Init ---
startBtn.addEventListener('click', async () => {
    document.getElementById('startOverlay').classList.add('hidden');
    
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });
    
    await camera.start();
    speak('Bem vindo ao Gesture OS');
});

// Helper for 'Space' key to toggle mode (debug)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') toggleMode();
});
