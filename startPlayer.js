var m = require('./Hash_Player.js');

var player_port = 9999;
var direcotry = 'test';
process.argv.forEach(function (val, index, array) {
	if(index == 2) {
		player_port = val;
	}
	if(index == 3) {
		direcotry = val;
	}
	
});
m.startPlayer(player_port, direcotry);

