"use strict";

var Q = require("q");
var async = require("async");

var TFN = function () {
	this.middleware = [];
};

//Register middleware with a TFN instance
TFN.prototype.use = function (middleware) {
	if (typeof middleware === "function") {
		this.middleware.push({
			middleware: middleware
		});
	} else {
		this.middleware.push(middleware);
	}
};

//Run the middleware chain and get the results
TFN.prototype.check = function (user, key, resource, options, skip) {
	options = options || {};

	var deferred = Q.defer();

	this.run(user, key, resource, options || {}, skip)
		.then(function (result) {
			deferred.resolve(result);
		})
		.done();

	return deferred.promise;
};

//Check a list of permissions at the same time and map results to an object
//map = [{ 
// 	key: String,
// 	resource: {}, 
// 	options: {}
// }]
TFN.prototype.checkMap = function (user, map) {

	//Create async callbacks from map parameter
	var cbs = map.map(function (entry) {
		return function (done) {
			this.check(user, entry.key, entry.resource, entry.options).then(function (result) {
					var r = {}
					r[entry.key] = result.result;
					done(null, r);
				})
				.done();
		}.bind(this);
	}.bind(this));

	var deferred = Q.defer();

	//Run the callbacks and then normalize the results to an object
	async.series(cbs, function (err, results) {
		if (err) {
			return deferred.reject(err);
		}

		var normalized = results.reduce(function (prev, current) {
			var key = Object.keys(current)[0];
			prev[key] = current[key];
			return prev;
		}, {});

		deferred.resolve(normalized);
	});

	return deferred.promise;
};

//A recursive function used to run the middleware chain
TFN.prototype.run = function (user, key, resource, options, skip, deferred, index) {
	deferred = deferred || Q.defer();
	index = index || 0;

	//If we're at the end of the chain, return null
	if (index >= this.middleware.length) {
		deferred.resolve({
			result: null
		});
		return deferred.promise;
	}

	//helper to keep things dry later in this function
	var next = function () {
		return this.run(user, key, resource, options, skip, deferred, index + 1);
	}.bind(this);

	//Get the current middleware
	var middleware = this.middleware[index];

	//1) check if this middlware should be skipped.  This is used for recursive calls
	//   (i.e. calling tfn.check from inside middleware)
	if (skip === index) {
		return next();
	}

	//2) check if this middleware requires a resource
	if (middleware.requireResource && !resource) {
		return next();
	}

	//3) make sure this middleware accepts this key.
	//   if it doesn't, move on to the next middleware
	if (middleware.keys instanceof Array && middleware.keys.indexOf(key) === -1) {
		return next();
	}

	//get ready to run the middleware
	//when the middleware has finished, return its result (true or false)
	//or move on to the next if the result is null
	var middlewareDeferred = Q.defer();

	middlewareDeferred.promise.then(function (result) {
		result = this.normalizeResult(result);

		if ([true, false, null].indexOf(result.result) === -1) {
			throw new Error('TFN middleware must return true, false or null.');
		}

		//resolve and stop middleware chain if result is definitive, i.e. true or false
		if (result.result === true || result.result === false) {
			return deferred.resolve(result);
		}

		next();
	}.bind(this)).done();

	//put options at the end because not all middleware will use them
	//i'm using options because I'm thinking about multitenancy and the
	//current tenant will need to be passed in.
	middleware.middleware.call(this, user, key, resource, middlewareDeferred, options, index);

	return deferred.promise;
};

TFN.prototype.normalizeResult = function (result) {
	if ([true, false, null].indexOf(result) > -1) {
		return {
			result: result
		};
	}

	return result;
};

module.exports = {
	TFN: TFN,
	tfn: new TFN() //to be used as a singleton
};