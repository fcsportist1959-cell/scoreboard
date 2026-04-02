const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const ADMIN_PASSWORD = "N@sp753z"; 

let gameState = { 
    home: 0, away: 0, 
    homeName: "HOME", awayName: "AWAY", 
    homeColor: "#ffffff", awayColor: "#ffffff",
    homeRedCards: 0, awayRedCards: 0, 
    seconds: 0, isRunning: false 
};

// Таймер логика
setInterval(() => {
    if (gameState.isRunning) {
        gameState.seconds++;
        io.emit('update', gameState);
    }
}, 1000);

app.get('/admin.html', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const b64auth = authHeader.split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login === 'admin' && password === ADMIN_PASSWORD) {
        return res.sendFile(path.join(__dirname, 'admin.html'));
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.emit('update', gameState);

    socket.on('update', (data) => {
        if (data.reset) {
            gameState = { 
                home: 0, away: 0, homeName: "HOME", awayName: "AWAY", 
                homeColor: "#ffffff", awayColor: "#ffffff",
                homeRedCards: 0, awayRedCards: 0, seconds: 0, isRunning: false 
            };
        } else {
            // Ключово: Обединяваме стария стейт с новите данни
            gameState = Object.assign(gameState, data);
        }
        io.emit('update', gameState);
    });

    socket.on('ping', () => {
        socket.emit('pong');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
