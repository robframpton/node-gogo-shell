'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _events = require('events');

var _net = require('net');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DEFAULT_CONNECT_CONFIG = {
	host: '127.0.0.1'
};

var STR_DATA = 'data';

var STR_NEWLINE = '\n';

var GogoShell = function (_Socket) {
	_inherits(GogoShell, _Socket);

	function GogoShell() {
		var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, GogoShell);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(GogoShell).call(this, config));

		_this.debug = config.debug || false;

		_this.init();
		return _this;
	}

	_createClass(GogoShell, [{
		key: 'init',
		value: function init() {
			this.ready = false;

			this.on('connect', this._onConnect.bind(this));
		}
	}, {
		key: 'connect',
		value: function connect(config) {
			var instance = this;

			config = _lodash2.default.assign({}, DEFAULT_CONNECT_CONFIG, config);

			_get(Object.getPrototypeOf(GogoShell.prototype), 'connect', this).call(this, config);

			return new _bluebird2.default(function (resolve, reject) {
				instance.once('ready', resolve);
			});
		}
	}, {
		key: 'help',
		value: function help(command) {
			var parser = command ? this._parseHelpCommandData : this._parseHelpData;

			return this.sendCommand(command ? 'help ' + command : 'help').then(function (data) {
				return parser(data, command);
			});
		}
	}, {
		key: 'sendCommand',
		value: function sendCommand(command) {
			var instance = this;

			if (arguments.length > 1) {
				command = _lodash2.default.join(arguments, ' ');
			}

			return new _bluebird2.default(function (resolve, reject) {
				if (instance.active) {
					reject(new Error('Only one command can be sent at a time. "' + instance.currentCommand + '" hasn\'t finished.'));
				}

				instance.active = true;
				instance.currentCommand = command;

				instance.on(STR_DATA, instance._getCommandDataListener(resolve));

				command = _lodash2.default.endsWith(command, STR_NEWLINE) ? command : command + STR_NEWLINE;

				instance.write(command);
			});
		}
	}, {
		key: '_getCommandDataListener',
		value: function _getCommandDataListener(resolve) {
			var instance = this;

			var dataBuffer = [];

			var dataListener = function dataListener(data) {
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
	}, {
		key: '_onConnect',
		value: function _onConnect() {
			var instance = this;

			var dataListener = function dataListener(data) {
				data = data.toString();

				if (!instance.ready && data.indexOf('g!') > -1) {
					instance.ready = true;

					instance.removeListener(STR_DATA, dataListener);

					instance.emit('ready');
				}
			};

			this.on(STR_DATA, dataListener);

			if (this.debug) {
				this.on(STR_DATA, function (data) {
					process.stdout.write(data.toString());
				});
			}

			this.write(new Buffer([255, 251, 24]));

			this.write(new Buffer([255, 250, 24, 0, 86, 84, 50, 50, 48, 255, 240]));
		}
	}, {
		key: '_parseHelpCommandData',
		value: function _parseHelpCommandData(data, command) {
			var currentGroup;
			var groupRegex = /(flags|options|parameters|scope):\s*(\S*)/;

			return _lodash2.default.reduce(data.split(STR_NEWLINE), function (result, line, index) {
				if (index == 0) {
					result.description = line;
					result.raw = data;
				} else if (groupRegex.test(line)) {
					var match = line.match(groupRegex);

					currentGroup = match[1];

					if (match[2]) {
						result[currentGroup] = match[2];
					} else {
						result[currentGroup] = [];
					}
				} else if (currentGroup && line.indexOf('g!') < 0) {
					result[currentGroup].push(_lodash2.default.trim(line));
				}

				return result;
			}, {
				command: command
			});
		}
	}, {
		key: '_parseHelpData',
		value: function _parseHelpData(data) {
			return _lodash2.default.reduce(data.split(STR_NEWLINE), function (commands, line, index) {
				if (line.indexOf('g!') < 0) {
					commands.push(_lodash2.default.trim(line));
				}

				return commands;
			}, []);
		}
	}]);

	return GogoShell;
}(_net.Socket);

exports.default = GogoShell;