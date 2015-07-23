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

//---------------[ Create the Folder ]---------------//
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
// proxyApp.use(express.bodyParser());
// proxyApp.use(bodyParser.raw({ type: 'application/x-amf' }));
// proxyApp.use(bodyParser.urlencoded({ extended: false }));
proxyApp.use(express.bodyParser());
proxyApp.use(bodyParser.urlencoded({ extended: true }));
// proxyApp.use(bodyParser.json());

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

// XXX
if (key=='referer') {
	console.log('>>>> REFERER: ', value);
	referer = value;
}

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


	// Handle text-based content
	if(!endsWith(webRequest.url, 'png') && !endsWith(webRequest.url, 'jpg') && !endsWith(webRequest.url, 'gif') && !endsWith(webRequest.url, 'ico')
		&& !endsWith(webRequest.url, 'swf') && !endsWith(webRequest.url, 'ttf') && !endsWith(webRequest.url, 'woff')){
		

		// Prepare redirecting request options
		// var options = {
		// 	uri:proxiedHost + webRequest.url, 
		// 	headers: newHeaders, 
		// 	jar:true, 
		// };
		var options = {
			host: hostName
			, port: '9443'
			// , path: '/vsphere-client'+webRequest.url
			, path: webRequest.url
			, headers: newHeaders
			// , headers: webRequest.headers
			, jar:true
		}
		if(webRequest.url == '/localhost:9996/config/log.xml'){
			options = {
				host: hostName
				, port: '9443'
				, path: '/vsphere-client/config/log.xml'
				, headers: newHeaders
				// , headers: webRequest.headers
				, jar:true
			}
		}
		if(webRequest.url == '/localhost:9996/config/resources.xml'){
			options = {
				host: hostName
				, port: '9443'
				, path: '/vsphere-client/config/resources.xml'
				, headers: newHeaders
				// , headers: webRequest.headers
				, jar:true
			}
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
		// request(options, function (error, resp, body) {
		// 	if (!error) {
		// 		console.log(webRequest.url);
		// 		console.log(resp.body);

		// 		// Add the count by one after receiving the response
		// 		requestCount++;

		// 		// rqst - the request sent to the proxy
		// 		var rqst = {'path':webRequest.path, 'method':'get', 'headers':webRequest.headers};

		// 		// 1. Normalize the request
		// 		var normalized = {'path':webRequest.path, 'method':'get'};
		// 		// var cookie = webRequest.headers['cookie'];
		// 		// var normalized = {'path':webRequest.path, 'method':'get', 'cookie':cookie};

		// 		// 2. Do Hash
		// 		var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
				
		// 		// 3. Create foldername in the format of num-hash-path
		// 		var foldername = requestCount + '_' + hash + '_' + filePath;
		// 		// console.log('FILE_NAME: '+foldername);
				
		// 		// 4. Create folder
		// 		fs.mkdir(serviceName+'/'+foldername,function(){
					
		// 			// 5. Write to the file
		// 			fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(rqst), function(err) {
		// 				if (err) return console.log('ERR!!!'+err);
		// 			});
		// 			fs.writeFile(serviceName+'/'+foldername+'/Response', body, function(err) {
		// 				if (err) return console.log('ERR!!!'+err);
		// 			});
		// 			fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(resp.headers), function(err) {
		// 				if (err) return console.log('ERR!!!'+err);
		// 			});

		// 			// 6. Send back the response from the server
		// 			response.writeHead(resp.statusCode,resp.headers);
		// 			response.write(resp.body);
		// 			response.end();
		// 		});
		// 	}
		// 	else {
		// 		console.log("ERROR in sending/receving the request " + webRequest.path +' '+ error);
		// 	}
		// });
	}
	// Handle with images or font, which requires to be encoded in binary
	else{	
		////////////////////////////////////////
		// options = {
		// 	host: hostName
		// 	, port: portNumber
		// 	, path: webRequest.url
		// 	, jar:true
		// }
		// Hard-coded for now
		options = {
			host: hostName
			, port: '9443'
			// , path: '/vsphere-client'+webRequest.url
			, path: webRequest.url
			, headers: newHeaders
			// , headers: webRequest.headers
			, jar:true
		}

		console.log('TTTTTT'+JSON.stringify(options));

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
console.log('<<<<< '+ JSON.stringify(webRequest.body));
console.log('<<<<< '+ encodeURIComponent(JSON.stringify(webRequest.body)));
if(JSON.stringify(webRequest.body).length > 2){
	var buf = '';
	webRequest.setEncoding('utf8');
	webRequest.on('data', function(chunk){ buf += chunk });
	webRequest.on('end', function() {
		console.log(buf);
	});
	console.log('POST Body:'+buf);
	console.log('POST Body:'+JSON.stringify(webRequest.body));
	testData = JSON.stringify(webRequest.body);
	var options = {
		// uri:proxiedHost+webRequest.url
		// uri:'https://10.33.121.243:9443'+webRequest.url
		host: '10.33.121.243'	// Hard-coded for now
		, port: '9443'
		, path: webRequest.url
		// , path: '/vsphere-client/endpoints/messagebroker/amfsecure'
		, method: 'POST'
		// , headers: newHeaders
		, headers: webRequest.headers
		// , form: testData
		, jar:true
		// , body:testData
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
	        postCount++;
	        fs.writeFile(serviceName+'/Response'+postCount, buffer, 'binary', function(err){
				if (err) return console.log('ERROR!!!'+err);
					console.log('-> File saved.')
			})
	        	
			response.write(buffer, 'binary');
	        response.end();
	    });
	});
		
	// Send the post request with body
	post_req.write(testData);
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

 /////////////////////////////////
 // The other way to read the body from the request: save the chunk to a buffer
 ////////////////////////////////
	// var reqeustBody = [];
	// webRequest.on('data', function(chunk) {
	// 	reqeustBody.push(chunk);
	// }).on('end', function() {
	// 	//at this point data is an array of Buffers
	// 	//so Buffer.concat() can make us a new Buffer
	// 	//of all of them together
	// 	var buffer = Buffer.concat(reqeustBody);
	// 	console.log(buffer.toString('base64'));
	// 	testData = buffer;
	// 	data = buffer;
    
		// data = JSON.stringify(queryBody);
		// data = queryBody;
		console.log('POST body:'+testData);

		var currentCount = requestCount;

		// Prepare new headers based on webRequest.headers
		var newHeaders = {};
		var referer = null;
		for(var key in webRequest.headers) {
			var value = webRequest.headers[key];
// XXX
if (key=='referer') {
	console.log('>>>> REFERER: ', value);
	referer = value;
}
			if(key!='host' && key != 'referer'){
				newHeaders[key]=value;
			}
		}
		// newHeaders["cookie"]="JSESSIONID=8B6A665F9FCEB81A5ECE2B6A4AA01A81; JSESSIONID=F82C0E958C498BEE68492CA2B97051BA";
		// newHeaders['host']='10.33.121.243:9443';
		// newHeaders['referer']='https://10.33.121.243:9443/vsphere-client/UI.swf/[[DYNAMIC]]/6';
		// newHeaders['referer']=(referer||'').replace('localhost:9996', '10.33.121.243:9443/vsphere-client');
		console.log('-> New Headers:'+JSON.stringify(newHeaders));

		////////////////////////////////////////////////////////////
		// One way to redirect the request: using 'request' library
		////////////////////////////////////////////////////////////

		// var options = {
		// 	// uri:proxiedHost+webRequest.url
		// 	uri:'https://10.33.121.243:9443'+webRequest.url	
		// 	// uri:'https://10.33.121.243:9443/vsphere-client/endpoints/messagebroker/amfsecure'
		// 	//, headers: {"content-type":"text/xml; charset=utf-8","soapaction":"urn:vim25/5.5","user-agent":"VMware vim-java 1.0"}
		// 	, headers: newHeaders
		// 	// , headers: webRequest.headers
		// 	, jar:true
		// 	, body:data
		// };
		
		// // Redirect the POST request
		// request.post(options, callback);

		// function callback(error, cbresponse, body) {
		// 	console.log('--------------------[ endpoint Response '+currentCount+ ' ]---------------');
		// 	var cbheaders = cbresponse.headers;
		// 	console.log('Headers from endpoint:'+JSON.stringify(cbheaders));
		// 	var rtnHeaders = {};
		// 	for(var key in cbheaders) {
		// 		var value = cbheaders[key];
		// 		if(key!='content-length' && key!='host' && key != 'location'){
		// 			rtnHeaders[key]=value;
		// 		}
		// 	}
		// 	// IMPORTANT: the 'location' should be the host name running the proxy
		// 	console.log('http://'+hostName+':'+listenPort+'/');
		// 	// rtnHeaders['location']='http://localhost:'+listenPort+'/';
		// 	requestCount++;
		// 	var filePath = webRequest.url.replace(new RegExp('/', 'g'), '!');
		// 	var rqst = {'path':webRequest.path, 'method':'post', 'headers':webRequest.headers, 'body':data};
		// 	// 1. Normalize the request
		// 	var normalized = {'path':webRequest.path, 'method':'post', 'body':data};
		// 	// 2. Do Hash
		// 	var hash = require('crypto').createHash('md5').update(JSON.stringify(normalized)).digest("hex");
		// 	// 3. Create foldername in the format of num-hash-path
		// 	var foldername = requestCount + '_' + hash + '_' + filePath;
		// 	console.log(foldername);
		// 	// 4. Create folder
		// 	fs.mkdir(serviceName+'/'+foldername,function(){
		// 		// 5. Write file
		// 		fs.writeFile(serviceName+'/'+foldername+'/Request', JSON.stringify(newHeaders), function(err) {
		// 			if (err) throw err;
		// 		});
		// 		fs.writeFile(serviceName+'/'+foldername+'/ResponseHeader', JSON.stringify(rtnHeaders), function (err) {
		// 			if (err) throw err;
		// 		});
		// 		fs.writeFile(serviceName+'/'+foldername+'/Response', body, function (err) {
		// 			if (err) throw err;
		// 		});
		// 		console.log('Response Code:'+cbresponse.statusCode); // + '   Body:'+body);
		// 		// 6. Send back the response
		// 		response.writeHead(cbresponse.statusCode,rtnHeaders);
		// 		response.end(body, 'binary');
		// 		// response.write(body);
		// 		// response.end();
		// 	});
		// 	console.log('--------------------[ /endpoint Response '+currentCount+ ' ]---------------');
		// };


		///////////////////////////////////////////////////////////////
		// The other way to redirect the request: using 'https' library
		//////////////////////////////////////////////////////////////
		var options = {
			// uri:proxiedHost+webRequest.url
			// uri:'https://10.33.121.243:9443'+webRequest.url
			host: '10.33.121.243'	// Hard-coded for now
			, port: '9443'
			, path: webRequest.url
			// , path: '/vsphere-client/endpoints/messagebroker/amfsecure'
			, method: 'POST'
			, headers: newHeaders
			// , headers: webRequest.headers
			, jar:true
			// , body:data
		};

		if(webRequest.url == '/localhost:9996/messagebroker/amfsecure'){
			options = {
				host: hostName
				, port: '9443'
				, path: '/vsphere-client/messagebroker/amfsecure'
				, method: 'POST'
				, headers: newHeaders
				// , headers: webRequest.headers
				, jar:true
			}
		}
	
		console.log('-> OPTIONS: '+JSON.stringify(options));
		var post_req = https.request(options, function(res){
			
			////////////////////////////////////////////////////
			// One way to read/send the response body: aggregate the chunk first, then send them back together
			///////////////////////////////////////////////////

			// var imagedata = '';
			// res.setEncoding('binary');
			// res.on('data', function(chunk){
			//     imagedata += chunk;
			// })
			// res.on('end', function(){
			// 	fs.writeFile(serviceName+'/Response', imagedata, 'binary', function(err){
			// 		if (err) return console.log('ERR!!!'+err);
			// 			console.log('File saved.')
			// 	})
			// 	response.writeHead(res.statusCode,res.headers);
			// 	console.log(res.headers);
			// 	response.end(imagedata,'binary');
			// });

			//////////////////////////////////////////////////
			// The other way to read/send the response body: read the chunk and send it
			/////////////////////////////////////////////////
			console.log('-> Response Headers: '+JSON.stringify(res.headers));
			// cbheaders = res.headers;
			// var rtnHeaders = {};
			// for(var key in cbheaders) {
			// 	var value = cbheaders[key];
			// 	if(key!='connection'){
			// 		rtnHeaders[key]=value;
			// 	}
			// }
			// rtnHeaders['connection'] = 'close';
			// console.log('-> Headers to return: '+JSON.stringify(rtnHeaders));
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
	        	postCount++;
	        	fs.writeFile(serviceName+'/Response'+postCount, buffer, 'binary', function(err){
					if (err) return console.log('ERROR!!!'+err);
						console.log('-> File saved.')
				})
	        	
				response.write(buffer, 'binary');
	        	response.end();
	    	});
		});
		
		// Send the post request with body
		post_req.write(testData,'binary');
	  	post_req.end();

		console.log('--------------------[ /simulation Request '+currentRequestNum+' ]---------------');
	});

});

//---------------[ Start the Server ]---------------//
// var server = https.createServer(proxyApp).listen(proxyApp.get('port'), function(){
// 	console.log('Proxy server listening on port ' + proxyApp.get('port'));
// });

var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var httpServer = http.createServer(proxyApp);
var httpsServer = https.createServer(credentials, proxyApp);

httpServer.listen(9997);
httpsServer.listen(9996);


