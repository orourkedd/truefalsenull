truefalsenull (tfn)
=============
A small module designed to make behavior-based access control easier.

### Installation

To install the stable version:

```
npm install --save truefalsenull
```

### One interface for all of your authorization logic

TFN implements the strategy pattern for making auth decisions.  Each strategy (a function) can return one of three values: `true`, `false`, or `null`.  When a strategy function returns `true` or `false`, tfn immediately returns the result.  If `null` is returned, tfn continues on.  If it reaches the end and the result is still `null`, then tfn returns `null` to the client code.
