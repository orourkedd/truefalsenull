(function(){
var r=function(){var e="function"==typeof require&&require,r=function(i,o,u){o||(o=0);var n=r.resolve(i,o),t=r.m[o][n];if(!t&&e){if(t=e(n))return t}else if(t&&t.c&&(o=t.c,n=t.m,t=r.m[o][t.m],!t))throw new Error('failed to require "'+n+'" from '+o);if(!t)throw new Error('failed to require "'+i+'" from '+u);return t.exports||(t.exports={},t.call(t.exports,t,t.exports,r.relative(n,o))),t.exports};return r.resolve=function(e,n){var i=e,t=e+".js",o=e+"/index.js";return r.m[n][t]&&t?t:r.m[n][o]&&o?o:i},r.relative=function(e,t){return function(n){if("."!=n.charAt(0))return r(n,t,e);var o=e.split("/"),f=n.split("/");o.pop();for(var i=0;i<f.length;i++){var u=f[i];".."==u?o.pop():"."!=u&&o.push(u)}return r(o.join("/"),t,e)}},r}();r.m = [];
r.m[0] = {
"tfn.js": function(module, exports, require){
"use strict";
"use strict";
var TFN = function TFN() {
  this.middleware = [];
};
($traceurRuntime.createClass)(TFN, {
  use: function(middleware) {
    if (typeof middleware === "function") {
      this.middleware.push({middleware: middleware});
    } else {
      this.middleware.push(middleware);
    }
  },
  check: function(user, key, resource, done) {
    if (!resource && !done) {
      throw new Error("A callback is required.");
    }
    if (typeof done === "undefined") {
      if (typeof resource !== "function") {
        throw new Error("A callback is required.");
      }
      done = resource;
      resource = null;
    }
    this.run(user, key, resource, function(err, result) {
      done(null, result);
    });
  },
  run: function(user, key, resource, done, index) {
    var self = this;
    index = index || 0;
    if (index >= this.middleware.length) {
      return done(null, {result: null});
    }
    var middleware = this.middleware[index];
    if (middleware.requireResource && !resource) {
      return this.run(user, key, resource, done, index + 1);
    }
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
    middleware.middleware.call(this, user, key, resource, function(err, result) {
      result = self.normalizeResult(result);
      if (result.result === true || result.result === false) {
        return done(null, result);
      }
      self.run(user, key, resource, done, index + 1);
    });
  },
  normalizeResult: function(result) {
    if (result === true || result === false || result === null) {
      return {result: result};
    }
    return result;
  }
}, {});
module.exports = TFN;

}
};
TFN = r("tfn.browser.js");}());
