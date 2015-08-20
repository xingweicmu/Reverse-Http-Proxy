exports.startSender = function startSender(para_destination, para_directory, para_interval){

	var proxiedHost = 'http://127.0.0.1'
	var serviceName = 'Inventory';
	var firstRequest = null;
	var interval = 500;
	var configurationFilename = '';

	//-----------------[ Setup Dependencies ]-----------------//
	var express = require('express');
	var bodyParser = require("body-parser");
	var http = require('http');
	var path = require('path');
	var os=require('os');
	var fs = require('fs');
	var request = require('request');
	var HashMap = require('hashmap');

	//-----------------[ Set up Local variable]-------------------//
	var serviceName = para_directory;
	var proxiedHost = para_destination;
	var interval = para_interval;

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

	console.log('Reading requests from service: '+serviceName);
	console.log('Sending requests to destination: '+hostName + ' on '+ portNumber);

	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
		
	//---------------[ Prepare to read and send ]---------------//
	var requestList = null;
	var map = new HashMap();
	var sortMap = new HashMap();
	fs.readdir(serviceName, function(err, list) {
		if (err) {
			console.log('Error!')
			console.log('Detail: '+JSON.stringify(err));
			process.exit();
		}
		requestList = list;

		// First to sort the requestList, put them in sortMap
		for (var i = 0; i < requestList.length; i++) {
			var key = requestList[i].substring(0, requestList[i].indexOf('_'));
			var value = requestList[i];
			sortMap.set(key, value);
		}

		// Print out the requests to be sent
		console.log('\n---------------[ Requests to be sent in sequence ]---------------')
		for(var i = 1; i < requestList.length; i++){
			var filePath = serviceName + '/' + sortMap.get(i+'') + '/Request';
			console.log(filePath);
		}

		// Start to send requests
		waitAndDo(1);

	});

	//---------------[ Issue the request with intervals ]---------------//
	function waitAndDo(times) {
		if(times > requestList.length) {
			return;
		}

		setTimeout(function() {
			console.log('\n******* Doing request '+times+' *******');
			readAndSend(times);
			waitAndDo(times+1);

		}, interval);
	}
			
	//---------------[ Read the request from local file and send it ]---------------//
	function readAndSend(num){
		// console.log(num);
		var filePath = serviceName + '/' + sortMap.get(num+'') + '/Request';
		fs.readFile(filePath, 'utf-8', function(err,data) {
			if (err) {
				return console.log(err);
			}

			firstRequest = JSON.parse(data);
			var readPath = firstRequest.path;
			var readHeaders = firstRequest.headers;
			var readMethod = firstRequest.method;
			var readBody = firstRequest.body;
			console.log('path: ' + readPath);
			console.log('method: ' + readMethod);
			console.log('headers: ' + JSON.stringify(readHeaders));
			console.log('body: '+ readBody);

			// Create a new header by removing host
			var newHeaders = {};
			for(var key in readHeaders) {
				var value = readHeaders[key];
				//console.log('HEADER:'+key+':'+value);
				if(key != 'content-length' && key!='host'){
					newHeaders[key]=value;
				}
			}
			// console.log(newHeaders);
			sendRequest();
		
			function sendRequest(){
				// Handle GET request
				if(readMethod == 'GET' || readMethod == 'get'){
					var options = {
						uri:proxiedHost + readPath
						, headers: newHeaders
						, jar: true
					};
					console.log(JSON.stringify(options));
					request(options, function (error, resp, body) {
						if (!error) {
							console.log('---------------[ Sent Request: '+readMethod + ' ' +readPath+' ]---------------');
							console.log('---------------[ Response from Server ]---------------');
							console.log(resp.body);
						}
						else{
							console.log('ERROR: '+error);
						}
					});
				}	
				// Handle POST request
				else if(readMethod == 'POST' || readMethod == 'post') {
					var options = {
						uri:proxiedHost + readPath
						, headers: newHeaders
						, body:readBody
						, jar: true
					};
					request.post(options, function (error, resp, body) {
						if (!error) {
							// console.log(options);
							console.log('---------------[ Sent Request: '+readMethod + ' ' +readPath+']----------------');
							console.log('---------------[ Response from Server ]---------------');
							console.log(body);
						}
						else{
							console.log('ERROR: '+error);
						}
					});	
				}
				else if(readMethod == 'PUT' || readMethod == 'put') {
					var options = {
						uri:proxiedHost + readPath
						, headers: newHeaders
						, body:readBody
						, jar: true
					};
					request.put(options, function (error, resp, body) {
						if (!error) {
							// console.log(options);
							console.log('---------------[ Sent Request: '+readMethod + ' ' +readPath+']----------------');
							console.log('---------------[ Response from Server ]---------------');
							console.log(body);
						}
						else{
							console.log('ERROR: '+error);
						}
					});	
				}

				else {
					console.log('Unrecognized Request: '+readMethod);
				}
			}
		});
	}

}