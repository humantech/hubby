# `hubby`, A high feature, distributed, low latency and secure message exchange bus based on `redis` and `mongodb`

**Warning I:** this project is in early development stage, you might not find it useful for now.

Hubby has the following features working (or at least we think so):

* Named queues
* Broadcasting
* JSON schema validation using [`amanda`](https://github.com/Baggz/Amanda/)

Each schema has its own queue, so listeners needs to subscribe to schema names.

## Install from npm
```
$ npm install hubby
```

## Usage
```javascript
var hubby = require('hubby')();

hubby.on('initialized', function() {
	// message schema format
	var messageSchema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			sender: {
				required: true,
				type: 'string'
			},
			recipient: {
				required: true,
				type: 'string'
			},
			subject: {
				required: true,
				type: 'string'
			},
			body: {
				required: true,
				type: 'string'
			}
		}
	};

	// create or update the schema
	hubby.createSchema('Message', function(schema) {
		console.log('Schema \'Message\' created');
	}, null, messageSchema);

	// subscribe to 'Message' schema queue
	hubby.subscribe(['Message'], function(err) {
		if (err) {
			console.log('Subscribe error');
		} else {
			console.log('Subscribed to: \'Message\'');
		}
	});

});

hubby.on('Message', function(msg) {
	// the msg parameter is an object, ex: { uuid: '', schema: { name: '', version: 0 } }
	var m = JSON.parse(msg);
	// get the queued message
	hubby.requestMessage(m.uuid, function(message){
		if (message && message.content) {
			// do something useful
			console.log('Message from ' + message.content.sender + ' to ' + message.content.recipient + ' received');
			// mark message as read
			hubby.setMessageStatus(m.uuid, 'read', function() {
	                        out.loginfo(plugin, 'message processed');
          	        });
		} else {
			console.log('Message ' + m.uuid + ' not found');
		}
	});
});

// redis and mongo configuration
// these are the default values
var conf = {
    redis: {
        host: 'localhost',
        port: 6379
    },
    mongo: {
        host : 'localhost',
        port : 27017,
        db: 'hubby',
        args : {
            auto_reconnect : true,
            native_parser : true // DO NOT USE IT WITH mongodb=1.0.0
        }
    }
};

// if mongo and redis are in their default ports, you don't need to use the conf parameter
hubby.initialize(conf);

/*
----> sending a message
*/

// sample message content
var content = {
	sender: 'test@test.com',
	recipient: 'test2@test.com',
	subject: 'this is a test message',
	body: 'nothing special here'
};

// get the schema
hubby.createSchema('Message', function(schema) {
	// create an empty new message
	hubby.createMessage(function(message) {
		// set schema properties
		message.schema = {name: schema.name, version: schema.version};
		// ser content
		message.setContent(content, function(result, err) {
			if (!err) {
				// finally send messages
				hubby.enqueue(message);
			} else {
				// uh-oh... validation error
				console.log('validation error: ' + err );
			}
		});
	});
});

```
### Available events

`hubby.on('broadcast', function(messageNotification) {});`

`hubby.on('<schema name>', function(messageNotification) {});`

### API

Big TODO here.

## TODO

* better documentation of the source code;
* better error handling
* code cleanup
* a real document page, examples, and so on;
* **tests!**
* ~~jsHint standards~~ we don't like code standards.

## License

Copyright (C) 2012 [Humantech Gestao do Conhecimento](https://www.humantech.com.br/)

Distributed under the MIT License, the same as NodeJS.

[Read this](https://github.com/humantech/hubby/blob/master/LICENSE) if you're in doubt.

## References
* [Amanda](https://github.com/Baggz/Amanda/)
