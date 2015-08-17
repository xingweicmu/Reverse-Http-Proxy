exports.getHandler = function getHandler(webRequest, response, next) {

	// Set up dependencies
	var bodyParser = require("body-parser");
	var http = require('http');
	var https = require('https');
	var fs = require('fs');
	var HashMap = require('hashmap');

	// Retrieve shared variables from the server
	var serviceName = shared_directory;
	var map = shared_map;

	var firstRequest = '';
	// var requestCount = 1;
	var headers = webRequest.headers;

	// First parse the request and create its corresponding filepath
	var url = webRequest.url;
	var filename = url.replace(new RegExp('/', 'g'), '!');
	var normalized = {'path':webRequest.path, 'method':'get'};
	// var cookie = webRequest.headers['cookie'];
	// var normalized = {'path':webRequest.path, 'method':'get', 'cookie':cookie};
	var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
	var hash_path = hash + '_' + filename;
	var filePath = serviceName + '/'+map.get(hash_path)+'/Request';

	// Basiclly, it handles three possible exceptions in handling GET request:
	// 1. No Request file found. (request url is different)
	// 2. No Match File Found with the same headers. (request url is the same, but headers are different)
	// 3. No Response file found. (response file with the url is missing)
	fs.readFile(filePath, 'utf-8', function(err,data) {
		if (err) {
			console.log(err);
			response.write('No Request file found: '+err.path);
			response.end();
		}
		else {
			console.log('Read: ' + filePath);
			firstRequest = JSON.parse(data);
			
			// The count does not take effect in this version
			requestCount++;		

			//-------------[ See if the Request Headers match first request ]------------//
			var headerMatch = true;
			var keys = Object.keys(headers);
			for(var i = 0; i < keys.length; i++){
				var key = keys[i];
				if(key != 'host' && key != 'user-agent' && key != 'accept-language' && key != 'cookie' 
					&& key != 'referer' && key != 'accept' && key != 'accept-encoding' && key != 'cache-control'){
					headerMatch = (webRequest.headers[key] == firstRequest.headers[key]);
					if(!headerMatch){
						console.log('****'+key);
						headerMatch = false;
						break;
					}
				}
			}

			console.log('--------------------[ simulation GET Request '+ requestCount + ' ]---------------');
			console.log('GET Request:'+url);
			console.log('GET Headers:'+JSON.stringify(webRequest.headers));

			// Check the request path, method type, headers to the firstRequest attributes.
			// If a match is made, return the response for the request.
			console.log(url +' VS '+firstRequest.path);
			console.log('Does headers match: '+headerMatch);
			if (headerMatch) {
				// No use for this version
				console.log("RESETING COUNTER\n\n"); 
				// requestCount = 1;
			
				var responseFilePath = filePath.replace('Request', 'Response');
				console.log('Reading the response from: '+responseFilePath);
				function endsWith(str, suffix) {
					return str.indexOf(suffix, str.length - suffix.length) !== -1;
				}
				// Handle with the text-based content
				if(!endsWith(webRequest.url, 'png') && !endsWith(webRequest.url, 'jpg') 
					&& !endsWith(webRequest.url, 'ttf') && !endsWith(webRequest.url, 'woff')
					&& !endsWith(webRequest.url, 'gif') && !endsWith(webRequest.url, 'swf')){

					fs.readFile(responseFilePath, 'utf8', function (err,data) {
						if (err) {
							console.log(err);
							response.write('No Response file found: '+err.path);
							response.end();
						}
						else{
							// console.log(data);
							response.write(data);
							response.end();
						}
					});
				}
				// Handle with image or font content, it should be encoded in binary
				else{
					// May need to handle exceptions here for reading images
					var img = fs.readFileSync(responseFilePath);
					response.end(img, 'binary');
				}

			}else{
				console.log('No Match File Found');
				console.log('URLMatch: '+ (url == firstRequest.path));
				console.log('URL:'+ url + '/' + firstRequest.path);
				console.log('headerMatch: '+ headerMatch);
				response.write('No Match File Found with the same headers');
				response.end();
			}

			console.log('--------------------[ /simulation GET Request '+requestCount+' ]---------------');

			}
		});
}