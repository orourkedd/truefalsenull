"use strict";

var Q = require("q");
var _ = require("lodash");
var async = require("async");

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

//Check a list of permissions at the same time and map results to object
//map = [{ key: String, resource: {}, options: {} }]
TFN.prototype.checkMap = function(user, map){
	var self = this;

	//Create async callbacks from map parameter
	var cbs = map.map(function(entry){
		return function(done){
			self.check(user, entry.key, entry.resource, entry.options || {}).then(function(result){
				var r = {}
				r[entry.key] = result.result;
				done(null, r);
			})
			.done();
		};
	});

	var deferred = Q.defer();

	//Run the callbacks and then normalize the results to an object
	async.series(cbs, function(err, results){
		if(err) {
			return deferred.reject(err);
		}

		var normalized = results.reduce(function(prev, current){
			var key = Object.keys(current)[0];
			prev[key] = current[key];
			return prev;
		}, {});

		deferred.resolve(normalized);
	});

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

	//3) make sure this middleware accepts this key.
	//   if it doesn't, move on to the next middleware
	if (middleware.keys instanceof Array) {

		var hasKey = middleware.keys.some(function(k){
			return k === key;
		});

		//this middleware does not process this key, so go to the next
		if (hasKey === false) {
			return this.run(user, key, resource, options, skip, deferred, index + 1);
		}
	}

	//get ready to run the middleware
	//when the middleware has finished, return its result (true or false)
	//or move on to the next if the result is null
	var middlewareDeferred = Q.defer();

	middlewareDeferred.promise.then(function (result) {

		result = self.normalizeResult(result);

		if (result.result === true || result.result === false) {
			return deferred.resolve(result);
		}

		self.run(user, key, resource, options, skip, deferred, index + 1);
	}).done();

	//put options at the end because not all middleware will use them
	//i'm using options because I'm thinking about multitenancy and the
	//current tenant will need to be passed in.
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