exports.putHandler = function putHandler(webRequest, response, next) {

	// Set up dependency
	var bodyParser = require("body-parser");
	var fs = require('fs');
	var https = require('https');
	var request = require('request');
	var jar = request.jar();

	// Get parameters from the server
	var filter = shared_filter;
	var serviceName = shared_directory;
	var hostName = shared_hostName;
	var portNumber = shared_portNumber;

	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var data = '';

	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('PUT Request:'+webRequest.url);
	console.log('PUT Headers:'+JSON.stringify(headers));
	console.log('PUT Body:'+JSON.stringify(webRequest.body));

	data = JSON.stringify(webRequest.body);
	var currentCount = requestCount;

	function callback(error, cbresponse, body) {
    	console.log('--------------------[ endpoint Response '+currentCount+ ' ]---------------');
		var cbheaders = cbresponse.headers;
		console.log('Headers from endpoint:'+JSON.stringify(cbheaders));
		
		var rtnHeaders = {};
		for(var key in cbheaders) {
    		var value = cbheaders[key];
			if(key!='content-length'&&key!='host' && key != 'location'){
				rtnHeaders[key]=value;
			}
		}

		// IMPORTANT: the 'location' should be the host name running the proxy
		console.log('http://'+hostName+':'+listenPort+'/');
		rtnHeaders['location']='http://localhost:'+listenPort+'/';

		requestCount++;

		var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
		var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':data};

		// 1. Normalize the request
		var normalized = {'path':webRequest.path, 'method':'post', 'body':data};
		// 2. Do Hash
		var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
		// 3. Create foldername in the format of num-hash-path
		var foldername = requestCount + '_' + hash + '_' + filePath;
		console.log(foldername);

		if (typeof String.prototype.startsWith != 'function') {
  			String.prototype.startsWith = function (str){
 				return this.slice(0, str.length) == str;
			};
		}
		if (webRequest.path.startsWith(filter)) {
			// 4. Create folder
			fs.mkdir(serviceName+'/'+foldername,function(){
				// 5. Write file
				fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(rqst), function(err) {
					if (err) throw err;
				});

				fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(rtnHeaders), function (err) {
		  			if (err) throw err;
				});

				fs.writeFile(serviceName+'/'+foldername+'/Response', body, function (err) {
		  			if (err) throw err;
				});

				console.log('Response Code:'+cbresponse.statusCode); // + '   Body:'+body);

				// 6. Send back the response
				response.writeHead(cbresponse.statusCode,rtnHeaders);
				response.write(body);
				response.end();
			});
		}
		else{
			requestCount--;
						// 6. Send back the response
			response.writeHead(cbresponse.statusCode,rtnHeaders);
			response.write(body);
			response.end();
		}
        console.log('--------------------[ /endpoint Response '+currentCount+ ' ]---------------');
	};

	// Prepare new headers based on webRequest.headers
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

	// Redirect the POST request
	request.put(options, callback);
    console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');
}