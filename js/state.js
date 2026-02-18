export const STATE = {
    mode: 'COMMAND', // 'DRAW' or 'COMMAND'
    isDrawing: false,
    isErasing: false,
    drawColor: '#ef4444',
    drawSize: 6,
    
    // Command Mode State
    planetRotation: 0,
    selectedOrbitIndex: -1,
    hoveredIconIndex: -1,
    
    // Smoothing
    lastX: 0, 
    lastY: 0,
    
    // System
    canvasWidth: 0,
    canvasHeight: 0
};

export const EVENTS = {
    MODE_CHANGED: 'mode_changed',
    COMMAND_EXECUTED: 'command_executed'
};

const listeners = {};

export function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
}

export function emit(event, data) {
    if (listeners[event]) {
        listeners[event].forEach(cb => cb(data));
    }
}

export function setMode(newMode) {
    if (STATE.mode !== newMode) {
        STATE.mode = newMode;
        emit(EVENTS.MODE_CHANGED, newMode);
    }
}
