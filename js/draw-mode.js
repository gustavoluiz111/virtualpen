import { STATE } from './state.js';

export class DrawMode {
    constructor(ctx) {
        this.ctx = ctx;
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
            this.ctx.beginPath(); // Reset path
        }

        // Visual Feedback (Cursor)
        this.drawCursor(x, y, gesture);
    }

    draw(x, y) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineWidth = STATE.drawSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = STATE.drawColor;

        if (!STATE.isDrawing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        } else {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }

    erase(x, y) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.fill();
    }

    clearScreen() {
        this.ctx.clearRect(0, 0, STATE.canvasWidth, STATE.canvasHeight);
    }

    drawCursor(x, y, gesture) {
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Shadow/Glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = STATE.drawColor;
        
        this.ctx.beginPath();
        if (gesture === 'PEACE') {
             this.ctx.arc(x, y, 20, 0, Math.PI * 2);
             this.ctx.strokeStyle = '#ef4444'; // Red for eraser
             this.ctx.lineWidth = 2;
             this.ctx.stroke();
        } else {
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = STATE.drawColor;
            this.ctx.fill();
            
            // Ring if pinching
            if (gesture === 'PINCH') {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 10, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
        
        this.ctx.shadowBlur = 0; // Reset
    }
}
