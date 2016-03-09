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
	config = config || {};

	Socket.call(this, config);

	this.debug = config.debug || false;

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

	help: function(command) {
		var parser = command ? this._parseHelpCommandData : this._parseHelpData;

		return this.sendCommand(command ? 'help ' + command : 'help')
			.then(function(data) {
				return parser(data, command);
			});
	},

	sendCommand: function(command) {
		var instance = this;

		if (arguments.length > 1) {
			command = _.join(arguments, ' ');
		}

		return new Promise(function(resolve, reject) {
			if (instance.active) {
				reject(new Error('Only one command can be sent at a time. "' + instance.currentCommand + '" hasn\'t finished.'));
			}

			instance.active = true;
			instance.currentCommand = command;

			instance.on(STR_DATA, instance._getCommandDataListener(resolve));

			command = _.endsWith(command, STR_NEWLINE) ? command : command + STR_NEWLINE;

			instance.write(command);
		});
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

		if (this.debug) {
			this.on(STR_DATA, function(data) {
				process.stdout.write(data.toString());
			});
		}

		this.write(new Buffer([255, 251, 24]));

		this.write(new Buffer([255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]));
	},

	_parseHelpCommandData: function(data, command) {
		var currentGroup;
		var groupRegex = /(flags|options|parameters|scope):\s*(\S*)/;

		return _.reduce(data.split(STR_NEWLINE), function(result, line, index) {
			if (index == 0) {
				result.description = line;
				result.raw = data;
			}
			else if (groupRegex.test(line)) {
				var match = line.match(groupRegex);

				currentGroup = match[1];

				if (match[2]) {
					result[currentGroup] = match[2];
				}
				else {
					result[currentGroup] = [];
				}
			}
			else if (currentGroup && line.indexOf('g!') < 0) {
				result[currentGroup].push(_.trim(line));
			}

			return result;
		}, {
			command: command
		});
	},

	_parseHelpData: function(data) {
		return _.reduce(data.split(STR_NEWLINE), function(commands, line, index) {
			if (line.indexOf('g!') < 0) {
				commands.push(_.trim(line));
			}

			return commands;
		}, []);
	}
});

module.exports = GogoShell;
