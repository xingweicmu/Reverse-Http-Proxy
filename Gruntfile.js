module.exports = function (grunt) {

	grunt.initConfig({
	  pkg: grunt.file.readJSON('proxy.json'),
	  shell: {
        options: {
            stdout: true,
            execOptions: {
                maxBuffer: Infinity
            }
        },
        clean: {
        	command : './clean.sh'
        },
        proxy: {
            command: 'node testExports.js proxy.json'
        },
        player: {
        	command: 'node Hash_Player.js player.json'
        },
        sender: {
        	command: 'node Hash_Sender.js sender.json'
        }


      },
	  express: {
	    dev: {
	      options: {
	        script: 'testExports.js',
	        background: false,
	        opts: [],
	        args: ['proxy.json'],
	      }
	    },
	    prod: {
	      options: {
	        script: 'path/to/prod/server.js',
	        node_env: 'production'
	      }
	    },
	    test: {
	      options: {
	        script: 'path/to/test/server.js'
	      }
	    }
	  }
	});
	grunt.loadNpmTasks('grunt-express-server');
	grunt.loadNpmTasks('grunt-shell');

	grunt.registerTask('parameters', function(){
		parameters = grunt.file.readJSON('proxy.json');
  		grunt.log.writeln(parameters.proxy_port);
  		grunt.log.writeln(parameters.proxied_host);
  		grunt.log.writeln(parameters.protocol);
  		grunt.log.writeln(parameters.directory);
  		grunt.log.writeln(parameters.filter);
	});
	grunt.registerTask('clean', ['shell:clean']);
	grunt.registerTask('proxy', ['shell:clean', 'shell:proxy']);
	grunt.registerTask('player', ['shell:player']);
	grunt.registerTask('sender', ['shell:sender']);

};