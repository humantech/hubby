
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
	mongodb = require('mongodb'),
	UUID = require('node-uuid'),
	_ = require('underscore');

var Message = function Message(uuid, client) {
	EventEmitter.call(this);
	if (uuid) {
		client.collection('messages', function(err, collection) {
			collection.find({uuid:uuid}, function(err, result) {
				if (!err) {
					console.log(uuid, " found");
					this.__uuid = result.uuid;
					this.__schema = result.schema;
					this.__content = result.content;
					this.created_at = result.created_at;
					this.updated_at = result.updated_at;
					this.status = result.status;
				} else {
					console.log(uuid, " not found");
				}
			}); 
		});
	} else {
		this.__uuid = UUID.v4();
	}

	this.created_at = new Date();

	Object.defineProperty(this, "uuid", {
		enumerable: true,
		get: function () {
			return this.__uuid;
		}
	 });

	Object.defineProperty(this, "schema", {
		enumerable: true,
		get: function () {
			return this.__schema;
		},
		set: function (v) {
			if (this.__schema) {
				return; // you can't set another schema for a message
			}
			this.__schema = v;
		}
	 });

	Object.defineProperty(this, "content", {
		enumerable: true,
		get: function () {
			return this.__content;
		},
		set: function (v) {
			
			var self = this;
			try{
				hubby().requestSchema(this.__schema, function(schema){
					try{
						schema.validate(v, function(){
							self.__content = v;
							self.emit('content set');
						});
					}catch(e){ 
						fn(e); 
					}
				});
			}catch(e){ 
				fn(e); 
			}
		}
	 });

};

Message.super_ = EventEmitter;

Message.prototype = Object.create(EventEmitter.prototype, {
	constructor : {
		value : Message,
		enumerable : false
	}
});

var extensions = {

	// variables
	__schema : null,
	__content : null,
	__uuid : null,

	// methods
	watch : function () {
		// watch this message instance
	}
};

// extending
_.extend(Message.prototype, extensions);

module.exports = Message;

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
