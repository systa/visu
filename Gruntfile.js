/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

module.exports = function(grunt) {

  grunt.initConfig({

    // JS TASKS ================================================================
    jshint: {
      all: ['frontend/src/js/**/*.js', 'backend/**/*.js', 'Gruntfile.js', 'server.js', 'test/**/*.js',
      'datasources/nokia/**/*.js', 'datasources/issue_collector/*.js', 'datasources/issue_collector/apis/*.js',
      'datasources/gitparser/*.js'],
      options: {
        force: true
      }

      
    },
    
    uglify: {
        options: {
            banner : "/*\n"+
                "* Copyright (c) TUT Tampere University of Technology 2014-2015.\n"+
                "* All rights reserved.\n"+
                "* This software has been developed in Tekes-TIVIT project Need-for-Speed.\n"+
                "* All rule set in consortium agreement of Need-for-Speed project apply.\n"+
                "*\n"+
                "* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho\n"+
                "*/\n"
        },
        build: {
            files: {
                'frontend/dist/js/app.min.js': ['frontend/src/js/**/*.js', 'frontend/src/js/*.js']
            }
        }
    },

    // CSS TASKS ===============================================================
    less: {
      build: {
        files: {
          'frontend/dist/css/style.css': 'frontend/src/css/style.less'
        }
      }
    },

    cssmin: {
      build: {
        files: {
          'frontend/dist/css/style.min.css': 'frontend/dist/css/style.css'
        }
      }
    },

    // TASKS ==============================================================
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          captureFile: 'results.txt', // Optionally capture the reporter output to a file
          quiet: false, // Optionally suppress output to standard out (defaults to false)
          clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false)
        },
        src: ['test/top.js']
      }
    },

    bower_concat: {
      all: {
        options: {
          separator : ';'
        },
        dest: 'frontend/dist/js/_bower.js',
        cssDest: 'frontend/dist/css/bower.css',
        include: ['jquery', 'd3'],
        includeDev: true,
        
      }
    },

    watch: {
      css: {
        files: ['frontend/src/css/**/*.less'],
        tasks: ['less', 'cssmin']
      },
      js: {
        files: ['frontend/src/js/**/*.js', 'backend/**/*.js', 'Gruntfile.js'],
        tasks: ['jshint', 'uglify']
      }
    },

    nodemon: {
      dev: {
        options: {
          env: {
            NODE_ENV: 'development',
            TZ:'Europe/Helsinki'

          }
        },
        script: 'server.js'
      }
    },


    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      tasks: ['nodemon', 'watch']
    } 

    // OWN TASKS ==============================================================
    
    //lisencer: {
      //this task adss licence comments to all files that don't yet have it on the last line.
      //should probably be run when grunt starts, not on every change

      /*
        Iterate through the filesystem from a root node
          check file type and add a proper type of Licence comment
            if js file
              check if the firstline is the licence commmit
                if not, add
            if html file
              check if the firstline is the licence commmit
                if not, add
            

      */
    //}


  });
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-bower-concat');
  

  grunt.registerTask('default', ['less', 'cssmin', 'jshint', 'uglify', 'bower_concat','mochaTest', 'concurrent']);
  grunt.registerTask('test', ['less', 'cssmin', 'jshint', 'uglify', 'bower_concat',  'mochaTest']);
};
