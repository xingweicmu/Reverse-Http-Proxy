var proxiedHost = 'http://127.0.0.1'
var serviceName = 'Inventory';
var requestCount=0;
var responseCount=0;
var listenPort=9999;
var postCount=0;

process.argv.forEach(function (val, index, array) {
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
var https = require('https');
var HashMap = require('hashmap');

//---------------[ Create the Folder ]---------------//
fs.mkdir(serviceName,function(){});

//---------------[ Create the Application ]---------------//
var hashMap = new HashMap();
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
proxyApp.use(bodyParser.urlencoded({ extended: true }));

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
					response.writeHead(res.statusCode,res.headers);
					response.end(imagedata, 'binary');
				});

			})
		})

});

proxyApp.post('/*', function(webRequest, response) {

	///////////////////////
	// Before doing everything, let's try to save the request in a HashMap
	// var key = webRequest.url;
	// if(hashMap.has(key)){
	// 	var ocu = hashMap.get(key)+1;
	// 	hashMap.set(key, ocu);
	// }else{
	// 	hashMap.set(key, 1);
	// }
	///////////////////////

	var request = require('request');
	var jar = request.jar();
	var headers = webRequest.headers;
	var currentRequestNum = requestCount;
	var data = '';
	var queryBody = webRequest.body;
	
	console.log('--------------------[ simulation Request '+currentRequestNum+ ' ]---------------');
	console.log('POST Request:'+webRequest.url);
	console.log('POST Headers:'+JSON.stringify(headers));
	
	///////////////////
	// Special handling for urlencoded
	//////////////////
	if(JSON.stringify(webRequest.body).length > 2){

		var urlcodeJson = require('urlcode-json');
		var json = webRequest.body;
		var test = urlcodeJson.encode(json, true);
		var body = test.replace(/_/g,'%5F');
		console.log('POST Body:' + body);
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
				console.log(buffer.toString('base64'));
				requestCount++;
				var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
				var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':body};
				// 1. Normalize the request
				var normalized = {'path':webRequest.path, 'method':'post'};
				// 2. Do Hash
				var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
				// 3. Create foldername in the format of num-hash-path
				var foldername = requestCount + '_' + hash + '_' + filePath;
				console.log(foldername);
				// 4. Create folder
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
			});
		});
			
		// Send the post request with body
		post_req.write(body);
		post_req.end();

	}
	/////////////////////////////////
	// One way to read the body from the request: aggregate the chunk
	/////////////////////////////////
	var testData='';
	webRequest.setEncoding('binary');
	webRequest.on('data', function(chunk) { 
		testData += chunk;
		console.log('chunk: '+chunk);
	});

	webRequest.on('end', function() {
		console.log(testData);
		data = testData;
		console.log('POST body:'+testData);

		/////////////////////////////////
		////////////////////////////////
		// Right after we receive the body of the request, we put them into the hashmap
		// var bodyString = testData.toString('utf8');
		// console.log(bodyString);
		// var index0 = testData.toString('utf8').indexOf('/');
		// var index1 = index0+1;
		// for(var i = index0+1; i<bodyString.length; i++){
		// 	console.log('Char At: '+ bodyString.charAt(i));
		// 	if(bodyString.charAt(i) <= '9' && bodyString.charAt(i) >= '0'){
		// 		index1 = i;
		// 	}else{
		// 		break;
		// 	}
		// }
		// var num = bodyString.substring(index0+1, index1+1);
		// console.log('Sequence: '+ num);

		// var key = webRequest.url+'_'+num;
		// if(hashMap.has(key)){
		// 	var ocu = hashMap.get(key)+1;
		// 	hashMap.set(key, ocu);
		// }else{
		// 	hashMap.set(key, 1);
		// }
		///////////////////////////

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
				console.log('BUFFER: '+buffer.toString('utf8'));

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

				requestCount++;
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
				/////////////////

				// 4. Create folder
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
					// console.log('Response Code:'+cbresponse.statusCode); // + '   Body:'+body);
					// 6. Send back the response
					// response.writeHead(cbresponse.statusCode,rtnHeaders);
					console.log('-> Response Headers: '+JSON.stringify(res.headers));
					response.writeHead(res.statusCode,res.headers);
					response.end(buffer, 'binary');
				});
			});
		});
		
		// Send the post request with body
		post_req.write(testData,'binary');
		post_req.end();

		console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');
	});

});

//---------------[ Start the Server ]---------------//

var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var httpServer = http.createServer(proxyApp);
var httpsServer = https.createServer(credentials, proxyApp);

httpServer.listen(9997);
httpsServer.listen(9996);


