/**
 * Cockpit Import module build file
 */

var gulp = require('gulp');
var pkg = require('./package.json');
var path = pkg.config.path;

/**
 * Build task
 */
gulp.task('build', function buildTask(cb) {

    // Copy vendor dist files into assets folder
    var files = [
        path.vendor + '/papaparse/papaparse.js',
        path.vendor + '/papaparse/papaparse.min.js',
    ];

    gulp.src(files)
        .pipe(gulp.dest(path.src + '/assets/3p'));
    ;
});

/**
 * Default task
 */
gulp.task('default', [
    'build'
]);
