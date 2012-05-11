
var Db = require('mongodb').Db, 
	Server = require('mongodb').Server, 
	ObjectID = require('mongodb').ObjectID, 
	Cursor = require('mongodb').Cursor, 
	Collection = require('mongodb').Collection,
	_ = require('underscore.ext');

var conn = new Db('test', new Server("127.0.0.1", 27017, 
{auto_reconnect: true, native_parser:true, strict:true}), {});

conn.open(function(err, client) {

	if (process.argv[2] == 'create') create(client);
	if (process.argv[2] == 'drop') drop(client);
	if (process.argv[2] == 'watch') watch(client);
	if (process.argv[2] == 'test') test(client);

});

function drop(client) {
	client.dropCollection("streamtest", function() {
		console.log('dropped');
		client.close();
	});
};

function create(client) {
	client.createCollection("streamtest", {safe: true, capped: true, size: 100000000}, function(err, collection) {
		if (!err) {
			console.log('collection created successfully');
			client.close();
		}
	});
};

function watch(client) {
	client.collection('streamtest', function(err, collection) {
		collection.find({}, {tailable : true}, function(err, cursor) {
			cursor.each(function(err, data) {
				if (!err && data) {
					console.log(data.uuid);
				}
			});
		});
	});
};

function test(client) {
	client.collection('streamtest', function(err, collection) {
		collection.find({status:0}, {tailable : true}, function(err, cursor) {
			cursor.each(function(err, data) {
				if (!err && data) {
					console.log('processing ', data.uuid);
					if (data.status == 0) {

					collection.update(data, {$set : {status : 1}}, {safe : true},
						function(err) {
							if (err) {
								console.error('could not update object');
							} else {
								console.log(data.uuid + ' processed!');
							}
						}
					);


					}
				}
			});
		});
	});
};

