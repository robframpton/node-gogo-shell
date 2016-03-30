'use strict';

var _ = require('lodash');
var chai = require('chai');
var GogoShell = require('../index.js');
var net = require('net');
var path = require('path');
var sinon = require('sinon');

var assert = chai.assert;

describe('GogoShell', function() {
	var gogoServer;
	var gogoShell;

	after(function() {
		gogoServer.close();
	});

	describe('connect', function() {
		it('should return connection error', function(done) {
			startGogo({
				port: 1234
			}, true);

			gogoShell.on('error', function(err) {
				assert.equal(err.code, 'ECONNREFUSED');

				if (err.port) {
					assert.equal(err.port, 1234);
				}

				stopGogo(done);
			});
		});

		it('should fire ready event', function(done) {
			startGogo({
				port: 1337
			}, true);

			gogoShell.on('ready', function() {
				stopGogo(done);
			});
		});

		it('should return promise that resolves when connection is ready', function(done) {
			startGogo({
				port: 1337
			}, true)
				.then(function() {
					return gogoShell.sendCommand('command');
				})
				.then(function(data) {
					stopGogo(done);
				});
		});
	});

	describe('help', function() {
		it('should return array of available gogo commands', function(done) {
			startGogo({
				port: 1337
			}, true)
				.then(function() {
					return gogoShell.help();
				})
				.then(function(data) {
					assert.deepEqual(data, ['gogo:echo', 'gogo:format', 'gogo:getopt']);

					stopGogo(done);
				});
		});

		it('should parse and return info on specific command', function(done) {
			startGogo({
				port: 1337
			}, true)
				.then(function() {
					return gogoShell.help('command');
				})
				.then(function(data) {
					assert(!_.isUndefined(data.raw));
					assert.equal(data.command, 'command');
					assert.equal(data.description, 'command - command that does something');
					assert.equal(data.flags.length, 2);
					assert.equal(data.parameters.length, 1);
					assert.equal(data.scope, 'obr');

					stopGogo(done);
				});
		});
	});

	describe('sendCommand', function() {
		it('should return correct data from server as Promise', function(done) {
			startGogo({
				port: 1337
			}, true);

			gogoShell.on('ready', function() {
				gogoShell.sendCommand('command')
					.then(function(data) {
						assertDefaultData(data);

						stopGogo(done);
					});
			});
		});

		it('should catch error for sending too many commands at once', function(done) {
			startGogo({
				port: 1337
			}, true);

			gogoShell.on('ready', function() {
				gogoShell.sendCommand('async')
					.then(function(data) {
						assertAsyncData(data);

						stopGogo(done);
					});

				gogoShell.sendCommand('command')
					.catch(function(err) {
						assert.equal(err.message, 'Only one command can be sent at a time. "async" hasn\'t finished.');
					});
			});
		});

		it('should be able to chain commands', function(done) {
			startGogo({
				debug: true,
				port: 1337
			}, true)
				.then(function() {
					return gogoShell.sendCommand('async');
				})
				.then(function(data) {
					assertAsyncData(data);

					return gogoShell.sendCommand('command');
				})
				.then(function(data) {
					assertDefaultData(data);

					return gogoShell.sendCommand('async');
				})
				.then(function(data) {
					assertAsyncData(data);

					stopGogo(done);
				});
		});

		it('should join arguments to create command string', function(done) {
			startGogo({
				port: 1337
			}, true)
				.then(function() {
					return gogoShell.sendCommand('joined', 'arguments', 'command', '--test');
				})
				.then(function(data) {
					assert.equal(data, 'joined arguments data\ng! ');

					stopGogo(done);
				});
		});

		it('should format command string with newline character', function(done) {
			startGogo({
				port: 1337
			}, true)
				.then(function() {
					gogoShell.write = sinon.spy();

					gogoShell.sendCommand('some command');

					assert(gogoShell.write.getCall(0).calledWith('some command\n'), 'added newline character');

					gogoShell.active = false;

					gogoShell.sendCommand('another command\n');

					assert(gogoShell.write.getCall(1).calledWith('another command\n'), 'did not add newline character');

					stopGogo(done);
				});
		});
	});

	var helpCommandData = 'command - command that does something\n' +
		'  scope: obr\n' +
		'  flags:\n' +
		'    -f, --flag   does something\n' +
		'    -o, --otherflag   does something else\n' +
		'  parameters:\n' +
		'    String[]   ( <this> | <that> | <the-other> )[@<version>] ...\ng! ';

	function assertAsyncData(data) {
		assert.equal(data, 'chunk 1\ndata\ng! ');
	}

	function assertDefaultData(data) {
		assert.equal(data, 'data\ng! ');
	}

	function startGogo(config, startServer) {
		if (startServer && !gogoServer) {
			var defaultResponseData = 'data\ng! ';

			var handshakeBuffer = new Buffer([255, 251, 24, 255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]);

			gogoServer = net.createServer({
				allowHalfOpen: true
			}, function(socket) {
				socket.on('data', function(data) {
					data = data.toString();

					if (_.isEqual(data, handshakeBuffer)) {
						socket.write('Welcome to Apache Felix Gogo\n');

						setTimeout(function() {
							socket.write('\ng! ');
						}, 100);
					}
					else if (data.indexOf('async') > -1) {
						socket.write('chunk 1\n');

						setTimeout(function() {
							socket.write(defaultResponseData);
						}, 300);
					}
					else if (data.indexOf('help command') > -1) {
						socket.write(helpCommandData);
					}
					else if (data.indexOf('help') > -1) {
						socket.write('gogo:echo\n' +
							'gogo:format\n' +
							'gogo:getopt\n' +
							'g! ');
					}
					else if (data.indexOf('joined arguments command --test') > -1) {
						socket.write('joined arguments data\ng! ');
					}
					else {
						socket.write(defaultResponseData);
					}
				});
			});

			gogoServer.listen(1337, '0.0.0.0');
		}

		gogoShell = new GogoShell({
			debug: config.debug
		});

		gogoShell.setKeepAlive(true);

		return gogoShell.connect(config);
	}

	function stopGogo(done) {
		if (gogoShell) {
			gogoShell.end();

			gogoShell.destroy();
		}

		gogoShell = null;

		done();
	}
});
