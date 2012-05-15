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
	validator = require('amanda')('json'),
	_ = require('underscore');

/**
 * Control the {Message} content with validation, used basically to keep
 * the consistence on the database
 * 
 * @param {Object} client  MongoDB client instance properly initialized
 * @param {String} name    Schema name
 * @param {int} [version]  Schema version
 */
var Schema = function Schema(client, name, version) {
	
	EventEmitter.call(this);

	if(!_.isUndefined(client) && !_.isNull(client) 
		&& !_.isUndefined(name) && !_.isNull(name)){

		this.__name = name;
		this.__client = client;
		
		var search = {name : name};
		if(!_.isUndefined(version) && !_.isNull(version)){
			search.version = this.__version = version;
		}

		var self = this;
		client.collection('schemas', function(err, collection) {
			
			var schema = collection.find(search).sort({version: -1});
			schema.nextObject(function(err, result) {
				
				if (!err && result) {
				
					console.log(result.name, ' schema was found');
					
					self.__id = result._id;
					self.__name = result.name;
					self.__version = result.version;
					self.__schema = result.schema;

				} else {
					console.log(err ? err : name + ' schema was not found');
				}

				self.emit('schema loaded', err);
			});
		});

	}else{
		throw new Error('Invalid Parameters');
	}

	Object.defineProperty(this, "id", {
		enumerable: true,
		get: function () {
			return this.__id;
		}
	});

	Object.defineProperty(this, "name", {
		enumerable: true,
		get: function () {
			return this.__name;
		}
	});

	Object.defineProperty(this, "version", {
		enumerable: true,
		get: function () {
			return this.__version;
		}
	});

	Object.defineProperty(this, "schema", {
		enumerable: true,
		get: function () {
			return this.__schema;
		},
		set: function (v) {
			if (this.__schema) {
				throw new Error('Illegal Operation');
			}else{
				this.__schema = v;	
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

	__id : null,
	__name : null,
	__version : null,
	__schema : null,
	__client : null,

	/**
	 * Creates a new schema if no one was loaded and "schema" is properly defined. 
	 * If some schema is already loaded, check if the structure is equal, if isn't, 
	 * updates the version
	 * 
	 * @param  {Object}   schema Schema structure based on JSON Schema Internet Draft
	 * @param  {Function} fn     Callback function
	 * @return {Object}          Return error if exists
	 * @throws {Error} If parameters are not defined properly
	 */
	create : function (schema, fn) {
		
		var self = this;
		if(!_.isUndefined(schema) && !_.isNull(schema)){
			
			if(!_.isNull(this.__id)){
				if(!_.isEqual(schema, this.__schema)){
					
					this.__client.collection('schemas', function(err, collection) {
						collection.save({
							name: self.__name,
							version: self.__version + 1,
							schema: schema,
							updated_at: new Date()
						},
						function(err, result) {
							if (!err) {

								self.__id = result._id;
								self.__schema = schema;
								self.__version = result.version;
								
								console.log(self.__name, ' schema was updated');
								fn();

							}else{
								fn(err);
							}
						});
					});

				}else{
					console.log(this.__name, ' schema is already updated');
					fn();
				}
			}else{

				this.__client.collection('schemas', function(err, collection) {
					collection.insert({
						name: self.__name,
						version: _.isNull(self.__version) ? 1 : self.__version,
						schema: schema,
						updated_at: new Date()
					}, 
					function(err, results) {
						if (!err) {

							var result = _.first(results);
							self.__id = result._id;
							self.__version = result.version;
							self.__schema = result.schema;

							console.log(self.__name, ' schema was created');
							fn();

						}else{
							fn(err);
						}
					});
				});
			}
		}else{
			throw new Error('Invalid Parameter');
		}
	},

	/**
	 * Validate {Message} content based on JSON Schema Internet Draft
	 * 
	 * @param  {[Object]} v  Message to be validate
	 * @param  {Function} fn Callback function
	 * @throws {Error} If validation fails
	 */
	validate: function(v, fn) {
		validator.validate(v, this.__schema, function(err) {
			if (err) {
				throw new Error('Invalid Message Content');
			} else {
				fn();
			}
		});
	}
};

_.extend(Schema.prototype, extensions);
module.exports = Schema;
