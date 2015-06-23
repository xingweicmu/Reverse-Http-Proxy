
var serviceName = 'NA';
var requestCount=1;
var listenPort=9999;
// var firstRequest=null;

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
var path = require('path');
var os=require('os');
var fs = require('fs');


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
// playerApp.use(express.bodyParser());
playerApp.use(bodyParser.urlencoded({ extended: false }));

// Read the first request file (which will always be Request1.txt) and get the path, method, headers and body to use for comparison on every
// other request coming in. If a match is made on all 4 parts of the incoming request to the request in the Request1.txt file, reset the
// reqestCount to 1 and start again, so the proper responses are returned in the same order the requests are coming in.

function readFromFile(filename) {
	// fs.readFile(serviceName+'/Request/!', 'utf-8', function(err,data) {
	fs.readFile(filename, 'utf-8', function(err,data) {
  		if (err) {
    		return console.log(err);
  		}

  		// firstRequest = JSON.parse(data);
  		console.log(JSON.parse(data));
  		return JSON.parse(data);
	});
}

//---------------[ Used for Development Only ]---------------//
if ('development' == playerApp.get('env')) {
  playerApp.use(express.errorHandler());
}

//---------------[ Setup the Routes ]---------------//
playerApp.get('/*', function(webRequest, response) {

	// var request = require('request').debug=true;
	// console.log('GET Request:'+webRequest.url);
	var headers = webRequest.headers;
	var url = webRequest.url;

	var filename = url.replace(new RegExp('/', 'g'), '!');
	var filePath = serviceName + '/Request/' + filename;
	// var firstRequest = readFromFile(serviceName+'/Request/!');

	fs.readFile(filePath, 'utf-8', function(err,data) {
  		if (err) {
    		console.log(err);
			response.write('No Request file found: '+err.path);
			response.end();
  		}
  		else {
	  		firstRequest = JSON.parse(data);
	  		// console.log(JSON.parse(data));
	        // console.log(filePath+'###'+firstRequest);
	        requestCount++;
			//-------------[ See if the Request Headers match first request ]------------//
			// console.log(JSON.stringify(firstRequest.headers));
			// console.log('========');
			// console.log(JSON.stringify(webRequest.headers));
			var headerMatch = true;
			var keys = Object.keys(headers);
			for(var i = 0; i < keys.length; i++){
				var key = keys[i];
				if(key != 'host' && key != 'user-agent' && key != 'accept-language' && key != 'cookie'){
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
			// If a match is made, resent the requestCount to 1 so that the Response1.txt file is
			// used to return the response for the request, and continue from there.
			console.log(url +' VS '+firstRequest.path);
			console.log(headerMatch);
	        if (url === firstRequest.path && headerMatch) {
	        	console.log("RESETING COUNTER\n\n"); 
	            requestCount = 1;
	        }

	        var responseFilePath = filePath.replace('Request', 'Response');
	        function endsWith(str, suffix) {
    			return str.indexOf(suffix, str.length - suffix.length) !== -1;
			}
			// If it's text
	        if(!endsWith(webRequest.url, 'png') && !endsWith(webRequest.url, 'jpg') 
	        	&& !endsWith(webRequest.url, 'ttf') && !endsWith(webRequest.url, 'woff')){

		        fs.readFile(responseFilePath, 'utf8', function (err,data) {
		  			if (err) {
		    			console.log(err);
		    			response.write('No Response file found: '+err.path);
		    			response.end();
		  			}
					// requestCount++;
					else{
						console.log("TEXT");
						response.write(data);
						response.end();
					}
				});
			}
			// If it's image or woff, it should be encoded in binary
			else{
				var img = fs.readFileSync(responseFilePath);
				// res.writeHead(200, {'Content-Type': 'image/gif' });
				response.end(img, 'binary');
			}

	        console.log('--------------------[ /simulation GET Request '+requestCount+' ]---------------');

	    	}
        });

});

playerApp.post('/*', function(webRequest, response) {
	var headers = webRequest.headers;
	var url = webRequest.url;

	var filename = url.replace(new RegExp('/', 'g'), '!');
	var filePath = serviceName + '/Request/' + filename;
	// console.log("@@@"+filename + "@@@" + filePath);

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
				//console.log('Parsing key:'+key+'='+webRequest.headers[key]);
				if(key!="host" && key!="user-agent" && key != 'accept-language' && key != 'cookie'){
					//console.log('comparing '+key+':'+webRequest.headers[key]+' Against:'+firstRequest.headers[key]);
					headerMatch = (webRequest.headers[key]==firstRequest.headers[key]);
					if(!headerMatch){
						headerMatch = false;
						break;
					}
				}
			}
			//console.log('Do Headers Match:'+headerMatch);

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
		    // If a match is made, resent the requestCount to 1 so that the Response1.txt file is
		    // used to return the response for the request, and continue from there.
		    if (url === firstRequest.path && headerMatch && dataMatch) {
		        console.log("RESETING COUNTER\n\n"); 
		        requestCount = 1;
		    }

			fs.readFile(filePath.replace('Request', 'Response'), 'utf8', function (err,data) {
		  		if (err) {
		    		console.log(err);
		    		response.write('No Response file found: '+err.path);
		    		response.end();
		  		}
				// Send response back to the client
				else{
					response.write(data);
					response.end();
				}
		    });	

		    console.log('--------------------[ /simulation POST Request '+requestCount+' ]---------------');
		}
	});

});

//---------------[ Start the Server ]---------------//
var server = http.createServer(playerApp).listen(playerApp.get('port'), function(){
  console.log('Proxy server listening on port ' + playerApp.get('port'));
});


