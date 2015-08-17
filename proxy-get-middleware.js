exports.getHandler = function getHandler(webRequest, response, next) {

	///////////////////////
	// var requestCount = require('./Hash_Proxy.js').requestCount;
	console.log(requestCount);
	// var hostName
	///////////////////////

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

	var currentCount = requestCount;
	console.log('###'+currentCount);

	// Create new headers based on webReqeust.headers by removing browser-based info
	var newHeaders = {};
	var referer = null;
	for(var key in webRequest.headers) {
		var value = webRequest.headers[key];
		if(key != 'content-length' && key!='host' /*&& key!='referer'*/){
			newHeaders[key]=value;
		}
	}
	// newHeaders["cookie"]="JSESSIONID=8B6A665F9FCEB81A5ECE2B6A4AA01A81; JSESSIONID=F82C0E958C498BEE68492CA2B97051BA";
	// newHeaders['host']='10.33.121.243:9443';
	// newHeaders['referer']=(referer||'').replace('localhost:9996', '10.33.121.243:9443/vsphere-client');
	console.log('-> Send Headers:'+JSON.stringify(newHeaders));

	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	// Prepare file path by replacing the '/' with '!'
	var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
	console.log('@@@'+filePath);

		var options = {
			host: hostName
			, port: portNumber
			// , path: '/vsphere-client'+webRequest.url
			, path: webRequest.url
			// , headers: newHeaders
			, headers: webRequest.headers
			, jar:true
		}

		var request = https.get(options, function(res){
			var imagedata = '';
			res.setEncoding('binary');

			res.on('data', function(chunk){
			    imagedata += chunk;
			})

			res.on('end', function(){

					requestCount++;
					var rqst = {'path':webRequest.path, 'method':'get', 'headers':newHeaders};
					
					// 1. Normalize the request
					var normalized = {'path':webRequest.path, 'method':'get'};
					// var cookie = webRequest.headers['cookie'];
					// var normalized = {'path':webRequest.path, 'method':'get', 'cookie':cookie};
					
					// 2. Do Hash
					var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
					
					// 3. Create foldername in the format of num-hash-path
					var foldername = requestCount + '_' + hash + '_' + filePath;
					console.log('Count'+requestCount+':'+foldername);

					//---------------[ Helpers function ]---------------//
					function endsWith(str, suffix) {
						return str.indexOf(suffix, str.length - suffix.length) != -1;
					}

					// Filter /vcc-ui/
					console.log('FILTER:'+filter);
					filter = filter.replace(new RegExp('/', 'g'), '!');
					console.log('FILTER:'+filter);
					if(!endsWith(foldername,'swf') && foldername.indexOf(filter) != -1){	
						// requestCount++;
						// 4. Create folder
						fs.mkdir(serviceName+'/'+foldername,function(){
							// requestCount++;
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
							response.writeHead(res.statusCode,res.headers);
							response.end(imagedata, 'binary');
						});
						
					}
					else {
						requestCount--;
						response.writeHead(res.statusCode,res.headers);
						response.end(imagedata, 'binary');
					}

			// });

			})
		})
}