const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const CONTROL_KEY = "sportist1959@N";

let gameState = {
  teamA: "Sportist 1959",
  teamB: "Гост",
  scoreA: 0,
  scoreB: 0,
  time: 0,
  running: false,
  half: 1
};

let interval = null;

function startTimer() {
  if (interval) return;
  gameState.running = true;
  interval = setInterval(() => {
    gameState.time++;
    io.emit("update", gameState);
  }, 1000);
}

function stopTimer() {
  gameState.running = false;
  clearInterval(interval);
  interval = null;
}

io.on("connection", (socket) => {

  socket.on("auth", (key) => {
    if (key !== CONTROL_KEY) socket.disconnect();
  });

  socket.emit("update", gameState);

  socket.on("goalA", () => {
    gameState.scoreA++;
    io.emit("goal");
    io.emit("update", gameState);
  });

  socket.on("goalB", () => {
    gameState.scoreB++;
    io.emit("goal");
    io.emit("update", gameState);
  });

  socket.on("start", startTimer);
  socket.on("stop", stopTimer);

  socket.on("nextHalf", () => {
    gameState.half = 2;
    gameState.time = 0;
    io.emit("update", gameState);
  });

  socket.on("reset", () => {
    gameState = {
      ...gameState,
      scoreA: 0,
      scoreB: 0,
      time: 0,
      half: 1
    };
    io.emit("update", gameState);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
