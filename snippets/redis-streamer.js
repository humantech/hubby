
var redis = require("redis"),
	queueClient = redis.createClient(),
	// pubsubClient = redis.createClient(),
	_ = require('underscore.ext'),
	key = 'queue01';

queueClient.on("error", function (err) {
	console.log("Error " + err);
});

/*pubsubClient.on("error", function (err) {
	console.log("Error " + err);
});*/

setInterval(function() {
	var data = {
		id     : _.uuid.v4(),
		date   : _.formatDate(new Date()),
		status : 0,
		data   : 'random'
	};
	queueClient.rpush(key, JSON.stringify(data), function(err, val) {
		if (!err) {
			queueClient.publish(key, 'queued');
		}
	});
}, 100);

/*pubsubClient.on('message', function (channel, message) {
	if (message === 'queued') {
		queueClient.lpop(channel, function(err, resp) {
			if (!err && resp) {
				var obj = JSON.parse(resp);
				console.log(obj.date, '-', obj.id);
			}
		});
	}
});

pubsubClient.subscribe(key);*/
