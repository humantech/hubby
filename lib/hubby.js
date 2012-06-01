/*
 *                          __          __    __
 *                         / /_  __  __/ /_  / /_  __  __
 *                        / __ \/ / / / __ \/ __ \/ / / /
 *                       / / / / /_/ / /_/ / /_/ / /_/ /
 *                      /_/ /_/\__,_/_.___/_.___/\__, /
 *                                              /____/
 *
 */

/*

== TODO ==

* Connection errors handling

* Use authentication for mongo and redis connections

*/

var EventEmitter = require('events').EventEmitter,
	Message = require('./message.js'),
	Schema = require('./schema.js'),
	mongodb = require('mongodb'),
	redis = require('redis'),
	_ = require('underscore');

var hubby = function hubby() {

	if (this.constructor !== hubby) {
		return new hubby();
	}

	this.__instance = null;
	
	var __events = new EventEmitter(),
		__initialized = false,
		__mongo,
		__client,
		__redisQueue,
		__redisClient;

	__events.on('initialized', function() {
		__initialized = true;
	});

	/**
	 * Message constants
	 * @type {Object}
	 */
	var __msg = {
		'HUBBY_IS_NOT_INITIALIZED' : 'This hubby is not initialized yet. Check your Redis and MongoDB configuration',
		'ONLY_MESSAGE_INSTANCES_VALID' : 'Only Message instances are valid for this operation'
	};

	/**
	 * Mongo default connection
	 * @type {Object}
	 */
	var __mongoDefault = {
		host : '127.0.0.1',
		port : 27017,
		db : 'hubby',
		args : {
			auto_reconnect : true
			//poolSize : 4,
			//native_parser : true // not working in version 1.0.0
		}
	};

	var __redisDefault = {
		host : '127.0.0.1',
		port : 6379
	};

	/**
	 * Default collections
	 * @type {Array}
	 */
	var __collections = [
		'schemas',
		'messages'
	];

	/**
	 * Cached {Schema} objects
	 * @type {Array}
	 */
	var __storedSchemas = [];

	/**
	 * Default collection options
	 * @type {Object}
	 */
	var __options = {
		safe : true,
		capped : true,
		size : 100000000
	};

	/**
	 * [__indexes description]
	 * @type {Object}
	 */
	var __indexes = {
		schemas: {
			'_id' : 1,
			'name' : 1,
			'schema' : -1,
			'version' : -1,
			'created_at' : -1
		},
		messages: {
			'uuid' : 1,
			'created_at' : -1,
			'status' : 1,
			'schema' : 1
		}
	};

	var __idx_options = {
		dropDups : true,
		unique : true
	};

	/**
	 * Checks for collections and create them
	 * @throws {Error} If has database errors
	 */
	var __check_mongo_collections = function() {
		__client.collectionNames(function(err, names) {
			names = _.map(_.pluck(names, 'name'), function(name) {
				return name.substr(name.indexOf('.')+1);
			});

			var __collLength = __collections.length,
				__collInterval = setInterval(function() {
					if (__collLength == 0) {
						clearInterval(__collInterval);
						__events.emit('initialized');
					}
				}, 10);

			_.each(__collections, function(name) {
				if (!_.include(names, name)) {
					__client.createCollection(name, __options, function(err, collection) {
						if (err) {
							throw err;
						}
						console.log('collection', name, 'created');
						collection.createIndex(__indexes[name], __idx_options, function(err, indexName) {
							if (err) {
								throw err;
							}
							var fakeData = {fake:true};
							collection.save(fakeData,function(){});
							console.log('collection index for', name, 'created');
							__collLength--;
						});
					});
				} else {
					__collLength--;
				}
			});
		});
	};

	var __checkInitialized = function() {
		if (!this.__instance.isInitialized()) {
			throw __msg['HUBBY_IS_NOT_INITIALIZED'];
		}
	};

	var __getInstance = function() {
		if (!this.__instance) {
			this.__instance = __createInstance();
		}
		return this.__instance;
	};

	var __saveMessage = function(message, fn) {
		if (!(message instanceof Message)) {
			throw __msg['ONLY_MESSAGE_INSTANCES_VALID'];
		}

		message.client = __client;
		message.save(message, fn);
	};

	var __popAndEmit = function(schema) {
		__redisQueue.lpop(schema, function(err, resp) {
			if (!err && resp) {
				__events.emit(schema, resp);
			}
		});
	};

	var __clearQueue = function(schema) {
		__redisQueue.llen(schema, function(err, resp) {
			if (resp > 0) {
				__popAndEmit(schema);
				__clearQueue(schema);
			}
		});
	};

	var __createInstance = function() {
		return {
			
			/**
			 * List schema as BSON object, without initialization
			 * 
			 * @param  {Function}  fn          	 Callback function
			 * @param  {boolean} [initialized] List just initialized
			 * @return {Object}               	 Collection with all schemas
			 */
			listSchemas : function(fn, initialized) {
				__checkInitialized();

				if(initialized){
					fn(__storedSchemas);
				}else{
					__client.collection('schemas', function(err, collection) {
						
						var cursor = collection.find({version:{$ne: null}}).sort({version:-1});
						var schemas = {};

						cursor.each(function(err, item) {
							if(item != null) {
								if(!_.has(schemas, item.name)){
									schemas[item.name] = item;
								}				
							}
							if(item == null) {                
								fn(schemas);
							}
						});
					});
				} 
			},

			/**
			 * Create or initialize a schema based on name and version, 
			 * if name was not founded, create a schema using schema parameter.
			 * 
			 * @param  {String}   	name    	[Schema name]
			 * @param  {Function} 	fn      	[Callback function]
			 * @param  {int}   		[version] 	[Schema version]
			 * @param  {Object}   	schema  	[JSON based on Schema Internet Draft]
			 * @return {Object}           		[Schema properly initialized Object]
			 * @throws {Error} If missing parameters or database problems to save
			 */
			createSchema : function(name, fn, version, schema) {
				__checkInitialized();
				
				if(typeof __storedSchemas[name] === 'undefined' ||  
					__storedSchemas[name].version !== version){

					var __schema = new Schema(__client, name, version);
					__schema.on('schema loaded', function(err){
						if(!err){
							if(typeof schema !== 'undefined'){
								__schema.create(schema, function(err){
									if(!err){

										__storedSchemas[__schema.name] = __schema;
										fn(__schema);
									}else{
										throw new Error(err);
									}									
								});
							}else{

								__storedSchemas[__schema.name] = __schema;
								fn(__schema);
							}			
						}else{
							throw new Error(err);
						}
					});			
				}else{
					fn(__storedSchemas[name]);
				}		
			},
			createMessage : function(fn) {
				var message = new Message(this);
				fn(message);
			},
			requestMessage : function(uuid,fn) {
				__checkInitialized();
				if (!_.isNull(uuid) && !_.isUndefined(uuid)) {
					var message = new Message(this, uuid, __client);
					message.load(function(){ 
						fn(message); 
					});
				} else {
					fn(null);
				}
			},
			setMessageStatus : function(uuid,status,fn){
				if ( status != 'unread' && status != 'read' ){
					fn('Invalid status');
					return;
				}
				__checkInitialized();
				var message;
				if (!_.isNull(uuid) && !_.isUndefined(uuid)) {
					message = new Message(this, uuid, __client);
					message.load(function(){ 
						message.status = status;
						__saveMessage(message,fn);
					});					
				} else {
					fn('Invalid uuid');
				}
			},
			enqueue : function(message) {
				__checkInitialized();
				message.type = 'queue';
				__saveMessage(message, function(){
					__redisQueue.rpush(message.schema.name, JSON.stringify({uuid: message.uuid, schema: message.schema}), function(err, val) {
						if (!err) {
							__redisQueue.publish(message.schema.name, 'queued');
						}
					});
				});
				
			},
			broadcast : function(message) {
				__checkInitialized();
				message.type = 'broadcast';
				__saveMessage(message, function(){

				});
			},
			isInitialized : function() {
				return __initialized;
			},
			initialize : function(config) {
				config = config || {};
				var mongoConf = config.mongo || __mongoDefault,
					redisConf = config.redis || __redisDefault;

				var mongoServer = new mongodb.Server(
					mongoConf.host,
					mongoConf.port,
					mongoConf.args
				);

				__mongo = new mongodb.Db(mongoConf.db, mongoServer, {});

				__mongo.open(function(err, client) {
					if (err) {
						throw err;
					}
					__client = client;
					__check_mongo_collections();

					__client.collection('messages', function(err, collection) {
						collection.find({created_at:{$gt:new Date()},type:'broadcast'}, {tailable : true}, function(err, cursor) {
							cursor.each(function(err, data) {
								if (!err && data) {
									__events.emit('broadcast', JSON.stringify({uuid: data.uuid}));
								}
							});
						});
					});

					__redisQueue  = redis.createClient(redisConf.port, redisConf.host);
					__redisClient = redis.createClient(redisConf.port, redisConf.host);

				});
			},
			subscribe: function(schemas, f){
				for ( schema in schemas ){
					__clearQueue(schemas[schema]);
				}

				__redisClient.on('message', function(channel, message){
					if ( schemas.indexOf(channel) != -1 && message == 'queued' ) {
						__popAndEmit(channel);
					}
				});

				for ( schema in schemas ){
					__redisClient.subscribe(schemas[schema]);
				}
				f();
			},
			unsubscribe: function(schemas, f){
				for ( schema in schemas ){
					__redisClient.unsubscribe(schemas[schema]);
				}
				f();
			},
			on : function(c, f) {
				__events.on(c, f);
			},
			emit : function(c, v) {
				__events.emit(c, v);
			}
		}
	};

	return __getInstance();
};


module.exports = hubby;
