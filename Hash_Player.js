//---------------[ Setup Dependencies ]---------------//
var express = require('express');
var path = require('path');
var bodyParser = require("body-parser");
var http = require('http');
var https = require('https');
var fs = require('fs');
var HashMap = require('hashmap');

//---------------[ Global variables with default values ]---------------//
// These variables should be shared across the proxy - they would be accessed by middlewares
shared_directory = 'NA';
shared_map = null;
requestCount = 1;

//---------------[ Local variables ]---------------//
// These variables are only used by the proxy server locally
var configurationFilename = '';
var listenPort=9999;

process.argv.forEach(function (val, index, array) {
	// if(index==2){
	// 	serviceName = val;
	// }
	// if(index==3){
	// 	listenPort = val;
	// }
	if(index == 2){
		configurationFilename = val;
	}
});

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

//---------------[ Read parameters from configuration file]---------------//
var parameters = JSON.parse(fs.readFileSync(configurationFilename, 'utf8'));
console.log('Configuration for Player:')
console.log('-player_port:'+parameters['player_port']);
console.log('-protocol:'+parameters['protocol']);
console.log('-directory:'+parameters['directory']);
var listenPort = parameters['player_port'];
var directory = parameters['directory'];
shared_directory = directory;

//---------------[ Create the Application ]---------------//
var playerApp = express();
playerApp.set('port', process.env.PORT || listenPort);
playerApp.set('views', path.join(__dirname, 'views'));
playerApp.set('view engine', 'ejs');
playerApp.engine('html', require('ejs').renderFile);
playerApp.use(express.logger('dev'));
playerApp.use(express.json());
playerApp.use(express.urlencoded());
playerApp.use(express.methodOverride());
playerApp.use(playerApp.router);
playerApp.use(express.static(path.join(__dirname, 'public')));
playerApp.use(express.bodyParser());
playerApp.use(bodyParser.urlencoded({ extended: false }));

//---------------[ Used for Development Only ]---------------//
if ('development' == playerApp.get('env')) {
	playerApp.use(express.errorHandler());
}

//---------------[ Prepare the filepath to be read in the target folder ]---------------//
var requestList = null;
var map = new HashMap();
var sortMap = new HashMap();
fs.readdir(directory, function(err, list) {
	if (err) {
		console.log('Error!')
		console.log('Detail: '+JSON.stringify(err));
		process.exit();
	}
	requestList = list;
	
	// First sort the requestList, put them in sortMap
	for (var i = 0; i < requestList.length; i++) {
		var key = requestList[i].substring(0, requestList[i].indexOf('_'));
		var value = requestList[i];
		sortMap.set(key, value);
	}

	console.log('\n---------------[ Requests/Responses Saved locally ]---------------');
	
	// Second Put the filenames to the hashmap in sequence
	for (var i = 0; i < requestList.length; i++) {
		var index = (i+1) + '';
		var key = sortMap.get(index).substring(sortMap.get(index).indexOf('_')+1);
		var value = sortMap.get(index);
		map.set(key, value);
		console.log(value);
	}
});
shared_map = map;

//---------------[ Setup the Middleware ]---------------//
var m = require('./player-get-middleware.js');
var m1 = require('./player-post-middleware.js');
playerApp.get('/*', m.getHandler);
playerApp.post('/*', m1.postHandler);

//---------------[ Start the Server ]---------------//
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var httpServer = http.createServer(playerApp);
var httpsServer = https.createServer(credentials, playerApp);

httpServer.listen(9997);
httpsServer.listen(listenPort);


