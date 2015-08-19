var m = require('./Hash_Sender.js');

var destination = 'https://10.33.120.58:9443';
var direcotry = 'test';
var interval = 500;
process.argv.forEach(function (val, index, array) {
	if(index == 2) {
		destination = val;
	}
	if(index == 3) {
		direcotry = val;
	}
	if(index == 4) {
		interval = val;
	}

});
m.startSender(destination, direcotry, interval);

