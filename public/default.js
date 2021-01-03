
(function () {

  WinJS.UI.processAll().then(function () {
    var socket, serverGame;
    var user, playerColor;
    var game, board, cfg;
    var whitePlayer, blackPlayer;
    var spectator = false;
    var usersOnline = [];
    var myGames = [];
    var boardWhite = 'rgb(255, 206, 158)';
    var boardBlack = 'rgb(209, 139, 71)';
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
      $('#current-status').text(`${toTitleCase(msg.by)} resigned.`);
      endGame();
    });

    socket.on('gameStart', function (msg) {
      console.log("Starting game");
      startGame(msg.game);
      setTurnIndicator();
    });


    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id) {
        if (msg.move) {
          game.move(msg.move);
        }
        board.position(game.fen());
        setTurnIndicator();
        renderMoveHistory(game.history());
      }

      updateStatus();
    });

    socket.on('draw-offered', function (msg) {
      if (msg.by === playerColor) return;
      $('#draw-offered').css('display', 'block');
      $('#draw-offered-text').text(`${toTitleCase(msg.by)} offered a draw!`);
    });

    socket.on('draw-response', function (msg) {
      if (msg.accepted) {
        $('#current-status').text('Draw offer accepted, game drawn.');
        endGame();
      } else {
        const currentText = $('#current-status').text();
        const appendText = ', draw offer rejected.';
        if (!currentText.endsWith(appendText)) {
          $('#current-status').text(currentText + appendText);
        }
        $('#game-draw').text('Offer Draw');
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
      socket.emit('reset', { gameId: serverGame.id, by: user.id });
      endGame();
    });

    $('#game-draw').on('click', function () {
      const offeredText = 'Draw Offered';
      if ($('#game-draw').text() === offeredText) return;
      socket.emit('draw-offered', { gameId: serverGame.id, by: user.id });
      $('#game-draw').text(offeredText).css('opacity', '0.7').css('cursor', 'default');
    });

    $('#draw-accept').on('click', function () {
      socket.emit('draw-response', { accepted: true });
      $('#draw-offered').css('display', 'none');
    });

    $('#draw-reject').on('click', function () {
      socket.emit('draw-response', { accepted: false });
      $('#draw-offered').css('display', 'none');
    });

    $('#new-game').on('click', function() {
      window.location.reload();
    });

    function toTitleCase(str) {
      return str.replace(
        /\w\S*/g,
        function (txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
      );
    }

    var updateStatus = function () {
      var status = ''

      var moveColor = 'White'
      if (game.turn() === 'b') {
        moveColor = 'Black'
      }

      // checkmate?
      if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
        endGame();
      }

      // draw?
      else if (game.in_draw()) {
        status = 'Game over, drawn position'
      }

      // game still on
      else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
          status += ', ' + moveColor + ' is in check'
        }
      }

      $('#current-status').text(status);
      $('#game-pgn').text(game.pgn());
    }

    var setTurnIndicator = function () {
      const whitesTurn = game.turn() === 'w';

      if (game.in_checkmate()) {
        $('.game-bottom').css(
          'background-color',
          whitesTurn ? boardBlack : boardWhite,
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
        fill: "color",
        colors: ['rgb(33 96 253)']
      });

      if (spectator) {
        $('#peer-role').text('You are a spectator');
        $("#game-resign").hide();
      } else {
        $('#new-game').hide();
        $("#game-resign").show();
        $('#game-draw').show();
      }

      initGame(game);
      updateStatus();

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
      $('#userList').text('');
      usersOnline.forEach(function (user) {
        $('#userList').append($('<button class="user-invite-btn">')
          .text(user.displayName)
          .on('click', function () {
            plugin.enableForAll();
            socket.emit('invite', user);
          }));
      });
    };

    var renderMoveHistory = function (moves) {
      // var historyElement = $('#move-history').empty();
      // historyElement.empty();
      // for (var i = 0; i < moves.length; i = i + 2) {
      //     historyElement.append('<span>' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
      // }
      // historyElement.scrollTop(historyElement[0].scrollHeight);

    };

    //////////////////////////////
    // Chess Game
    ////////////////////////////// 

    var initGame = function (serverGameState) {
      serverGame = serverGameState;

      cfg = {
        draggable: true,
        showNotation: true,
        orientation: playerColor,
        pieceTheme: wikipedia_piece_theme,
        boardTheme: wikipedia_board_theme,
        position: serverGame.board ? serverGame.board : 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
      };

      game = serverGame.board ? new Chess(serverGame.board) : new Chess();
      board = new ChessBoard('game-board', cfg);
      $(window).resize(board.resize);
      renderMoveHistory(game.history());
    }

    var endGame = function () {
      board = new ChessBoard('game-board', {
        ...cfg,
        draggable: false,
        position: game.fen(),
        onMouseoverSquare: null,
        onMouseoutSquare: null,
      });

      $('#game-draw').hide();
      $('#game-resign').hide();
      $('#new-game').show();
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

      updateStatus();

      // illegal move
      if (move === null) {
        return 'snapback';
      } else {
        socket.emit('move', { move: move, gameId: serverGame.id, board: game.fen() });
        renderMoveHistory(game.history());
      }
    };

    var onMouseoverSquare = function (square, piece) {
      var moves = game.moves({
        square: square,
        verbose: true
      });

      if (moves.length === 0) return;

      greySquare(square);

      for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
      }
    };

    var onMouseoutSquare = function (square, piece) {
      removeGreySquares();
    };

    var removeGreySquares = function () {
      board.resize();
    };

    var greySquare = function (square) {
      var squareEl = $('#game-board .square-' + square);

      var background = '#a9a9a9';
      if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
      }

      squareEl.css('background', background);
    };

    // update the board position after the piece snap 
    // for castling, en passant, pawn promotion
    var onSnapEnd = function () {
      board.position(game.fen());
    };
  });
})();
