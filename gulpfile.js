const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const flow = require('gulp-flowtype');
const gulp = require('gulp');
const gutil = require('gulp-util');
const prettify = require('gulp-jsbeautifier');
const react = require('gulp-react');
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');

gulp.task('default', ['typecheck', 'bundle']);

gulp.task('typecheck', function() {
  gulp.src('./src/*.js')
    .pipe(flow({
      all: false,
      weak: false,
      killFlow: false,
      beep: true,
      abort: false
    }))
    .pipe(react({ stripTypes: true }))
    .pipe(prettify())
    .pipe(gulp.dest('./lib/'));
});

gulp.task('bundle', function() {
  browserify({
    debug: true,
    entries: './index.js'
  }).bundle()
  .pipe(source('index.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .on('error', gutil.log)
  .pipe(rename({ basename: 'bundle' }))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./'));
});
