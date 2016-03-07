'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var path = require('path');
var Promise = require('bluebird');

var Socket = net.Socket;

var DEFAULT_CONNECT_CONFIG = {
	host: '127.0.0.1'
};

var STR_DATA = 'data';

var STR_NEWLINE = '\n';

var GogoShell = function(config) {
	Socket.call(this, config);

	this.init();
};

GogoShell.prototype = _.create(Socket.prototype, {
	init: function() {
		this.ready = false;

		this.on('connect', this._onConnect.bind(this))
	},

	connect: function(config) {
		var instance = this;

		config = _.assign({}, DEFAULT_CONNECT_CONFIG, config);

		Socket.prototype.connect.call(this, config);

		return new Promise(function(resolve, reject) {
			instance.once('ready', resolve);
		});
	},

	sendCommand: function(command) {
		var instance = this;

		return new Promise(function(resolve, reject) {
			if (instance.active) {
				reject(new Error('Only one command can be sent at a time. "' + instance.currentCommand + '" hasn\'t finished.'));
			}

			instance.active = true;
			instance.currentCommand = command;

			instance.on(STR_DATA, instance._getCommandDataListener(resolve));

			command = !_.endsWith(command, STR_NEWLINE) ? command : command + STR_NEWLINE;

			instance.write(command);
		});
	},

	_onConnect: function() {
		var instance = this;

		var dataListener = function(data) {
			data = data.toString();

			if (!instance.ready && data.indexOf('g!') > -1) {
				instance.ready = true;

				instance.removeListener(STR_DATA, dataListener);

				instance.emit('ready');
			}
		};

		this.on(STR_DATA, dataListener);

		this.write(new Buffer([255, 251, 24]));

		this.write(new Buffer([255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]));
	},

	_getCommandDataListener: function(resolve) {
		var instance = this;

		var dataBuffer = [];

		var dataListener = function(data) {
			data = data.toString();

			dataBuffer.push(data);

			if (data.match(/g\!/)) {
				instance.removeListener(STR_DATA, dataListener);

				instance.active = false;
				instance.currentCommand = null;

				resolve(dataBuffer.join(''));
			}
		};

		return dataListener;
	}
});

module.exports = GogoShell;
