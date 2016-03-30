'use strict';

var coveralls = require('gulp-coveralls');
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');

gulp.task('coveralls', function () {
	gulp.src('coverage/**/lcov.info')
		.pipe(coveralls());
});

gulp.task('pre-test', function () {
	return gulp.src(['index.js'])
		.pipe(istanbul())
		.pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
	return gulp.src(['test/index.js', 'test/integration.js'])
		.pipe(mocha({
			timeout: 4000
		}))
		.pipe(istanbul.writeReports());
});
