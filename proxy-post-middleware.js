exports.postHandler = function postHandler(webRequest, response, next) {

	// Set up dependencies
	var bodyParser = require("body-parser");
	var fs = require('fs');
	var https = require('https');
	var HashMap = require('hashmap');


	// Get parameters from the server
	var filter = shared_filter;
	var serviceName = shared_directory;
	var hostName = shared_hostName;
	var portNumber = shared_portNumber;

	var hashMap = new HashMap();
	var data = '';
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var queryBody = webRequest.body;
	
	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('POST Request:'+webRequest.url);
	console.log('POST Headers:'+JSON.stringify(headers));
	console.log('POST Body:'+JSON.stringify(queryBody));

	if(webRequest.headers['content-type'] == 'application/json;charset=utf-8' 
		|| webRequest.url == '/vsphere-client/vcc-ui/rest/hm/api/session'){	// Trade-off for vsphere
		var body = JSON.stringify(webRequest.body);
		console.log('POST Body(urlencoded):' + body);
		var options = {
			host: hostName
			, port: portNumber
			, path: webRequest.url
			, method: 'POST'
			, headers: webRequest.headers
			// , headers: newHeaders
			, jar:true
		};
		console.log('-> OPTIONS: '+JSON.stringify(options));
		var post_req = https.request(options, function(res){
			response.writeHead(res.statusCode,res.headers);
				
			var data = [];
			res.on('data', function(chunk) {
				data.push(chunk);
				// response.write(chunk, 'binary');
			}).on('end', function() {
				//at this point data is an array of Buffers
				//so Buffer.concat() can make us a new Buffer
				//of all of them together
				var buffer = Buffer.concat(data);
				// console.log(buffer.toString('base64'));
				requestCount++;
				var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
				var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':body};
				// 1. Normalize the request
				// var normalized = {'path':webRequest.path, 'method':'post'};
				var normalized = {'path':webRequest.path, 'method':'post', 'body':JSON.stringify(webRequest.body)};
				// 2. Do Hash
				var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
				// 3. Create foldername in the format of num-hash-path
				var foldername = requestCount + '_' + hash + '_' + filePath;
				console.log(foldername);
				// 4. Create folder
				// Double check 
				if (typeof String.prototype.startsWith != 'function') {
  					String.prototype.startsWith = function (str){
    					return this.slice(0, str.length) == str;
  					};
				}
				// filter = filter.replace(new RegExp('/', 'g'), '!');
				// if( foldername.indexOf(filter) != -1){	
				if (webRequest.path.startsWith(filter)) {
					fs.mkdir(serviceName+'/'+foldername,function(){
						// 5. Write file
						fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(rqst), function(err) {
							if (err) throw err;
						});
						fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(res.headers), function (err) {
							if (err) throw err;
						});
						fs.writeFile(serviceName+'/'+foldername+'/Response', buffer, function (err) {
							if (err) throw err;
						});
						// 6. Send back the response
						// response.writeHead(cbresponse.statusCode,rtnHeaders);
						console.log('-> Response Headers: '+JSON.stringify(res.headers));
						// response.writeHead(res.statusCode,res.headers);
						response.end(buffer, 'binary');
					});
				}
				else{
					requestCount--;
					console.log('-> Response Headers: '+JSON.stringify(res.headers));
					// response.writeHead(res.statusCode,res.headers);
					response.end(buffer, 'binary');
				}
			});
		});
			
		// Send the post request with body
		post_req.write(body);
		post_req.end();
	}

	///////////////////
	// Special handling for urlencoded
	//////////////////
	else if(webRequest.headers['content-type'] == 'application/x-www-form-urlencoded') {
		var urlcodeJson = require('urlcode-json');
		var json = webRequest.body;
		var test = urlcodeJson.encode(json, true);
		var body = test.replace(/_/g,'%5F');

		console.log('POST Body(urlencoded):' + body);
		var options = {
			host: hostName
			, port: portNumber
			, path: webRequest.url
			, method: 'POST'
			, headers: webRequest.headers
			// , headers: newHeaders
			, jar:true
		};
		console.log('-> OPTIONS: '+JSON.stringify(options));
		var post_req = https.request(options, function(res){
			response.writeHead(res.statusCode,res.headers);
				
			var data = [];
			res.on('data', function(chunk) {
				data.push(chunk);
				// response.write(chunk, 'binary');
			}).on('end', function() {
				//at this point data is an array of Buffers
				//so Buffer.concat() can make us a new Buffer
				//of all of them together
				var buffer = Buffer.concat(data);
				// console.log(buffer.toString('base64'));
				// requestCount++;
				var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
				var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':body};
				// 1. Normalize the request
				var normalized = {'path':webRequest.path, 'method':'post'};
				// 2. Do Hash
				var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
				// 3. Create foldername in the format of num-hash-path
				var foldername = requestCount + '_' + hash + '_' + filePath;
				console.log(foldername);

				// 4. Send back the response without saving
				// response.writeHead(cbresponse.statusCode,rtnHeaders);
				console.log('-> Response Headers: '+JSON.stringify(res.headers));
				// response.writeHead(res.statusCode,res.headers);
				response.end(buffer, 'binary');
			});
		});
			
		// Send the post request with body
		console.log('sent body:'+body);
		post_req.write(body);
		post_req.end();
	}
	/////////////////////////////////
	// Handle other binary files like swf or amf
	/////////////////////////////////
	else{

		var testData='';
		webRequest.setEncoding('binary');
		webRequest.on('data', function(chunk) { 
			testData += chunk;
			// console.log('chunk: '+chunk);
		});

		webRequest.on('end', function() {
			// console.log(testData);
			data = testData;
			console.log('POST body(binary):'+testData);

			var currentCount = requestCount;

			// Prepare new headers based on webRequest.headers
			var newHeaders = {};
			var referer = null;
			for(var key in webRequest.headers) {
				var value = webRequest.headers[key];
				if(key!='host' && key != 'referer'){
					newHeaders[key]=value;
				}
			}
			// newHeaders["cookie"]="JSESSIONID=8B6A665F9FCEB81A5ECE2B6A4AA01A81; JSESSIONID=F82C0E958C498BEE68492CA2B97051BA";
			// newHeaders['host']='10.33.121.243:9443';
			// newHeaders['referer']='https://10.33.121.243:9443/vsphere-client/UI.swf/[[DYNAMIC]]/6';
			// newHeaders['referer']=(referer||'').replace('localhost:9996', '10.33.121.243:9443/vsphere-client');
			console.log('-> New Headers:'+JSON.stringify(newHeaders));

			///////////////////////////////////////////////////////////////
			// The other way to redirect the request: using 'https' library
			//////////////////////////////////////////////////////////////
			var options = {
		
				host: hostName
				, port: portNumber
				, path: webRequest.url
				, method: 'POST'
				// , headers: newHeaders
				, headers: webRequest.headers
				, jar:true
				// , body:data
			};
		
			console.log('-> OPTIONS: '+JSON.stringify(options));
			var post_req = https.request(options, function(res){
						
				var data = [];
				res.on('data', function(chunk) {
				data.push(chunk);
				// response.write(chunk, 'binary');
				}).on('end', function() {
					//at this point data is an array of Buffers
					//so Buffer.concat() can make us a new Buffer
					//of all of them together
					var buffer = Buffer.concat(data);
					// console.log('BUFFER: '+buffer.toString('utf8'));

					/////////////////////////
					//Trt to parse amf and save them uniquely
					/////////////////////////
					var index0 = buffer.toString('utf8').indexOf('/');
					var index = buffer.toString('utf8').indexOf('onResult');
					console.log('Index: '+ index);
					// var num = buffer.toString('utf8').charAt(index - 2);
					var num = buffer.toString('utf8').substring(index0+1, index - 1);
					console.log('Char At: '+ num);

					var key = webRequest.url+'_'+num;
					if(hashMap.has(key)){
						var ocu = hashMap.get(key)+1;
						hashMap.set(key, ocu);
					}else{
						hashMap.set(key, 1);
					}
					///////////////////////////

					// requestCount++;
					var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
					var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':testData};
					// 1. Normalize the request
					// var normalized = {'path':webRequest.path, 'method':'post', 'body':testData};
					var normalized = {'path':webRequest.path, 'method':'post'};
					// 2. Do Hash
					var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
					// 3. Create foldername in the format of num-hash-path
					var foldername = requestCount + '_' + hash + '_' + filePath;
					console.log(foldername);

					//////////////////
					function endsWith(str, suffix) {
						return str.indexOf(suffix, str.length - suffix.length) !== -1;
					}
					if (endsWith(foldername, 'amfsecure')){
						foldername = foldername + '_'+num+'_'+hashMap.get(webRequest.url+'_'+num);
					}

					// 6. Send back the response without saving
					// response.writeHead(cbresponse.statusCode,rtnHeaders);
					console.log('-> Response Headers: '+JSON.stringify(res.headers));
					response.writeHead(res.statusCode,res.headers);
					response.end(buffer, 'binary');
				});
			});
			
			// Send the post request with body
			post_req.write(testData,'binary');
			post_req.end();

			console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');
		});
	}
}