var proxiedHost = 'http://127.0.0.1'

var serviceName = 'Inventory';
var requestCount=0;
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


console.log('Proxying for host:'+proxiedHost);
console.log('Proxying for service:'+serviceName);

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

//---------------[ Setup Dependencies ]---------------//
var express = require('express');
var http = require('http');
var path = require('path');
var os=require('os');
var fs = require('fs');

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

//---------------[ Used for Development Only ]---------------//
if ('development' == proxyApp.get('env')) {
  proxyApp.use(express.errorHandler());
}

//---------------[ Setup the Routes ]---------------//
proxyApp.get('/*', function(webRequest, response) {
	var request = require('request').debug=true;
	console.log('GET Request:'+webRequest.url);
	// request({
 //    		uri  : proxiedHost 
	// }, 
	// webRequest.on('end', 
	// function(err, res, body) {
    		//console.log('REQUEST RESULTS:', err, res.statusCode, body);
		// response.writeHead(200, { 'Content-Type': 'text/html' });
		// if(body){
		// 	response.write('test');
		// }
		// response.end();
	// });
	// response.send("Hello GET");

	// Simple Version:
	// var options = {
	// 	host: proxiedHost,
 	//  path: '/index.html'
	// };
	// var callback = function(res){
	// 	var body = '';
	// 	res.on('data', function(data){
	// 		body += data;
	// 	});

	// 	res.on('end', function(){
	// 		console.log(body);
	// 		response.send(body);
	// 	});

	// }

	// var req = http.request(options, callback);
	// req.end();

	var request = require('request');
	var jar = request.jar();
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var data = '';

	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('GET Request:'+webRequest.url);
	console.log('GET Headers:'+JSON.stringify(headers));

    webRequest.on('data', function(chunk) {
        data+=chunk.toString();
    });

	webRequest.on('end', function() {
		console.log(data); // data should be nothing here
		var currentCount = requestCount;
		requestCount++;

		// rqst - the request sent to the proxy
		var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers, 'body':data};
		// write the request to file 
		fs.writeFile(serviceName+'/Request'+requestCount+'.txt', JSON.stringify(rqst), function(err) {
			if (err) throw err;
		});

		// NEXT - redirect the request to the destination
		// create a new header
		var newHeaders = {};
		for(var key in webRequest.headers) {
    		var value = webRequest.headers[key];
			if(key != 'content-length' && key!='host'){		// then what about the host and content-length now?
				newHeaders[key]=value;
			}
		}
		console.log('Send Headers:'+JSON.stringify(newHeaders));

		// prepare redirecting request options
		var options = {
			uri:proxiedHost + webRequest.url, 
			// headers: webRequest.headers, 
			jar:true, 
			body:data 
		};

		// send the request to the destination and save the response to local file 
		// request.get(options, callback).pipe(
		// 	fs.createWriteStream(serviceName+'/Response'+requestCount+'.txt'),{end:false});
		
		// Optional ways
		// request.get('http://google.com').on('response', function(resp){
		// 	console.log(resp.statusCode); // 200 
  //   		console.log(JSON.stringify(resp)); 
  //   		response.send(resp);
  // 		}).pipe(fs.createWriteStream(serviceName+'/Response'+requestCount+'.txt'),{end:false});

		// function callback(error, cbresponse, body) {
  //       	console.log('--------------------[ endpoint Response '+currentCount+ ' ]---------------');
		// 	var cbheaders = cbresponse.headers;
		// 	console.log('Headers from endpoint:'+JSON.stringify(cbheaders));
		
		// 	// headers to return
		// 	var rtnHeaders = {};
		// 	for(var key in cbheaders) {
  //   			var value = cbheaders[key];
		// 		if(key!='content-length'&&key!='host'){
		// 			rtnHeaders[key]=value;
		// 		}
		// 	}
		// 	// write header to local file
		// 	fs.writeFile(serviceName+'/ResponseHeader'+requestCount+'.txt', JSON.stringify(rtnHeaders), function (err) {
  // 				if (err) throw err;
		// 	});

		// 	// send back the response
		// 	console.log('Response Code:'+cbresponse.statusCode); 
		// 	response.writeHead(cbresponse.statusCode,cbheaders);
		// 	response.write(body);
		// 	response.end();

  //       	console.log('--------------------[ /endpoint Response '+currentCount+ ' ]---------------');
		// };

  		request(options, function (error, resp, body) {
    		if (!error && response.statusCode == 200) {
        		console.log(body);
        		fs.writeFile(serviceName+'/Response'+requestCount+'.txt', JSON.stringify(resp), function(err) {
					if (err) throw err;
				});
				fs.writeFile(serviceName+'/ResponseHeader'+requestCount+'.txt', JSON.stringify(resp.headers), function(err) {
					if (err) throw err;
				});
        		response.send(resp.body);
    		}
		});
		
		console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');

	});

});

proxyApp.post('/*', function(webRequest, response) {
	var request = require('request');
	var jar = request.jar();
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;

    var data = '';
    console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('POST Request:'+webRequest.url);
	console.log('POST Headers:'+JSON.stringify(headers));

        webRequest.on('data', function(chunk) {
                data+=chunk.toString();
        });

webRequest.on('end', function() {
		var currentCount = requestCount;
		requestCount++;

		var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':data};

		fs.writeFile(serviceName+'/Request'+requestCount+'.txt', JSON.stringify(rqst), function(err) {
			if (err) throw err;
		});

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

			fs.writeFile(serviceName+'/ResponseHeader'+requestCount+'.txt', JSON.stringify(rtnHeaders), function (err) {
  				if (err) throw err;
			});


			console.log('Response Code:'+cbresponse.statusCode); // + '   Body:'+body);
			response.writeHead(cbresponse.statusCode,cbheaders);
			response.write(body);
			response.end();

        		console.log('--------------------[ /endpoint Response '+currentCount+ ' ]---------------');
		};

		//console.log("Posting Data:"+data);
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
			, headers: newHeaders
			, jar:true
			, body:data
		};
		request.post(options, callback).pipe(fs.createWriteStream(serviceName+'/Response'+requestCount+'.txt'),{end:false});
	});

        console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');

});

//---------------[ Start the Server ]---------------//
var server = http.createServer(proxyApp).listen(proxyApp.get('port'), function(){
  console.log('Proxy server listening on port ' + proxyApp.get('port'));
});


