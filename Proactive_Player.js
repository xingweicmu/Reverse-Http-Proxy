var proxiedHost = 'http://127.0.0.1'

var serviceName = 'Inventory';
var requestCount=0;
var responseCount=0;
var listenPort=9999;
var firstRequest = null;

process.argv.forEach(function (val, index, array) {
  	//console.log(index + ': ' + val);
	if(index==2){
		proxiedHost=val;
	}
	if(index==3){
		serviceName = val;
	}
});

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

console.log('Proxying for host: '+hostName + ' on '+ portNumber);
console.log('Proxying for service: '+serviceName);

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

//---------------[ Setup Dependencies ]---------------//
var express = require('express');
var bodyParser = require("body-parser");
var http = require('http');
var path = require('path');
var os=require('os');
var fs = require('fs');
var request = require('request');

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
proxyApp.use(bodyParser.urlencoded({ extended: false }));

//---------------[ Used for Development Only ]---------------//
if ('development' == proxyApp.get('env')) {
  proxyApp.use(express.errorHandler());
}

var requestList = null;
fs.readdir(serviceName+'/Request', function(err, list) {
	if (err) return console.log(err);
	requestList = list;
	console.log(requestList);

	console.log(requestList);
	for(var num in requestList){

		// function waitAndDo(times) {
  // 			if(times < 1) {
  //   			return;
  // 			}

  // 			setTimeout(function() {

  //   			// Do something here
  //   			console.log('Doing a request on '+times);

  //   			waitAndDo(times-1);
  // 			}, 1000);
		// }
		// waitAndDo(5);
		fs.readFile(serviceName+'/Request/'+requestList[num], 'utf-8', function(err,data) {
			if (err) {
		    	return console.log(err);
		  	}

		  	firstRequest = JSON.parse(data);
		  	var readPath = firstRequest.path;
		  	var readHeaders = firstRequest.headers;
		  	var readMethod = firstRequest.method;
		  	var readBody = firstRequest.body;
		  	console.log('path: ' + readPath);
		  	console.log('method: ' + readMethod);
			console.log('headers: ' + JSON.stringify(readHeaders));
			console.log('body: '+ readBody);

			// Create a new header by removing host
			var newHeaders = {};
			for(var key in readHeaders) {
		    	var value = readHeaders[key];
				//console.log('HEADER:'+key+':'+value);
				if(key != 'content-length' && key!='host' && key != 'referer' && key != 'cookie'){
					newHeaders[key]=value;
				}
			}
			sendRequest();
	
			// If it's GET
			function sendRequest(){
				if(readMethod == 'GET' || readMethod == 'get'){
					var options = {
						uri:proxiedHost + readPath
						, headers: newHeaders
					};
			  		request(options, function (error, resp, body) {
			    		if (!error) {
			    			console.log('---------------[ Response from Server ]---------------');
			       			console.log(resp.body);
			       		}
						else{
							console.log('ERROR: '+error);
				       	}
			    	});
			    }	
			    // If it's POST
			    else if(readMethod == 'POST' || readMethod == 'post') {
			    	var options = {
						uri:proxiedHost + readPath
						, headers: newHeaders
						, body:readBody
					};
			    	request.post(options, function (error, resp, body) {
			    		if (!error) {
			    			console.log(options);
			    			console.log('---------------[ Response from Server ]---------------');
			       			console.log(body);
			       		}
				       	else{
				       		console.log('ERROR: '+error);
				       	}
			    	});	
			    }
			    else {
			    	console.log('Unrecognized Request: '+readMethod);
			    }
			}
		});
	}
});
