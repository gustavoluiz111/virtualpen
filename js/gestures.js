import { STATE } from './state.js';

export class GestureEngine {
    constructor() {
        this.lastGesture = 'IDLE';
        this.smoothingFactor = 0.5;
    }

    process(landmarks) {
        if (!landmarks) return { gesture: 'IDLE', x: 0, y: 0 };

        // 1. Coordinates
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        
        // Map to screen
        // Mirror X
        const rawX = (1 - indexTip.x) * STATE.canvasWidth;
        const rawY = indexTip.y * STATE.canvasHeight;

        // Smooth
        const x = STATE.lastX + (rawX - STATE.lastX) * (1 - this.smoothingFactor);
        const y = STATE.lastY + (rawY - STATE.lastY) * (1 - this.smoothingFactor);
        
        STATE.lastX = x;
        STATE.lastY = y;

        // 2. Gesture Logic
        const gesture = this.detectGesture(landmarks);

        return { gesture, x, y };
    }

    detectGesture(lm) {
        const indexTip = lm[8];
        const thumbTip = lm[4];
        const middleTip = lm[12];
        const ringTip = lm[16];
        const pinkyTip = lm[20];

        const indexPip = lm[6];
        const middlePip = lm[10];
        const ringPip = lm[14];
        const pinkyPip = lm[18];

        // Finger States
        const isIndexUp = indexTip.y < indexPip.y;
        const isMiddleUp = middleTip.y < middlePip.y;
        const isRingUp = ringTip.y < ringPip.y;
        const isPinkyUp = pinkyTip.y < pinkyPip.y;

        const isFist = !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp;
        const isOpenHand = isIndexUp && isMiddleUp && isRingUp && isPinkyUp;
        
        // Pince / Pinch data
        const pinchDist = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) + 
            Math.pow(indexTip.y - thumbTip.y, 2)
        );

        // Logic Hierarchy
        if (isFist) return 'FIST';
        
        if (isOpenHand) return 'OPEN_HAND';

        // Peace Sign (Index + Middle) -> Eraser (in Draw mode)
        if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return 'PEACE';

        // Pinch (Draw / Click)
        if (pinchDist < 0.05) return 'PINCH';

        // Just Index
        if (isIndexUp && !isMiddleUp) return 'POINT';

        return 'IDLE';
    }
}
