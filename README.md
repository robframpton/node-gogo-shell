# gogo-shell

> A Node wrapper for sending Gogo commands to an OSGi environment


## Install

```
$ npm install --save gogo-shell
```


## Usage

Note: a Gogo shell must be running before invoking the connect method, otherwise a connection error will be thrown.

```js
var GogoShell = require('gogo-shell');

var gogoShell = new GogoShell();

gogoShell.connect({
		port: 11311
	})
	.then(function() {
		return gogoShell.sendCommand('some', 'gogo', 'command');
	})
	.then(function(data) {
		// Do something with response data
	});

```


## API

GogoShell is an instance of [net.Socket](https://nodejs.org/api/net.html#net_class_net_socket) and inherits all it's properties, methods, and events.

The `GogoShell` constructor can be passed the same configuration options as the [net.Socket constructor](https://nodejs.org/api/net.html#net_new_net_socket_options).


### connect([options])

Connects to a TCP server which allows you to send Gogo commands to an OSGi environment. Returns a Promise which resolves when the server is ready to receive commands.

#### options

##### host

Type: `string`
Default: `127.0.0.1`

##### port

Type: `number`
Required: `true`

See [socket.connect](https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener) method for other options and their default values.

#### examples

```js
var GogoShell = require('gogo-shell');

var gogoShell = new GogoShell();

gogoShell.connect({
		port: 11311
	})
	.then(function() {
		// gogoShell.sendCommand(...);
	});
```


### help([command])

Returns Promise that resolves with array of available commands, or object literal containing information on specified command.

#### options

##### command

Type: `string`

The Gogo command to retieve help info for.

#### examples

```js
gogoShell.help()
	.then(function(data) {
		// data = array of available commands
	});
```

```js
gogoShell.help('install')
	.then(function(data) {
		// data = object literal containing api information for specified command
	});
```


### sendCommand(command, [options])

Sends Gogo command to an OSGi environment. Returns a Promise that resolves with the response data.

#### options

##### command

Type: `string`

The Gogo command that will be sent to the OSGi environment.

##### options

Type: `string`

Additional parameters, flags, and options that will be joined with the command argument.

#### examples

```js
gogoShell.sendCommand('lb', '-s')
	.then(function(data) {
		// data = list of installed bundles with symbolic name
	});
```

MIT
