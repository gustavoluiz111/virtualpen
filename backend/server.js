const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Command Map for Windows
const COMMANDS = {
    'VSCODE': 'code',
    'CHROME': 'start chrome',
    'SPOTIFY': 'start spotify',
    'NOTEPAD': 'notepad',
    'CALCULATOR': 'calc',
    'EXPLORER': 'explorer',
    'CMD': 'start cmd',
    'YOUTUBE': 'start chrome https://www.youtube.com',
    'WHATSAPP': 'start whatsapp:',  // Requires WhatsApp installed
    'DISCORD': 'start discord:',    // Requires Discord installed
};

app.post('/command', (req, res) => {
    const { action, target } = req.body;
    
    console.log(`Received command: ${action} -> ${target}`);

    if (action === 'OPEN_APP') {
        const cmd = COMMANDS[target.toUpperCase()];
        
        if (cmd) {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing ${target}:`, error);
                    return res.status(500).json({ status: 'error', message: error.message });
                }
                console.log(`Executed: ${target}`);
                res.json({ status: 'success', message: `Opened ${target}` });
            });
        } else {
            console.warn(`Unknown target: ${target}`);
            res.status(404).json({ status: 'error', message: 'Unknown target' });
        }
    } else {
        res.status(400).json({ status: 'error', message: 'Invalid action' });
    }
});

app.listen(PORT, () => {
    console.log(`Gesture OS Backend running on http://localhost:${PORT}`);
});
