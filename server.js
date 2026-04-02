const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const ADMIN_PASSWORD = "Вашата_Парола"; // Променете тук

// Стейт на играта
let gameState = { 
    home: 0, away: 0, 
    homeName: "HOME", awayName: "AWAY", 
    homeColor: "#ffffff", awayColor: "#ffffff",
    homeRedCards: 0, awayRedCards: 0, 
    seconds: 0, isRunning: false 
};

// Таймер логика (Сървърна)
setInterval(() => {
    if (gameState.isRunning) {
        gameState.seconds++;
        // Изпращаме пълния стейт на всеки 1 секунда за перфектна синхронизация
        io.emit('update', gameState);
    }
}, 1000);

// Basic Auth за Admin панела
app.get('/admin.html', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const b64auth = authHeader.split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login === 'admin' && password === ADMIN_PASSWORD) {
        return res.sendFile(path.join(__dirname, 'admin.html'));
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Необходима е оторизация.');
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    // При свързване пращаме текущото състояние
    socket.emit('update', gameState);

    // УНИВЕРСАЛЕН ХЕНДЛЪР за новия Admin.html
    socket.on('update', (data) => {
        if (data.reset) {
            gameState = { 
                home: 0, away: 0, homeName: "HOME", awayName: "AWAY", 
                homeColor: "#ffffff", awayColor: "#ffffff",
                homeRedCards: 0, awayRedCards: 0, seconds: 0, isRunning: false 
            };
        } else {
            // Обединяваме стария стейт с новите данни от админа
            gameState = { ...gameState, ...data };
        }
        io.emit('update', gameState);
    });

    // Пинг-понг за поддържане на връзката
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сървърът стартира на порт ${PORT}`));
