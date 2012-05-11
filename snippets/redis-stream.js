
var redis = require("redis"),
	queueClient = redis.createClient(),
	pubsubClient = redis.createClient(),
	util = require("util"),
	key = 'queue01';

queueClient.on("error", function (err) {
	console.log("Error " + err);
});

pubsubClient.on("error", function (err) {
	console.log("Error " + err);
});

pubsubClient.on('message', function (channel, message) {
	if (message === 'queued') {
		queueClient.lpop(channel, function(err, resp) {
			if (!err && resp) {
				var obj = JSON.parse(resp);
				console.log(obj.date, '-', obj.id);
			}
		});
	}
});

pubsubClient.subscribe(key);
