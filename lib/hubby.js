
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
	jsonValidator = require('amanda')('json'),
	message = require('./message.js'),
	mongodb = require('mongodb'),
	redis = require('redis'),
	uuid = require('node-uuid'),
	_ = require('underscore');

// collection indexes
/*

schemas : {
	name : xxxx,
	schema : json,
	created_at : date,
	updated_at : date
}

messages : {
	uuid : uuid,
	created_at : date,
	updated_at : date,
	status : enum,
	message : json,
	schema : objectid
}

connections : {
	hostname : machinename,
	pid : pid,
	last_job : objectid,
	last_response : date,
	active : bool,
	schemas: [objectid]
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
		__redis;

	__events.on('initialized', function() {
		__initialized = true;
	});

	// default messages
	var __msg = {
		'HUBBY_IS_NOT_INITIALIZED' : 'This hubby is not initialized yet. Check your Redis and MongoDB configuration'
	};

	// mongo default connection in case of none
	var __mongoDefault = {
		host : '127.0.0.1',
		port : 27017,
		db : 'hubby',
		args : {
			auto_reconnect : true,
			//native_parser : true // not working in version 1.0.0
		}
	};

	// default collections
	var __collections = [
		'schemas',
		'messages',
		'connections'
	];

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
			'name' : 1
		},
		messages: {
			'uuid' : 1,
			'created_at' : -1,
			'status' : 1,
			'schema' : 1
		},
		connections: {
			'hostname' : 1,
			'pid' : 1,
			'last_response' : -1,
			'schemas' : 1,
			'active' : 1
		}
	};

	// index options
	var __idx_options = {
		dropDups : true,
		unique : true
	};

	// checks for collections and creates them
	var __check_mongo_collections = function(client) {
		client.collectionNames(function(err, names) {
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
					client.createCollection(name, __options, function(err, collection) {
						if (err) {
							throw err;
						}
						console.log('collection', name, 'created');
						collection.createIndex(__indexes[name], __idx_options, function(err, indexName) {
							if (err) {
								throw err;
							}
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

	var getInstance = function() {
		if (!this.__instance) {
			this.__instance = createInstance();
		}
		return this.__instance;
	};

	var createInstance = function() {
		return {
			createSchema : function(name, schema, overwrite) {
				if (!this.isInitialized()) {
					throw __msg['HUBBY_IS_NOT_INITIALIZED'];
				}

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
					__check_mongo_collections(client);
				});

				__redis = redis.createClient(redisConf);

				return this;
			},
			newMessageId : function() {
				return uuid.v4();
			},
			newInstanceId : function() {
				return uuid.v1();
			},
			on : function(c, f) {
				__events.on(c, f);
			},
			emit : function(c, v) {
				__events.emit(c, v);
			}
		}
	};

	return getInstance();
};

module.exports = hubby;

////////////////////////////////////////////////////////////////////////////////
// 

hubby().initialize();
setTimeout(function() {
	console.log(hubby().isInitialized());
}, 2000);
