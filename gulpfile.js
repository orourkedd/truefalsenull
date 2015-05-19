"use strict";

var gulp = require("gulp");
var mocha = require("gulp-mocha");
var notify = require("gulp-notify");
var plumber = require("gulp-plumber");

gulp.task("default", function () {
	return gulp.src("./spec/**/*-spec.js", {
			read: false
		})
		.pipe(plumber())
		.pipe(mocha({
			//reporter: "nyan"
		}))
		.on("error", notify.onError(function (error) {
			return "Message to the notifier: " + error.message;
		}))
		.pipe(notify({
			message: "Tests Passed :-)"
		}));
});

gulp.task("watch:spec", function () {
	gulp.start("default").watch(["./spec/**/*-spec.js", "./lib/**/*"], ["default"]);
});