
(function () {

  WinJS.UI.processAll().then(function () {
    var socket, serverGame;
    var user, playerColor;
    var game, board;
    var whitePlayer, blackPlayer;
    var spectator = false;
    var usersOnline = [];
    var myGames = [];
    var boardWhite = '#f0d9b5';
    var boardBlack = '#b58863';
    socket = io();

    const plugin = new dytePluginSdk.DytePlugin();
    plugin.init().then(() => {
      console.log("Plugin done");
      plugin.getCurrentPeer().then(peer => {
        console.log(peer);
        user = peer;
        socket.emit("login", { userId: peer.id, roomId: plugin.getRoomName() })
      }).catch(err => console.log(err));
    })

    //////////////////////////////
    // Socket.io handlers
    ////////////////////////////// 

    socket.on('login', function (msg) {
      console.log(msg);
      $('#peer-identity').text(user.displayName);

      if (msg.game) {
        startGame(msg.game);
        setTurnIndicator();
      } else {
        //socket.emit('login', peer.id);

        $('#page-login').hide();
        $('#page-lobby').show();
        usersOnline = plugin.getJoinedPeers().filter(p => p.id !== user.id);
        console.log(usersOnline);
        updateUserList();
      }
    });

    socket.on('reset', function (msg) {
      if (msg.gameId == serverGame.id) {

        startGame(msg.game);
        setTurnIndicator();
      }
    });

    socket.on('gameStart', function (msg) {
      console.log("Starting game");
      startGame(msg.game);
      setTurnIndicator();
    });


    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id) {
        if(msg.move) {
          game.move(msg.move);
        }
        board.position(game.fen());
        setTurnIndicator();
      }
    });


    socket.on('logout', function (msg) {
      removeUser(msg.username);
    });



    //////////////////////////////
    // Menus
    //////////////////////////////
  
    $('#login').on('click', function () {
      username = $('#username').val();

      if (username.length > 0) {
        $('#userLabel').text(username);
        socket.emit('login', username);

        $('#page-login').hide();
        $('#page-lobby').show();
      }
    });

    $('#game-back').on('click', function () {
      socket.emit('login', username);

      $('#page-game').hide();
      $('#page-lobby').show();
    });

    $('#game-resign').on('click', function () {
      socket.emit('reset', { gameId: serverGame.id});
    });

    var setTurnIndicator = function() {
      const whitesTurn = game.turn() === 'w';

      if(game.in_checkmate()) {
        $('.game-bottom').css(
          'background-color',
          whitesTurn ?  boardBlack: boardWhite,
        );
  
        $('#game-turn').css(
          'color',
          whitesTurn ? 'white' : 'black',
        );

        const winnerText = (player) => player.id === user.id ? `You Won` : `${player.displayName} Won`;
        

        $('#game-turn').text(
          winnerText(whitesTurn ? blackPlayer : whitePlayer),
        );
      } else {
        const turnText = (player) => player.id === user.id ? `Your Turn` : `${player.displayName}'s Turn`;

        $('#game-turn').text(
          turnText(whitesTurn ? whitePlayer : blackPlayer),
        );
  
        $('.game-bottom').css(
          'background-color',
          whitesTurn ? boardWhite : boardBlack,
        );
  
        $('#game-turn').css(
          'color',
          whitesTurn ? 'black' : 'white',
        );
      }

    }

    function startGame(game) {
      console.log("joined as game id: " + game.id);
      playerColor = game.users.black == user.id ? "black" : "white";
      spectator = !(game.users.black == user.id || game.users.white == user.id);

      whitePlayer = plugin.getJoinedPeers().find(p => p.id === game.users.white);
      blackPlayer = plugin.getJoinedPeers().find(p => p.id === game.users.black);

      if (playerColor === "black") {
        $('#opponent-name').text(whitePlayer.displayName);
        $('#opponent-avatar').attr('title', whitePlayer.displayName);
        $('#player-name').text(blackPlayer.displayName);
        $('#player-avatar').attr('title', blackPlayer.displayName);
        $('#peer-role').text('You\'re playing as black')
      } else {
        $("#player-name").text(whitePlayer.displayName);
        $('#player-avatar').attr('title', whitePlayer.displayName);
        $('#opponent-name').text(blackPlayer.displayName);
        $('#opponent-avatar').attr('title', blackPlayer.displayName);
        $('#peer-role').text('You\'re playing as white')
      }

      $(".letterpic").letterpic({
        fill: "color"
      });

      if (spectator) {
        $('#peer-role').text('You are a spectator');
        $("#game-resign").hide();
      } else {
        $("#game-resign").show();
      }

      initGame(game);

      $('#page-lobby').hide();
      $('#page-login').hide();
      $('#page-game').show();
    }

    var removeUser = function (userId) {
      for (var i = 0; i < usersOnline.length; i++) {
        if (usersOnline[i] === userId) {
          usersOnline.splice(i, 1);
        }
      }

      updateUserList();
    };

    var updateGamesList = function () {
      document.getElementById('gamesList').innerHTML = '';
      myGames.forEach(function (game) {
        $('#gamesList').append($('<button>')
          .text('#' + game)
          .on('click', function () {
            plugin.enableForAll();
            socket.emit('resumegame', game);
          }));
      });
    };

    var updateUserList = function () {
      document.getElementById('userList').innerHTML = '';
      usersOnline.forEach(function (user) {
        $('#userList').append($('<button class="user-invite-btn">')
          .text(user.displayName)
          .on('click', function () {
            plugin.enableForAll();
            socket.emit('invite', user);
          }));
      });
    };

    //////////////////////////////
    // Chess Game
    ////////////////////////////// 

    var initGame = function (serverGameState) {
      serverGame = serverGameState;

      var cfg = {
        draggable: true,
        showNotation: false,
        orientation: playerColor,
        position: serverGame.board ? serverGame.board : 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
      };

      game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      board = new ChessBoard('game-board', cfg);
      $(window).resize(board.resize);
    }

    // do not pick up pieces if the game is over
    // only pick up pieces for the side to move
    var onDragStart = function (source, piece, position, orientation) {
      if (game.game_over() === true ||
        spectator ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (game.turn() !== playerColor[0])) {
        return false;
      }
    };

    var onDrop = function (source, target) {
      // see if the move is legal
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });

      // illegal move
      if (move === null) {
        return 'snapback';
      } else {
        socket.emit('move', { move: move, gameId: serverGame.id, board: game.fen() });
      }
    };

    // update the board position after the piece snap 
    // for castling, en passant, pawn promotion
    var onSnapEnd = function () {
      board.position(game.fen());
    };
  });
})();

