exports.test = function test(filename){
	//---------------[ Global variables with default values]---------------//
	// All the global variables set up here are for the invocation of middleware.
	// All of them could be replaced using another way: exports.requestCount = requestCount;
	proxiedHost = 'http://127.0.0.1'
	serviceName = 'Inventory';
	requestCount=0;
	filter = '';
	directory = '';

	//---------------[ Local variables ]---------------//
	// All the local variables are used to set up the express server.
	var listenPort = 9999;
	var configurationFilename = filename;
	var protocol = '';

	//---------------[ Setup Dependencies ]---------------//
	var express = require('express');
	var http = require('http');
	var path = require('path');
	bodyParser = require("body-parser");
	fs = require('fs');
	https = require('https');
	HashMap = require('hashmap');
	hashMap = new HashMap();

	//---------------[ Read parameters from configuration file]---------------//
	var parameters = JSON.parse(fs.readFileSync(configurationFilename, 'utf8'));
	console.log('Configuration for Proxy:')
	console.log('-proxy_port:'+parameters['proxy_port']);
	console.log('-proxied_host:'+parameters['proxied_host']);
	console.log('-protocol:'+parameters['protocol']);
	console.log('-directory:'+parameters['directory']);
	console.log('-filter:'+parameters['filter']);

	listenPort = parameters['proxy_port'];
	proxiedHost = parameters['proxied_host'];
	protocol = parameters['protocol'];
	directory = parameters['directory'];
	filter = parameters['filter'];
	serviceName = directory;

	//---------------[ Parse the url to be proxied]---------------//
	var parts = proxiedHost.split(':');
	hostName = '';
	portNumber = '';
	if(parts.length == 2){
		hostName = parts[1].substring(2);
		portNumber = 80;
	}
	else if(parts.length == 3){
		hostName = parts[1].substring(2);
		portNumber = parts[2];
	}

	console.log('Proxying for host: '+hostName + ' on '+ portNumber);
	console.log('Proxying for service: '+serviceName);


	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	//---------------[ Create the Folder ]---------------//
	fs.mkdir(serviceName,function(){});

	//---------------[ Create the Application ]---------------//
	var proxyApp = express();
	proxyApp.set('port', process.env.PORT || listenPort);
	proxyApp.set('views', path.join(__dirname, 'views'));
	proxyApp.set('view engine', 'ejs');
	proxyApp.engine('html', require('ejs').renderFile);
	proxyApp.use(express.logger('dev'));
	proxyApp.use(express.json());
	proxyApp.use(express.urlencoded());
	proxyApp.use(express.methodOverride());
	proxyApp.use(proxyApp.router);
	proxyApp.use(express.static(path.join(__dirname, 'public')));
	proxyApp.use(express.bodyParser());
	proxyApp.use(bodyParser.urlencoded({ extended: true }));

	//---------------[ Used for Development Only ]---------------//
	if ('development' == proxyApp.get('env')) {
		proxyApp.use(express.errorHandler());
	}

	//---------------[ Setup the Middleware ]---------------//
	var m = require('./proxy-get-middleware.js');
	var m2 = require('./proxy-post-middleware.js');
	proxyApp.get('/*', m.getHandler);
	proxyApp.post('/*', m2.postHandler);

	//---------------[ Start the Server ]---------------//
	var privateKey  = fs.readFileSync('key.pem', 'utf8');
	var certificate = fs.readFileSync('cert.pem', 'utf8');

	var credentials = {key: privateKey, cert: certificate};

	var httpServer = http.createServer(proxyApp);
	var httpsServer = https.createServer(credentials, proxyApp);

	httpServer.listen(9997);
	httpsServer.listen(listenPort);
}



