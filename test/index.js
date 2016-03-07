'use strict';

var _ = require('lodash');
var chai = require('chai');
var GogoShell = require('../index.js');
var net = require('net');
var path = require('path');

var assert = chai.assert;

describe('GogoShell', function() {
	var gogoServer;
	var gogoShell;

	describe('connect', function() {
		it('should return connection error', function(done) {
			startGogo({
				port: 1234
			});

			gogoShell.on('error', function(err) {
				assert.equal(err.code, 'ECONNREFUSED');
				assert.equal(err.address, '127.0.0.1');
				assert.equal(err.port, 1234);

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
	});

	function assertAsyncData(data) {
		assert.equal(data, 'chunk 1\nchunk 2\ndata\ng! ');
	}

	function assertDefaultData(data) {
		assert.equal(data, 'data\ng! ');
	}

	function startGogo(config, startServer) {
		if (startServer) {
			var defaultResponseData = 'data\ng! ';

			var handshakeBuffer = new Buffer([255, 251, 24, 255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]);

			gogoServer = net.createServer(function(socket) {
				socket.on('data', function(data) {
					if (_.isEqual(data, handshakeBuffer)) {
						socket.write('Welcome to Apache Felix Gogo\n\ng! ');
					}
					else if (data.indexOf('async') > -1) {
						socket.write('chunk 1\n');

						setTimeout(function() {
							socket.write('chunk 2\n');
						}, 150);

						setTimeout(function() {
							socket.write(defaultResponseData);
						}, 300);
					}
					else {
						socket.write(defaultResponseData);
					}
				});
			});

			gogoServer.listen({
				host: '127.0.0.1',
				port: 1337
			});
		}

		gogoShell = new GogoShell();

		return gogoShell.connect(config);
	}

	function stopGogo(done) {
		if (gogoShell) {
			gogoShell.end();
		}

		if (gogoServer) {
			gogoServer.close(done);
		}
		else {
			done();
		}

		gogoServer = null;
		gogoShell = null;
	}
});
