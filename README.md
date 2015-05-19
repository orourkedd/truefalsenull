truefalsenull (tfn)
=============
A small module designed to make user authorization cleaner.  Inspired slightly by CanCan.

The documentation below is not extensive.  You should read the module's source for features not mentioned below.

Problems with simple Role Based Access Control
-------
A lot of times developers use a simple RBAC implementation to determine what users should or should not be able to do.  The basic implementation normally looks something like this disaster:

```
if(user.hasRole('admin')) {
  //do something
}
```

This is a trainwreck waiting to happen because the authorization logic is distributed across the codebase.  For example, what happends when there are multiple roles and you need to add or remove privileges for one of them?  (CMD|CTRL)+f -> refactor :-(

A better way: Behavior Based Access Control
-------
A better approach is the use a behavior-based approach.  Consider a modified version of the above example:
```
if(user.can('createUsers')) {
  //do something
}
```
This is a much more flexible approach, especially when combined with roles.  For example, let's look at a contrived example of the user's `can` method:

```
...
//roles registry
var roles = {
  admin: ['createUsers', 'deleteUsers']
};
...
User.prototype.can = function(permission) {
  //this.roles is an array containing this users roles: ['admin']
  for(var i in this.roles) {
    if(roles[this.roles[i]].indexOf(permission) > -1) {
      return true;
    }
  }
  return false;
};
...
```

This is a much more flexible approach.  Now, in order to update permissions system-wide, the only thing needed is to update the roles registry by adding or removing permissions from roles.

The above approach will work in a lot of situations but things will get messy when run into more complex scenarios (like in multitenant environment).  For example, how would the above system be used to authorize: "Admins can deleteUsers, but only for a specific tenant."  It would look something like this:

```
//Assume that some prior node middleware pulls the current tenant
//from mongo and puts it on the request.
if(user.can('deleteUsers') && req.tenant._id === tenantUserIsAdminOf._id) {
  //do something
}
```

This brings us back to our original problem: authorization logic mixed in with our normal business logic.

The tfn way
-------

tfn is basically a middleware runner.  Each piece of middleware can return one of three values: `true`, `false`, or `null`.  When a middleware function returns `true` or `false`, the middleware chain aborts and the result is returned.  If `null` is returned, the middleware chain continues on.  If it reaches the end and the result is still `null`, then tfn returns `null` to the client code.

Complex scenario
-------
Consider the above example that the a basic behavior-based access control system could not handle:
```
//roles registry
var roles = {
  admin: ['createUsers', 'deleteUsers']
};
...
var tfn = require('truefalsenull').tfn;

//Register tfn middleware
//this is basically just a port of the above `user.can`
//method to tfn
tfn.use(function (user, key, resource, deferred) {
  for(var i in user.roles) {
    if(roles[user.roles[i]].indexOf(key) > -1) {
      return deferred.resolve(true);
    }
  }
  deferred.resolve(null);
});
```

This will do everything that the above `user.can` method does.  It would then be called like in a context like this (Express/Passportjs example):
```
var tfn = require('truefalsenull').tfn;
app.delete('/users/:id', function(req, res, next){
  tfn.check(req.user, 'deleteUser', function(result){
    if(result.result === true) {
      //delete the user
    } else {
      res.status(403).send();
    }
  }).done();
});
```

But what about the problematic situation mentioned before, "Admins can deleteUsers, but only for a specific tenant."?  A simple solution would be to add another piece of middleware:

```
//roles registry
var roles = {
  admin: ['createUsers', 'deleteUsers']
};
...
var tfn = require('truefalsenull').tfn;

//Register tfn middleware

tfn.use({
    // this middleware will be skipped unless the user is checking for
    //one of the keys in the keys array
    keys: ['deleteUsers'],
    // the middleware will be skipped unless a resource is being passed in.
    requireResource: true,
    middleware: function (user, key, resource, deferred) {
      if(resource.tenant !== user.tenant) {
        //this will stop the middleware chain before it gets
        //to the next middleware function
        return deferred.resolve(false);
      }
      
      return deferred.resolve(null);
    }
});

tfn.use(function (user, key, resource, deferred) {
  for(var i in user.roles) {
    if(roles[user.roles[i]].indexOf(key) > -1) {
      return deferred.resolve(true);
    }
  }
  deferred.resolve(null);
});
```

This is not the best example on how to do this.  I would, for example, have two sets of roles for the user: one global set and one per-tenant set.  First, one tfn middleware function would check the tenant-specific set.  Second, another tfn middleware function would check the global set. 

Bottom Line
-------
Using tfn like described above will mean the following:  
* All authorization logic will be centralized and outside of your application business logic.
* Your authorization code will be easy to test if you separate each piece fo tfn middleware into its own module (recommended).
* Your system will be able to elegantly handle all sorts of advanced authorization scenarios by adding more middleware.