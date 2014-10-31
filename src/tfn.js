"use strict";

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

TFN.prototype.check = function (user, key, resource, done) {

	if (!resource && !done) {
		throw new Error("A callback is required.");
	}

	//if no resource is passed
	if (typeof done === "undefined") {
		if (typeof resource !== "function") {
			throw new Error("A callback is required.");
		}
		done = resource;
		resource = null;
	}

	this.run(user, key, resource, function (err, result) {
		done(null, result);
	});
};

TFN.prototype.run = function (user, key, resource, done, index) {
	var self = this;

	index = index || 0;

	if (index >= this.middleware.length) {
		return done(null, {
			result: null
		});
	}

	var middleware = this.middleware[index];

	//Make sure middleware is applicable.
	//I might add more checks in the future

	//1) check if this middleware requires a resource
	if (middleware.requireResource && !resource) {
		return this.run(user, key, resource, done, index + 1);
	}

	//2) make sure this middleware accepts this key
	if (middleware.keys instanceof Array) {
		var keyRequirement = false;
		for (var i in middleware.keys) {
			if (middleware.keys[i] === key) {
				keyRequirement = true;
				break;
			}
		}

		if (!keyRequirement) {
			return this.run(user, key, resource, done, index + 1);
		}
	}

	middleware.middleware.call(this, user, key, resource, function (err, result) {

		result = self.normalizeResult(result);

		if (result.result === true || result.result === false) {
			return done(null, result);
		}

		self.run(user, key, resource, done, index + 1);
	});
};

TFN.prototype.normalizeResult = function (result) {
	if (result === true || result === false || result === null) {
		return {
			result: result
		};
	}

	return result;
};


module.exports = TFN;