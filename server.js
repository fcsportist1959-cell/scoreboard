const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const ADMIN_PASSWORD = "N@sp753z"; 

// Защита на административния панел
app.get('/admin.html', (req, res) => {
    const auth = { login: 'admin', password: ADMIN_PASSWORD };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    }

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
});

app.use(express.static('public'));

// Глобално състояние на играта
let gameState = { 
    home: 0, away: 0, 
    homeName: "HOME", awayName: "AWAY", 
    homeColor: "#ff0000", awayColor: "#0000ff",
    seconds: 0, isRunning: false 
};

// Сървърен таймер
setInterval(() => {
    if (gameState.isRunning) {
        gameState.seconds++;
        io.emit('timerUpdate', gameState.seconds);
    }
}, 1000);

io.on('connection', (socket) => {
    // Изпращане на текущото състояние при свързване
    socket.emit('update', gameState);

    // Промяна на резултат, имена или цветове
    socket.on('changeScore', (data) => {
        gameState = { ...gameState, ...data };
        io.emit('update', gameState);
    });

    // Управление на таймера (Start/Pause/Reset)
    socket.on('controlTimer', (command) => {
        if (command === 'start') gameState.isRunning = true;
        if (command === 'pause') gameState.isRunning = false;
        if (command === 'reset') { gameState.seconds = 0; gameState.isRunning = false; }
        io.emit('update', gameState);
    });

    // Ръчно задаване на минути
    socket.on('setManualTime', (mins) => {
        gameState.seconds = parseInt(mins) * 60;
        io.emit('update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
