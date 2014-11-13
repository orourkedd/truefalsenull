"use strict";

var Q = require("q");

var TFN = function () {
	this.middleware = [];
};

TFN.prototype.use = function (middleware) {
	if (typeof middleware === "function") {
		this.middleware.push({
			middleware: middleware
		});
	} else {
		this.middleware.push(middleware);
	}
};

TFN.prototype.check = function (user, key, resource, options, skip) {
	options = options || {};

	var deferred = Q.defer();

	this.run(user, key, resource, options, skip)
		.then(function (result) {
			deferred.resolve(result);
		})
		.done();

	return deferred.promise;
};

TFN.prototype.run = function (user, key, resource, options, skip, deferred, index) {
	var self = this;
	deferred = deferred || Q.defer();
	index = index || 0;

	if (index >= this.middleware.length) {
		deferred.resolve({
			result: null
		});
		return deferred.promise;
	}

	var middleware = this.middleware[index];

	//Make sure middleware is applicable.
	//I might add more checks in the future

	//1) check if this should be skipped
	if (skip === index) {
		return this.run(user, key, resource, options, skip, deferred, index + 1);
	}

	//2) check if this middleware requires a resource
	if (middleware.requireResource && !resource) {
		return this.run(user, key, resource, options, skip, deferred, index + 1);
	}

	//3) make sure this middleware accepts this key
	var keyRequirementFulfilled = true;
	if (middleware.keys instanceof Array) {
		keyRequirementFulfilled = false;
		for (var i in middleware.keys) {
			if (middleware.keys[i] === key) {
				keyRequirementFulfilled = true;
				break;
			}
		}

		if (keyRequirementFulfilled === false) {
			return this.run(user, key, resource, options, skip, deferred, index + 1);
		}
	}

	var middlewareDeferred = Q.defer();

	middlewareDeferred.promise.then(function (result) {

		result = self.normalizeResult(result);

		if (result.result === true || result.result === false) {
			return deferred.resolve(result);
		}

		self.run(user, key, resource, options, skip, deferred, index + 1);
	}).done();

	//put options at the end because not all middleware will use them
	//i'm using options because I'm thinking about multitenancy
	middleware.middleware.call(this, user, key, resource, middlewareDeferred, options, index);

	return deferred.promise;
};

TFN.prototype.normalizeResult = function (result) {
	if (result === true || result === false || result === null) {
		return {
			result: result
		};
	}

	return result;
};

module.exports = {
	TFN: TFN,
	tfn: new TFN()
};