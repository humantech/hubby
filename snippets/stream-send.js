
var Db = require('mongodb').Db, 
	Server = require('mongodb').Server, 
	ObjectID = require('mongodb').ObjectID, 
	Cursor = require('mongodb').Cursor, 
	Collection = require('mongodb').Collection,
	_ = require('underscore.ext');

new Db('test', new Server("127.0.0.1", 27017, 
{auto_reconnect: true, native_parser:true}), {}).open(function(err, client) { 
	client.collection('streamtest', function(err, collection) {
		setInterval(function() {
			var uuid = _.uuid.v4();
			collection.save({uuid:uuid, date: new Date(),status:0}, function(err, result) {
				if (!err) {
					console.log(uuid, " saved");
				}
			}); 
		}, 500);
		client.close();
	});
}); 
