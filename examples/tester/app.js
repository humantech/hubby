var express = require('express'), 
	stylus = require('stylus'), 
	nib = require('nib'), 
	hubby = require('../../lib/hubby');

var app = express.createServer();

app.configure(function () {
	app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
	app.use(express.static(__dirname + '/public'));
	app.use(express.bodyParser());
	app.set('views', __dirname);
	app.set('view engine', 'jade');

	function compile (str, path) {
		return stylus(str)
		.set('filename', path)
		.use(nib());
	};
});

app.get('/', function (req, res) {
	res.render('index', { layout: false });
});

app.post('/list-schemas', function (req, res) {
	hubby().listSchemas(function(data){
		res.send(data);
	});
});

app.post('/create-schemas', function (req, res) {
	hubby().createSchema(
		req.param('name'), 
		function(data){
			console.log(data);
		},
		req.param('version'), 
		req.param('schema')
	);
});

app.listen(3000, function () {
	var addr = app.address();
	console.log('Hubby Tester listening on http://' + addr.address + ':' + addr.port);
});

hubby().on('initialized', function(){
	console.log('Hubby was initialized on tester: ' + hubby().isInitialized());
});

hubby().initialize();