var express = require('express');
var app = express();
app.use(express.static('public'));
app.use(express.static('dashboard'));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 5000;

var activeGames = {};

app.get('/main', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});


io.on('connection', function (socket) {
    console.log('new connection ' + socket);

    socket.on('login', function ({ roomId, userId }) {
        socket.join(`room/${roomId}`);
        doLogin(socket, userId, roomId);
    });

    function doLogin(socket, userId, roomId) {
        console.log({ userId, roomId });
        socket.userId = userId;
        socket.roomId = roomId;
        console.log("activeGames: " + JSON.stringify(activeGames));
        if (activeGames[roomId]) {
            socket.emit('login', { game: activeGames[roomId] });
        } else {
            socket.emit('login', { game: null });
        }
    }

    socket.on('invite', function (opponent) {
        console.log(opponent);

        // socket.broadcast.emit('leavelobby', socket.userId);
        // socket.broadcast.emit('leavelobby', opponentId);


        var game = {
            id: socket.roomId,
            board: null,
            users: { white: socket.userId, black: opponent.id }
        };

        socket.gameId = game.id;
        activeGames[game.id] = game;

        console.log(game);
        io.to(`room/${socket.roomId}`).emit('gameStart', { game });
    });


    socket.on('move', function (msg) {
        io.to(`room/${socket.roomId}`).emit('move', msg);
        activeGames[msg.gameId].board = msg.board;
    });

    socket.on('reset', function (msg) {
        const by = activeGames[msg.gameId].users.white === msg.by ? 'white' : 'black';
        io.to(`room/${socket.roomId}`).emit('reset', { by });
    });

    socket.on('draw-offered', function (msg) {
        const by = activeGames[msg.gameId].users.white === msg.by ? 'white' : 'black';
        io.to(`room/${socket.roomId}`).emit('draw-offered', { by });
    });

    socket.on('draw-response', function (msg) {
        io.to(`room/${socket.roomId}`).emit('draw-response', msg);
    });


    socket.on('disconnect', function (msg) {
        if (socket && socket.userId && socket.gameId) {
            console.log(socket.userId + ' disconnected');
            console.log(socket.gameId + ' disconnected');
        }

        delete activeGames[socket.gameId];

        io.to(`room/${socket.roomId}`).emit('logout', {
            userId: socket.userId,
            gameId: socket.gameId
        });
    });

    /////////////////////
    // Dashboard messages 
    /////////////////////

    socket.on('dashboardlogin', function () {
        console.log('dashboard joined');
        socket.emit('dashboardlogin', { games: activeGames });
    });

});

http.listen(port, function () {
    console.log('listening on *:' + port);
});