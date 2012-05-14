
 var EventEmitter = require('events').EventEmitter,
	_ = require('underscore');

var Schema = function Schema(key, body, version) {
	
	EventEmitter.call(this);
	
	this.__key = key;
	this.__body = body;
	this.__version = version;

	if (!_.isUndefined(key) && !_.isNull(key)) {
		
		// load schema from mongo
		
		if(!_.isUndefined(body) && !_.isNull(body)){
			// create schema on mongo
		}else{
			// verify if body is equal the stored version, if isn't store and update version
		}
	} else {
		throw new Error('Invalid Parameter - Schema should receive a key');
	}

	Object.defineProperty(this, "uuid", {
		enumerable: true,
		get: function () {
			return this.__uuid;
		}
	 });

	Object.defineProperty(this, "key", {
		enumerable: true,
		get: function () {
			return this.__key;
		}
	 });

	Object.defineProperty(this, "version", {
		enumerable: true,
		get: function () {
			return this.__version;
		}
	 });

	Object.defineProperty(this, "body", {
		enumerable: true,
		get: function () {
			return this.__body;
		},
		set: function (v) {
			if (this.__body) {
				throw new Error('Illegal Operation - Body could not be set directly');
			}else{
				this.__body = v;	
			}			
		}
	 });

};

Schema.super_ = EventEmitter;

Schema.prototype = Object.create(EventEmitter.prototype, {
	constructor : {
		value : Schema,
		enumerable : false
	}
});

var extensions = {

	// variables
	__uuid : null,
	__key : null,
	__version : null,
	__body : null,
	
	// methods
	define : function (content) {
		// create a message with current schema
	}
};

// extend
_.extend(Schema.prototype, extensions);

// export
module.exports = Schema;

////////////////////////////////////////////////////////////////////////////////
// testing snippet

/*
var test = new Message();

console.log(test.uuid);

test.uuid = 'oi';

console.log(test.uuid);

test.on('bla', function() {
	console.log('bla caught');
});

setTimeout(function() {
	test.emit('bla');
}, 2000);
*/
