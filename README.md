<p align="center">
  <a href="https://dyte.in">
    <img src="https://s3.us-west-2.amazonaws.com/secure.notion-static.com/536973cd-65bf-45ee-bdd3-8200ad445bd3/Logo_on_Light_%28no_bg%29.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAT73L2G45O3KS52Y5%2F20210117%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20210117T193715Z&X-Amz-Expires=86400&X-Amz-Signature=dfe8438596a8ffae0fe788642b02f6726b11a4e25e8a9a14b248904b51290728&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22Logo%2520on%2520Light%2520%28no%2520bg%29.svg%22" alt="Logo" width="80">
  </a>

  <h3 align="center">Chess Plugin by dyte</h3>

  <p align="center">
    A dyte plugin which lets you play live Chess with friends on a videocall.
    <br />
    <a href="https://github.com/dyte-in/chess-plugin"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://app.dyte.in">View Demo</a>
    ·
    <a href="https://github.com/dyte-in/chess-plugin/issues">Report Bug</a>
    ·
    <a href="https://github.com/dyte-in/chess-plugin/issues">Request Feature</a>
  </p>
</p>

## About The Project

Inspired by Queen's Gambit? Practice chess moves with your buddies right here right now.

### Built With

- dyte-plugin-sdk
- WinJS 4.0
- [JQuery](https://jquery.com/)
- [chessboard.js](https://chessboardjs.com/)
- [socket.io](https://socket.io/)
- [express](https://www.npmjs.com/package/express)


## Getting Started

### Prerequisites

- npm
- node

### Installation

1. Clone the repository on your server
```bash
git clone git@github.com:dyte-in/chess-plugin.git
```

2. Run the chess plugin
```bash
cd chess-plugin
npm start
```

3. Get SSL certificates for your plugin. (Optional but strongly recommended, might cause issues if ignored)

4. Point a domain to your plugin.

5. Get your plugin domain registered on `dyte`.

6. Visit `dyte` and use your plugin!


## Working

The plugin has a simple `client-server` base. The file `app.js` defines a simple `express` server along with a `socket.io` server. The `express` server is used to render the HTML pages whereas the `socket.io` server handles events in the game.


On the client side, the `dyte-plugin-sdk` is used to get information about the meeting, including the participants, meeting name, etc.


The socket events in the plugin are sent using the `socket.io` library. The `dyte-plugin-sdk` also allows you to send socket events to other peers using the following function.

```js
plugin.triggerEvent(message);

// Receiver end
plugin.connection.on(Events.pluginEvent, (data) => {
    // use data here
});
```

You can also store small amounts of data on the room using the following function:

```js
plugin.storeData(data);
```

This stores the data on the server and also triggers an event which can be caught by participants in the meeting.

```js
// To manually fetch the data
plugin.getData().then((data) => {
    // use data here
});

// Receiver end for plugin triggered event
plugin.connection.on(Events.pluginData, (data) => {
    // use data here
});
```

This chess plugin, however, does not use the `dyte-plugin-sdk` for socket events since it has it's own backend for the same.

The frontend markup for the chess game is contained in `public/index.html`, the libraries are stored in `public/lib` and the client side logic for the plugin is implemented in `public/default.js`.


## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
