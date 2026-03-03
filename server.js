const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const ADMIN_PASSWORD = "N@sp753z"; 

// Защита на административния панел
app.get('/admin.html', (req, res) => {
    const auth = { login: 'admin', password: ADMIN_PASSWORD };
    
    // Взимаме Auth хедъра
    const authHeader = req.headers.authorization || '';
    const b64auth = authHeader.split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        // КОРЕКЦИЯ: Вече търсим файла в основната директория, а не в public
        return res.sendFile(path.join(__dirname, 'admin.html'));
    }

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
});

// Статичните файлове (индексната страница, стилове, картинки) остават в public
app.use(express.static('public'));

let gameState = { 
    home: 0, away: 0, 
    homeName: "HOME", awayName: "AWAY", 
    homeColor: "#ff0000", awayColor: "#0000ff",
    homeRedCards: 0, awayRedCards: 0, 
    seconds: 0, isRunning: false 
};

// Сървърен таймер
setInterval(() => {
    if (gameState.isRunning) {
        gameState.seconds++;
        io.emit('timerUpdate', { seconds: gameState.seconds });
        
        if (gameState.seconds % 10 === 0) {
            io.emit('update', gameState);
        }
    }
}, 1000);

io.on('connection', (socket) => {
    socket.emit('update', gameState);

    socket.on('changeScore', (data) => {
        gameState = { ...gameState, ...data };
        io.emit('update', gameState);
    });

    socket.on('controlTimer', (command) => {
        if (command === 'start') gameState.isRunning = true;
        if (command === 'pause') gameState.isRunning = false;
        if (command === 'reset') { 
            gameState.seconds = 0; 
            gameState.isRunning = false; 
            gameState.homeRedCards = 0;
            gameState.awayRedCards = 0;
        }
        io.emit('update', gameState);
    });

    socket.on('setManualTime', (mins) => {
        gameState.seconds = parseInt(mins) * 60;
        io.emit('update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
