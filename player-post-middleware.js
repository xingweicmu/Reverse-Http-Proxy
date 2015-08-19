exports.postHandler = function postHandler(webRequest, response, next) {

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
	var hashMap = new HashMap();
	var headers = webRequest.headers;

	// Handle text content: html, css, js
	if(webRequest.headers['content-type'] == 'application/json;charset=utf-8'){
		// First parse the request and create its corresponding filepath
		var url = webRequest.url;
		var filename = url.replace(new RegExp('/', 'g'), '!');
		// var normalized = {'path':webRequest.path, 'method':'post'};
		var normalized = {'path':webRequest.path, 'method':'post', 'body':JSON.stringify(webRequest.body)};
		console.log('NORMALIZED:'+JSON.stringify(normalized));
		var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
		var hash_path = hash + '_' + filename;
		console.log('HASH_PATH:'+hash_path);
		var filePath = serviceName + '/'+map.get(hash_path)+'/Request'
		var responseFilePath = filePath.replace('Request','Response');
		console.log('ResponseFilePath:'+responseFilePath);

		fs.readFile(filePath, 'utf-8', function(err,data) {
  		if (err) {
    		console.log(err);
    		response.write('No Request file found: '+err.path);
    		response.end();
  		}
  		else {

	  		firstRequest = JSON.parse(data);

			// Add the request count
			requestCount++;

			//-------------[ See if the Request Headers match first request ]------------//
			var headerMatch = true;
			var keys = Object.keys(webRequest.headers);
			for(var i=0;i<keys.length;i++){
				var key = keys[i];
				if(key!="host" && key!="user-agent" && key != 'accept-language' 
					&& key != 'cookie' && key != 'accept' && key != 'content-length' 
					&& key != 'accept-encoding'){
					headerMatch = (webRequest.headers[key]==firstRequest.headers[key]);
					if(!headerMatch){
						console.log('Different Key: ' + key);
						console.log('See detail: ' + webRequest.headers[key] + " VS " + firstRequest.headers[key]);
						headerMatch = false;
						break;
					}
				}
			}
			console.log('Do Headers Match:'+headerMatch);

		    var hdrs = {'headers':headers};
		    var data = '';
		    console.log('--------------------[ simulation POST Request '+requestCount+ ' ]---------------');
			console.log('POST Request:'+url);
			console.log('POST Headers:'+JSON.stringify(webRequest.headers));
			console.log('POST Body:'+JSON.stringify(webRequest.body));

		    data = JSON.stringify(webRequest.body);
			console.log('POST Body:\n'+data+'\nAGAINST:\n'+firstRequest.body);
			var dataMatch = false;

			//----------[ Check body if headers match ]-----------//
			if(headerMatch){
				dataMatch = (data==firstRequest.body);
				console.log('Does Body Match:'+dataMatch);
			}

			// Check the request path, method type, headers and body to the firstRequest attributes.
		    // If a match is made, return the response for the request.
		    if (headerMatch && dataMatch) {
		    //////////////////////////////////////////////////////////
		    	// The counter is no use for this version
		        console.log("RESETING COUNTER\n\n"); 
		        // requestCount = 1;
		    
		        // If there is a match, read the file and send the response back
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

			}else{
				console.log('No Match File Found');
				console.log('URLMatch: '+ (url == firstRequest.path));
				console.log(url);
				console.log(firstRequest.path);
				console.log('headerMatch: '+ headerMatch);
				console.log('dataMatch:' + dataMatch);
				response.write('No Match File Found with the same headers and body');
				response.end();
			}

		    console.log('--------------------[ /simulation POST Request '+requestCount+' ]---------------');
		}
		});
	}
	// Handle with binary files: swf, amf
	// Though not too useful in this version
	else {
		var testData='';
		webRequest.setEncoding('binary');
		webRequest.on('data', function(chunk) { 
			testData += chunk;
		});

		webRequest.on('end', function() {
			console.log(testData);
			data = testData;
			console.log('POST body:'+testData);

			/////////////////////////
			// Special handling for recording duplicated amf file
			////////////////////////

			var bodyString = testData.toString('utf8');
			console.log(bodyString);
			var index0 = bodyString.indexOf('/');
			var index1 = index0+1;
			for(var i = index0+1; i<bodyString.length; i++){
				console.log('Char At: '+ bodyString.charAt(i));
				if(bodyString.charAt(i) <= '9' && bodyString.charAt(i) >= '0'){
					index1 = i;
				}else{
					break;
				}
			}
			var num = bodyString.substring(index0+1, index1+1);
			console.log('Sequence: '+ num);

			var key = webRequest.url+'_'+num;
			if(hashMap.has(key)){
				var ocu = hashMap.get(key)+1;
				hashMap.set(key, ocu);
			}else{
				hashMap.set(key, 1);
			}
			///////////////////////////
			
			// First parse the request and create its corresponding filepath
			var url = webRequest.url;
			var filename = url.replace(new RegExp('/', 'g'), '!');
			// var normalized = {'path':webRequest.path, 'method':'post', 'body':testData};
			var normalized = {'path':webRequest.path, 'method':'post'};
			console.log('NORMALIZED:'+JSON.stringify(normalized));
			var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
			var hash_path = hash + '_' + filename;

			//////////////////////////
			function endsWith(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			}
			if(endsWith(hash_path, 'amfsecure')){
				hash_path = hash_path + '_' +num+'_'+hashMap.get(webRequest.url+'_'+num);
				// console.log("HASH_PATH: "+hash_path);
			}
			//////////////////////////


			console.log('HASH_PATH:'+hash_path);
			var filePath = serviceName + '/'+map.get(hash_path)+'/Request';
			console.log('FILE_PATH:'+filePath);

			fs.readFile(filePath, 'utf-8', function(err,data) {
				if (err) {
					console.log(err);
					response.write('No Request file found: '+err.path);
					response.end();
				}
				else {

					firstRequest = JSON.parse(data);

					// Add the request count
					requestCount++;

					//-------------[ See if the Request Headers match first request ]------------//
					var headerMatch = true;
					var keys = Object.keys(webRequest.headers);
					//console.log('Keys:'+JSON.stringify(keys));
					for(var i=0;i<keys.length;i++){
						var key = keys[i];
						if(key!="host" && key!="user-agent" && key != 'accept-language' 
							&& key != 'cookie' && key != 'accept' && key != 'content-length' 
							&& key != 'accept-encoding'){
							headerMatch = (webRequest.headers[key]==firstRequest.headers[key]);
							if(!headerMatch){
								console.log('Different Key: ' + key);
								console.log('See detail: ' + webRequest.headers[key] + " VS " + firstRequest.headers[key]);
								headerMatch = false;
								break;
							}
						}
					}
					console.log('Do Headers Match:'+headerMatch);

					var hdrs = {'headers':headers};
					var data = '';
					console.log('--------------------[ simulation POST Request '+requestCount+ ' ]---------------');
					console.log('POST Request:'+url);
					console.log('POST Headers:'+JSON.stringify(webRequest.headers));
					console.log('POST Body:'+JSON.stringify(webRequest.body));

					data = JSON.stringify(webRequest.body);
					console.log('POST Body:\n'+data+'\nAGAINST:\n'+firstRequest.body);
					var dataMatch = false;

					//----------[ Check body if headers match ]-----------//
					if(headerMatch){
						dataMatch = (data==firstRequest.body);
						console.log('Does Body Match:'+dataMatch);
					}

					// Check the request path, method type, headers and body to the firstRequest attributes.
					// If a match is made, return the response for the request.
					// if (url == firstRequest.path && headerMatch && dataMatch) {
					if (url == firstRequest.path && headerMatch) {
					//////////////////////////////////////////////////////////
					// if (headerMatch && dataMatch) {
						// The counter is no use for this version
						console.log("RESETING COUNTER\n"); 
						// requestCount = 1;

						// May need to handle exceptions here for reading images
						console.log('Read from: '+filePath.replace('Request', 'Response'));
						var img = fs.readFileSync(filePath.replace('Request', 'Response'));
						response.writeHead(200, {'Content-Type': 'application/x-amf' })
						response.end(img, 'binary');
						console.log('DONE');
					}else{
						console.log('No Match File Found');
						console.log('URLMatch: '+ (url == firstRequest.path));
						console.log(url);
						console.log(firstRequest.path);
						console.log('headerMatch: '+ headerMatch);
						console.log('dataMatch:' + dataMatch);
						response.write('No Match File Found with the same headers');
						response.end();
					}

					console.log('--------------------[ /simulation POST Request '+requestCount+' ]---------------');
				}
			});
		});
	}
}