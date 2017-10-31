const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');

gulp.task('default', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './src/index.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(babel({ presets: ['env', 'es2015'] }))
    .pipe(uglify())
    .on('error', gutil.log)
    .pipe(gulp.dest('./build/'));
});
