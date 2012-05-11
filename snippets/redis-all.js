var redis = require("redis"),
	queueClient = redis.createClient(),
	_ = require('underscore.ext'),
	key = 'queue01';

queueClient.on("error", function (err) {
	console.error("Error " + err);
});

queueClient.llen(key, function(err, resp) {
	queueClient.lrange(key, 0, resp, function(err, replies) {
		if (err) {
			console.error(err);
			queueClient.quit();
		} else {
			replies.forEach(function (reply) {
				var obj = JSON.parse(reply);
				console.log(obj.date, '-', obj.id);
			});
			queueClient.quit();
		}
	});
});
