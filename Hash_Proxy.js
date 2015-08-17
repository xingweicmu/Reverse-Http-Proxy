exports.test = function test(filename){

	//---------------[ Setup Dependencies ]---------------//
	var express = require('express');
	var http = require('http');
	var path = require('path');
	var fs = require('fs');
	var bodyParser = require("body-parser");
	var https = require('https');

	//---------------[ Global variables with default values]---------------//
	// These variables should be shared across the proxy - they would be accessed by middlewares
	requestCount = 0;
	shared_hostName = '';
	shared_portNumber = '';
	shared_directory = '';
	shared_filter = '';

	//---------------[ Local variables ]---------------//
	// These variables are only used by the proxy server locally
	var configurationFilename = filename;

	//---------------[ Read parameters from configuration file]---------------//
	var parameters = JSON.parse(fs.readFileSync(configurationFilename, 'utf8'));
	console.log('Configuration for Proxy:')
	console.log('-proxy_port:'+parameters['proxy_port']);
	console.log('-proxied_host:'+parameters['proxied_host']);
	console.log('-protocol:'+parameters['protocol']);
	console.log('-directory:'+parameters['directory']);
	console.log('-filter:'+parameters['filter']);

	var listenPort = parameters['proxy_port'];
	var proxiedHost = parameters['proxied_host'];
	var protocol = parameters['protocol'];
	var directory = parameters['directory'];
	var filter = parameters['filter'];
	shared_filter = filter;
	shared_directory = directory;

	//---------------[ Parse the url to be proxied]---------------//
	var parts = proxiedHost.split(':');
	var hostName = '';
	var portNumber = '';
	if(parts.length == 2){
		hostName = parts[1].substring(2);
		portNumber = 80;
	}
	else if(parts.length == 3){
		hostName = parts[1].substring(2);
		portNumber = parts[2];
	}
	shared_hostName = hostName;
	shared_portNumber = portNumber;

	console.log('Proxying for host: '+hostName + ' on '+ portNumber);
	console.log('Proxying for service: '+shared_directory);


	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	//---------------[ Create the Folder ]---------------//
	fs.mkdir(shared_directory,function(){});

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



