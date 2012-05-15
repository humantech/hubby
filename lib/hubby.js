
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

* amarrar um possível erro do servidor com um callback para deletar da
	collection '__connections' o respectivo registro

* utilizar a api Admin() para fazer autenticação do mongodb, ver o mesmo
	para o redis

* validação de schemas, acho que deverá passar para o objeto message

*/

var EventEmitter = require('events').EventEmitter,
	Message = require('./message.js'),
	Schema = require('./schema.js'),
	mongodb = require('mongodb'),
	redis = require('redis'),
	_ = require('underscore');

// collection indexes
/*

schemas : {
	name : xxxx,
	schema : jsonString,
	version : string,
	created_at : date,
	updated_at : date
}

messages : {
	uuid : uuid,
	created_at : date,
	updated_at : date,
	status : enum, // criar enum
	content : json,
	schema : objectid
}

*/

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

	// default messages
	var __msg = {
		'HUBBY_IS_NOT_INITIALIZED' : 'This hubby is not initialized yet. Check your Redis and MongoDB configuration',
		'ONLY_MESSAGE_INSTANCES_VALID' : 'Only Message instances are valid for this operation'
	};

	// mongo default connection in case of none
	var __mongoDefault = {
		host : '127.0.0.1',
		port : 27017,
		db : 'hubby',
		args : {
			auto_reconnect : true,
			poolSize : 4,
			//native_parser : true // not working in version 1.0.0
		}
	};

	// default collections
	var __collections = [
		'schemas',
		'messages'
	];

	// cached schemas
	var __storedSchemas = [];

	// default collection options
	var __options = {
		safe : true,
		capped : true,
		size : 100000000 // 100 million registers
	};

	// default indexes collections
	var __indexes = {
		schemas: {
			'_id' : 1,
			'name' : 1,
			'version' : -1,
			'updated_at' : -1
		},
		messages: {
			'uuid' : 1,
			'created_at' : -1,
			'status' : 1,
			'schema' : 1
		}
	};

	// index options
	var __idx_options = {
		dropDups : true,
		unique : true
	};

	// checks for collections and creates them
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
		/*
		if (!isInitialized()) {
			throw __msg['HUBBY_IS_NOT_INITIALIZED'];
		}
		*/
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

	var __popAndEmit = function() {
		__redisQueue.lpop('hubby', function(err, resp) {
			if (!err && resp) {
				__events.emit('queued', resp);
			}
		});
	};

	var __clearQueue = function() {
		__redisQueue.llen('hubby', function(err, resp) {
			if (resp > 0) {
				__popAndEmit();
				__clearQueue();
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
			requestMessage : function(uuid,fn) {
				__checkInitialized();
				var message;
				if (uuid) {
					message = new Message(uuid, __client);
					message.load(function(){ 
						fn(message); 
					});					
				} else {
					fn(null);
				}
			},
			enqueue : function(message) {
				__checkInitialized();
				message.type = 'queue';
				__saveMessage(message, function(){
					__redisQueue.rpush('hubby', JSON.stringify({uuid: message.uuid}), function(err, val) {
						if (!err) {
							__redisQueue.publish('hubby', 'queued');
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
					redisConf = config.redis ? config.redis : null;

				__mongo = new mongodb.Db(mongoConf.db, new mongodb.Server(
					mongoConf.host,
					mongoConf.port,
					{}
				), mongoConf.args);

				__mongo.open(function(err, client) {
					if (err) {
						throw err;
					}
					__client = client;
					__check_mongo_collections();

					__client.collection('messages', function(err, collection) {
						collection.find({status: 0, type: 'broadcast'}, {tailable : true}, function(err, cursor) {
							cursor.each(function(err, data) {
								if (!err && data) {
									__events.emit('broadcast', JSON.stringify({uuid: data.uuid}));
								}
							});
						});
					});
				});

				__redisQueue  = redis.createClient(redisConf);
				__redisClient = redis.createClient(redisConf);

				return this;
			},
			subscribe: function(f){
				__clearQueue();

				__redisClient.on('message',function(channel, message){
					if (message === 'queued') {
						__popAndEmit();
					}
				});

				__redisClient.subscribe('hubby');
				f();
			},
			on : function(c, f) {
				__events.on(c, f);
			},
			emit : function(c, v) { // provavelmente broadcast, mas rever
				__events.emit(c, v);
			}
		}
	};

	return __getInstance();
};

module.exports = hubby;
