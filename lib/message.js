
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
	jsonValidator = require('amanda')('json'),
	mongodb = require('mongodb'),
	UUID = require('node-uuid'),
	_ = require('underscore');

var Message = function Message(uuid, client) {
	EventEmitter.call(this);

	if (uuid && !_.isUndefined(client) && !_.isNull(client)) {
		client.collection('messages', function(err, collection) {
			collection.find({uuid:uuid}, function(err, result) {
				if (!err && result) {
					console.log(uuid, " found");
					this.__uuid = result.uuid;
					this.__schema = result.schema;
					this.__content = result.content;
					this.created_at = result.created_at;
					this.updated_at = result.updated_at;
					this.status = result.status;
					this.type = result.type;
				} else {
					console.log(uuid, " not found");
					return null;
				}
			}); 
		});
	} else {
		this.__uuid = UUID.v4();
	}

	this.created_at = new Date();
	this.status = 0;

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
			jsonValidator.validate(v, this.__schema, function(err) {
				if (err) {
					// do something
				} else {
					this.__content = v;
					this.emit('content set');
				}
			});
		}
	 });

	Object.defineProperty(this, "client", {
		enumerable: true,
		get: function () {
			return this.__client;
		},
		set: function (v) {
			this.__client = v;
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
	__client : null,

	// methods
	watch : function () {
		// watch this message instance
	},

	save : function(message, fn) {
		var self = this;
		if ( !_.isNull(message) && !_.isUndefined(message)){
			if ( !_.isNull(this._id)){
				this.__client.collection('messages', function(err, collection) {
					collection.save({
						uuid: message.uuid,
						schema: self.schema,
						content: self.content,
						created_at: self.created_at,
						updated_at : new Date(),
						status: self.status,
						type: self.type
					},
					function(err, result) {
						if (!err) {

							self.__id = result._id;
							console.log(self.uuid, ' message was updated');
							fn();

						}else{
							fn(err);
						}
					});
				});
			} else {
				this.__client.collection('messages', function(err, collection) {
					collection.insert({
						uuid: message.uuid,
						schema: self.schema,
						content: self.content,
						created_at: self.created_at,
						updated_at : new Date(),
						status: self.status,
						type: self.type
					}, 
					function(err, results) {
						if (!err) {

							var result = _.first(results);
							self.__id = result._id;

							console.log(self.uuid, ' message was created');
							fn();

						}else{
							fn(err);
						}
					});
				});
			}
		} else {
			throw new Error("Invalid Parameters");
		}
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
