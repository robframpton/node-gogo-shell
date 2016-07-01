'use strict';

import _ from 'lodash';
import { EventEmitter } from 'events';
import { Socket } from 'net';
import path from 'path';
import Promise from 'bluebird';

const DEFAULT_CONNECT_CONFIG = {
	host: '127.0.0.1'
};

const STR_DATA = 'data';

const STR_NEWLINE = '\n';

export default class GogoShell extends Socket {

	constructor(config = {}) {
		super(config);

		this.debug = config.debug || false;

		this.init();
	}

	init() {
		this.ready = false;

		this.on('connect', this._onConnect.bind(this))
	}

	connect(config) {
		config = _.assign({}, DEFAULT_CONNECT_CONFIG, config);

		super.connect(config);

		return new Promise((resolve, reject) => {
			this.once('ready', resolve);
		});
	}

	help(command) {
		var parser = command ? this._parseHelpCommandData : this._parseHelpData;

		return this.sendCommand(command ? 'help ' + command : 'help')
			.then(data => parser(data, command));
	}

	sendCommand(command) {
		if (arguments.length > 1) {
			command = _.join(arguments, ' ');
		}

		return new Promise((resolve, reject) => {
			if (this.active) {
				reject(new Error('Only one command can be sent at a time. "' + this.currentCommand + '" hasn\'t finished.'));
			}

			this.active = true;
			this.currentCommand = command;

			this.on(STR_DATA, this._getCommandDataListener(resolve));

			command = _.endsWith(command, STR_NEWLINE) ? command : command + STR_NEWLINE;

			this.write(command);
		});
	}

	_getCommandDataListener(resolve) {
		var dataBuffer = [];

		var dataListener = (data) => {
			data = data.toString();

			dataBuffer.push(data);

			if (data.match(/g\!/)) {
				this.removeListener(STR_DATA, dataListener);

				this.active = false;
				this.currentCommand = null;

				resolve(dataBuffer.join(''));
			}
		};

		return dataListener;
	}

	_onConnect() {
		var dataListener = (data) => {
			data = data.toString();

			if (!this.ready && data.indexOf('g!') > -1) {
				this.ready = true;

				this.removeListener(STR_DATA, dataListener);

				this.emit('ready');
			}
		};

		this.on(STR_DATA, dataListener);

		if (this.debug) {
			this.on(STR_DATA, (data) => {
				process.stdout.write(data.toString());
			});
		}

		this.write(new Buffer([255, 251, 24]));

		this.write(new Buffer([255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]));
	}

	_parseHelpCommandData(data, command) {
		var currentGroup;
		var groupRegex = /(flags|options|parameters|scope):\s*(\S*)/;

		return _.reduce(data.split(STR_NEWLINE), (result, line, index) => {
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
	}

	_parseHelpData(data) {
		return _.reduce(data.split(STR_NEWLINE), (commands, line, index) => {
			if (line.indexOf('g!') < 0) {
				commands.push(_.trim(line));
			}

			return commands;
		}, []);
	}

}
