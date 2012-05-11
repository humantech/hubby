
/*
 *                          __          __    __
 *                         / /_  __  __/ /_  / /_  __  __
 *                        / __ \/ / / / __ \/ __ \/ / / /
 *                       / / / / /_/ / /_/ / /_/ / /_/ /
 *                      /_/ /_/\__,_/_.___/_.___/\__, /
 *                                              /____/
 *
 */

 var EventEmitter = require('events').EventEmitter,
	_ = require('underscore');

var message = function message() {
	EventEmitter.call(this);
};

message.super_ = EventEmitter;

message.prototype = Object.create(EventEmitter.prototype, {
	constructor : {
		value : message,
		enumerable : false
	}
});

var extensions = {

	// variables
	schema : {},

	// methods
	enqueue : function () {

	},
	broadcast : function() {

	}
};

// extending
_.extend(message.prototype, extensions);

module.exports = message;

////////////////////////////////////////////////////////////////////////////////
// testing snippet

var test = new message();

test.on('bla', function() {
	console.log('bla caught');
});

setTimeout(function() {
	test.emit('bla');
}, 2000);
