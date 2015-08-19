module.exports = function (grunt) {

	grunt.initConfig({
	  json: {
	  	"proxy_port"                :"9996",
	  	"proxied_host"              :"https://10.33.120.58:9443",
		// "protocol"                  :"https",
		"directory"					:"test",
		"filter"					:"vcc-ui",

		"player_port"				:"9996",
		// "protocol"					:"https",
		"directory"					:"test",

		"destination"				:"https://10.33.120.58:9443",
		// "protocol"					:"https",
		"directory"					:"test",
		"interval"					:"500"

	  },
	  pkg: grunt.file.readJSON('proxy.json'),

	  shell: {
        options: {
            stdout: true,
            execOptions: {
                maxBuffer: Infinity
            }
        },
        clean: {
        	command : './clean.sh <%= json.directory %>'
        },
        proxy: {
            command: 'node startProxy.js <%= json.proxy_port %> <%= json.proxied_host %> <%= json.directory %>  <%= json.filter %> '
        },
        player: {
        	command: 'node startPlayer.js <%= json.player_port %> <%= json.directory %> '
        	// <%= json.player_port %> <%= json.directory %> 
        },
        sender: {
        	command: 'node startSender.js <%= json.destination %> <%= json.directory %> <%= json.interval %> '
        }


      },
      availabletasks: {
  		tasks: {
    	options: {
      		filter: 'exclude',
      		tasks: ['availabletasks', 'tasks'],
      		descriptions: {
                'clean': 'Remove all files in the target directory.',
                'help': 'Print out all the avaibable tasks.',
                'player': 'Start the player server to replay the traffic.',
                'printConfig': 'Print out the parameters for proxy, player and sender.',
                'proxy': 'Start the proxy server to record all the traffic going through.',
                'sender': 'Send all the recorded requests in sequence with intervals.',
                'shell': 'Run shell commands.'

            }
    	}
  	  }              
	},

	});

	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-available-tasks');

	grunt.registerTask('printConfig', function() {
  		parameters = grunt.config().json;
  		grunt.log.writeln('\n=========[ Configuration for proxy]==========');
  		grunt.log.writeln('proxy_port      :'+parameters.proxy_port);
  		grunt.log.writeln('proxied_host    :'+parameters.proxied_host);
  		grunt.log.writeln('directory       :'+parameters.directory);
  		grunt.log.writeln('filter          :'+parameters.filter);

  		grunt.log.writeln('\n=========[ Configuration for player]==========');
  		grunt.log.writeln('player_port     :'+parameters.player_port);
  		grunt.log.writeln('directory       :'+parameters.directory);

  		grunt.log.writeln('\n=========[ Configuration for sender]==========');
  		grunt.log.writeln('destination     :'+parameters.destination);
  		grunt.log.writeln('directory       :'+parameters.directory);
  		grunt.log.writeln('interval        :'+parameters.interval);
	});
	grunt.registerTask('clean', ['shell:clean']);
	grunt.registerTask('proxy', ['shell:clean', 'shell:proxy']);
	grunt.registerTask('player', ['shell:player']);
	grunt.registerTask('sender', ['shell:sender']);
	grunt.registerTask('help', ['availabletasks']);

};