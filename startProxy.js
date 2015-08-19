var m = require('./Hash_Proxy.js');

var proxy_port = 9999;
var proxied_host = 'https://10.33.120.58:9443';
var direcotry = 'test';
var filter = 'vcc-ui"'; // Default value
process.argv.forEach(function (val, index, array) {
	if(index == 2) {
		proxy_port = val;
	}
	if(index == 3) {
		proxied_host = val;
	}
	if(index == 4) {
		direcotry = val;
	}
	if(index == 5){
		filter = val;
	}
	
});
m.test(proxy_port, proxied_host, direcotry, filter);

