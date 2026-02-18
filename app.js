/**
 * Virtual Pen - Advanced Gesture & Drawing Logic
 * Uses MediaPipe Hands for detection and HTML5 Canvas for rendering.
 */

// --- Configuration & State ---
const CONFIG = {
    videoWidth: 1280,
    videoHeight: 720,
    smoothing: 0.5, // 0 = no smoothing, 1 = max smoothing
    pinchThreshold: 0.05, // Distance between index and thumb to trigger draw
    eraseDistThreshold: 0.06 // Distance between index and middle to trigger erase
};

const STATE = {
    isDrawing: false,
    isErasing: false,
    color: '#ef4444', // Default Red
    lineWidth: 6,
    lastX: 0,
    lastY: 0,
    canvasWidth: 0,
    canvasHeight: 0
};

// --- DOM Elements ---
const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const cursor = document.getElementById('handCursor');
const cursorInner = document.getElementById('cursorInner');
const statusIndicator = document.getElementById('statusIndicator');
const startBtn = document.getElementById('startBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const startOverlay = document.getElementById('startOverlay');

// --- Helper Funcs ---
function setStatus(text, type) {
    statusIndicator.innerText = text;
    statusIndicator.className = 'ml-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border';
    
    if (type === 'active') statusIndicator.classList.add('status-active');
    else if (type === 'drawing') statusIndicator.classList.add('status-drawing');
    else if (type === 'erasing') statusIndicator.classList.add('status-erasing');
    else statusIndicator.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
}

// --- Canvas Setup ---
function resizeCanvas() {
    // Match canvas size to its visual display size provided by CSS
    const rect = canvasElement.getBoundingClientRect();
    canvasElement.width = rect.width;
    canvasElement.height = rect.height;
    STATE.canvasWidth = rect.width;
    STATE.canvasHeight = rect.height;
    
    // Re-apply context styles after resize
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- MediaPipe Hands Setup ---
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7, // High confidence to reduce jitter
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// --- Main Loop ---
function onResults(results) {
    // Hide loading if visible
    if (!loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
        resizeCanvas(); // Ensure canvas is sized correctly once video starts
    }

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        cursor.classList.add('hidden');
        setStatus('Aguardando Mão...', 'idle');
        return;
    }

    const landmarks = results.multiHandLandmarks[0];
    processGestures(landmarks);
}

// --- Gesture Recognition Engine ---
function processGestures(landmarks) {
    // NOTE: MediaPipe x is 0-1 (left-right), y is 0-1 (top-bottom).
    // Start origin (0,0) is top-left.
    
    // Key Landmarks
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];
    const wrist = landmarks[0];

    // Coordinates mapped to Screen
    // IMPORTANT: Mirror X because video is mirrored
    // results.image width isn't always reliable, use STATE.canvasWidth
    const rawX = (1 - indexTip.x) * STATE.canvasWidth; 
    const rawY = indexTip.y * STATE.canvasHeight;

    // Smoothing Logic (Exponential Moving Average)
    const smoothX = STATE.lastX + (rawX - STATE.lastX) * (1 - CONFIG.smoothing);
    const smoothY = STATE.lastY + (rawY - STATE.lastY) * (1 - CONFIG.smoothing);

    // Update Cursor Position
    cursor.classList.remove('hidden');
    cursor.style.left = `${smoothX}px`;
    cursor.style.top = `${smoothY}px`;

    // 1. Calculate Distances for Gestures
    const pinchDist = calculateDistance(indexTip, thumbTip);
    
    // Index and Middle finger up check (Peace sign check rough approximation)
    const peaceDist = calculateDistance(indexTip, middleTip);
    const isIndexUp = indexTip.y < landmarks[6].y; // Tip above PIP joint
    const isMiddleUp = middleTip.y < landmarks[10].y;
    const isRingDown = landmarks[16].y > landmarks[14].y;
    const isPinkyDown = landmarks[20].y > landmarks[18].y;

    // Fist Detection (All fingers closed)
    const isFist = !isIndexUp && !isMiddleUp && isRingDown && isPinkyDown;

    // --- State Machine ---
    
    // CLEAR: Fist
    if (isFist) {
        clearCanvas();
        setStatus('Limpar Tela', 'idle');
        STATE.isDrawing = false;
        STATE.isErasing = false;
    }
    // ERASE: Peace Sign (Index + Middle Up)
    else if (isIndexUp && isMiddleUp && !isRingDown && peaceDist < 0.1) {
         // Double check peace sign logic, actually "Index + Middle together" is usually for erasing in this context
         // Let's stick to the plan: Index + Middle up = Erase
         startErasing(smoothX, smoothY);
    }
    // DRAW: Pinch (Index + Thumb close)
    else if (pinchDist < CONFIG.pinchThreshold) {
        startDrawing(smoothX, smoothY);
    }
    // HOVER: Just Index Up (or just moving)
    else {
        stopAction();
        setStatus('Mover', 'active');
    }

    // Save history for smoothing
    STATE.lastX = smoothX;
    STATE.lastY = smoothY;
}

// --- Drawing Actions ---
function startDrawing(x, y) {
    setStatus('Desenhando', 'drawing');
    cursor.classList.add('drawing');
    cursor.classList.remove('erasing');
    cursorInner.style.backgroundColor = STATE.color;

    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.beginPath();
    canvasCtx.moveTo(STATE.lastX, STATE.lastY); // Connect from last smoothed point
    canvasCtx.lineTo(x, y);
    canvasCtx.strokeStyle = STATE.color;
    canvasCtx.lineWidth = STATE.lineWidth;
    canvasCtx.stroke();
    
    STATE.isDrawing = true;
    STATE.isErasing = false;
}

function startErasing(x, y) {
    setStatus('Apagando', 'erasing');
    cursor.classList.add('erasing');
    cursor.classList.remove('drawing');
    
    canvasCtx.globalCompositeOperation = 'destination-out'; // Erase mode
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 20, 0, Math.PI * 2); // Circle eraser
    canvasCtx.fill();

    STATE.isDrawing = false;
    STATE.isErasing = true;
}

function stopAction() {
    STATE.isDrawing = false;
    STATE.isErasing = false;
    cursor.classList.remove('drawing', 'erasing');
    canvasCtx.beginPath(); // Reset path to avoid connecting to new jump
}

function clearCanvas() {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

// --- Utils ---
function calculateDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// --- UI Interactions ---

// Color Pickers
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active class from all
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Set color
        STATE.color = e.target.getAttribute('data-color');
        
        // Update cursor preview
        cursorInner.style.backgroundColor = STATE.color;
    });
});

// Size Slider
document.getElementById('sizeSlider').addEventListener('input', (e) => {
    STATE.lineWidth = e.target.value;
});

document.getElementById('clearBtn').addEventListener('click', clearCanvas);

// --- Camera & Init ---
startBtn.addEventListener('click', async () => {
    startOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            // Wait for video to be ready
            await hands.send({image: videoElement});
        },
        width: CONFIG.videoWidth,
        height: CONFIG.videoHeight
    });
    
    try {
        await camera.start();
        console.log("Camera started");
    } catch (e) {
        console.error(e);
        alert("Erro ao iniciar câmera. Verifique permissões.");
        loadingOverlay.classList.add('hidden');
        startOverlay.classList.remove('hidden');
    }
});
