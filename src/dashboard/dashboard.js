(function () {
      WinJS.UI.processAll().then(() => {
            const socket = io();
            const games = {};
            const boards = {};

            /// ///////////////////////////
            // Socket.io handlers
            /// ///////////////////////////

            socket.emit('dashboardlogin');
            socket.on('dashboardlogin', (msg) => {
                  createGamesList(msg.games);
            });

            socket.on('gameadd', (msg) => {
                  initGame(msg.gameId, msg.gameState);
            });

            socket.on('resign', (msg) => {
                  const gameToRemove = document.getElementById(`game-board${msg.gameId}`);
                  gameToRemove.parentElement.removeChild(gameToRemove);
            });

            socket.on('move', (msg) => {
                  games[msg.gameId].move(msg.move);
                  boards[msg.gameId].position(games[msg.gameId].fen());
            });

            /// ///////////////////////////
            // Chess Games
            /// ///////////////////////////

            var createGamesList = function (serverGames) {
                  Object.keys(serverGames).forEach((gameId) => {
                        initGame(gameId, serverGames[gameId]);
                  });
            };

            var initGame = function (gameId, serverGame) {
                  const cfg = {
                        draggable: false,
                        showNotation: false,
                        orientation: 'white',
                        pieceTheme: '../img/chesspieces/wikipedia/{piece}.png',
                        position: serverGame.board ? serverGame.board : 'start',
                  };

                  // create the game parent div
                  $('#games').append($(`<div id="game-board${gameId}" class="gameboard"></div>`));

                  // create the game
                  const game = serverGame.board ? new Chess(serverGame.board) : new Chess();
                  games[gameId] = game;

                  const board = new ChessBoard(`game-board${gameId}`, cfg);
                  boards[gameId] = board;
            };
      });
}());
