module.exports = function (grunt) {

	grunt.initConfig({
	  json: {
	  //---------------[ Setup Example for vSphere web client ]---------------//
	  	"proxy_port"                :"9996",						// The port that proxy is running on
	  	"proxied_host"              :"https://10.33.120.58:9443",	// The proxied server, it must contains three parts: protocol, 
	  																// ip address, and port number. It also will be the destination 
	  																// server for the sender.
	  	
		"directory"					:"test",						// The directory which contains all recorded requests/responses
		"filter"					:"/vsphere-client/vcc-ui",		// All requests under this path will be recorded
		"player_port"				:"9996",						// The port that the player is running on. In most cases, this port 
																	// number should be the same the proxy port.

		"interval"					:"500",							// The interval that the sender use to send requests
		"start_point"				:["/vsphere-client/vcc-ui/resources/setup-wizard/index.html",
									  "/vsphere-client/vcc-ui/resources/networkExtenstionList.html"]		// Start point for player when proxying for vSphere



		//---------------[ Setup Example for http://localhost:8080 ]---------------//
		// "proxy_port"                :"9997",
		// "proxied_host"              :"http://localhost:8080",
		// "directory"					:"test",
		// "filter"					:"",
		// "player_port"				:"9997",						
		// "interval"					:"500",							
		// "start_point"				:["/vsphere-client/vcc-ui/resources/setup-wizard/index.html"]
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
        	command: 'node startPlayer.js <%= json.player_port %> <%= json.directory %> <%= json.proxied_host %> <%= json.start_point %> '
        },
        sender: {
        	command: 'node startSender.js <%= json.proxied_host %> <%= json.directory %> <%= json.interval %> '
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
  		grunt.log.writeln('\n=========[ Configuration for Proxy]==========');
  		grunt.log.writeln('proxy_port      :'+parameters.proxy_port);
  		grunt.log.writeln('proxied_host    :'+parameters.proxied_host);
  		grunt.log.writeln('directory       :'+parameters.directory);
  		grunt.log.writeln('filter          :'+parameters.filter);

  		grunt.log.writeln('\n=========[ Configuration for Player]==========');
  		grunt.log.writeln('player_port     :'+parameters.player_port);
  		grunt.log.writeln('directory       :'+parameters.directory);

  		grunt.log.writeln('\n=========[ Configuration for Sender]==========');
  		grunt.log.writeln('destination     :'+parameters.proxy_port);
  		grunt.log.writeln('directory       :'+parameters.directory);
  		grunt.log.writeln('interval        :'+parameters.interval);
	});
	grunt.registerTask('clean', ['shell:clean']);
	grunt.registerTask('proxy', ['shell:clean', 'shell:proxy']);
	grunt.registerTask('player', ['shell:player']);
	grunt.registerTask('sender', ['shell:sender']);
	grunt.registerTask('help', ['availabletasks']);

};