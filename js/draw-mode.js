import { STATE } from './state.js';

export class DrawMode {
    constructor(bgCtx, uiCtx) {
        this.bgCtx = bgCtx;
        this.uiCtx = uiCtx;
    }

    update(gesture, x, y) {
        if (gesture === 'FIST') {
            this.clearScreen();
            return;
        }

        if (gesture === 'PEACE') {
            this.erase(x, y);
            STATE.isErasing = true;
            STATE.isDrawing = false;
        } else if (gesture === 'PINCH') {
            this.draw(x, y);
            STATE.isDrawing = true;
            STATE.isErasing = false;
        } else {
            // Lift pen
            STATE.isDrawing = false;
            STATE.isErasing = false;
            this.bgCtx.beginPath(); // Reset path on permanent layer
        }

        // Visual Feedback (Cursor always on UI layer)
        this.drawCursor(x, y, gesture);
    }

    draw(x, y) {
        this.bgCtx.globalCompositeOperation = 'source-over';
        this.bgCtx.lineWidth = STATE.drawSize;
        this.bgCtx.lineCap = 'round';
        this.bgCtx.lineJoin = 'round';
        this.bgCtx.strokeStyle = STATE.drawColor;

        if (!STATE.isDrawing) {
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(x, y);
        } else {
            this.bgCtx.lineTo(x, y);
            this.bgCtx.stroke();
        }
    }

    erase(x, y) {
        this.bgCtx.globalCompositeOperation = 'destination-out';
        this.bgCtx.beginPath();
        this.bgCtx.arc(x, y, 20, 0, Math.PI * 2);
        this.bgCtx.fill();
    }

    clearScreen() {
        this.bgCtx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);
    }

    drawCursor(x, y, gesture) {
        this.uiCtx.globalCompositeOperation = 'source-over';

        // Shadow/Glow
        this.uiCtx.shadowBlur = 10;
        this.uiCtx.shadowColor = STATE.drawColor;

        this.uiCtx.beginPath();
        if (gesture === 'PEACE') {
            this.uiCtx.arc(x, y, 20, 0, Math.PI * 2);
            this.uiCtx.strokeStyle = '#ef4444'; // Red for eraser
            this.uiCtx.lineWidth = 2;
            this.uiCtx.stroke();
        } else {
            this.uiCtx.arc(x, y, 6, 0, Math.PI * 2);
            this.uiCtx.fillStyle = STATE.drawColor;
            this.uiCtx.fill();

            // Ring if pinching
            if (gesture === 'PINCH') {
                this.uiCtx.beginPath();
                this.uiCtx.arc(x, y, 10, 0, Math.PI * 2);
                this.uiCtx.strokeStyle = 'white';
                this.uiCtx.lineWidth = 1;
                this.uiCtx.stroke();
            }
        }

        this.uiCtx.shadowBlur = 0; // Reset
    }
}
