// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

// Allow cross-origin requests from your local network
const io = new Server(server, {
  cors: { origin: '*' },
});

let buzzerWinner = null;
let buzzerActive = false; // Auto-paused by default until Admin opens it

io.on('connection', (socket) => {
  // 1. Instantly send current state to any device that connects
  socket.emit('buzzerState', { buzzerWinner, buzzerActive });

  // 2. Handle an incoming buzz
  socket.on('buzz', (teamIndex) => {
    // Only accept the buzz if the buzzer is active AND no one has won yet
    if (buzzerActive && buzzerWinner === null) {
      buzzerWinner = teamIndex;
      buzzerActive = false; // Immediately Auto-Pause for everyone else
      io.emit('buzzerState', { buzzerWinner, buzzerActive });
    }
  });

  // 3. Admin: Reset and open the floor
  socket.on('resetBuzzer', () => {
    buzzerWinner = null;
    buzzerActive = true;
    io.emit('buzzerState', { buzzerWinner, buzzerActive });
  });

  // 4. Admin: Manually pause/lock the buzzers
  socket.on('pauseBuzzer', () => {
    buzzerActive = false;
    io.emit('buzzerState', { buzzerWinner, buzzerActive });
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Buzzer Socket Server running on port ${PORT}`);
});
