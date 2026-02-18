import { STATE, emit, EVENTS } from './state.js';
import { speak, playTone } from './voice.js';

// Icons for the orbits (using simple text/emojis for now, could be replaced by SVGs)
const APPS = [
    { name: 'Spotify', icon: '🎵', command: 'SPOTIFY', color: '#1db954' },
    { name: 'VS Code', icon: '💻', command: 'VSCODE', color: '#007acc' },
    { name: 'Chrome', icon: '🌐', command: 'CHROME', color: '#ea4335' },
    { name: 'YouTube', icon: '📹', command: 'YOUTUBE', color: '#ff0000' },
    { name: 'Calculator', icon: '🧮', command: 'CALCULATOR', color: '#fb923c' },
    { name: 'Notepad', icon: '📝', command: 'NOTEPAD', color: '#94a3b8' },
    { name: 'Explorer', icon: '📂', command: 'EXPLORER', color: '#eab308' },
    { name: 'Terminal', icon: '⌨️', command: 'CMD', color: '#000000' },
    { name: 'WhatsApp', icon: '💬', command: 'WHATSAPP', color: '#25d366' },
    { name: 'Discord', icon: '🎮', command: 'DISCORD', color: '#5865f2' }
];

export class CommandMode {
    constructor(uiCtx) {
        this.ctx = uiCtx;
        this.centerX = 0;
        this.centerY = 0;
        this.orbitRadius = 150;
        this.iconSize = 40;
        this.lastPinchTime = 0;
    }

    update(gesture, x, y) {
        this.centerX = STATE.canvasWidth / 2;
        this.centerY = STATE.canvasHeight / 2;

        this.drawSystem();
        this.handleInteraction(gesture, x, y);
    }

    drawSystem() {
        this.ctx.globalCompositeOperation = 'source-over';

        // 1. Central Planet (Core)
        const planetGradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 10,
            this.centerX, this.centerY, 50
        );
        planetGradient.addColorStop(0, '#818cf8');
        planetGradient.addColorStop(1, '#1e1b4b');

        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = '#6366f1';
        this.ctx.fillStyle = planetGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 50, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#a5b4fc';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Label 'SYSTEM'
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = 'black';
        this.ctx.fillText('SYSTEM', this.centerX, this.centerY);

        // 2. Orbit Ring
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.orbitRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // 3. Satellites (Apps)
        const angleStep = (Math.PI * 2) / APPS.length;

        APPS.forEach((app, index) => {
            const angle = index * angleStep + STATE.planetRotation;
            const appX = this.centerX + Math.cos(angle) * this.orbitRadius;
            const appY = this.centerY + Math.sin(angle) * this.orbitRadius;

            // Check Hover
            const isHovered = index === STATE.hoveredIconIndex;
            const targetScale = isHovered ? 1.3 : 1;

            // Draw Connection Line
            if (isHovered) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.centerX, this.centerY);
                this.ctx.lineTo(appX, appY);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Draw Icon Bubble
            this.ctx.beginPath();
            this.ctx.arc(appX, appY, (this.iconSize / 2) * targetScale, 0, Math.PI * 2);

            // Gradient for bubbles
            const bubbleGradient = this.ctx.createRadialGradient(
                appX - 10, appY - 10, 5,
                appX, appY, 25
            );
            bubbleGradient.addColorStop(0, isHovered ? app.color : '#475569');
            bubbleGradient.addColorStop(1, isHovered ? adjustColor(app.color, -30) : '#1e293b');

            this.ctx.fillStyle = bubbleGradient;
            this.ctx.shadowBlur = isHovered ? 20 : 5;
            this.ctx.shadowColor = isHovered ? app.color : 'black';
            this.ctx.fill();

            // Icon Text
            this.ctx.fillStyle = 'white';
            this.ctx.shadowBlur = 0;
            this.ctx.font = `${22 * targetScale}px "Segoe UI Emoji"`;
            this.ctx.fillText(app.icon, appX, appY + 2); // centered

            // Label on Hover
            if (isHovered) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
                this.ctx.shadowColor = 'black';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText(app.name, appX, appY - 40);
            }
        });
    }

    handleInteraction(gesture, x, y) {
        // Find hovered icon
        let foundHover = -1;
        const angleStep = (Math.PI * 2) / APPS.length;

        APPS.forEach((app, index) => {
            const angle = index * angleStep + STATE.planetRotation;
            const appX = this.centerX + Math.cos(angle) * this.orbitRadius;
            const appY = this.centerY + Math.sin(angle) * this.orbitRadius;

            const dist = Math.sqrt((x - appX) ** 2 + (y - appY) ** 2);
            if (dist < 40) {
                foundHover = index;
            }
        });

        // Play hover sound if changed
        if (foundHover !== STATE.hoveredIconIndex && foundHover !== -1) {
            playTone(600, 'sine', 0.05);
        }

        STATE.hoveredIconIndex = foundHover;

        // Visual Cursor
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.fill();

        // Click / Execute
        if (gesture === 'PINCH' && foundHover !== -1) {
            const now = Date.now();
            if (now - this.lastPinchTime > 1000) { // Debounce 1s
                this.lastPinchTime = now;
                playTone(880, 'triangle', 0.1);
                this.executeCommand(APPS[foundHover]);
            }
        }
    }

    executeCommand(app) {
        speak(`Abrindo ${app.name}`);

        fetch('http://localhost:3000/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'OPEN_APP', target: app.command })
        }).catch(err => {
            console.warn('Backend unavailable', err);
            speak('Erro de conexão com o sistema');
        });
    }
}

// Helper to darken/lighten hex color
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
