
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

/**
 * Packages that cross the hubby searching for his owner.
 * 
 * {
 * 		uuid: 'v4',
 * 		schema: {name: '', version: 1},
 * 		content: {},
 * 		status: 'queue|broadcast',
 * 		created_at: new Date(),
 * 		updated_at: new Date()
 * }
 * 
 * @param {Hubby} hubby   Instance of {Hubby}
 * @param {String} uuid   V4 uuid
 * @param {Object} client MongoDB instance properly initialized
 */
var Message = function Message(hubby, uuid, client) {
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
	this.__hubby = hubby;

	/**
	 * Read-only property
	 */
	Object.defineProperty(this, "schema", {
		enumerable: true,
		get: function () {
			return this.__schema;
		},
		set: function (v) {
			if (this.__schema) {
				return;
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
				self.__hubby.createSchema(this.__schema.name, function(schema){
					
					schema.validate(v, function(err){
						if(!err){
							self.__content = v;
							self.emit('content set');
						}
					});

				}, this.__schema.version);
			}catch(e){ 
				console.log('Error to validate message content: ' + e);
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

	Object.defineProperty(this, "hubby", {
		enumerable: true,
		get: function () {
			return this.__hubby;
		},
		set: function (v) {
			this.__hubby = v;
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

	__schema : null,
	__content : null,
	__uuid : null,
	__client : null,
	__hubby : null,

	watch : function () {
		
	},

	load : function(fn) {
		var self = this;
		if (   !_.isNull(self.__uuid)
			&& !_.isUndefined(self.__uuid)
			&& !_.isUndefined(self.__client) 
			&& !_.isNull(self.__client)) {

			self.__client.collection('messages', function(err, collection) {

				var cursor = collection.find({uuid: self.__uuid});

				cursor.nextObject(function(err, result) {
					if (!err && result) {
						console.log(self.__uuid, " found");

						self.__uuid = result.uuid;
						self.__schema = result.schema;
						self.__content = result.content;
						self.created_at = result.created_at;
						self.updated_at = result.updated_at;
						self.status = result.status;
						self.type = result.type;

					} else {
						console.log(self.__uuid, " not found");
					}
					fn();
				});
			});
		} else {
			throw new Error('Invalid object');
		}
	},

	/**
	 * Save message content, use the current populated instance.
	 * 
	 * @param  {Object}   message Object that will be validated and seted as a content
	 * @param  {Function} fn      Callback function
	 * @return {String}           Error if exists
	 * @throws {Error} If parameters are not defined properly
	 */
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

_.extend(Message.prototype, extensions);
module.exports = Message;