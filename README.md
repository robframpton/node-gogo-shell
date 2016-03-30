# gogo-shell [![Build Status](https://travis-ci.org/Robert-Frampton/node-gogo-shell.svg?branch=master)](https://travis-ci.org/Robert-Frampton/node-gogo-shell) [![Coverage Status](https://coveralls.io/repos/github/Robert-Frampton/node-gogo-shell/badge.svg?branch=master)](https://coveralls.io/github/Robert-Frampton/node-gogo-shell?branch=master)

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

var config = {
    port: 11311
};

gogoShell.connect(config)
    .then(function() {
        return gogoShell.sendCommand('lb');
    })
    .then(function(data) {
        // Do something with response data

        gogoShell.end();
    });
```


## API

GogoShell is an instance of [net.Socket](https://nodejs.org/api/net.html#net_class_net_socket) and inherits all it's properties, methods, and events.

### new GogoShell([options])

#### options

Type: `object`

The `GogoShell` constructor can also be passed the same configuration options as the [net.Socket constructor](https://nodejs.org/api/net.html#net_new_net_socket_options).

##### debug

type: `boolean`<br>

If set to true, prints all commands sent to the server, and all response data from the server to stdout.

#### examples

```js
var GogoShell = require('gogo-shell');

var gogoShell = new GogoShell({
    debug: true
});
```

### connect([options])

Connects to a TCP server which allows you to send Gogo commands to an OSGi environment. Returns a Promise which resolves when the server is ready to receive commands.

#### options

Type: `object`

##### host

Type: `string`<br>
Default: `127.0.0.1`

##### port

Type: `number`<br>
Required: `true`

See [socket.connect](https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener) method for other options and their default values.

#### examples

```js
var GogoShell = require('gogo-shell');

var gogoShell = new GogoShell();

var config = {
    port: 11311
};

gogoShell.connect(config)
    .then(function() {
        // gogoShell.sendCommand(...);
    });
```


### help([command])

Returns Promise that resolves with array of available commands, or object literal containing information on specified command.

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

Chaining commands.

```js
var GogoShell = require('gogo-shell');

var gogoShell = new GogoShell();

var config = {
    port: 11311
};

gogoShell.connect(config)
    .then(function() {
        return gogoShell.sendCommand('lb');
    })
    .then(function(data) {
        // data = response from 'lb'

        return gogoShell.sendCommand('another command');
    })
    .then(function(data) {
        // data = response from 'another command'

        // Using socket.end for closing connection, otherwise Node process wouldn't end
        gogoShell.end();
    });
```


MIT
