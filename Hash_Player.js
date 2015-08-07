
var serviceName = 'NA';
var requestCount=1;
var listenPort=9999;
var firstRequest=null;

process.argv.forEach(function (val, index, array) {
	if(index==2){
		serviceName = val;
	}
	if(index==3){
		listenPort = val;
	}
});


console.log('Proxying for service:'+serviceName);

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

//---------------[ Setup Dependencies ]---------------//
var express = require('express');
var bodyParser = require("body-parser");
var http = require('http');
var https = require('https');
var path = require('path');
var os=require('os');
var fs = require('fs');
var HashMap = require('hashmap');


//---------------[ Create the Application ]---------------//
var playerApp = express();
playerApp.set('port', process.env.PORT || listenPort);
playerApp.set('views', path.join(__dirname, 'views'));
playerApp.set('view engine', 'ejs');
playerApp.engine('html', require('ejs').renderFile);
playerApp.use(express.logger('dev'));
playerApp.use(express.json());
playerApp.use(express.urlencoded());
playerApp.use(express.methodOverride());
playerApp.use(playerApp.router);
playerApp.use(express.static(path.join(__dirname, 'public')));
playerApp.use(express.bodyParser());
playerApp.use(bodyParser.urlencoded({ extended: false }));

var requestList = null;
var map = new HashMap();
var sortMap = new HashMap();
var hashMap = new HashMap();

//---------------[ Read from file function ]---------------//
function readFromFile(filename) {
	fs.readFile(filename, 'utf-8', function(err,data) {
		if (err) {
			return console.log(err);
		}
		console.log(JSON.parse(data));
		return JSON.parse(data);
	});
}

//---------------[ Used for Development Only ]---------------//
if ('development' == playerApp.get('env')) {
	playerApp.use(express.errorHandler());
}

//---------------[ Prepare the filepath to be read in the target folder ]---------------//
fs.readdir(serviceName, function(err, list) {
	if (err) return console.log(err);
	requestList = list;
	
	// First sort the requestList, put them in sortMap
	for (var i = 0; i < requestList.length; i++) {
		var key = requestList[i].substring(0, requestList[i].indexOf('_'));
		var value = requestList[i];
		sortMap.set(key, value);
		// console.log(key + ' ' + value);
	}

	console.log('\n---------------[ Requests/Responses Saved locally ]---------------');
	
	// Second Put the filenames to the hashmap in sequence
	for (var i = 0; i < requestList.length; i++) {
		// console.log(sortMap.count());
		var index = (i+1) + '';
		// console.log(index);
		var key = sortMap.get(index).substring(sortMap.get(index).indexOf('_')+1);
		var value = sortMap.get(index);
		map.set(key, value);
		console.log(value);
	}
});

//---------------[ Setup the Routes ]---------------//
playerApp.get('/*', function(webRequest, response) {

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
					&& key != 'referer' && key != 'accept' && key != 'accept-encoding'){
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
				requestCount = 1;
			
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
							console.log(data);
							response.write(data);
							response.end();
						}
					});
				}
				// Handle with image or font content, it should be encoded in binary
				else{
					// May need to handle exceptions here for reading images
					var img = fs.readFileSync(responseFilePath);
					// res.writeHead(200, {'Content-Type': 'image/gif' });
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
});

