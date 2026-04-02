const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const https = require('https');

const ADMIN_PASSWORD = "N@sp753z"; 
// Твоят адрес в Render за самосъбуждане
const MY_RENDER_URL = "https://onrender.com"; 

let gameState = { 
    home: 0, away: 0, 
    homeName: "HOME", awayName: "AWAY", 
    homeColor: "#ffffff", awayColor: "#ffffff",
    homeRedCards: 0, awayRedCards: 0, 
    seconds: 0, isRunning: false 
};

// 1. Таймер логика - изпраща данни на всеки 1 секунда
setInterval(() => {
    if (gameState.isRunning) {
        gameState.seconds++;
        io.emit('update', gameState);
    }
}, 1000);

// 2. Self-Ping: Предпазва сървъра от "заспиване" (на всеки 10 минути)
setInterval(() => {
    https.get(MY_RENDER_URL, (res) => {
        console.log(`Keep-alive: Сървърът е буден (Status: ${res.statusCode})`);
    }).on('error', (e) => {
        console.error(`Keep-alive error: ${e.message}`);
    });
}, 10 * 60 * 1000);

// Ендпоинт за пинг
app.get('/ping', (req, res) => res.send('pong'));

// Оторизация за Admin панела
app.get('/admin.html', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const b64auth = (authHeader.split(' ')[1] || '');
    if (!b64auth) {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        return res.status(401).send('Authentication required.');
    }
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login === 'admin' && password === ADMIN_PASSWORD) {
        return res.sendFile(path.join(__dirname, 'admin.html'));
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
});

// ВАЖНО: Сервиране на статични файлове (логото) от папка public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    // Пращаме текущото състояние при свързване
    socket.emit('update', gameState);

    socket.on('update', (data) => {
        if (data.reset) {
            gameState = { 
                home: 0, away: 0, homeName: "HOME", awayName: "AWAY", 
                homeColor: "#ffffff", awayColor: "#ffffff",
                homeRedCards: 0, awayRedCards: 0, seconds: 0, isRunning: false 
            };
        } else {
            // Обединяваме стария стейт с новите команди от админа
            gameState = Object.assign(gameState, data);
        }
        io.emit('update', gameState);
    });

    socket.on('ping', () => {
        socket.emit('pong');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Сървърът работи на порт ${PORT}`);
});
