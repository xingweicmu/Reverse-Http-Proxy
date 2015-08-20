exports.getHandler = function getHandler(webRequest, response, next) {

	// Set up dependency
	var bodyParser = require("body-parser");
	var fs = require('fs');
	var http = require('http');
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
	console.log('GET Request:'+webRequest.url);
	console.log('GET Headers:'+JSON.stringify(headers));

	// Create new headers based on webReqeust.headers by removing browser-based info
	var newHeaders = {};
	var referer = null;
	for(var key in webRequest.headers) {
		var value = webRequest.headers[key];
		if(key != 'content-length' && key!='host' /*&& key!='referer'*/){
			newHeaders[key]=value;
		}
	}
	// newHeaders['host']='localhost:9997';
	// newHeaders['referer']=(referer||'').replace('localhost:9996', '10.33.121.243:9443/vsphere-client');
	console.log('-> Send Headers:'+JSON.stringify(newHeaders));

	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	// Prepare file path by replacing the '/' with '!'
	var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
	console.log('@@@'+filePath);
	// Handle text-based content
	if(!endsWith(webRequest.url, 'png') && !endsWith(webRequest.url, 'jpg') 
		&& !endsWith(webRequest.url, 'ttf') && !endsWith(webRequest.url, 'woff')){
		
		// Prepare redirecting request options
		var options = {
			uri:'http://localhost:8080' + webRequest.url, 
			// headers: newHeaders, 
			jar:true, 
		};

  		request(options, function (error, resp, body) {
    		if (!error) {
        		console.log(webRequest.url);

	        		// Add the count by one after receiving the response
		        	requestCount++;

		        	// rqst - the request sent to the proxy
					var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers};

					// 1. Normalize the request
					var normalized = {'path':webRequest.path, 'method':'get'};
					// var cookie = webRequest.headers['cookie'];
					// var normalized = {'path':webRequest.path, 'method':'get', 'cookie':cookie};

					// 2. Do Hash
					var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
					
					// 3. Create foldername in the format of num-hash-path
					var foldername = requestCount + '_' + hash + '_' + filePath;
					// console.log('FILE_NAME: '+foldername);
				
				if (typeof String.prototype.startsWith != 'function') {
  					String.prototype.startsWith = function (str){
    					return this.slice(0, str.length) == str;
  					};
				}
        		// console.log(resp.body);
        		if (webRequest.path.startsWith(filter)) {
					// 4. Create folder
					fs.mkdir(serviceName+'/'+foldername,function(){
						
						// 5. Write to the file
						fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(rqst), function(err) {
							if (err) return console.log('ERR!!!'+err);
						});
				        fs.writeFile(serviceName+'/'+foldername+'/Response', body, function(err) {
							if (err) return console.log('ERR!!!'+err);
						});
						fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(resp.headers), function(err) {
							if (err) return console.log('ERR!!!'+err);
						});

						// 6. Send back the response from the server
			        	response.write(resp.body);
						response.end();
					});
				}
				else{
					requestCount--;
					response.write(resp.body);
					response.end();
				}
			}
    		else {
    			console.log("ERROR in sending/receving the request " + webRequest.path);
    		}
		});
	}
	// Handle with images or font, which requires to be encoded in binary
	else{	
		options = {
			host: hostName
			, port: portNumber
			, path: webRequest.url
			, jar:true
		}

		var request = http.get(options, function(res){
			
			var imagedata = '';
			res.setEncoding('binary');

			res.on('data', function(chunk){
			    imagedata += chunk;
			})

			res.on('end', function(){
				
				requestCount++;
				var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers};
				
				// 1. Normalize the request
				var normalized = {'path':webRequest.path, 'method':'get'};
				// var cookie = webRequest.headers['cookie'];
				// var normalized = {'path':webRequest.path, 'method':'get', 'cookie':cookie};
				
				// 2. Do Hash
				var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
				
				// 3. Create foldername in the format of num-hash-path
				var foldername = requestCount + '_' + hash + '_' + filePath;
				
				if (typeof String.prototype.startsWith != 'function') {
  					String.prototype.startsWith = function (str){
    					return this.slice(0, str.length) == str;
  					};
				}
				if (webRequest.path.startsWith(filter)) {
					// 4. Create folder
					fs.mkdir(serviceName+'/'+foldername,function(){
						
						// 5. Write the request to file 
						fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(rqst), function(err) {
							if (err) return console.log('ERR!!!'+err);
						});

						fs.writeFile(serviceName+'/'+foldername+'/Response', imagedata, 'binary', function(err){
		            		if (err) return console.log('ERR!!!'+err);
		            		console.log('File saved.')
		        		})

						fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(res.headers), 'binary', function(err){
							if (err) throw err
						})

						// 6. Send back the data
						response.end(imagedata, 'binary');
					});
				}else{
					requestCount--;
					// 6. Send back the data
					response.end(imagedata, 'binary');
				}
			})

  		})
	}
	console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');

}