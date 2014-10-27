var assert = expect = require('chai').expect;
var TFN = require('../src/tfn');

describe("TFN", function(){

	describe("use", function(){
		
		it("should add middleware", function(){
			var tfn = new TFN();

			tfn.use(function(done){
				done(true);
			});

			expect(tfn.middleware.length).to.eq(1);
		});

	});

	describe("check", function(){
		
		it("should return true when middleware returns true", function(done){
			var tfn = new TFN();

			tfn.use(function(user, key, resource, done){
				done(null, true);
			});

			tfn.check({}, 'userEdit', function(err, result){
				expect(result.result).to.eq(true);
				done();
			});
		});

		it("should return false when middleware returns true", function(done){
			var tfn = new TFN();

			tfn.use(function(user, key, resource, done){
				done(null, {result: false});
			});

			tfn.check({}, 'userEdit', function(err, result){
				expect(result.result).to.eq(false);
				done();
			});
		});

		it("should return null when no middleware returns true or false", function(done){
			var tfn = new TFN();

			tfn.use(function(user, key, resource, done){
				done(null, null);
			});

			tfn.check({}, 'userEdit', function(err, result){
				expect(result.result).to.eq(null);
				done();
			});
		});

		it("should throw an error if no resource or callback is given", function(){
			var tfn = new TFN();

			var fn = function(){
				tfn.check({}, 'test');
			};

			expect(fn).to.throw();
		});

		it("should throw an error if no callback is given", function(){
			var tfn = new TFN();

			var fn = function(){
				tfn.check({}, 'test', {});
			};

			expect(fn).to.throw();
		});

		it("should not check middleware if resource is required and no resource is given", function(done){
			var tfn = new TFN();

			tfn.use({
				middleware: function(user, key, resource, done){
					done(null, true);
				},
				requireResource: true
			});

			tfn.use(function(user, key, resource, done){
				done(null, null);
			});

			tfn.check({}, 'userEdit', function(err, result){
				expect(result.result).to.eq(null);
				done();
			});
		});

		it("should not check middleware if the middleware does not accept the key", function(done){
			var tfn = new TFN();

			tfn.use({
				middleware: function(user, key, resource, done){
					done(null, true);
				},
				keys: ['userEdit']
			});

			tfn.use(function(user, key, resource, done){
				done(null, null);
			});

			tfn.check({}, 'userEdit', function(err, result){
				expect(result.result).to.eq(true);
				done();
			});
		});

	});
});