playerApp.post('/*', function(webRequest, response) {
	var headers = webRequest.headers;



	//////////////////////////////////
	if(JSON.stringify(webRequest.body).length > 2){
		console.log("LOGIN");
		function endsWith(str, suffix) {
			return str.indexOf(suffix, str.length - suffix.length) !== -1;
		}
		if(endsWith(webRequest.url,'j_spring_security_check')){

			// First parse the request and create its corresponding filepath
			var url = webRequest.url;
			var filename = url.replace(new RegExp('/', 'g'), '!');
			// var normalized = {'path':webRequest.path, 'method':'post', 'body':testData};
			var normalized = {'path':webRequest.path, 'method':'post'};
			console.log('NORMALIZED:'+JSON.stringify(normalized));
			var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
			var hash_path = hash + '_' + filename;
			console.log('HASH_PATH:'+hash_path);
			var filePath = serviceName + '/'+map.get(hash_path)+'/Request'
			var responseFilePath = filePath.replace('Request','Response');
			console.log('ResponseFilePath:'+responseFilePath);

			// var responseFilePath = 'test/57_b2f1698ef64f9deda720b24e715c4673_!vsphere-client!j_spring_security_check/Response';
			fs.readFile(responseFilePath, 'utf8', function (err,data) {
				if (err) {
					console.log(err);
					response.write('No Response file found: '+err.path);
					response.end();
				}
				else{
					console.log(data);
					response.write(data);
					response.end();
				}
			});
		}
	}
	else if(webRequest.headers['content-type'] == 'application/json;charset=utf-8'){
		// First parse the request and create its corresponding filepath
		var url = webRequest.url;
		var filename = url.replace(new RegExp('/', 'g'), '!');
		// var normalized = {'path':webRequest.path, 'method':'post', 'body':testData};
		var normalized = {'path':webRequest.path, 'method':'post'};
		console.log('NORMALIZED:'+JSON.stringify(normalized));
		var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
		var hash_path = hash + '_' + filename;
		console.log('HASH_PATH:'+hash_path);
		var filePath = serviceName + '/'+map.get(hash_path)+'/Request'
		var responseFilePath = filePath.replace('Request','Response');
		console.log('ResponseFilePath:'+responseFilePath);

		// var responseFilePath = 'test/57_b2f1698ef64f9deda720b24e715c4673_!vsphere-client!j_spring_security_check/Response';
		fs.readFile(responseFilePath, 'utf8', function (err,data) {
			if (err) {
				console.log(err);
				response.write('No Response file found: '+err.path);
				response.end();
			}
			else{
				console.log(data);
				response.write(data);
				response.end();
			}
		});
	}

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
		// var index = testData.toString('utf8').indexOf('/');
		// console.log('Index: '+ index);
		// var num = testData.toString('utf8').charAt(index + 1);
		// console.log('Char At: '+ num);

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

	////////////////////////////
	// if(hash_path.indexOf('amfsecure_1') > -1){
	// 	console.log('###'+filePath);
	// 	var options = {
	
	// 		host: '10.33.121.243'
	// 		, port: '9443'
	// 		, path: webRequest.url
	// 		, method: 'POST'
	// 		// , headers: newHeaders
	// 		, headers: webRequest.headers
	// 		, jar:true
	// 		// , body:data
	// 	};
	
	// 	console.log('-> OPTIONS: '+JSON.stringify(options));
	// 	var post_req = https.request(options, function(res){
					
	// 		var data = [];
	// 		res.on('data', function(chunk) {
	// 		data.push(chunk);
	// 		// response.write(chunk, 'binary');
	// 		}).on('end', function() {
	// 			//at this point data is an array of Buffers
	// 			//so Buffer.concat() can make us a new Buffer
	// 			//of all of them together
	// 			var buffer = Buffer.concat(data);
	// 			console.log('++++: '+buffer.toString('utf8'));
	// 			// response.write(buffer, 'binary');
	// 			response.end(buffer);
	// 		});
	// 	});
		
	// 	// Send the post request with body
	// 	// post_req.write(testData,'binary');
	// 	post_req.end(testData, 'binary');
	// }
	// else {
	fs.readFile(filePath, 'utf-8', function(err,data) {
		if (err) {
			console.log(err);
			response.write('No Request file found: '+err.path);
			response.end();
		}
		else {

			firstRequest = JSON.parse(data);

			// Add the request count
			// No use in this version
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
				requestCount = 1;
			
				// If there is a match, read the file and send the response back
				// fs.readFile(filePath.replace('Request', 'ResponseHeader'), 'utf8', function (err,data) {
				// 	if (err) {
				// 		console.log(err);
				// 		response.write('No Response file found: '+err.path);
				// 		response.end();
				// 	}
				// 	// Send response back to the client
				// 	else{
				// 		response.write(data);
				// 		// response.end(); 
				// 	}
				// });	
				// May need to handle exceptions here for reading images
				console.log('Read from: '+filePath.replace('Request', 'Response'));
				var img = fs.readFileSync(filePath.replace('Request', 'Response'));
				// res.writeHead(200, {'Content-Type': 'image/gif' });
				// console.log(img);
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
	// }, 1000);
	});
	}
});

//---------------[ Start the Server ]---------------//
// var server = http.createServer(playerApp).listen(playerApp.get('port'), function(){
// 	console.log('Player server listening on port ' + playerApp.get('port'));
// });

var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var httpServer = http.createServer(playerApp);
var httpsServer = https.createServer(credentials, playerApp);

httpServer.listen(9997);
httpsServer.listen(9996);


