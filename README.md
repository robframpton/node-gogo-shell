# liferay-gogo-shell

> A Node wrapper for communicating with Liferay's OSGi environment


## Install

```
$ npm install --save liferay-gogo-shell
```


## Usage

Note: a local instance of Liferay must be running before invoking the connect method, otherwise a connection error will thrown.

```js
var GogoShell = require('liferay-gogo-shell');

var gogoShell = new GogoShell();

gogoShell.connect()
	.then(function() {
		return gogoShell.sendCommand('some gogo command');
	})
	.then(function(data) {
		// Do something with response data
	});

```


## API

GogoShell is an instance of [net.Socket](https://nodejs.org/api/net.html#net_class_net_socket) and inherits all it's properties, methods, and events.

The `GogoShell` constructor can be passed the same configuration options as the [net.Socket constructor](https://nodejs.org/api/net.html#net_new_net_socket_options).

### connect([options])

Connects to a TCP server which allows you to send Gogo OSGi commands to a Liferay instance. Returns a Promise which resolves when the server is ready to receive commands.

#### options

##### host

Type: `string`
Default: `127.0.0.1`

##### port

Type: `number`
Default: `11311`

See [socket.connect](https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener) method for other options and their default values.

### sendCommand(command)

Sends command to a Liferay instance's OSGi environment. Returns a Promise that resolves with the response data.

#### options

##### command

Type: 'string'

The command that will be sent to the OSGi environment.

MIT
