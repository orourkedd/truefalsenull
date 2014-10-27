var TFN = function() {
	this.middleware = [];
};

TFN.prototype.use = function(middleware){
	if(typeof middleware === "function") {
		this.middleware.push({
			middleware: middleware
		});
	}
	else {
		this.middleware.push(middleware);	
	}
};

TFN.prototype.check = function(user, key, resource, done){

	if(!resource && !done) {
		throw new Error('A callback is required.');
	}

	//if no resource is passed
	if(typeof done === "undefined") {
		if(typeof resource !== "function") {
			throw new Error('A callback is required.');
		}
		done = resource;
		resource = null;
	}

	this.run(user, key, resource, function(err, result){
		done(null, result);
	});
};

TFN.prototype.run = function(user, key, resource, done, index){
	var self = this;

	index = index || 0;

	if(index >= this.middleware.length) {
		return done(null, {result: null});
	}

	var middleware = this.middleware[index];

	//qualify middleware here?

	//check if this middleware requires a resource
	if(middleware.requireResource && !resource) {
		return this.run(user, key, resource, done, index + 1);
	}

	//make sure this middleware accepts this key
	if(middleware.keys instanceof Array) {
		var keyRequirement = false;
		for(var i in middleware.keys) {
			if(middleware.keys[i] === key) {
				keyRequirement = true;
				break;
			}
		}

		if(!keyRequirement) {
			return this.run(user, key, resource, done, index + 1);
		}
	}

	middleware.middleware.call(this, user, key, resource, function(err, result){

		//Normalize results

		if(result === true) {
			result = {result: true};
		}

		if(result === false) {
			result = {result: false};
		}

		if(result === null) {
			result = {result: null};
		}

		if(result.result === true) {
			return done(null, result);
		}

		if(result.result === false) {
			return done(null, result);
		}

		self.run(user, key, resource, done, index + 1);
	});
};


module.exports = TFN;