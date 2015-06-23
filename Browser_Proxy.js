var proxiedHost = 'http://127.0.0.1'

var serviceName = 'Inventory';
var requestCount=0;
var responseCount=0;
var listenPort=9999;

process.argv.forEach(function (val, index, array) {
  	//console.log(index + ': ' + val);
	if(index==2){
		proxiedHost=val;
	}
	if(index==3){
		serviceName = val;
	}
	if(index==4){
		listenPort = val;
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

fs.mkdir(serviceName,function(){});
fs.mkdir(serviceName+'/Request',function(){});
fs.mkdir(serviceName+'/Response',function(){});
fs.mkdir(serviceName+'/ResponseHeader',function(){});

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

//---------------[ Setup the Routes ]---------------//
proxyApp.get('/*', function(webRequest, response) {
	var request = require('request').debug=true;
	console.log('GET Request:'+webRequest.url);
	
	var request = require('request');
	var jar = request.jar();
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var data = '';

	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('GET Request:'+webRequest.url);
	console.log('GET Headers:'+JSON.stringify(headers));

	console.log(data); // data should be nothing here
	var currentCount = requestCount;
	// requestCount++;
	console.log('###'+currentCount);

	var newHeaders = {};
	for(var key in webRequest.headers) {
    	var value = webRequest.headers[key];
		if(key != 'content-length' && key!='host'){		// then what about the host and content-length now?
			newHeaders[key]=value;
		}
	}
	console.log('Send Headers:'+JSON.stringify(newHeaders));

	function endsWith(str, suffix) {
    	return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
	console.log('@@@'+filePath);
	// To handle text 
	if(!endsWith(webRequest.url, 'png') && !endsWith(webRequest.url, 'jpg') 
		&& !endsWith(webRequest.url, 'ttf') && !endsWith(webRequest.url, 'woff')){
		// prepare redirecting request options
		var options = {
			uri:proxiedHost + webRequest.url, 
			// headers: webRequest.headers, 
			jar:true, 
		};
		// var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
		// console.log('***'+filePath);
		// responseCount++;
  		request(options, function (error, resp, body) {
    		if (!error) {
        		console.log(webRequest.url);
        		console.log(resp.body);
	        	// response.send(resp.body);
	        	// responseCount++;
	        	requestCount++;

	        	// rqst - the request sent to the proxy
				var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers, 'body':data};
				// write the request to file 
				fs.writeFile(serviceName+'/Request/'+filePath, JSON.stringify(rqst), function(err) {
					if (err) throw err;
				});

				// write to local file
	        	fs.writeFile(serviceName+'/Response/'+filePath, body, function(err) {
	        		// console.log('Failed request count:'+requestCount + 'response ERROR!!!!!'+JSON.stringify(err));
					if (err) throw err;
				});
				fs.writeFile(serviceName+'/ResponseHeader/'+filePath, JSON.stringify(resp.headers), function(err) {
					// console.log('Failed request count:'+requestCount +'header ERROR!!!!!'+JSON.stringify(err));
					if (err) throw err;
				});
	        	// response.send(resp.body);
	        	response.write(resp.body);
				response.end();
    		}
    		else {
    			console.log("ERROR!");
    		}
		});
	}
	// To handle images or font, which requires to be encoded in binary
	else{	
		options = {
			host: hostName
			, port: portNumber
			, path: webRequest.url
			// uri: proxiedHost + webRequest.url
		}

		var request = http.get(options, function(res){
			var imagedata = ''
			res.setEncoding('binary')

			res.on('data', function(chunk){
			    imagedata += chunk
			})

			res.on('end', function(){

				var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers, 'body':data};
				// write the request to file 
				fs.writeFile(serviceName+'/Request/'+filePath, JSON.stringify(rqst), function(err) {
					if (err) throw err;
				});

				fs.writeFile(serviceName+'/Response/'+filePath, imagedata, 'binary', function(err){
            		if (err) throw err
            		console.log('File saved.')
        		})
				response.end(imagedata, 'binary');
			})

  		})
	}
	console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');

});

proxyApp.post('/*', function(webRequest, response) {
	var request = require('request');
	var jar = request.jar();
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var data = '';
	var queryBody = webRequest.body;
	
	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('POST Request:'+webRequest.url);
	console.log('POST Headers:'+JSON.stringify(headers));
	console.log('--------------------[ webRequest ]---------------');
	console.log(webRequest);
	console.log('--------------------[ queryBody ]---------------');
	console.log(queryBody);
	data = JSON.stringify(queryBody);

	console.log('POST body:'+data);
	var currentCount = requestCount;

	function callback(error, cbresponse, body) {
    	console.log('--------------------[ endpoint Response '+currentCount+ ' ]---------------');
		var cbheaders = cbresponse.headers;
		console.log('Headers from endpoint:'+JSON.stringify(cbheaders));
		
		var rtnHeaders = {};
		for(var key in cbheaders) {
    		var value = cbheaders[key];
			//console.log('HEADER:'+key+':'+value);
			if(key!='content-length'&&key!='host'){
				rtnHeaders[key]=value;
			}
		}

		requestCount++;

		var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
		var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':data};

		fs.writeFile(serviceName+'/Request/'+filePath, JSON.stringify(rqst), function(err) {
			if (err) throw err;
		});

		fs.writeFile(serviceName+'/ResponseHeader/'+filePath, JSON.stringify(rtnHeaders), function (err) {
  			if (err) throw err;
		});

		fs.writeFile(serviceName+'/Response/'+filePath, body, function (err) {
  			if (err) throw err;
		});

		console.log('Response Code:'+cbresponse.statusCode); // + '   Body:'+body);
		response.writeHead(cbresponse.statusCode,cbheaders);
		response.write(body);
		response.end();

        console.log('--------------------[ /endpoint Response '+currentCount+ ' ]---------------');
	};

	var newHeaders = {};
	for(var key in webRequest.headers) {
    	var value = webRequest.headers[key];
		//console.log('HEADER:'+key+':'+value);
		if(key!='content-length'&&key!='host'){
			newHeaders[key]=value;
		}
	}

	console.log('Send Headers:'+JSON.stringify(newHeaders));

	var options = {
		uri:proxiedHost+webRequest.url
		//, headers: {"content-type":"text/xml; charset=utf-8","soapaction":"urn:vim25/5.5","user-agent":"VMware vim-java 1.0"}
		// , headers: newHeaders
		, headers: webRequest.headers
		, jar:true
		, body:data
	};

	request.post(options, callback);
    console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');

});

//---------------[ Start the Server ]---------------//
var server = http.createServer(proxyApp).listen(proxyApp.get('port'), function(){
	console.log('Proxy server listening on port ' + proxyApp.get('port'));
});


