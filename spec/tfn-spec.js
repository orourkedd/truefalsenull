"use strict";

var expect = require("chai").expect;
var TFN = require("../src/tfn");

describe("TFN", function () {

	describe("use", function () {

		it("should add middleware", function () {
			var tfn = new TFN();

			tfn.use(function (done) {
				done(true);
			});

			expect(tfn.middleware.length).to.eq(1);
		});

	});

	describe("check", function () {

		it("should return true when middleware returns true", function (done) {
			var tfn = new TFN();

			tfn.use(function (user, key, resource, deferred) {
				deferred.resolve(true);
			});

			tfn.check({}, "userEdit").then(function (result) {
				expect(result.result).to.eq(true);
				done();
			});
		});

		it("should return false when middleware returns false", function (done) {
			var tfn = new TFN();

			tfn.use(function (user, key, resource, deferred) {
				deferred.resolve({
					result: false
				});
			});

			tfn.check({}, "userEdit").then(function (result) {
				expect(result.result).to.eq(false);
				done();
			});
		});

		it("should return null when no middleware returns true or false", function (done) {
			var tfn = new TFN();

			tfn.use(function (user, key, resource, deferred) {
				deferred.resolve(null);
			});

			tfn.check({}, "userEdit").then(function (result) {
				expect(result.result).to.eq(null);
				done();
			});
		});

		it("should not check middleware if resource is required and no resource is given", function (done) {
			var tfn = new TFN();

			tfn.use({
				middleware: function (user, key, resource, deferred) {
					deferred.resolve(true);
				},
				requireResource: true
			});

			tfn.use(function (user, key, resource, deferred) {
				deferred.resolve(null);
			});

			tfn.check({}, "userEdit").then(function (result) {
				expect(result.result).to.eq(null);
				done();
			});
		});

		it("should not check middleware if the middleware does not accept the key", function (done) {
			var tfn = new TFN();
			tfn.use({
				middleware: function (user, key, resource, deferred) {
					deferred.resolve(true);
				},
				keys: ["userEdit"]
			});

			tfn.use(function (user, key, resource, deferred) {
				deferred.resolve(null);
			});

			tfn.check({}, "userEdit").then(function (result) {
				expect(result.result).to.eq(true);
				done();
			});
		});

		it("should return a promise when there is no middleware execute", function (done) {
			var tfn = new TFN();

			tfn.check({}, "test").then(function () {
				done();
			});
		});

		it("should skip middleware when using skip index", function (done) {
			var tfn = new TFN();

			tfn.use({
				middleware: function (user, key, resource, deferred, options, middlewareIndex) {
					//this should call deadly recursion.  skip will cause it to be skipped over when
					//rerunning the middleware stack.
					this.check(user, "test", resource, null, middlewareIndex).then(function (result) {
						deferred.resolve(true);
					});
				}
			});

			tfn.check({}, "test").then(function () {
				done();
			});
		});

		it("should work with nested calls", function (done) {
			var tfn = new TFN();
			var one, two, three;

			tfn.use({
				keys: ["usePreferencesTestFeature"],
				middleware: function (user, key, resource, deferred, options) {
					one = true;
					this.check(user, "tentantHasTestFeature", resource, null).then(function (result) {
						if (result.result === true) {
							deferred.resolve(true);
						} else {
							deferred.resolve(false);
						}
					});
				}
			});

			tfn.use({
				keys: ["tentantHasTestFeature"],
				middleware: function (user, key, resource, deferred, options) {
					two = true;
					this.check(user, "isAllowedToUseTestFeature", resource, null).then(function (result) {
						if (result.result === true) {
							deferred.resolve(true);
						} else {
							deferred.resolve(false);
						}
					});
				}
			});

			tfn.use({
				keys: ["isAllowedToUseTestFeature"],
				middleware: function (user, key, resource, deferred) {
					three = true;
					deferred.resolve(true);
				}
			});

			tfn.check({}, "usePreferencesTestFeature").then(function (result) {
				//Make sure all middleware is called
				expect(one).to.eq(true);
				expect(two).to.eq(true);
				expect(three).to.eq(true);
				expect(result.result).to.eq(true);

				done();
			});

		});

	});
});