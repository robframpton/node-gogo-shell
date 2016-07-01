'use strict';

var _ = require('lodash');
var chai = require('chai');
var GogoShell = require('../index.js');
var net = require('net');
var path = require('path');

var assert = chai.assert;

describe('GogoShell - Liferay integeration', function() {
	var command;
	var gogoServer;
	var gogoShell;

	after(function() {
		stopGogo();
	});

	it('should attempt to connect with localhost:11311', function(done) {
		startGogo({
			port: 11311
		})
		.then(function() {
			done();
		});

		gogoShell.on('error', function(err) {
			assert.equal(err.code, 'ECONNREFUSED');

			done();
		});
	});

	it('should return list of installed packages', function(done) {
		if (!checkConnection()) return done();

		gogoShell.sendCommand('lb', '-s')
			.then(function(data) {
				assert(data);

				done();
			});
	});

	it('should return array of available gogo commands', function(done) {
		if (!checkConnection()) return done();

		gogoShell.help()
			.then(function(data) {
				assert(_.isArray(data));

				command = data[1];

				done();
			});
	});

	it('should parse and return info on specific command', function(done) {
		if (!checkConnection()) return done();

		gogoShell.help(command)
			.then(function(data) {
				assert(_.isObject(data));

				assert(data.description);
				assert(data.raw);
				assert(data.scope);

				done();
			});
	});

	function checkConnection() {
		var connected = true;

		if (!gogoShell.ready) {
			connected = false;

			console.log('    SKIPPING TEST');
		}

		return connected;
	}

	function startGogo(config) {
		gogoShell = new GogoShell();

		return gogoShell.connect(config);
	}

	function stopGogo(done) {
		if (gogoShell) {
			gogoShell.end();
		}

		gogoShell = null;
	}
});
