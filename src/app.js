const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dashboard')));

const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 5000;

const activeGames = {};

app.get('/main', (_, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function doLogin(s, userId, roomId) {
    console.log({ userId, roomId });

    const sock = s;
    sock.userId = userId;
    sock.roomId = roomId;

    console.log(`activeGames: ${JSON.stringify(activeGames)}`);

    if (activeGames[roomId]) {
        sock.emit('login', { game: activeGames[roomId] });
    } else {
        sock.emit('login', { game: null });
    }
}

io.on('connection', (socketIo) => {
    const socket = socketIo;
    socket.on('login', ({ roomId, userId }) => {
        socket.join(`room/${roomId}`);
        doLogin(socket, userId, roomId);
    });

    socket.on('invite', (opponent) => {
        const game = {
            id: socket.roomId,
            board: null,
            users: { white: socket.userId, black: opponent.id },
        };

        socket.gameId = game.id;
        activeGames[game.id] = game;

        console.log(game);
        io.to(`room/${socket.roomId}`).emit('gameStart', { game });
    });

    socket.on('move', (msg) => {
        io.to(`room/${socket.roomId}`).emit('move', msg);
        activeGames[msg.gameId].board = msg.board;
    });

    socket.on('reset', (msg) => {
        const by = activeGames[msg.gameId].users.white === msg.by ? 'white' : 'black';
        io.to(`room/${socket.roomId}`).emit('reset', { by });
    });

    socket.on('draw-offered', (msg) => {
        const by = activeGames[msg.gameId].users.white === msg.by ? 'white' : 'black';
        io.to(`room/${socket.roomId}`).emit('draw-offered', { by });
    });

    socket.on('draw-response', (msg) => {
        io.to(`room/${socket.roomId}`).emit('draw-response', msg);
    });

    socket.on('disconnect', () => {
        if (socket && socket.userId && socket.gameId) {
            console.log(`${socket.userId} disconnected`);
            console.log(`${socket.gameId} disconnected`);
        }

        delete activeGames[socket.gameId];

        io.to(`room/${socket.roomId}`).emit('logout', {
            userId: socket.userId,
            gameId: socket.gameId,
        });
    });

    socket.on('dashboardlogin', () => {
        console.log('dashboard joined');
        socket.emit('dashboardlogin', { games: activeGames });
    });
});

http.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
