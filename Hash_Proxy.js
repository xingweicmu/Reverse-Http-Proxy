exports.test = function test(para_port, para_host, para_directory, para_filter){

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
	listenPort = para_port;
	proxiedHost = para_host;
	var directory = para_directory;
	var filter = para_filter;
	var hostName = '';
	var portNumber = 80;
	var protocol = '';

	//---------------[ Set values for Global variables ]---------------//
	// Passing local variable to global variable for middleware
	shared_filter = filter;
	shared_directory = directory;

	//---------------[ Parse the url to be proxied]---------------//
	var parts = proxiedHost.split(':');
	if(parts.length == 2){
		protocol = parts[0];
		hostName = parts[1].substring(2);
		// portNumber = 80;
	}
	else if(parts.length == 3){
		protocol = parts[0];
		hostName = parts[1].substring(2);
		portNumber = parts[2];
	}
	// console.log(":"+protocol);
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
	// proxyApp.use(express.bodyParser());
	proxyApp.use(express.json());
	proxyApp.use(bodyParser.urlencoded({ extended: true }));

	//---------------[ Used for Development Only ]---------------//
	if ('development' == proxyApp.get('env')) {
		proxyApp.use(express.errorHandler());
	}

	//---------------[ Setup the Middleware ]---------------//
	if(protocol == 'https'){
		var m = require('./proxy-get-middleware.js');
		var m2 = require('./proxy-post-middleware.js');
		var m3 = require('./proxy-put-middleware.js');
		proxyApp.put('/*', m3.putHandler);
	}else{
		var m = require('./http-proxy-get-middleware.js');
		var m2 = require('./http-proxy-post-middleware.js');
	}
	proxyApp.get('/*', m.getHandler);
	proxyApp.post('/*', m2.postHandler);


	//---------------[ Start the Server ]---------------//
	if(protocol == 'https'){
		// Start https server
		var privateKey  = fs.readFileSync('key.pem', 'utf8');
		var certificate = fs.readFileSync('cert.pem', 'utf8');
		var credentials = {key: privateKey, cert: certificate};
		var httpsServer = https.createServer(credentials, proxyApp);
		httpsServer.listen(listenPort);
	}else{
		// Start http server
		var httpServer = http.createServer(proxyApp);
		httpServer.listen(listenPort);
	}

}



