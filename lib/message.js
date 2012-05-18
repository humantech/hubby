
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
	hubby = require('./hubby.js'),
	_ = require('underscore');

var Message = function Message(uuid, client) {
	EventEmitter.call(this);

	this.created_at = new Date();
	this.status = 0;

	Object.defineProperty(this, "uuid", {
		enumerable: true,
		get: function () {
			return this.__uuid;
		}
	 });

	if (!_.isNull(uuid) && !_.isUndefined(uuid)) {
		this.__uuid = uuid;
	} else {
		this.__uuid = UUID.v4();
	}

	this.__client = client;

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
				self.__content = v;
				/*
				hubby().createSchema(this.__schema.name, function(schema){
					try{
						schema.validate(v, function(){
							self.__content = v;
							self.emit('content set');
						});
					}catch(e){ 
						fn(e); 
					}
				}, this.__schema.version);
				*/
			}catch(e){ 
				throw e;
			}
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

	load : function(fn) {
		var self = this;
		console.log('procurando');
		if (   !_.isNull(self.__uuid)
			&& !_.isUndefined(self.__uuid)
			&& !_.isUndefined(self.__client) 
			&& !_.isNull(self.__client)) {

			self.__client.collection('messages', function(err, collection) {
				collection.find({uuid: self.__uuid}, function(err, result) {
					if (!err && result) {
						console.log(self.__uuid, " found");
						result.nextObject(function(err, res){
							console.log('wallaaaaa: ');
							console.log(res);
							/*
							self.__uuid = result.uuid;
							self.__schema = result.schema;
							self.__content = result.content;
							self.created_at = result.created_at;
							self.updated_at = result.updated_at;
							self.status = result.status;
							self.type = result.type;
							*/
						});
					} else {
						console.log('procurando - fracasso');
						console.log(self.__uuid, " not found");
					}
					fn();
				});
			});
		} else {
			throw new Error('Invalid object');
		}

		console.log('procurando - nem devia chegar aqui');
		fn();
	},

	save : function(message, fn) {
		var self = this;
		if (   !_.isNull(message) 
			&& !_.isUndefined(message)
			&& !_.isNull(message.uuid)
			&& !_.isUndefined(message.uuid)) {
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
