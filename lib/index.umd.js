(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SimpleQk = {}));
})(this, (function (exports) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	var runtime = {exports: {}};

	/**
	 * Copyright (c) 2014-present, Facebook, Inc.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	(function (module) {
	var runtime = (function (exports) {

	  var Op = Object.prototype;
	  var hasOwn = Op.hasOwnProperty;
	  var undefined$1; // More compressible than void 0.
	  var $Symbol = typeof Symbol === "function" ? Symbol : {};
	  var iteratorSymbol = $Symbol.iterator || "@@iterator";
	  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

	  function define(obj, key, value) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	    return obj[key];
	  }
	  try {
	    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
	    define({}, "");
	  } catch (err) {
	    define = function(obj, key, value) {
	      return obj[key] = value;
	    };
	  }

	  function wrap(innerFn, outerFn, self, tryLocsList) {
	    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	    var generator = Object.create(protoGenerator.prototype);
	    var context = new Context(tryLocsList || []);

	    // The ._invoke method unifies the implementations of the .next,
	    // .throw, and .return methods.
	    generator._invoke = makeInvokeMethod(innerFn, self, context);

	    return generator;
	  }
	  exports.wrap = wrap;

	  // Try/catch helper to minimize deoptimizations. Returns a completion
	  // record like context.tryEntries[i].completion. This interface could
	  // have been (and was previously) designed to take a closure to be
	  // invoked without arguments, but in all the cases we care about we
	  // already have an existing method we want to call, so there's no need
	  // to create a new function object. We can even get away with assuming
	  // the method takes exactly one argument, since that happens to be true
	  // in every case, so we don't have to touch the arguments object. The
	  // only additional allocation required is the completion record, which
	  // has a stable shape and so hopefully should be cheap to allocate.
	  function tryCatch(fn, obj, arg) {
	    try {
	      return { type: "normal", arg: fn.call(obj, arg) };
	    } catch (err) {
	      return { type: "throw", arg: err };
	    }
	  }

	  var GenStateSuspendedStart = "suspendedStart";
	  var GenStateSuspendedYield = "suspendedYield";
	  var GenStateExecuting = "executing";
	  var GenStateCompleted = "completed";

	  // Returning this object from the innerFn has the same effect as
	  // breaking out of the dispatch switch statement.
	  var ContinueSentinel = {};

	  // Dummy constructor functions that we use as the .constructor and
	  // .constructor.prototype properties for functions that return Generator
	  // objects. For full spec compliance, you may wish to configure your
	  // minifier not to mangle the names of these two functions.
	  function Generator() {}
	  function GeneratorFunction() {}
	  function GeneratorFunctionPrototype() {}

	  // This is a polyfill for %IteratorPrototype% for environments that
	  // don't natively support it.
	  var IteratorPrototype = {};
	  define(IteratorPrototype, iteratorSymbol, function () {
	    return this;
	  });

	  var getProto = Object.getPrototypeOf;
	  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
	  if (NativeIteratorPrototype &&
	      NativeIteratorPrototype !== Op &&
	      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	    // This environment has a native %IteratorPrototype%; use it instead
	    // of the polyfill.
	    IteratorPrototype = NativeIteratorPrototype;
	  }

	  var Gp = GeneratorFunctionPrototype.prototype =
	    Generator.prototype = Object.create(IteratorPrototype);
	  GeneratorFunction.prototype = GeneratorFunctionPrototype;
	  define(Gp, "constructor", GeneratorFunctionPrototype);
	  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
	  GeneratorFunction.displayName = define(
	    GeneratorFunctionPrototype,
	    toStringTagSymbol,
	    "GeneratorFunction"
	  );

	  // Helper for defining the .next, .throw, and .return methods of the
	  // Iterator interface in terms of a single ._invoke method.
	  function defineIteratorMethods(prototype) {
	    ["next", "throw", "return"].forEach(function(method) {
	      define(prototype, method, function(arg) {
	        return this._invoke(method, arg);
	      });
	    });
	  }

	  exports.isGeneratorFunction = function(genFun) {
	    var ctor = typeof genFun === "function" && genFun.constructor;
	    return ctor
	      ? ctor === GeneratorFunction ||
	        // For the native GeneratorFunction constructor, the best we can
	        // do is to check its .name property.
	        (ctor.displayName || ctor.name) === "GeneratorFunction"
	      : false;
	  };

	  exports.mark = function(genFun) {
	    if (Object.setPrototypeOf) {
	      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	    } else {
	      genFun.__proto__ = GeneratorFunctionPrototype;
	      define(genFun, toStringTagSymbol, "GeneratorFunction");
	    }
	    genFun.prototype = Object.create(Gp);
	    return genFun;
	  };

	  // Within the body of any async function, `await x` is transformed to
	  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	  // `hasOwn.call(value, "__await")` to determine if the yielded value is
	  // meant to be awaited.
	  exports.awrap = function(arg) {
	    return { __await: arg };
	  };

	  function AsyncIterator(generator, PromiseImpl) {
	    function invoke(method, arg, resolve, reject) {
	      var record = tryCatch(generator[method], generator, arg);
	      if (record.type === "throw") {
	        reject(record.arg);
	      } else {
	        var result = record.arg;
	        var value = result.value;
	        if (value &&
	            typeof value === "object" &&
	            hasOwn.call(value, "__await")) {
	          return PromiseImpl.resolve(value.__await).then(function(value) {
	            invoke("next", value, resolve, reject);
	          }, function(err) {
	            invoke("throw", err, resolve, reject);
	          });
	        }

	        return PromiseImpl.resolve(value).then(function(unwrapped) {
	          // When a yielded Promise is resolved, its final value becomes
	          // the .value of the Promise<{value,done}> result for the
	          // current iteration.
	          result.value = unwrapped;
	          resolve(result);
	        }, function(error) {
	          // If a rejected Promise was yielded, throw the rejection back
	          // into the async generator function so it can be handled there.
	          return invoke("throw", error, resolve, reject);
	        });
	      }
	    }

	    var previousPromise;

	    function enqueue(method, arg) {
	      function callInvokeWithMethodAndArg() {
	        return new PromiseImpl(function(resolve, reject) {
	          invoke(method, arg, resolve, reject);
	        });
	      }

	      return previousPromise =
	        // If enqueue has been called before, then we want to wait until
	        // all previous Promises have been resolved before calling invoke,
	        // so that results are always delivered in the correct order. If
	        // enqueue has not been called before, then it is important to
	        // call invoke immediately, without waiting on a callback to fire,
	        // so that the async generator function has the opportunity to do
	        // any necessary setup in a predictable way. This predictability
	        // is why the Promise constructor synchronously invokes its
	        // executor callback, and why async functions synchronously
	        // execute code before the first await. Since we implement simple
	        // async functions in terms of async generators, it is especially
	        // important to get this right, even though it requires care.
	        previousPromise ? previousPromise.then(
	          callInvokeWithMethodAndArg,
	          // Avoid propagating failures to Promises returned by later
	          // invocations of the iterator.
	          callInvokeWithMethodAndArg
	        ) : callInvokeWithMethodAndArg();
	    }

	    // Define the unified helper method that is used to implement .next,
	    // .throw, and .return (see defineIteratorMethods).
	    this._invoke = enqueue;
	  }

	  defineIteratorMethods(AsyncIterator.prototype);
	  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
	    return this;
	  });
	  exports.AsyncIterator = AsyncIterator;

	  // Note that simple async functions are implemented on top of
	  // AsyncIterator objects; they just return a Promise for the value of
	  // the final result produced by the iterator.
	  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
	    if (PromiseImpl === void 0) PromiseImpl = Promise;

	    var iter = new AsyncIterator(
	      wrap(innerFn, outerFn, self, tryLocsList),
	      PromiseImpl
	    );

	    return exports.isGeneratorFunction(outerFn)
	      ? iter // If outerFn is a generator, return the full iterator.
	      : iter.next().then(function(result) {
	          return result.done ? result.value : iter.next();
	        });
	  };

	  function makeInvokeMethod(innerFn, self, context) {
	    var state = GenStateSuspendedStart;

	    return function invoke(method, arg) {
	      if (state === GenStateExecuting) {
	        throw new Error("Generator is already running");
	      }

	      if (state === GenStateCompleted) {
	        if (method === "throw") {
	          throw arg;
	        }

	        // Be forgiving, per 25.3.3.3.3 of the spec:
	        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
	        return doneResult();
	      }

	      context.method = method;
	      context.arg = arg;

	      while (true) {
	        var delegate = context.delegate;
	        if (delegate) {
	          var delegateResult = maybeInvokeDelegate(delegate, context);
	          if (delegateResult) {
	            if (delegateResult === ContinueSentinel) continue;
	            return delegateResult;
	          }
	        }

	        if (context.method === "next") {
	          // Setting context._sent for legacy support of Babel's
	          // function.sent implementation.
	          context.sent = context._sent = context.arg;

	        } else if (context.method === "throw") {
	          if (state === GenStateSuspendedStart) {
	            state = GenStateCompleted;
	            throw context.arg;
	          }

	          context.dispatchException(context.arg);

	        } else if (context.method === "return") {
	          context.abrupt("return", context.arg);
	        }

	        state = GenStateExecuting;

	        var record = tryCatch(innerFn, self, context);
	        if (record.type === "normal") {
	          // If an exception is thrown from innerFn, we leave state ===
	          // GenStateExecuting and loop back for another invocation.
	          state = context.done
	            ? GenStateCompleted
	            : GenStateSuspendedYield;

	          if (record.arg === ContinueSentinel) {
	            continue;
	          }

	          return {
	            value: record.arg,
	            done: context.done
	          };

	        } else if (record.type === "throw") {
	          state = GenStateCompleted;
	          // Dispatch the exception by looping back around to the
	          // context.dispatchException(context.arg) call above.
	          context.method = "throw";
	          context.arg = record.arg;
	        }
	      }
	    };
	  }

	  // Call delegate.iterator[context.method](context.arg) and handle the
	  // result, either by returning a { value, done } result from the
	  // delegate iterator, or by modifying context.method and context.arg,
	  // setting context.delegate to null, and returning the ContinueSentinel.
	  function maybeInvokeDelegate(delegate, context) {
	    var method = delegate.iterator[context.method];
	    if (method === undefined$1) {
	      // A .throw or .return when the delegate iterator has no .throw
	      // method always terminates the yield* loop.
	      context.delegate = null;

	      if (context.method === "throw") {
	        // Note: ["return"] must be used for ES3 parsing compatibility.
	        if (delegate.iterator["return"]) {
	          // If the delegate iterator has a return method, give it a
	          // chance to clean up.
	          context.method = "return";
	          context.arg = undefined$1;
	          maybeInvokeDelegate(delegate, context);

	          if (context.method === "throw") {
	            // If maybeInvokeDelegate(context) changed context.method from
	            // "return" to "throw", let that override the TypeError below.
	            return ContinueSentinel;
	          }
	        }

	        context.method = "throw";
	        context.arg = new TypeError(
	          "The iterator does not provide a 'throw' method");
	      }

	      return ContinueSentinel;
	    }

	    var record = tryCatch(method, delegate.iterator, context.arg);

	    if (record.type === "throw") {
	      context.method = "throw";
	      context.arg = record.arg;
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    var info = record.arg;

	    if (! info) {
	      context.method = "throw";
	      context.arg = new TypeError("iterator result is not an object");
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    if (info.done) {
	      // Assign the result of the finished delegate to the temporary
	      // variable specified by delegate.resultName (see delegateYield).
	      context[delegate.resultName] = info.value;

	      // Resume execution at the desired location (see delegateYield).
	      context.next = delegate.nextLoc;

	      // If context.method was "throw" but the delegate handled the
	      // exception, let the outer generator proceed normally. If
	      // context.method was "next", forget context.arg since it has been
	      // "consumed" by the delegate iterator. If context.method was
	      // "return", allow the original .return call to continue in the
	      // outer generator.
	      if (context.method !== "return") {
	        context.method = "next";
	        context.arg = undefined$1;
	      }

	    } else {
	      // Re-yield the result returned by the delegate method.
	      return info;
	    }

	    // The delegate iterator is finished, so forget it and continue with
	    // the outer generator.
	    context.delegate = null;
	    return ContinueSentinel;
	  }

	  // Define Generator.prototype.{next,throw,return} in terms of the
	  // unified ._invoke helper method.
	  defineIteratorMethods(Gp);

	  define(Gp, toStringTagSymbol, "Generator");

	  // A Generator should always return itself as the iterator object when the
	  // @@iterator function is called on it. Some browsers' implementations of the
	  // iterator prototype chain incorrectly implement this, causing the Generator
	  // object to not be returned from this call. This ensures that doesn't happen.
	  // See https://github.com/facebook/regenerator/issues/274 for more details.
	  define(Gp, iteratorSymbol, function() {
	    return this;
	  });

	  define(Gp, "toString", function() {
	    return "[object Generator]";
	  });

	  function pushTryEntry(locs) {
	    var entry = { tryLoc: locs[0] };

	    if (1 in locs) {
	      entry.catchLoc = locs[1];
	    }

	    if (2 in locs) {
	      entry.finallyLoc = locs[2];
	      entry.afterLoc = locs[3];
	    }

	    this.tryEntries.push(entry);
	  }

	  function resetTryEntry(entry) {
	    var record = entry.completion || {};
	    record.type = "normal";
	    delete record.arg;
	    entry.completion = record;
	  }

	  function Context(tryLocsList) {
	    // The root entry object (effectively a try statement without a catch
	    // or a finally block) gives us a place to store values thrown from
	    // locations where there is no enclosing try statement.
	    this.tryEntries = [{ tryLoc: "root" }];
	    tryLocsList.forEach(pushTryEntry, this);
	    this.reset(true);
	  }

	  exports.keys = function(object) {
	    var keys = [];
	    for (var key in object) {
	      keys.push(key);
	    }
	    keys.reverse();

	    // Rather than returning an object with a next method, we keep
	    // things simple and return the next function itself.
	    return function next() {
	      while (keys.length) {
	        var key = keys.pop();
	        if (key in object) {
	          next.value = key;
	          next.done = false;
	          return next;
	        }
	      }

	      // To avoid creating an additional object, we just hang the .value
	      // and .done properties off the next function object itself. This
	      // also ensures that the minifier will not anonymize the function.
	      next.done = true;
	      return next;
	    };
	  };

	  function values(iterable) {
	    if (iterable) {
	      var iteratorMethod = iterable[iteratorSymbol];
	      if (iteratorMethod) {
	        return iteratorMethod.call(iterable);
	      }

	      if (typeof iterable.next === "function") {
	        return iterable;
	      }

	      if (!isNaN(iterable.length)) {
	        var i = -1, next = function next() {
	          while (++i < iterable.length) {
	            if (hasOwn.call(iterable, i)) {
	              next.value = iterable[i];
	              next.done = false;
	              return next;
	            }
	          }

	          next.value = undefined$1;
	          next.done = true;

	          return next;
	        };

	        return next.next = next;
	      }
	    }

	    // Return an iterator with no values.
	    return { next: doneResult };
	  }
	  exports.values = values;

	  function doneResult() {
	    return { value: undefined$1, done: true };
	  }

	  Context.prototype = {
	    constructor: Context,

	    reset: function(skipTempReset) {
	      this.prev = 0;
	      this.next = 0;
	      // Resetting context._sent for legacy support of Babel's
	      // function.sent implementation.
	      this.sent = this._sent = undefined$1;
	      this.done = false;
	      this.delegate = null;

	      this.method = "next";
	      this.arg = undefined$1;

	      this.tryEntries.forEach(resetTryEntry);

	      if (!skipTempReset) {
	        for (var name in this) {
	          // Not sure about the optimal order of these conditions:
	          if (name.charAt(0) === "t" &&
	              hasOwn.call(this, name) &&
	              !isNaN(+name.slice(1))) {
	            this[name] = undefined$1;
	          }
	        }
	      }
	    },

	    stop: function() {
	      this.done = true;

	      var rootEntry = this.tryEntries[0];
	      var rootRecord = rootEntry.completion;
	      if (rootRecord.type === "throw") {
	        throw rootRecord.arg;
	      }

	      return this.rval;
	    },

	    dispatchException: function(exception) {
	      if (this.done) {
	        throw exception;
	      }

	      var context = this;
	      function handle(loc, caught) {
	        record.type = "throw";
	        record.arg = exception;
	        context.next = loc;

	        if (caught) {
	          // If the dispatched exception was caught by a catch block,
	          // then let that catch block handle the exception normally.
	          context.method = "next";
	          context.arg = undefined$1;
	        }

	        return !! caught;
	      }

	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        var record = entry.completion;

	        if (entry.tryLoc === "root") {
	          // Exception thrown outside of any try block that could handle
	          // it, so set the completion value of the entire function to
	          // throw the exception.
	          return handle("end");
	        }

	        if (entry.tryLoc <= this.prev) {
	          var hasCatch = hasOwn.call(entry, "catchLoc");
	          var hasFinally = hasOwn.call(entry, "finallyLoc");

	          if (hasCatch && hasFinally) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            } else if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else if (hasCatch) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            }

	          } else if (hasFinally) {
	            if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else {
	            throw new Error("try statement without catch or finally");
	          }
	        }
	      }
	    },

	    abrupt: function(type, arg) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc <= this.prev &&
	            hasOwn.call(entry, "finallyLoc") &&
	            this.prev < entry.finallyLoc) {
	          var finallyEntry = entry;
	          break;
	        }
	      }

	      if (finallyEntry &&
	          (type === "break" ||
	           type === "continue") &&
	          finallyEntry.tryLoc <= arg &&
	          arg <= finallyEntry.finallyLoc) {
	        // Ignore the finally entry if control is not jumping to a
	        // location outside the try/catch block.
	        finallyEntry = null;
	      }

	      var record = finallyEntry ? finallyEntry.completion : {};
	      record.type = type;
	      record.arg = arg;

	      if (finallyEntry) {
	        this.method = "next";
	        this.next = finallyEntry.finallyLoc;
	        return ContinueSentinel;
	      }

	      return this.complete(record);
	    },

	    complete: function(record, afterLoc) {
	      if (record.type === "throw") {
	        throw record.arg;
	      }

	      if (record.type === "break" ||
	          record.type === "continue") {
	        this.next = record.arg;
	      } else if (record.type === "return") {
	        this.rval = this.arg = record.arg;
	        this.method = "return";
	        this.next = "end";
	      } else if (record.type === "normal" && afterLoc) {
	        this.next = afterLoc;
	      }

	      return ContinueSentinel;
	    },

	    finish: function(finallyLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.finallyLoc === finallyLoc) {
	          this.complete(entry.completion, entry.afterLoc);
	          resetTryEntry(entry);
	          return ContinueSentinel;
	        }
	      }
	    },

	    "catch": function(tryLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc === tryLoc) {
	          var record = entry.completion;
	          if (record.type === "throw") {
	            var thrown = record.arg;
	            resetTryEntry(entry);
	          }
	          return thrown;
	        }
	      }

	      // The context.catch method must only be called with a location
	      // argument that corresponds to a known catch block.
	      throw new Error("illegal catch attempt");
	    },

	    delegateYield: function(iterable, resultName, nextLoc) {
	      this.delegate = {
	        iterator: values(iterable),
	        resultName: resultName,
	        nextLoc: nextLoc
	      };

	      if (this.method === "next") {
	        // Deliberately forget the last sent value so that we don't
	        // accidentally pass it on to the delegate.
	        this.arg = undefined$1;
	      }

	      return ContinueSentinel;
	    }
	  };

	  // Regardless of whether this script is executing as a CommonJS module
	  // or not, return the runtime object so that we can declare the variable
	  // regeneratorRuntime in the outer scope, which allows this module to be
	  // injected easily by `bin/regenerator --include-runtime script.js`.
	  return exports;

	}(
	  // If this script is executing as a CommonJS module, use module.exports
	  // as the regeneratorRuntime namespace. Otherwise create a new empty
	  // object. Either way, the resulting object will be used to initialize
	  // the regeneratorRuntime variable at the top of this file.
	  module.exports 
	));

	try {
	  regeneratorRuntime = runtime;
	} catch (accidentalStrictMode) {
	  // This module should not be running in strict mode, so the above
	  // assignment should always work unless something is misconfigured. Just
	  // in case runtime.js accidentally runs in strict mode, in modern engines
	  // we can explicitly access globalThis. In older engines we can escape
	  // strict mode using a global Function call. This could conceivably fail
	  // if a Content Security Policy forbids using Function, but in that case
	  // the proper solution is to fix the accidental strict mode problem. If
	  // you've misconfigured your bundler to force strict mode and applied a
	  // CSP to forbid Function, and you're not willing to fix either of those
	  // problems, please detail your unique predicament in a GitHub issue.
	  if (typeof globalThis === "object") {
	    globalThis.regeneratorRuntime = runtime;
	  } else {
	    Function("r", "regeneratorRuntime = r")(runtime);
	  }
	}
	}(runtime));

	var regenerator = runtime.exports;

	/**
	 * This method returns `undefined`.
	 *
	 * @static
	 * @memberOf _
	 * @since 2.3.0
	 * @category Util
	 * @example
	 *
	 * _.times(2, _.noop);
	 * // => [undefined, undefined]
	 */

	function noop() {
	  // No operation performed.
	}

	var noop_1 = noop;

	function _arrayLikeToArray(arr, len) {
	  if (len == null || len > arr.length) len = arr.length;

	  for (var i = 0, arr2 = new Array(len); i < len; i++) {
	    arr2[i] = arr[i];
	  }

	  return arr2;
	}

	function _arrayWithoutHoles(arr) {
	  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
	}

	function _iterableToArray(iter) {
	  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
	}

	function _unsupportedIterableToArray(o, minLen) {
	  if (!o) return;
	  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	  var n = Object.prototype.toString.call(o).slice(8, -1);
	  if (n === "Object" && o.constructor) n = o.constructor.name;
	  if (n === "Map" || n === "Set") return Array.from(o);
	  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	}

	function _nonIterableSpread() {
	  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	}

	function _toConsumableArray(arr) {
	  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
	}

	function _typeof(obj) {
	  "@babel/helpers - typeof";

	  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	    _typeof = function _typeof(obj) {
	      return typeof obj;
	    };
	  } else {
	    _typeof = function _typeof(obj) {
	      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	    };
	  }

	  return _typeof(obj);
	}

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation.

	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */

	function __rest(s, e) {
	    var t = {};
	    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
	        t[p] = s[p];
	    if (s != null && typeof Object.getOwnPropertySymbols === "function")
	        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
	            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
	                t[p[i]] = s[p[i]];
	        }
	    return t;
	}

	function __awaiter(thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	}

	/* single-spa@5.9.3 - ESM - prod */
	var t=Object.freeze({__proto__:null,get start(){return xt},get ensureJQuerySupport(){return ft},get setBootstrapMaxTime(){return F},get setMountMaxTime(){return J},get setUnmountMaxTime(){return H},get setUnloadMaxTime(){return Q},get registerApplication(){return Ot},get unregisterApplication(){return Tt},get getMountedApps(){return Et},get getAppStatus(){return Pt},get unloadApplication(){return At},get checkActivityFunctions(){return bt},get getAppNames(){return yt},get pathToActiveWhen(){return _t},get navigateToUrl(){return nt},get triggerAppChange(){return Mt},get addErrorHandler(){return a},get removeErrorHandler(){return c$1},get mountRootParcel(){return C},get NOT_LOADED(){return l},get LOADING_SOURCE_CODE(){return p},get NOT_BOOTSTRAPPED(){return h},get BOOTSTRAPPING(){return m},get NOT_MOUNTED(){return v},get MOUNTING(){return d},get UPDATING(){return g},get LOAD_ERROR(){return y},get MOUNTED(){return w},get UNMOUNTING(){return E},get SKIP_BECAUSE_BROKEN(){return P}});function n(t){return (n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function e(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}var r=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{}).CustomEvent,o=function(){try{var t=new r("cat",{detail:{foo:"bar"}});return "cat"===t.type&&"bar"===t.detail.foo}catch(t){}return !1}()?r:"undefined"!=typeof document&&"function"==typeof document.createEvent?function(t,n){var e=document.createEvent("CustomEvent");return n?e.initCustomEvent(t,n.bubbles,n.cancelable,n.detail):e.initCustomEvent(t,!1,!1,void 0),e}:function(t,n){var e=document.createEventObject();return e.type=t,n?(e.bubbles=Boolean(n.bubbles),e.cancelable=Boolean(n.cancelable),e.detail=n.detail):(e.bubbles=!1,e.cancelable=!1,e.detail=void 0),e},i=[];function u(t,n,e){var r=f(t,n,e);i.length?i.forEach((function(t){return t(r)})):setTimeout((function(){throw r}));}function a(t){if("function"!=typeof t)throw Error(s(28,!1));i.push(t);}function c$1(t){if("function"!=typeof t)throw Error(s(29,!1));var n=!1;return i=i.filter((function(e){var r=e===t;return n=n||r,!r})),n}function s(t,n){for(var e=arguments.length,r=new Array(e>2?e-2:0),o=2;o<e;o++)r[o-2]=arguments[o];return "single-spa minified message #".concat(t,": ").concat(n?n+" ":"","See https://single-spa.js.org/error/?code=").concat(t).concat(r.length?"&arg=".concat(r.join("&arg=")):"")}function f(t,n,e){var r,o="".concat(N(n)," '").concat(T(n),"' died in status ").concat(n.status,": ");if(t instanceof Error){try{t.message=o+t.message;}catch(t){}r=t;}else {console.warn(s(30,!1,n.status,T(n)));try{r=Error(o+JSON.stringify(t));}catch(n){r=t;}}return r.appOrParcelName=T(n),n.status=e,r}var l="NOT_LOADED",p="LOADING_SOURCE_CODE",h="NOT_BOOTSTRAPPED",m="BOOTSTRAPPING",v="NOT_MOUNTED",d="MOUNTING",w="MOUNTED",g="UPDATING",E="UNMOUNTING",y="LOAD_ERROR",P="SKIP_BECAUSE_BROKEN";function O(t){return t.status===w}function b(t){try{return t.activeWhen(window.location)}catch(n){return u(n,t,P),!1}}function T(t){return t.name}function A(t){return Boolean(t.unmountThisParcel)}function N(t){return A(t)?"parcel":"application"}function S(){for(var t=arguments.length-1;t>0;t--)for(var n in arguments[t])"__proto__"!==n&&(arguments[t-1][n]=arguments[t][n]);return arguments[0]}function _(t,n){for(var e=0;e<t.length;e++)if(n(t[e]))return t[e];return null}function D(t){return t&&("function"==typeof t||(n=t,Array.isArray(n)&&!_(n,(function(t){return "function"!=typeof t}))));var n;}function U(t,n){var e=t[n]||[];0===(e=Array.isArray(e)?e:[e]).length&&(e=[function(){return Promise.resolve()}]);var r=N(t),o=T(t);return function(t){return e.reduce((function(e,i,u){return e.then((function(){var e=i(t);return j(e)?e:Promise.reject(s(15,!1,r,o,n,u))}))}),Promise.resolve())}}function j(t){return t&&"function"==typeof t.then&&"function"==typeof t.catch}function M(t,n){return Promise.resolve().then((function(){return t.status!==h?t:(t.status=m,t.bootstrap?V(t,"bootstrap").then(e).catch((function(e){if(n)throw f(e,t,P);return u(e,t,P),t})):Promise.resolve().then(e))}));function e(){return t.status=v,t}}function L(t,n){return Promise.resolve().then((function(){if(t.status!==w)return t;t.status=E;var e=Object.keys(t.parcels).map((function(n){return t.parcels[n].unmountThisParcel()}));return Promise.all(e).then(r,(function(e){return r().then((function(){var r=Error(e.message);if(n)throw f(r,t,P);u(r,t,P);}))})).then((function(){return t}));function r(){return V(t,"unmount").then((function(){t.status=v;})).catch((function(e){if(n)throw f(e,t,P);u(e,t,P);}))}}))}var R=!1,I=!1;function x(t,n){return Promise.resolve().then((function(){return t.status!==v?t:(R||(window.dispatchEvent(new o("single-spa:before-first-mount")),R=!0),V(t,"mount").then((function(){return t.status=w,I||(window.dispatchEvent(new o("single-spa:first-mount")),I=!0),t})).catch((function(e){return t.status=w,L(t,!0).then(r,r);function r(){if(n)throw f(e,t,P);return u(e,t,P),t}})))}))}var B=0,G={parcels:{}};function C(){return W.apply(G,arguments)}function W(t,e){var r=this;if(!t||"object"!==n(t)&&"function"!=typeof t)throw Error(s(2,!1));if(t.name&&"string"!=typeof t.name)throw Error(s(3,!1,n(t.name)));if("object"!==n(e))throw Error(s(4,!1,name,n(e)));if(!e.domElement)throw Error(s(5,!1,name));var o,i=B++,u="function"==typeof t,a=u?t:function(){return Promise.resolve(t)},c={id:i,parcels:{},status:u?p:h,customProps:e,parentName:T(r),unmountThisParcel:function(){return y.then((function(){if(c.status!==w)throw Error(s(6,!1,name,c.status));return L(c,!0)})).then((function(t){return c.parentName&&delete r.parcels[c.id],t})).then((function(t){return m(t),t})).catch((function(t){throw c.status=P,d(t),t}))}};r.parcels[i]=c;var l=a();if(!l||"function"!=typeof l.then)throw Error(s(7,!1));var m,d,E=(l=l.then((function(t){if(!t)throw Error(s(8,!1));var n=t.name||"parcel-".concat(i);if(Object.prototype.hasOwnProperty.call(t,"bootstrap")&&!D(t.bootstrap))throw Error(s(9,!1,n));if(!D(t.mount))throw Error(s(10,!1,n));if(!D(t.unmount))throw Error(s(11,!1,n));if(t.update&&!D(t.update))throw Error(s(12,!1,n));var e=U(t,"bootstrap"),r=U(t,"mount"),u=U(t,"unmount");c.status=h,c.name=n,c.bootstrap=e,c.mount=r,c.unmount=u,c.timeouts=q(t.timeouts),t.update&&(c.update=U(t,"update"),o.update=function(t){return c.customProps=t,$(function(t){return Promise.resolve().then((function(){if(t.status!==w)throw Error(s(32,!1,T(t)));return t.status=g,V(t,"update").then((function(){return t.status=w,t})).catch((function(n){throw f(n,t,P)}))}))}(c))});}))).then((function(){return M(c,!0)})),y=E.then((function(){return x(c,!0)})),O=new Promise((function(t,n){m=t,d=n;}));return o={mount:function(){return $(Promise.resolve().then((function(){if(c.status!==v)throw Error(s(13,!1,name,c.status));return r.parcels[i]=c,x(c)})))},unmount:function(){return $(c.unmountThisParcel())},getStatus:function(){return c.status},loadPromise:$(l),bootstrapPromise:$(E),mountPromise:$(y),unmountPromise:$(O)}}function $(t){return t.then((function(){return null}))}function k(e){var r=T(e),o="function"==typeof e.customProps?e.customProps(r,window.location):e.customProps;("object"!==n(o)||null===o||Array.isArray(o))&&(o={},console.warn(s(40,!1),r,o));var i=S({},o,{name:r,mountParcel:W.bind(e),singleSpa:t});return A(e)&&(i.unmountSelf=e.unmountThisParcel),i}var K={bootstrap:{millis:4e3,dieOnTimeout:!1,warningMillis:1e3},mount:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},unmount:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},unload:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},update:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3}};function F(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(16,!1));K.bootstrap={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function J(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(17,!1));K.mount={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function H(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(18,!1));K.unmount={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function Q(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(19,!1));K.unload={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function V(t,n){var e=t.timeouts[n],r=e.warningMillis,o=N(t);return new Promise((function(i,u){var a=!1,c=!1;t[n](k(t)).then((function(t){a=!0,i(t);})).catch((function(t){a=!0,u(t);})),setTimeout((function(){return l(1)}),r),setTimeout((function(){return l(!0)}),e.millis);var f=s(31,!1,n,o,T(t),e.millis);function l(t){if(!a)if(!0===t)c=!0,e.dieOnTimeout?u(Error(f)):console.error(f);else if(!c){var n=t,o=n*r;console.warn(f),o+r<e.millis&&setTimeout((function(){return l(n+1)}),r);}}}))}function q(t){var n={};for(var e in K)n[e]=S({},K[e],t&&t[e]||{});return n}function z(t){return Promise.resolve().then((function(){return t.loadPromise?t.loadPromise:t.status!==l&&t.status!==y?t:(t.status=p,t.loadPromise=Promise.resolve().then((function(){var o=t.loadApp(k(t));if(!j(o))throw r=!0,Error(s(33,!1,T(t)));return o.then((function(r){var o;t.loadErrorTime=null,"object"!==n(e=r)&&(o=34),Object.prototype.hasOwnProperty.call(e,"bootstrap")&&!D(e.bootstrap)&&(o=35),D(e.mount)||(o=36),D(e.unmount)||(o=37);var i=N(e);if(o){var a;try{a=JSON.stringify(e);}catch(t){}return console.error(s(o,!1,i,T(t),a),e),u(void 0,t,P),t}return e.devtools&&e.devtools.overlays&&(t.devtools.overlays=S({},t.devtools.overlays,e.devtools.overlays)),t.status=h,t.bootstrap=U(e,"bootstrap"),t.mount=U(e,"mount"),t.unmount=U(e,"unmount"),t.unload=U(e,"unload"),t.timeouts=q(e.timeouts),delete t.loadPromise,t}))})).catch((function(n){var e;return delete t.loadPromise,r?e=P:(e=y,t.loadErrorTime=(new Date).getTime()),u(n,t,e),t})));var e,r;}))}var X,Y="undefined"!=typeof window,Z={hashchange:[],popstate:[]},tt=["hashchange","popstate"];function nt(t){var n;if("string"==typeof t)n=t;else if(this&&this.href)n=this.href;else {if(!(t&&t.currentTarget&&t.currentTarget.href&&t.preventDefault))throw Error(s(14,!1));n=t.currentTarget.href,t.preventDefault();}var e=ct(window.location.href),r=ct(n);0===n.indexOf("#")?window.location.hash=r.hash:e.host!==r.host&&r.host?window.location.href=n:r.pathname===e.pathname&&r.search===e.search?window.location.hash=r.hash:window.history.pushState(null,null,n);}function et(t){var n=this;if(t){var e=t[0].type;tt.indexOf(e)>=0&&Z[e].forEach((function(e){try{e.apply(n,t);}catch(t){setTimeout((function(){throw t}));}}));}}function rt(){Lt([],arguments);}function ot(t,n){return function(){var e=window.location.href,r=t.apply(this,arguments),o=window.location.href;return X&&e===o||(Bt()?window.dispatchEvent(it(window.history.state,n)):Lt([])),r}}function it(t,n){var e;try{e=new PopStateEvent("popstate",{state:t});}catch(n){(e=document.createEvent("PopStateEvent")).initPopStateEvent("popstate",!1,!1,t);}return e.singleSpa=!0,e.singleSpaTrigger=n,e}if(Y){window.addEventListener("hashchange",rt),window.addEventListener("popstate",rt);var ut=window.addEventListener,at=window.removeEventListener;window.addEventListener=function(t,n){if(!("function"==typeof n&&tt.indexOf(t)>=0)||_(Z[t],(function(t){return t===n})))return ut.apply(this,arguments);Z[t].push(n);},window.removeEventListener=function(t,n){if(!("function"==typeof n&&tt.indexOf(t)>=0))return at.apply(this,arguments);Z[t]=Z[t].filter((function(t){return t!==n}));},window.history.pushState=ot(window.history.pushState,"pushState"),window.history.replaceState=ot(window.history.replaceState,"replaceState"),window.singleSpaNavigate?console.warn(s(41,!1)):window.singleSpaNavigate=nt;}function ct(t){var n=document.createElement("a");return n.href=t,n}var st=!1;function ft(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:window.jQuery;if(t||window.$&&window.$.fn&&window.$.fn.jquery&&(t=window.$),t&&!st){var n=t.fn.on,e=t.fn.off;t.fn.on=function(t,e){return lt.call(this,n,window.addEventListener,t,e,arguments)},t.fn.off=function(t,n){return lt.call(this,e,window.removeEventListener,t,n,arguments)},st=!0;}}function lt(t,n,e,r,o){return "string"!=typeof e?t.apply(this,o):(e.split(/\s+/).forEach((function(t){tt.indexOf(t)>=0&&(n(t,r),e=e.replace(t,""));})),""===e.trim()?this:t.apply(this,o))}var pt={};function ht(t){return Promise.resolve().then((function(){var n=pt[T(t)];if(!n)return t;if(t.status===l)return mt(t,n),t;if("UNLOADING"===t.status)return n.promise.then((function(){return t}));if(t.status!==v&&t.status!==y)return t;var e=t.status===y?Promise.resolve():V(t,"unload");return t.status="UNLOADING",e.then((function(){return mt(t,n),t})).catch((function(e){return function(t,n,e){delete pt[T(t)],delete t.bootstrap,delete t.mount,delete t.unmount,delete t.unload,u(e,t,P),n.reject(e);}(t,n,e),t}))}))}function mt(t,n){delete pt[T(t)],delete t.bootstrap,delete t.mount,delete t.unmount,delete t.unload,t.status=l,n.resolve();}function vt(t,n,e,r){pt[T(t)]={app:t,resolve:e,reject:r},Object.defineProperty(pt[T(t)],"promise",{get:n});}function dt(t){return pt[t]}var wt=[];function gt(){var t=[],n=[],e=[],r=[],o=(new Date).getTime();return wt.forEach((function(i){var u=i.status!==P&&b(i);switch(i.status){case y:u&&o-i.loadErrorTime>=200&&e.push(i);break;case l:case p:u&&e.push(i);break;case h:case v:!u&&dt(T(i))?t.push(i):u&&r.push(i);break;case w:u||n.push(i);}})),{appsToUnload:t,appsToUnmount:n,appsToLoad:e,appsToMount:r}}function Et(){return wt.filter(O).map(T)}function yt(){return wt.map(T)}function Pt(t){var n=_(wt,(function(n){return T(n)===t}));return n?n.status:null}function Ot(t,e,r,o){var i=function(t,e,r,o){var i,u={name:null,loadApp:null,activeWhen:null,customProps:null};return "object"===n(t)?(function(t){if(Array.isArray(t)||null===t)throw Error(s(39,!1));var e=["name","app","activeWhen","customProps"],r=Object.keys(t).reduce((function(t,n){return e.indexOf(n)>=0?t:t.concat(n)}),[]);if(0!==r.length)throw Error(s(38,!1,e.join(", "),r.join(", ")));if("string"!=typeof t.name||0===t.name.length)throw Error(s(20,!1));if("object"!==n(t.app)&&"function"!=typeof t.app)throw Error(s(20,!1));var o=function(t){return "string"==typeof t||"function"==typeof t};if(!(o(t.activeWhen)||Array.isArray(t.activeWhen)&&t.activeWhen.every(o)))throw Error(s(24,!1));if(!St(t.customProps))throw Error(s(22,!1))}(t),u.name=t.name,u.loadApp=t.app,u.activeWhen=t.activeWhen,u.customProps=t.customProps):(function(t,n,e,r){if("string"!=typeof t||0===t.length)throw Error(s(20,!1));if(!n)throw Error(s(23,!1));if("function"!=typeof e)throw Error(s(24,!1));if(!St(r))throw Error(s(22,!1))}(t,e,r,o),u.name=t,u.loadApp=e,u.activeWhen=r,u.customProps=o),u.loadApp="function"!=typeof(i=u.loadApp)?function(){return Promise.resolve(i)}:i,u.customProps=function(t){return t||{}}(u.customProps),u.activeWhen=function(t){var n=Array.isArray(t)?t:[t];return n=n.map((function(t){return "function"==typeof t?t:_t(t)})),function(t){return n.some((function(n){return n(t)}))}}(u.activeWhen),u}(t,e,r,o);if(-1!==yt().indexOf(i.name))throw Error(s(21,!1,i.name));wt.push(S({loadErrorTime:null,status:l,parcels:{},devtools:{overlays:{options:{},selectors:[]}}},i)),Y&&(ft(),Lt());}function bt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:window.location;return wt.filter((function(n){return n.activeWhen(t)})).map(T)}function Tt(t){if(0===wt.filter((function(n){return T(n)===t})).length)throw Error(s(25,!1,t));return At(t).then((function(){var n=wt.map(T).indexOf(t);wt.splice(n,1);}))}function At(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{waitForUnmount:!1};if("string"!=typeof t)throw Error(s(26,!1));var e=_(wt,(function(n){return T(n)===t}));if(!e)throw Error(s(27,!1,t));var r,o=dt(T(e));if(n&&n.waitForUnmount){if(o)return o.promise;var i=new Promise((function(t,n){vt(e,(function(){return i}),t,n);}));return i}return o?(r=o.promise,Nt(e,o.resolve,o.reject)):r=new Promise((function(t,n){vt(e,(function(){return r}),t,n),Nt(e,t,n);})),r}function Nt(t,n,e){L(t).then(ht).then((function(){n(),setTimeout((function(){Lt();}));})).catch(e);}function St(t){return !t||"function"==typeof t||"object"===n(t)&&null!==t&&!Array.isArray(t)}function _t(t,n){var e=function(t,n){var e=0,r=!1,o="^";"/"!==t[0]&&(t="/"+t);for(var i=0;i<t.length;i++){var u=t[i];(!r&&":"===u||r&&"/"===u)&&a(i);}return a(t.length),new RegExp(o,"i");function a(i){var u=t.slice(e,i).replace(/[|\\{}()[\]^$+*?.]/g,"\\$&");if(o+=r?"[^/]+/?":u,i===t.length)if(r)n&&(o+="$");else {var a=n?"":".*";o="/"===o.charAt(o.length-1)?"".concat(o).concat(a,"$"):"".concat(o,"(/").concat(a,")?(#.*)?$");}r=!r,e=i;}}(t,n);return function(t){var n=t.origin;n||(n="".concat(t.protocol,"//").concat(t.host));var r=t.href.replace(n,"").replace(t.search,"").split("?")[0];return e.test(r)}}var Dt=!1,Ut=[],jt=Y&&window.location.href;function Mt(){return Lt()}function Lt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],n=arguments.length>1?arguments[1]:void 0;if(Dt)return new Promise((function(t,e){Ut.push({resolve:t,reject:e,eventArguments:n});}));var r,i=gt(),u=i.appsToUnload,a=i.appsToUnmount,c=i.appsToLoad,s=i.appsToMount,f=!1,p=jt,h=jt=window.location.href;return Bt()?(Dt=!0,r=u.concat(c,a,s),g()):(r=c,d());function m(){f=!0;}function d(){return Promise.resolve().then((function(){var t=c.map(z);return Promise.all(t).then(y).then((function(){return []})).catch((function(t){throw y(),t}))}))}function g(){return Promise.resolve().then((function(){if(window.dispatchEvent(new o(0===r.length?"single-spa:before-no-app-change":"single-spa:before-app-change",O(!0))),window.dispatchEvent(new o("single-spa:before-routing-event",O(!0,{cancelNavigation:m}))),f)return window.dispatchEvent(new o("single-spa:before-mount-routing-event",O(!0))),E(),void nt(p);var n=u.map(ht),e=a.map(L).map((function(t){return t.then(ht)})).concat(n),i=Promise.all(e);i.then((function(){window.dispatchEvent(new o("single-spa:before-mount-routing-event",O(!0)));}));var l=c.map((function(t){return z(t).then((function(t){return Rt(t,i)}))})),h=s.filter((function(t){return c.indexOf(t)<0})).map((function(t){return Rt(t,i)}));return i.catch((function(t){throw y(),t})).then((function(){return y(),Promise.all(l.concat(h)).catch((function(n){throw t.forEach((function(t){return t.reject(n)})),n})).then(E)}))}))}function E(){var n=Et();t.forEach((function(t){return t.resolve(n)}));try{var e=0===r.length?"single-spa:no-app-change":"single-spa:app-change";window.dispatchEvent(new o(e,O())),window.dispatchEvent(new o("single-spa:routing-event",O()));}catch(t){setTimeout((function(){throw t}));}if(Dt=!1,Ut.length>0){var i=Ut;Ut=[],Lt(i);}return n}function y(){t.forEach((function(t){et(t.eventArguments);})),et(n);}function O(){var t,o=arguments.length>0&&void 0!==arguments[0]&&arguments[0],i=arguments.length>1?arguments[1]:void 0,m={},d=(e(t={},w,[]),e(t,v,[]),e(t,l,[]),e(t,P,[]),t);o?(c.concat(s).forEach((function(t,n){E(t,w);})),u.forEach((function(t){E(t,l);})),a.forEach((function(t){E(t,v);}))):r.forEach((function(t){E(t);}));var g={detail:{newAppStatuses:m,appsByNewStatus:d,totalAppChanges:r.length,originalEvent:null==n?void 0:n[0],oldUrl:p,newUrl:h,navigationIsCanceled:f}};return i&&S(g.detail,i),g;function E(t,n){var e=T(t);n=n||Pt(e),m[e]=n,(d[n]=d[n]||[]).push(e);}}}function Rt(t,n){return b(t)?M(t).then((function(t){return n.then((function(){return b(t)?x(t):t}))})):n.then((function(){return t}))}var It=!1;function xt(t){var n;It=!0,t&&t.urlRerouteOnly&&(n=t.urlRerouteOnly,X=n),Y&&Lt();}function Bt(){return It}Y&&setTimeout((function(){It||console.warn(s(1,!1));}),5e3);var Gt={getRawAppData:function(){return [].concat(wt)},reroute:Lt,NOT_LOADED:l,toLoadPromise:z,toBootstrapPromise:M,unregisterApplication:Tt};Y&&window.__SINGLE_SPA_DEVTOOLS__&&(window.__SINGLE_SPA_DEVTOOLS__.exposedMethods=Gt);

	/**
	 * Appends the elements of `values` to `array`.
	 *
	 * @private
	 * @param {Array} array The array to modify.
	 * @param {Array} values The values to append.
	 * @returns {Array} Returns `array`.
	 */

	function arrayPush$4(array, values) {
	  var index = -1,
	      length = values.length,
	      offset = array.length;

	  while (++index < length) {
	    array[offset + index] = values[index];
	  }
	  return array;
	}

	var _arrayPush = arrayPush$4;

	/** Detect free variable `global` from Node.js. */

	var freeGlobal$1 = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

	var _freeGlobal = freeGlobal$1;

	var freeGlobal = _freeGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root$8 = freeGlobal || freeSelf || Function('return this')();

	var _root = root$8;

	var root$7 = _root;

	/** Built-in value references. */
	var Symbol$6 = root$7.Symbol;

	var _Symbol = Symbol$6;

	var Symbol$5 = _Symbol;

	/** Used for built-in method references. */
	var objectProto$d = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$a = objectProto$d.hasOwnProperty;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var nativeObjectToString$1 = objectProto$d.toString;

	/** Built-in value references. */
	var symToStringTag$1 = Symbol$5 ? Symbol$5.toStringTag : undefined;

	/**
	 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the raw `toStringTag`.
	 */
	function getRawTag$1(value) {
	  var isOwn = hasOwnProperty$a.call(value, symToStringTag$1),
	      tag = value[symToStringTag$1];

	  try {
	    value[symToStringTag$1] = undefined;
	    var unmasked = true;
	  } catch (e) {}

	  var result = nativeObjectToString$1.call(value);
	  if (unmasked) {
	    if (isOwn) {
	      value[symToStringTag$1] = tag;
	    } else {
	      delete value[symToStringTag$1];
	    }
	  }
	  return result;
	}

	var _getRawTag = getRawTag$1;

	/** Used for built-in method references. */

	var objectProto$c = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var nativeObjectToString = objectProto$c.toString;

	/**
	 * Converts `value` to a string using `Object.prototype.toString`.
	 *
	 * @private
	 * @param {*} value The value to convert.
	 * @returns {string} Returns the converted string.
	 */
	function objectToString$1(value) {
	  return nativeObjectToString.call(value);
	}

	var _objectToString = objectToString$1;

	var Symbol$4 = _Symbol,
	    getRawTag = _getRawTag,
	    objectToString = _objectToString;

	/** `Object#toString` result references. */
	var nullTag = '[object Null]',
	    undefinedTag = '[object Undefined]';

	/** Built-in value references. */
	var symToStringTag = Symbol$4 ? Symbol$4.toStringTag : undefined;

	/**
	 * The base implementation of `getTag` without fallbacks for buggy environments.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	function baseGetTag$6(value) {
	  if (value == null) {
	    return value === undefined ? undefinedTag : nullTag;
	  }
	  return (symToStringTag && symToStringTag in Object(value))
	    ? getRawTag(value)
	    : objectToString(value);
	}

	var _baseGetTag = baseGetTag$6;

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */

	function isObjectLike$8(value) {
	  return value != null && typeof value == 'object';
	}

	var isObjectLike_1 = isObjectLike$8;

	var baseGetTag$5 = _baseGetTag,
	    isObjectLike$7 = isObjectLike_1;

	/** `Object#toString` result references. */
	var argsTag$2 = '[object Arguments]';

	/**
	 * The base implementation of `_.isArguments`.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
	 */
	function baseIsArguments$1(value) {
	  return isObjectLike$7(value) && baseGetTag$5(value) == argsTag$2;
	}

	var _baseIsArguments = baseIsArguments$1;

	var baseIsArguments = _baseIsArguments,
	    isObjectLike$6 = isObjectLike_1;

	/** Used for built-in method references. */
	var objectProto$b = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$9 = objectProto$b.hasOwnProperty;

	/** Built-in value references. */
	var propertyIsEnumerable$1 = objectProto$b.propertyIsEnumerable;

	/**
	 * Checks if `value` is likely an `arguments` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArguments(function() { return arguments; }());
	 * // => true
	 *
	 * _.isArguments([1, 2, 3]);
	 * // => false
	 */
	var isArguments$3 = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
	  return isObjectLike$6(value) && hasOwnProperty$9.call(value, 'callee') &&
	    !propertyIsEnumerable$1.call(value, 'callee');
	};

	var isArguments_1 = isArguments$3;

	/**
	 * Checks if `value` is classified as an `Array` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
	 * @example
	 *
	 * _.isArray([1, 2, 3]);
	 * // => true
	 *
	 * _.isArray(document.body.children);
	 * // => false
	 *
	 * _.isArray('abc');
	 * // => false
	 *
	 * _.isArray(_.noop);
	 * // => false
	 */

	var isArray$8 = Array.isArray;

	var isArray_1 = isArray$8;

	var Symbol$3 = _Symbol,
	    isArguments$2 = isArguments_1,
	    isArray$7 = isArray_1;

	/** Built-in value references. */
	var spreadableSymbol = Symbol$3 ? Symbol$3.isConcatSpreadable : undefined;

	/**
	 * Checks if `value` is a flattenable `arguments` object or array.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
	 */
	function isFlattenable$1(value) {
	  return isArray$7(value) || isArguments$2(value) ||
	    !!(spreadableSymbol && value && value[spreadableSymbol]);
	}

	var _isFlattenable = isFlattenable$1;

	var arrayPush$3 = _arrayPush,
	    isFlattenable = _isFlattenable;

	/**
	 * The base implementation of `_.flatten` with support for restricting flattening.
	 *
	 * @private
	 * @param {Array} array The array to flatten.
	 * @param {number} depth The maximum recursion depth.
	 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
	 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
	 * @param {Array} [result=[]] The initial result value.
	 * @returns {Array} Returns the new flattened array.
	 */
	function baseFlatten$1(array, depth, predicate, isStrict, result) {
	  var index = -1,
	      length = array.length;

	  predicate || (predicate = isFlattenable);
	  result || (result = []);

	  while (++index < length) {
	    var value = array[index];
	    if (depth > 0 && predicate(value)) {
	      if (depth > 1) {
	        // Recursively flatten arrays (susceptible to call stack limits).
	        baseFlatten$1(value, depth - 1, predicate, isStrict, result);
	      } else {
	        arrayPush$3(result, value);
	      }
	    } else if (!isStrict) {
	      result[result.length] = value;
	    }
	  }
	  return result;
	}

	var _baseFlatten = baseFlatten$1;

	/**
	 * Copies the values of `source` to `array`.
	 *
	 * @private
	 * @param {Array} source The array to copy values from.
	 * @param {Array} [array=[]] The array to copy values to.
	 * @returns {Array} Returns `array`.
	 */

	function copyArray$3(source, array) {
	  var index = -1,
	      length = source.length;

	  array || (array = Array(length));
	  while (++index < length) {
	    array[index] = source[index];
	  }
	  return array;
	}

	var _copyArray = copyArray$3;

	var arrayPush$2 = _arrayPush,
	    baseFlatten = _baseFlatten,
	    copyArray$2 = _copyArray,
	    isArray$6 = isArray_1;

	/**
	 * Creates a new array concatenating `array` with any additional arrays
	 * and/or values.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Array
	 * @param {Array} array The array to concatenate.
	 * @param {...*} [values] The values to concatenate.
	 * @returns {Array} Returns the new concatenated array.
	 * @example
	 *
	 * var array = [1];
	 * var other = _.concat(array, 2, [3], [[4]]);
	 *
	 * console.log(other);
	 * // => [1, 2, 3, [4]]
	 *
	 * console.log(array);
	 * // => [1]
	 */
	function concat() {
	  var length = arguments.length;
	  if (!length) {
	    return [];
	  }
	  var args = Array(length - 1),
	      array = arguments[0],
	      index = length;

	  while (index--) {
	    args[index - 1] = arguments[index];
	  }
	  return arrayPush$2(isArray$6(array) ? copyArray$2(array) : [array], baseFlatten(args, 1));
	}

	var concat_1 = concat;

	var _concat = concat_1;

	/**
	 * Removes all key-value entries from the list cache.
	 *
	 * @private
	 * @name clear
	 * @memberOf ListCache
	 */

	function listCacheClear$1() {
	  this.__data__ = [];
	  this.size = 0;
	}

	var _listCacheClear = listCacheClear$1;

	/**
	 * Performs a
	 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * comparison between two values to determine if they are equivalent.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to compare.
	 * @param {*} other The other value to compare.
	 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	 * @example
	 *
	 * var object = { 'a': 1 };
	 * var other = { 'a': 1 };
	 *
	 * _.eq(object, object);
	 * // => true
	 *
	 * _.eq(object, other);
	 * // => false
	 *
	 * _.eq('a', 'a');
	 * // => true
	 *
	 * _.eq('a', Object('a'));
	 * // => false
	 *
	 * _.eq(NaN, NaN);
	 * // => true
	 */

	function eq$4(value, other) {
	  return value === other || (value !== value && other !== other);
	}

	var eq_1 = eq$4;

	var eq$3 = eq_1;

	/**
	 * Gets the index at which the `key` is found in `array` of key-value pairs.
	 *
	 * @private
	 * @param {Array} array The array to inspect.
	 * @param {*} key The key to search for.
	 * @returns {number} Returns the index of the matched value, else `-1`.
	 */
	function assocIndexOf$4(array, key) {
	  var length = array.length;
	  while (length--) {
	    if (eq$3(array[length][0], key)) {
	      return length;
	    }
	  }
	  return -1;
	}

	var _assocIndexOf = assocIndexOf$4;

	var assocIndexOf$3 = _assocIndexOf;

	/** Used for built-in method references. */
	var arrayProto = Array.prototype;

	/** Built-in value references. */
	var splice = arrayProto.splice;

	/**
	 * Removes `key` and its value from the list cache.
	 *
	 * @private
	 * @name delete
	 * @memberOf ListCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function listCacheDelete$1(key) {
	  var data = this.__data__,
	      index = assocIndexOf$3(data, key);

	  if (index < 0) {
	    return false;
	  }
	  var lastIndex = data.length - 1;
	  if (index == lastIndex) {
	    data.pop();
	  } else {
	    splice.call(data, index, 1);
	  }
	  --this.size;
	  return true;
	}

	var _listCacheDelete = listCacheDelete$1;

	var assocIndexOf$2 = _assocIndexOf;

	/**
	 * Gets the list cache value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf ListCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function listCacheGet$1(key) {
	  var data = this.__data__,
	      index = assocIndexOf$2(data, key);

	  return index < 0 ? undefined : data[index][1];
	}

	var _listCacheGet = listCacheGet$1;

	var assocIndexOf$1 = _assocIndexOf;

	/**
	 * Checks if a list cache value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf ListCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function listCacheHas$1(key) {
	  return assocIndexOf$1(this.__data__, key) > -1;
	}

	var _listCacheHas = listCacheHas$1;

	var assocIndexOf = _assocIndexOf;

	/**
	 * Sets the list cache `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf ListCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the list cache instance.
	 */
	function listCacheSet$1(key, value) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  if (index < 0) {
	    ++this.size;
	    data.push([key, value]);
	  } else {
	    data[index][1] = value;
	  }
	  return this;
	}

	var _listCacheSet = listCacheSet$1;

	var listCacheClear = _listCacheClear,
	    listCacheDelete = _listCacheDelete,
	    listCacheGet = _listCacheGet,
	    listCacheHas = _listCacheHas,
	    listCacheSet = _listCacheSet;

	/**
	 * Creates an list cache object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function ListCache$4(entries) {
	  var index = -1,
	      length = entries == null ? 0 : entries.length;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	// Add methods to `ListCache`.
	ListCache$4.prototype.clear = listCacheClear;
	ListCache$4.prototype['delete'] = listCacheDelete;
	ListCache$4.prototype.get = listCacheGet;
	ListCache$4.prototype.has = listCacheHas;
	ListCache$4.prototype.set = listCacheSet;

	var _ListCache = ListCache$4;

	var ListCache$3 = _ListCache;

	/**
	 * Removes all key-value entries from the stack.
	 *
	 * @private
	 * @name clear
	 * @memberOf Stack
	 */
	function stackClear$1() {
	  this.__data__ = new ListCache$3;
	  this.size = 0;
	}

	var _stackClear = stackClear$1;

	/**
	 * Removes `key` and its value from the stack.
	 *
	 * @private
	 * @name delete
	 * @memberOf Stack
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */

	function stackDelete$1(key) {
	  var data = this.__data__,
	      result = data['delete'](key);

	  this.size = data.size;
	  return result;
	}

	var _stackDelete = stackDelete$1;

	/**
	 * Gets the stack value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Stack
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */

	function stackGet$1(key) {
	  return this.__data__.get(key);
	}

	var _stackGet = stackGet$1;

	/**
	 * Checks if a stack value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Stack
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */

	function stackHas$1(key) {
	  return this.__data__.has(key);
	}

	var _stackHas = stackHas$1;

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */

	function isObject$8(value) {
	  var type = typeof value;
	  return value != null && (type == 'object' || type == 'function');
	}

	var isObject_1 = isObject$8;

	var baseGetTag$4 = _baseGetTag,
	    isObject$7 = isObject_1;

	/** `Object#toString` result references. */
	var asyncTag = '[object AsyncFunction]',
	    funcTag$2 = '[object Function]',
	    genTag$1 = '[object GeneratorFunction]',
	    proxyTag = '[object Proxy]';

	/**
	 * Checks if `value` is classified as a `Function` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
	 * @example
	 *
	 * _.isFunction(_);
	 * // => true
	 *
	 * _.isFunction(/abc/);
	 * // => false
	 */
	function isFunction$3(value) {
	  if (!isObject$7(value)) {
	    return false;
	  }
	  // The use of `Object#toString` avoids issues with the `typeof` operator
	  // in Safari 9 which returns 'object' for typed arrays and other constructors.
	  var tag = baseGetTag$4(value);
	  return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
	}

	var isFunction_1 = isFunction$3;

	var root$6 = _root;

	/** Used to detect overreaching core-js shims. */
	var coreJsData$1 = root$6['__core-js_shared__'];

	var _coreJsData = coreJsData$1;

	var coreJsData = _coreJsData;

	/** Used to detect methods masquerading as native. */
	var maskSrcKey = (function() {
	  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
	  return uid ? ('Symbol(src)_1.' + uid) : '';
	}());

	/**
	 * Checks if `func` has its source masked.
	 *
	 * @private
	 * @param {Function} func The function to check.
	 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
	 */
	function isMasked$1(func) {
	  return !!maskSrcKey && (maskSrcKey in func);
	}

	var _isMasked = isMasked$1;

	/** Used for built-in method references. */

	var funcProto$2 = Function.prototype;

	/** Used to resolve the decompiled source of functions. */
	var funcToString$2 = funcProto$2.toString;

	/**
	 * Converts `func` to its source code.
	 *
	 * @private
	 * @param {Function} func The function to convert.
	 * @returns {string} Returns the source code.
	 */
	function toSource$2(func) {
	  if (func != null) {
	    try {
	      return funcToString$2.call(func);
	    } catch (e) {}
	    try {
	      return (func + '');
	    } catch (e) {}
	  }
	  return '';
	}

	var _toSource = toSource$2;

	var isFunction$2 = isFunction_1,
	    isMasked = _isMasked,
	    isObject$6 = isObject_1,
	    toSource$1 = _toSource;

	/**
	 * Used to match `RegExp`
	 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
	 */
	var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

	/** Used to detect host constructors (Safari). */
	var reIsHostCtor = /^\[object .+?Constructor\]$/;

	/** Used for built-in method references. */
	var funcProto$1 = Function.prototype,
	    objectProto$a = Object.prototype;

	/** Used to resolve the decompiled source of functions. */
	var funcToString$1 = funcProto$1.toString;

	/** Used to check objects for own properties. */
	var hasOwnProperty$8 = objectProto$a.hasOwnProperty;

	/** Used to detect if a method is native. */
	var reIsNative = RegExp('^' +
	  funcToString$1.call(hasOwnProperty$8).replace(reRegExpChar, '\\$&')
	  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
	);

	/**
	 * The base implementation of `_.isNative` without bad shim checks.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a native function,
	 *  else `false`.
	 */
	function baseIsNative$1(value) {
	  if (!isObject$6(value) || isMasked(value)) {
	    return false;
	  }
	  var pattern = isFunction$2(value) ? reIsNative : reIsHostCtor;
	  return pattern.test(toSource$1(value));
	}

	var _baseIsNative = baseIsNative$1;

	/**
	 * Gets the value at `key` of `object`.
	 *
	 * @private
	 * @param {Object} [object] The object to query.
	 * @param {string} key The key of the property to get.
	 * @returns {*} Returns the property value.
	 */

	function getValue$1(object, key) {
	  return object == null ? undefined : object[key];
	}

	var _getValue = getValue$1;

	var baseIsNative = _baseIsNative,
	    getValue = _getValue;

	/**
	 * Gets the native function at `key` of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {string} key The key of the method to get.
	 * @returns {*} Returns the function if it's native, else `undefined`.
	 */
	function getNative$7(object, key) {
	  var value = getValue(object, key);
	  return baseIsNative(value) ? value : undefined;
	}

	var _getNative = getNative$7;

	var getNative$6 = _getNative,
	    root$5 = _root;

	/* Built-in method references that are verified to be native. */
	var Map$4 = getNative$6(root$5, 'Map');

	var _Map = Map$4;

	var getNative$5 = _getNative;

	/* Built-in method references that are verified to be native. */
	var nativeCreate$4 = getNative$5(Object, 'create');

	var _nativeCreate = nativeCreate$4;

	var nativeCreate$3 = _nativeCreate;

	/**
	 * Removes all key-value entries from the hash.
	 *
	 * @private
	 * @name clear
	 * @memberOf Hash
	 */
	function hashClear$1() {
	  this.__data__ = nativeCreate$3 ? nativeCreate$3(null) : {};
	  this.size = 0;
	}

	var _hashClear = hashClear$1;

	/**
	 * Removes `key` and its value from the hash.
	 *
	 * @private
	 * @name delete
	 * @memberOf Hash
	 * @param {Object} hash The hash to modify.
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */

	function hashDelete$1(key) {
	  var result = this.has(key) && delete this.__data__[key];
	  this.size -= result ? 1 : 0;
	  return result;
	}

	var _hashDelete = hashDelete$1;

	var nativeCreate$2 = _nativeCreate;

	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

	/** Used for built-in method references. */
	var objectProto$9 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$7 = objectProto$9.hasOwnProperty;

	/**
	 * Gets the hash value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Hash
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function hashGet$1(key) {
	  var data = this.__data__;
	  if (nativeCreate$2) {
	    var result = data[key];
	    return result === HASH_UNDEFINED$1 ? undefined : result;
	  }
	  return hasOwnProperty$7.call(data, key) ? data[key] : undefined;
	}

	var _hashGet = hashGet$1;

	var nativeCreate$1 = _nativeCreate;

	/** Used for built-in method references. */
	var objectProto$8 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$6 = objectProto$8.hasOwnProperty;

	/**
	 * Checks if a hash value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Hash
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function hashHas$1(key) {
	  var data = this.__data__;
	  return nativeCreate$1 ? (data[key] !== undefined) : hasOwnProperty$6.call(data, key);
	}

	var _hashHas = hashHas$1;

	var nativeCreate = _nativeCreate;

	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = '__lodash_hash_undefined__';

	/**
	 * Sets the hash `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Hash
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the hash instance.
	 */
	function hashSet$1(key, value) {
	  var data = this.__data__;
	  this.size += this.has(key) ? 0 : 1;
	  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
	  return this;
	}

	var _hashSet = hashSet$1;

	var hashClear = _hashClear,
	    hashDelete = _hashDelete,
	    hashGet = _hashGet,
	    hashHas = _hashHas,
	    hashSet = _hashSet;

	/**
	 * Creates a hash object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Hash$1(entries) {
	  var index = -1,
	      length = entries == null ? 0 : entries.length;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	// Add methods to `Hash`.
	Hash$1.prototype.clear = hashClear;
	Hash$1.prototype['delete'] = hashDelete;
	Hash$1.prototype.get = hashGet;
	Hash$1.prototype.has = hashHas;
	Hash$1.prototype.set = hashSet;

	var _Hash = Hash$1;

	var Hash = _Hash,
	    ListCache$2 = _ListCache,
	    Map$3 = _Map;

	/**
	 * Removes all key-value entries from the map.
	 *
	 * @private
	 * @name clear
	 * @memberOf MapCache
	 */
	function mapCacheClear$1() {
	  this.size = 0;
	  this.__data__ = {
	    'hash': new Hash,
	    'map': new (Map$3 || ListCache$2),
	    'string': new Hash
	  };
	}

	var _mapCacheClear = mapCacheClear$1;

	/**
	 * Checks if `value` is suitable for use as unique object key.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	 */

	function isKeyable$1(value) {
	  var type = typeof value;
	  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
	    ? (value !== '__proto__')
	    : (value === null);
	}

	var _isKeyable = isKeyable$1;

	var isKeyable = _isKeyable;

	/**
	 * Gets the data for `map`.
	 *
	 * @private
	 * @param {Object} map The map to query.
	 * @param {string} key The reference key.
	 * @returns {*} Returns the map data.
	 */
	function getMapData$4(map, key) {
	  var data = map.__data__;
	  return isKeyable(key)
	    ? data[typeof key == 'string' ? 'string' : 'hash']
	    : data.map;
	}

	var _getMapData = getMapData$4;

	var getMapData$3 = _getMapData;

	/**
	 * Removes `key` and its value from the map.
	 *
	 * @private
	 * @name delete
	 * @memberOf MapCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function mapCacheDelete$1(key) {
	  var result = getMapData$3(this, key)['delete'](key);
	  this.size -= result ? 1 : 0;
	  return result;
	}

	var _mapCacheDelete = mapCacheDelete$1;

	var getMapData$2 = _getMapData;

	/**
	 * Gets the map value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf MapCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function mapCacheGet$1(key) {
	  return getMapData$2(this, key).get(key);
	}

	var _mapCacheGet = mapCacheGet$1;

	var getMapData$1 = _getMapData;

	/**
	 * Checks if a map value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf MapCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function mapCacheHas$1(key) {
	  return getMapData$1(this, key).has(key);
	}

	var _mapCacheHas = mapCacheHas$1;

	var getMapData = _getMapData;

	/**
	 * Sets the map `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf MapCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the map cache instance.
	 */
	function mapCacheSet$1(key, value) {
	  var data = getMapData(this, key),
	      size = data.size;

	  data.set(key, value);
	  this.size += data.size == size ? 0 : 1;
	  return this;
	}

	var _mapCacheSet = mapCacheSet$1;

	var mapCacheClear = _mapCacheClear,
	    mapCacheDelete = _mapCacheDelete,
	    mapCacheGet = _mapCacheGet,
	    mapCacheHas = _mapCacheHas,
	    mapCacheSet = _mapCacheSet;

	/**
	 * Creates a map cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function MapCache$1(entries) {
	  var index = -1,
	      length = entries == null ? 0 : entries.length;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	// Add methods to `MapCache`.
	MapCache$1.prototype.clear = mapCacheClear;
	MapCache$1.prototype['delete'] = mapCacheDelete;
	MapCache$1.prototype.get = mapCacheGet;
	MapCache$1.prototype.has = mapCacheHas;
	MapCache$1.prototype.set = mapCacheSet;

	var _MapCache = MapCache$1;

	var ListCache$1 = _ListCache,
	    Map$2 = _Map,
	    MapCache = _MapCache;

	/** Used as the size to enable large array optimizations. */
	var LARGE_ARRAY_SIZE = 200;

	/**
	 * Sets the stack `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Stack
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the stack cache instance.
	 */
	function stackSet$1(key, value) {
	  var data = this.__data__;
	  if (data instanceof ListCache$1) {
	    var pairs = data.__data__;
	    if (!Map$2 || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
	      pairs.push([key, value]);
	      this.size = ++data.size;
	      return this;
	    }
	    data = this.__data__ = new MapCache(pairs);
	  }
	  data.set(key, value);
	  this.size = data.size;
	  return this;
	}

	var _stackSet = stackSet$1;

	var ListCache = _ListCache,
	    stackClear = _stackClear,
	    stackDelete = _stackDelete,
	    stackGet = _stackGet,
	    stackHas = _stackHas,
	    stackSet = _stackSet;

	/**
	 * Creates a stack cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Stack$2(entries) {
	  var data = this.__data__ = new ListCache(entries);
	  this.size = data.size;
	}

	// Add methods to `Stack`.
	Stack$2.prototype.clear = stackClear;
	Stack$2.prototype['delete'] = stackDelete;
	Stack$2.prototype.get = stackGet;
	Stack$2.prototype.has = stackHas;
	Stack$2.prototype.set = stackSet;

	var _Stack = Stack$2;

	var getNative$4 = _getNative;

	var defineProperty$2 = (function() {
	  try {
	    var func = getNative$4(Object, 'defineProperty');
	    func({}, '', {});
	    return func;
	  } catch (e) {}
	}());

	var _defineProperty$1 = defineProperty$2;

	var defineProperty$1 = _defineProperty$1;

	/**
	 * The base implementation of `assignValue` and `assignMergeValue` without
	 * value checks.
	 *
	 * @private
	 * @param {Object} object The object to modify.
	 * @param {string} key The key of the property to assign.
	 * @param {*} value The value to assign.
	 */
	function baseAssignValue$3(object, key, value) {
	  if (key == '__proto__' && defineProperty$1) {
	    defineProperty$1(object, key, {
	      'configurable': true,
	      'enumerable': true,
	      'value': value,
	      'writable': true
	    });
	  } else {
	    object[key] = value;
	  }
	}

	var _baseAssignValue = baseAssignValue$3;

	var baseAssignValue$2 = _baseAssignValue,
	    eq$2 = eq_1;

	/**
	 * This function is like `assignValue` except that it doesn't assign
	 * `undefined` values.
	 *
	 * @private
	 * @param {Object} object The object to modify.
	 * @param {string} key The key of the property to assign.
	 * @param {*} value The value to assign.
	 */
	function assignMergeValue$2(object, key, value) {
	  if ((value !== undefined && !eq$2(object[key], value)) ||
	      (value === undefined && !(key in object))) {
	    baseAssignValue$2(object, key, value);
	  }
	}

	var _assignMergeValue = assignMergeValue$2;

	/**
	 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
	 *
	 * @private
	 * @param {boolean} [fromRight] Specify iterating from right to left.
	 * @returns {Function} Returns the new base function.
	 */

	function createBaseFor$1(fromRight) {
	  return function(object, iteratee, keysFunc) {
	    var index = -1,
	        iterable = Object(object),
	        props = keysFunc(object),
	        length = props.length;

	    while (length--) {
	      var key = props[fromRight ? length : ++index];
	      if (iteratee(iterable[key], key, iterable) === false) {
	        break;
	      }
	    }
	    return object;
	  };
	}

	var _createBaseFor = createBaseFor$1;

	var createBaseFor = _createBaseFor;

	/**
	 * The base implementation of `baseForOwn` which iterates over `object`
	 * properties returned by `keysFunc` and invokes `iteratee` for each property.
	 * Iteratee functions may exit iteration early by explicitly returning `false`.
	 *
	 * @private
	 * @param {Object} object The object to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @param {Function} keysFunc The function to get the keys of `object`.
	 * @returns {Object} Returns `object`.
	 */
	var baseFor$2 = createBaseFor();

	var _baseFor = baseFor$2;

	var _cloneBuffer = {exports: {}};

	(function (module, exports) {
	var root = _root;

	/** Detect free variable `exports`. */
	var freeExports = exports && !exports.nodeType && exports;

	/** Detect free variable `module`. */
	var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;

	/** Built-in value references. */
	var Buffer = moduleExports ? root.Buffer : undefined,
	    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

	/**
	 * Creates a clone of  `buffer`.
	 *
	 * @private
	 * @param {Buffer} buffer The buffer to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Buffer} Returns the cloned buffer.
	 */
	function cloneBuffer(buffer, isDeep) {
	  if (isDeep) {
	    return buffer.slice();
	  }
	  var length = buffer.length,
	      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

	  buffer.copy(result);
	  return result;
	}

	module.exports = cloneBuffer;
	}(_cloneBuffer, _cloneBuffer.exports));

	var root$4 = _root;

	/** Built-in value references. */
	var Uint8Array$1 = root$4.Uint8Array;

	var _Uint8Array = Uint8Array$1;

	var Uint8Array = _Uint8Array;

	/**
	 * Creates a clone of `arrayBuffer`.
	 *
	 * @private
	 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
	 * @returns {ArrayBuffer} Returns the cloned array buffer.
	 */
	function cloneArrayBuffer$3(arrayBuffer) {
	  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
	  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
	  return result;
	}

	var _cloneArrayBuffer = cloneArrayBuffer$3;

	var cloneArrayBuffer$2 = _cloneArrayBuffer;

	/**
	 * Creates a clone of `typedArray`.
	 *
	 * @private
	 * @param {Object} typedArray The typed array to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned typed array.
	 */
	function cloneTypedArray$2(typedArray, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer$2(typedArray.buffer) : typedArray.buffer;
	  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
	}

	var _cloneTypedArray = cloneTypedArray$2;

	var isObject$5 = isObject_1;

	/** Built-in value references. */
	var objectCreate = Object.create;

	/**
	 * The base implementation of `_.create` without support for assigning
	 * properties to the created object.
	 *
	 * @private
	 * @param {Object} proto The object to inherit from.
	 * @returns {Object} Returns the new object.
	 */
	var baseCreate$1 = (function() {
	  function object() {}
	  return function(proto) {
	    if (!isObject$5(proto)) {
	      return {};
	    }
	    if (objectCreate) {
	      return objectCreate(proto);
	    }
	    object.prototype = proto;
	    var result = new object;
	    object.prototype = undefined;
	    return result;
	  };
	}());

	var _baseCreate = baseCreate$1;

	/**
	 * Creates a unary function that invokes `func` with its argument transformed.
	 *
	 * @private
	 * @param {Function} func The function to wrap.
	 * @param {Function} transform The argument transform.
	 * @returns {Function} Returns the new function.
	 */

	function overArg$2(func, transform) {
	  return function(arg) {
	    return func(transform(arg));
	  };
	}

	var _overArg = overArg$2;

	var overArg$1 = _overArg;

	/** Built-in value references. */
	var getPrototype$3 = overArg$1(Object.getPrototypeOf, Object);

	var _getPrototype = getPrototype$3;

	/** Used for built-in method references. */

	var objectProto$7 = Object.prototype;

	/**
	 * Checks if `value` is likely a prototype object.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	 */
	function isPrototype$3(value) {
	  var Ctor = value && value.constructor,
	      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$7;

	  return value === proto;
	}

	var _isPrototype = isPrototype$3;

	var baseCreate = _baseCreate,
	    getPrototype$2 = _getPrototype,
	    isPrototype$2 = _isPrototype;

	/**
	 * Initializes an object clone.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneObject$2(object) {
	  return (typeof object.constructor == 'function' && !isPrototype$2(object))
	    ? baseCreate(getPrototype$2(object))
	    : {};
	}

	var _initCloneObject = initCloneObject$2;

	/** Used as references for various `Number` constants. */

	var MAX_SAFE_INTEGER$1 = 9007199254740991;

	/**
	 * Checks if `value` is a valid array-like length.
	 *
	 * **Note:** This method is loosely based on
	 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	 * @example
	 *
	 * _.isLength(3);
	 * // => true
	 *
	 * _.isLength(Number.MIN_VALUE);
	 * // => false
	 *
	 * _.isLength(Infinity);
	 * // => false
	 *
	 * _.isLength('3');
	 * // => false
	 */
	function isLength$2(value) {
	  return typeof value == 'number' &&
	    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
	}

	var isLength_1 = isLength$2;

	var isFunction$1 = isFunction_1,
	    isLength$1 = isLength_1;

	/**
	 * Checks if `value` is array-like. A value is considered array-like if it's
	 * not a function and has a `value.length` that's an integer greater than or
	 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	 * @example
	 *
	 * _.isArrayLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLike(document.body.children);
	 * // => true
	 *
	 * _.isArrayLike('abc');
	 * // => true
	 *
	 * _.isArrayLike(_.noop);
	 * // => false
	 */
	function isArrayLike$5(value) {
	  return value != null && isLength$1(value.length) && !isFunction$1(value);
	}

	var isArrayLike_1 = isArrayLike$5;

	var isArrayLike$4 = isArrayLike_1,
	    isObjectLike$5 = isObjectLike_1;

	/**
	 * This method is like `_.isArrayLike` except that it also checks if `value`
	 * is an object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array-like object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArrayLikeObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLikeObject(document.body.children);
	 * // => true
	 *
	 * _.isArrayLikeObject('abc');
	 * // => false
	 *
	 * _.isArrayLikeObject(_.noop);
	 * // => false
	 */
	function isArrayLikeObject$1(value) {
	  return isObjectLike$5(value) && isArrayLike$4(value);
	}

	var isArrayLikeObject_1 = isArrayLikeObject$1;

	var isBuffer$3 = {exports: {}};

	/**
	 * This method returns `false`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {boolean} Returns `false`.
	 * @example
	 *
	 * _.times(2, _.stubFalse);
	 * // => [false, false]
	 */

	function stubFalse() {
	  return false;
	}

	var stubFalse_1 = stubFalse;

	(function (module, exports) {
	var root = _root,
	    stubFalse = stubFalse_1;

	/** Detect free variable `exports`. */
	var freeExports = exports && !exports.nodeType && exports;

	/** Detect free variable `module`. */
	var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;

	/** Built-in value references. */
	var Buffer = moduleExports ? root.Buffer : undefined;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

	/**
	 * Checks if `value` is a buffer.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.3.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
	 * @example
	 *
	 * _.isBuffer(new Buffer(2));
	 * // => true
	 *
	 * _.isBuffer(new Uint8Array(2));
	 * // => false
	 */
	var isBuffer = nativeIsBuffer || stubFalse;

	module.exports = isBuffer;
	}(isBuffer$3, isBuffer$3.exports));

	var baseGetTag$3 = _baseGetTag,
	    getPrototype$1 = _getPrototype,
	    isObjectLike$4 = isObjectLike_1;

	/** `Object#toString` result references. */
	var objectTag$3 = '[object Object]';

	/** Used for built-in method references. */
	var funcProto = Function.prototype,
	    objectProto$6 = Object.prototype;

	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;

	/** Used to check objects for own properties. */
	var hasOwnProperty$5 = objectProto$6.hasOwnProperty;

	/** Used to infer the `Object` constructor. */
	var objectCtorString = funcToString.call(Object);

	/**
	 * Checks if `value` is a plain object, that is, an object created by the
	 * `Object` constructor or one with a `[[Prototype]]` of `null`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.8.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 * }
	 *
	 * _.isPlainObject(new Foo);
	 * // => false
	 *
	 * _.isPlainObject([1, 2, 3]);
	 * // => false
	 *
	 * _.isPlainObject({ 'x': 0, 'y': 0 });
	 * // => true
	 *
	 * _.isPlainObject(Object.create(null));
	 * // => true
	 */
	function isPlainObject$1(value) {
	  if (!isObjectLike$4(value) || baseGetTag$3(value) != objectTag$3) {
	    return false;
	  }
	  var proto = getPrototype$1(value);
	  if (proto === null) {
	    return true;
	  }
	  var Ctor = hasOwnProperty$5.call(proto, 'constructor') && proto.constructor;
	  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
	    funcToString.call(Ctor) == objectCtorString;
	}

	var isPlainObject_1 = isPlainObject$1;

	var baseGetTag$2 = _baseGetTag,
	    isLength = isLength_1,
	    isObjectLike$3 = isObjectLike_1;

	/** `Object#toString` result references. */
	var argsTag$1 = '[object Arguments]',
	    arrayTag$1 = '[object Array]',
	    boolTag$2 = '[object Boolean]',
	    dateTag$2 = '[object Date]',
	    errorTag$1 = '[object Error]',
	    funcTag$1 = '[object Function]',
	    mapTag$4 = '[object Map]',
	    numberTag$2 = '[object Number]',
	    objectTag$2 = '[object Object]',
	    regexpTag$2 = '[object RegExp]',
	    setTag$4 = '[object Set]',
	    stringTag$2 = '[object String]',
	    weakMapTag$2 = '[object WeakMap]';

	var arrayBufferTag$2 = '[object ArrayBuffer]',
	    dataViewTag$3 = '[object DataView]',
	    float32Tag$2 = '[object Float32Array]',
	    float64Tag$2 = '[object Float64Array]',
	    int8Tag$2 = '[object Int8Array]',
	    int16Tag$2 = '[object Int16Array]',
	    int32Tag$2 = '[object Int32Array]',
	    uint8Tag$2 = '[object Uint8Array]',
	    uint8ClampedTag$2 = '[object Uint8ClampedArray]',
	    uint16Tag$2 = '[object Uint16Array]',
	    uint32Tag$2 = '[object Uint32Array]';

	/** Used to identify `toStringTag` values of typed arrays. */
	var typedArrayTags = {};
	typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] =
	typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] =
	typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] =
	typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] =
	typedArrayTags[uint32Tag$2] = true;
	typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] =
	typedArrayTags[arrayBufferTag$2] = typedArrayTags[boolTag$2] =
	typedArrayTags[dataViewTag$3] = typedArrayTags[dateTag$2] =
	typedArrayTags[errorTag$1] = typedArrayTags[funcTag$1] =
	typedArrayTags[mapTag$4] = typedArrayTags[numberTag$2] =
	typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$2] =
	typedArrayTags[setTag$4] = typedArrayTags[stringTag$2] =
	typedArrayTags[weakMapTag$2] = false;

	/**
	 * The base implementation of `_.isTypedArray` without Node.js optimizations.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
	 */
	function baseIsTypedArray$1(value) {
	  return isObjectLike$3(value) &&
	    isLength(value.length) && !!typedArrayTags[baseGetTag$2(value)];
	}

	var _baseIsTypedArray = baseIsTypedArray$1;

	/**
	 * The base implementation of `_.unary` without support for storing metadata.
	 *
	 * @private
	 * @param {Function} func The function to cap arguments for.
	 * @returns {Function} Returns the new capped function.
	 */

	function baseUnary$3(func) {
	  return function(value) {
	    return func(value);
	  };
	}

	var _baseUnary = baseUnary$3;

	var _nodeUtil = {exports: {}};

	(function (module, exports) {
	var freeGlobal = _freeGlobal;

	/** Detect free variable `exports`. */
	var freeExports = exports && !exports.nodeType && exports;

	/** Detect free variable `module`. */
	var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;

	/** Detect free variable `process` from Node.js. */
	var freeProcess = moduleExports && freeGlobal.process;

	/** Used to access faster Node.js helpers. */
	var nodeUtil = (function() {
	  try {
	    // Use `util.types` for Node.js 10+.
	    var types = freeModule && freeModule.require && freeModule.require('util').types;

	    if (types) {
	      return types;
	    }

	    // Legacy `process.binding('util')` for Node.js < 10.
	    return freeProcess && freeProcess.binding && freeProcess.binding('util');
	  } catch (e) {}
	}());

	module.exports = nodeUtil;
	}(_nodeUtil, _nodeUtil.exports));

	var baseIsTypedArray = _baseIsTypedArray,
	    baseUnary$2 = _baseUnary,
	    nodeUtil$2 = _nodeUtil.exports;

	/* Node.js helper references. */
	var nodeIsTypedArray = nodeUtil$2 && nodeUtil$2.isTypedArray;

	/**
	 * Checks if `value` is classified as a typed array.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
	 * @example
	 *
	 * _.isTypedArray(new Uint8Array);
	 * // => true
	 *
	 * _.isTypedArray([]);
	 * // => false
	 */
	var isTypedArray$2 = nodeIsTypedArray ? baseUnary$2(nodeIsTypedArray) : baseIsTypedArray;

	var isTypedArray_1 = isTypedArray$2;

	/**
	 * Gets the value at `key`, unless `key` is "__proto__" or "constructor".
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {string} key The key of the property to get.
	 * @returns {*} Returns the property value.
	 */

	function safeGet$2(object, key) {
	  if (key === 'constructor' && typeof object[key] === 'function') {
	    return;
	  }

	  if (key == '__proto__') {
	    return;
	  }

	  return object[key];
	}

	var _safeGet = safeGet$2;

	var baseAssignValue$1 = _baseAssignValue,
	    eq$1 = eq_1;

	/** Used for built-in method references. */
	var objectProto$5 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

	/**
	 * Assigns `value` to `key` of `object` if the existing value is not equivalent
	 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * for equality comparisons.
	 *
	 * @private
	 * @param {Object} object The object to modify.
	 * @param {string} key The key of the property to assign.
	 * @param {*} value The value to assign.
	 */
	function assignValue$2(object, key, value) {
	  var objValue = object[key];
	  if (!(hasOwnProperty$4.call(object, key) && eq$1(objValue, value)) ||
	      (value === undefined && !(key in object))) {
	    baseAssignValue$1(object, key, value);
	  }
	}

	var _assignValue = assignValue$2;

	var assignValue$1 = _assignValue,
	    baseAssignValue = _baseAssignValue;

	/**
	 * Copies properties of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy properties from.
	 * @param {Array} props The property identifiers to copy.
	 * @param {Object} [object={}] The object to copy properties to.
	 * @param {Function} [customizer] The function to customize copied values.
	 * @returns {Object} Returns `object`.
	 */
	function copyObject$5(source, props, object, customizer) {
	  var isNew = !object;
	  object || (object = {});

	  var index = -1,
	      length = props.length;

	  while (++index < length) {
	    var key = props[index];

	    var newValue = customizer
	      ? customizer(object[key], source[key], key, object, source)
	      : undefined;

	    if (newValue === undefined) {
	      newValue = source[key];
	    }
	    if (isNew) {
	      baseAssignValue(object, key, newValue);
	    } else {
	      assignValue$1(object, key, newValue);
	    }
	  }
	  return object;
	}

	var _copyObject = copyObject$5;

	/**
	 * The base implementation of `_.times` without support for iteratee shorthands
	 * or max array length checks.
	 *
	 * @private
	 * @param {number} n The number of times to invoke `iteratee`.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns the array of results.
	 */

	function baseTimes$1(n, iteratee) {
	  var index = -1,
	      result = Array(n);

	  while (++index < n) {
	    result[index] = iteratee(index);
	  }
	  return result;
	}

	var _baseTimes = baseTimes$1;

	/** Used as references for various `Number` constants. */

	var MAX_SAFE_INTEGER = 9007199254740991;

	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;

	/**
	 * Checks if `value` is a valid array-like index.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	 */
	function isIndex$2(value, length) {
	  var type = typeof value;
	  length = length == null ? MAX_SAFE_INTEGER : length;

	  return !!length &&
	    (type == 'number' ||
	      (type != 'symbol' && reIsUint.test(value))) &&
	        (value > -1 && value % 1 == 0 && value < length);
	}

	var _isIndex = isIndex$2;

	var baseTimes = _baseTimes,
	    isArguments$1 = isArguments_1,
	    isArray$5 = isArray_1,
	    isBuffer$2 = isBuffer$3.exports,
	    isIndex$1 = _isIndex,
	    isTypedArray$1 = isTypedArray_1;

	/** Used for built-in method references. */
	var objectProto$4 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

	/**
	 * Creates an array of the enumerable property names of the array-like `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @param {boolean} inherited Specify returning inherited property names.
	 * @returns {Array} Returns the array of property names.
	 */
	function arrayLikeKeys$2(value, inherited) {
	  var isArr = isArray$5(value),
	      isArg = !isArr && isArguments$1(value),
	      isBuff = !isArr && !isArg && isBuffer$2(value),
	      isType = !isArr && !isArg && !isBuff && isTypedArray$1(value),
	      skipIndexes = isArr || isArg || isBuff || isType,
	      result = skipIndexes ? baseTimes(value.length, String) : [],
	      length = result.length;

	  for (var key in value) {
	    if ((inherited || hasOwnProperty$3.call(value, key)) &&
	        !(skipIndexes && (
	           // Safari 9 has enumerable `arguments.length` in strict mode.
	           key == 'length' ||
	           // Node.js 0.10 has enumerable non-index properties on buffers.
	           (isBuff && (key == 'offset' || key == 'parent')) ||
	           // PhantomJS 2 has enumerable non-index properties on typed arrays.
	           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
	           // Skip index properties.
	           isIndex$1(key, length)
	        ))) {
	      result.push(key);
	    }
	  }
	  return result;
	}

	var _arrayLikeKeys = arrayLikeKeys$2;

	/**
	 * This function is like
	 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	 * except that it includes inherited enumerable properties.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 */

	function nativeKeysIn$1(object) {
	  var result = [];
	  if (object != null) {
	    for (var key in Object(object)) {
	      result.push(key);
	    }
	  }
	  return result;
	}

	var _nativeKeysIn = nativeKeysIn$1;

	var isObject$4 = isObject_1,
	    isPrototype$1 = _isPrototype,
	    nativeKeysIn = _nativeKeysIn;

	/** Used for built-in method references. */
	var objectProto$3 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

	/**
	 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 */
	function baseKeysIn$1(object) {
	  if (!isObject$4(object)) {
	    return nativeKeysIn(object);
	  }
	  var isProto = isPrototype$1(object),
	      result = [];

	  for (var key in object) {
	    if (!(key == 'constructor' && (isProto || !hasOwnProperty$2.call(object, key)))) {
	      result.push(key);
	    }
	  }
	  return result;
	}

	var _baseKeysIn = baseKeysIn$1;

	var arrayLikeKeys$1 = _arrayLikeKeys,
	    baseKeysIn = _baseKeysIn,
	    isArrayLike$3 = isArrayLike_1;

	/**
	 * Creates an array of the own and inherited enumerable property names of `object`.
	 *
	 * **Note:** Non-object values are coerced to objects.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category Object
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 *   this.b = 2;
	 * }
	 *
	 * Foo.prototype.c = 3;
	 *
	 * _.keysIn(new Foo);
	 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
	 */
	function keysIn$5(object) {
	  return isArrayLike$3(object) ? arrayLikeKeys$1(object, true) : baseKeysIn(object);
	}

	var keysIn_1 = keysIn$5;

	var copyObject$4 = _copyObject,
	    keysIn$4 = keysIn_1;

	/**
	 * Converts `value` to a plain object flattening inherited enumerable string
	 * keyed properties of `value` to own properties of the plain object.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category Lang
	 * @param {*} value The value to convert.
	 * @returns {Object} Returns the converted plain object.
	 * @example
	 *
	 * function Foo() {
	 *   this.b = 2;
	 * }
	 *
	 * Foo.prototype.c = 3;
	 *
	 * _.assign({ 'a': 1 }, new Foo);
	 * // => { 'a': 1, 'b': 2 }
	 *
	 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
	 * // => { 'a': 1, 'b': 2, 'c': 3 }
	 */
	function toPlainObject$1(value) {
	  return copyObject$4(value, keysIn$4(value));
	}

	var toPlainObject_1 = toPlainObject$1;

	var assignMergeValue$1 = _assignMergeValue,
	    cloneBuffer$1 = _cloneBuffer.exports,
	    cloneTypedArray$1 = _cloneTypedArray,
	    copyArray$1 = _copyArray,
	    initCloneObject$1 = _initCloneObject,
	    isArguments = isArguments_1,
	    isArray$4 = isArray_1,
	    isArrayLikeObject = isArrayLikeObject_1,
	    isBuffer$1 = isBuffer$3.exports,
	    isFunction = isFunction_1,
	    isObject$3 = isObject_1,
	    isPlainObject = isPlainObject_1,
	    isTypedArray = isTypedArray_1,
	    safeGet$1 = _safeGet,
	    toPlainObject = toPlainObject_1;

	/**
	 * A specialized version of `baseMerge` for arrays and objects which performs
	 * deep merges and tracks traversed objects enabling objects with circular
	 * references to be merged.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @param {string} key The key of the value to merge.
	 * @param {number} srcIndex The index of `source`.
	 * @param {Function} mergeFunc The function to merge values.
	 * @param {Function} [customizer] The function to customize assigned values.
	 * @param {Object} [stack] Tracks traversed source values and their merged
	 *  counterparts.
	 */
	function baseMergeDeep$1(object, source, key, srcIndex, mergeFunc, customizer, stack) {
	  var objValue = safeGet$1(object, key),
	      srcValue = safeGet$1(source, key),
	      stacked = stack.get(srcValue);

	  if (stacked) {
	    assignMergeValue$1(object, key, stacked);
	    return;
	  }
	  var newValue = customizer
	    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
	    : undefined;

	  var isCommon = newValue === undefined;

	  if (isCommon) {
	    var isArr = isArray$4(srcValue),
	        isBuff = !isArr && isBuffer$1(srcValue),
	        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

	    newValue = srcValue;
	    if (isArr || isBuff || isTyped) {
	      if (isArray$4(objValue)) {
	        newValue = objValue;
	      }
	      else if (isArrayLikeObject(objValue)) {
	        newValue = copyArray$1(objValue);
	      }
	      else if (isBuff) {
	        isCommon = false;
	        newValue = cloneBuffer$1(srcValue, true);
	      }
	      else if (isTyped) {
	        isCommon = false;
	        newValue = cloneTypedArray$1(srcValue, true);
	      }
	      else {
	        newValue = [];
	      }
	    }
	    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
	      newValue = objValue;
	      if (isArguments(objValue)) {
	        newValue = toPlainObject(objValue);
	      }
	      else if (!isObject$3(objValue) || isFunction(objValue)) {
	        newValue = initCloneObject$1(srcValue);
	      }
	    }
	    else {
	      isCommon = false;
	    }
	  }
	  if (isCommon) {
	    // Recursively merge objects and arrays (susceptible to call stack limits).
	    stack.set(srcValue, newValue);
	    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
	    stack['delete'](srcValue);
	  }
	  assignMergeValue$1(object, key, newValue);
	}

	var _baseMergeDeep = baseMergeDeep$1;

	var Stack$1 = _Stack,
	    assignMergeValue = _assignMergeValue,
	    baseFor$1 = _baseFor,
	    baseMergeDeep = _baseMergeDeep,
	    isObject$2 = isObject_1,
	    keysIn$3 = keysIn_1,
	    safeGet = _safeGet;

	/**
	 * The base implementation of `_.merge` without support for multiple sources.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @param {number} srcIndex The index of `source`.
	 * @param {Function} [customizer] The function to customize merged values.
	 * @param {Object} [stack] Tracks traversed source values and their merged
	 *  counterparts.
	 */
	function baseMerge$1(object, source, srcIndex, customizer, stack) {
	  if (object === source) {
	    return;
	  }
	  baseFor$1(source, function(srcValue, key) {
	    stack || (stack = new Stack$1);
	    if (isObject$2(srcValue)) {
	      baseMergeDeep(object, source, key, srcIndex, baseMerge$1, customizer, stack);
	    }
	    else {
	      var newValue = customizer
	        ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
	        : undefined;

	      if (newValue === undefined) {
	        newValue = srcValue;
	      }
	      assignMergeValue(object, key, newValue);
	    }
	  }, keysIn$3);
	}

	var _baseMerge = baseMerge$1;

	/**
	 * This method returns the first argument it receives.
	 *
	 * @static
	 * @since 0.1.0
	 * @memberOf _
	 * @category Util
	 * @param {*} value Any value.
	 * @returns {*} Returns `value`.
	 * @example
	 *
	 * var object = { 'a': 1 };
	 *
	 * console.log(_.identity(object) === object);
	 * // => true
	 */

	function identity$3(value) {
	  return value;
	}

	var identity_1 = identity$3;

	/**
	 * A faster alternative to `Function#apply`, this function invokes `func`
	 * with the `this` binding of `thisArg` and the arguments of `args`.
	 *
	 * @private
	 * @param {Function} func The function to invoke.
	 * @param {*} thisArg The `this` binding of `func`.
	 * @param {Array} args The arguments to invoke `func` with.
	 * @returns {*} Returns the result of `func`.
	 */

	function apply$1(func, thisArg, args) {
	  switch (args.length) {
	    case 0: return func.call(thisArg);
	    case 1: return func.call(thisArg, args[0]);
	    case 2: return func.call(thisArg, args[0], args[1]);
	    case 3: return func.call(thisArg, args[0], args[1], args[2]);
	  }
	  return func.apply(thisArg, args);
	}

	var _apply = apply$1;

	var apply = _apply;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max;

	/**
	 * A specialized version of `baseRest` which transforms the rest array.
	 *
	 * @private
	 * @param {Function} func The function to apply a rest parameter to.
	 * @param {number} [start=func.length-1] The start position of the rest parameter.
	 * @param {Function} transform The rest array transform.
	 * @returns {Function} Returns the new function.
	 */
	function overRest$1(func, start, transform) {
	  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
	  return function() {
	    var args = arguments,
	        index = -1,
	        length = nativeMax(args.length - start, 0),
	        array = Array(length);

	    while (++index < length) {
	      array[index] = args[start + index];
	    }
	    index = -1;
	    var otherArgs = Array(start + 1);
	    while (++index < start) {
	      otherArgs[index] = args[index];
	    }
	    otherArgs[start] = transform(array);
	    return apply(func, this, otherArgs);
	  };
	}

	var _overRest = overRest$1;

	/**
	 * Creates a function that returns `value`.
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Util
	 * @param {*} value The value to return from the new function.
	 * @returns {Function} Returns the new constant function.
	 * @example
	 *
	 * var objects = _.times(2, _.constant({ 'a': 1 }));
	 *
	 * console.log(objects);
	 * // => [{ 'a': 1 }, { 'a': 1 }]
	 *
	 * console.log(objects[0] === objects[1]);
	 * // => true
	 */

	function constant$1(value) {
	  return function() {
	    return value;
	  };
	}

	var constant_1 = constant$1;

	var constant = constant_1,
	    defineProperty = _defineProperty$1,
	    identity$2 = identity_1;

	/**
	 * The base implementation of `setToString` without support for hot loop shorting.
	 *
	 * @private
	 * @param {Function} func The function to modify.
	 * @param {Function} string The `toString` result.
	 * @returns {Function} Returns `func`.
	 */
	var baseSetToString$1 = !defineProperty ? identity$2 : function(func, string) {
	  return defineProperty(func, 'toString', {
	    'configurable': true,
	    'enumerable': false,
	    'value': constant(string),
	    'writable': true
	  });
	};

	var _baseSetToString = baseSetToString$1;

	/** Used to detect hot functions by number of calls within a span of milliseconds. */

	var HOT_COUNT = 800,
	    HOT_SPAN = 16;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeNow = Date.now;

	/**
	 * Creates a function that'll short out and invoke `identity` instead
	 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
	 * milliseconds.
	 *
	 * @private
	 * @param {Function} func The function to restrict.
	 * @returns {Function} Returns the new shortable function.
	 */
	function shortOut$1(func) {
	  var count = 0,
	      lastCalled = 0;

	  return function() {
	    var stamp = nativeNow(),
	        remaining = HOT_SPAN - (stamp - lastCalled);

	    lastCalled = stamp;
	    if (remaining > 0) {
	      if (++count >= HOT_COUNT) {
	        return arguments[0];
	      }
	    } else {
	      count = 0;
	    }
	    return func.apply(undefined, arguments);
	  };
	}

	var _shortOut = shortOut$1;

	var baseSetToString = _baseSetToString,
	    shortOut = _shortOut;

	/**
	 * Sets the `toString` method of `func` to return `string`.
	 *
	 * @private
	 * @param {Function} func The function to modify.
	 * @param {Function} string The `toString` result.
	 * @returns {Function} Returns `func`.
	 */
	var setToString$1 = shortOut(baseSetToString);

	var _setToString = setToString$1;

	var identity$1 = identity_1,
	    overRest = _overRest,
	    setToString = _setToString;

	/**
	 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
	 *
	 * @private
	 * @param {Function} func The function to apply a rest parameter to.
	 * @param {number} [start=func.length-1] The start position of the rest parameter.
	 * @returns {Function} Returns the new function.
	 */
	function baseRest$1(func, start) {
	  return setToString(overRest(func, start, identity$1), func + '');
	}

	var _baseRest = baseRest$1;

	var eq = eq_1,
	    isArrayLike$2 = isArrayLike_1,
	    isIndex = _isIndex,
	    isObject$1 = isObject_1;

	/**
	 * Checks if the given arguments are from an iteratee call.
	 *
	 * @private
	 * @param {*} value The potential iteratee value argument.
	 * @param {*} index The potential iteratee index or key argument.
	 * @param {*} object The potential iteratee object argument.
	 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
	 *  else `false`.
	 */
	function isIterateeCall$1(value, index, object) {
	  if (!isObject$1(object)) {
	    return false;
	  }
	  var type = typeof index;
	  if (type == 'number'
	        ? (isArrayLike$2(object) && isIndex(index, object.length))
	        : (type == 'string' && index in object)
	      ) {
	    return eq(object[index], value);
	  }
	  return false;
	}

	var _isIterateeCall = isIterateeCall$1;

	var baseRest = _baseRest,
	    isIterateeCall = _isIterateeCall;

	/**
	 * Creates a function like `_.assign`.
	 *
	 * @private
	 * @param {Function} assigner The function to assign values.
	 * @returns {Function} Returns the new assigner function.
	 */
	function createAssigner$1(assigner) {
	  return baseRest(function(object, sources) {
	    var index = -1,
	        length = sources.length,
	        customizer = length > 1 ? sources[length - 1] : undefined,
	        guard = length > 2 ? sources[2] : undefined;

	    customizer = (assigner.length > 3 && typeof customizer == 'function')
	      ? (length--, customizer)
	      : undefined;

	    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
	      customizer = length < 3 ? undefined : customizer;
	      length = 1;
	    }
	    object = Object(object);
	    while (++index < length) {
	      var source = sources[index];
	      if (source) {
	        assigner(object, source, index, customizer);
	      }
	    }
	    return object;
	  });
	}

	var _createAssigner = createAssigner$1;

	var baseMerge = _baseMerge,
	    createAssigner = _createAssigner;

	/**
	 * This method is like `_.merge` except that it accepts `customizer` which
	 * is invoked to produce the merged values of the destination and source
	 * properties. If `customizer` returns `undefined`, merging is handled by the
	 * method instead. The `customizer` is invoked with six arguments:
	 * (objValue, srcValue, key, object, source, stack).
	 *
	 * **Note:** This method mutates `object`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Object
	 * @param {Object} object The destination object.
	 * @param {...Object} sources The source objects.
	 * @param {Function} customizer The function to customize assigned values.
	 * @returns {Object} Returns `object`.
	 * @example
	 *
	 * function customizer(objValue, srcValue) {
	 *   if (_.isArray(objValue)) {
	 *     return objValue.concat(srcValue);
	 *   }
	 * }
	 *
	 * var object = { 'a': [1], 'b': [2] };
	 * var other = { 'a': [3], 'b': [4] };
	 *
	 * _.mergeWith(object, other, customizer);
	 * // => { 'a': [1, 3], 'b': [2, 4] }
	 */
	var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
	  baseMerge(object, source, srcIndex, customizer);
	});

	var mergeWith_1 = mergeWith;

	var _mergeWith2 = mergeWith_1;

	/**
	 * A specialized version of `_.forEach` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns `array`.
	 */

	function arrayEach$2(array, iteratee) {
	  var index = -1,
	      length = array == null ? 0 : array.length;

	  while (++index < length) {
	    if (iteratee(array[index], index, array) === false) {
	      break;
	    }
	  }
	  return array;
	}

	var _arrayEach = arrayEach$2;

	var overArg = _overArg;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeKeys$1 = overArg(Object.keys, Object);

	var _nativeKeys = nativeKeys$1;

	var isPrototype = _isPrototype,
	    nativeKeys = _nativeKeys;

	/** Used for built-in method references. */
	var objectProto$2 = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

	/**
	 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 */
	function baseKeys$1(object) {
	  if (!isPrototype(object)) {
	    return nativeKeys(object);
	  }
	  var result = [];
	  for (var key in Object(object)) {
	    if (hasOwnProperty$1.call(object, key) && key != 'constructor') {
	      result.push(key);
	    }
	  }
	  return result;
	}

	var _baseKeys = baseKeys$1;

	var arrayLikeKeys = _arrayLikeKeys,
	    baseKeys = _baseKeys,
	    isArrayLike$1 = isArrayLike_1;

	/**
	 * Creates an array of the own enumerable property names of `object`.
	 *
	 * **Note:** Non-object values are coerced to objects. See the
	 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	 * for more details.
	 *
	 * @static
	 * @since 0.1.0
	 * @memberOf _
	 * @category Object
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 *   this.b = 2;
	 * }
	 *
	 * Foo.prototype.c = 3;
	 *
	 * _.keys(new Foo);
	 * // => ['a', 'b'] (iteration order is not guaranteed)
	 *
	 * _.keys('hi');
	 * // => ['0', '1']
	 */
	function keys$4(object) {
	  return isArrayLike$1(object) ? arrayLikeKeys(object) : baseKeys(object);
	}

	var keys_1 = keys$4;

	var baseFor = _baseFor,
	    keys$3 = keys_1;

	/**
	 * The base implementation of `_.forOwn` without support for iteratee shorthands.
	 *
	 * @private
	 * @param {Object} object The object to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Object} Returns `object`.
	 */
	function baseForOwn$1(object, iteratee) {
	  return object && baseFor(object, iteratee, keys$3);
	}

	var _baseForOwn = baseForOwn$1;

	var isArrayLike = isArrayLike_1;

	/**
	 * Creates a `baseEach` or `baseEachRight` function.
	 *
	 * @private
	 * @param {Function} eachFunc The function to iterate over a collection.
	 * @param {boolean} [fromRight] Specify iterating from right to left.
	 * @returns {Function} Returns the new base function.
	 */
	function createBaseEach$1(eachFunc, fromRight) {
	  return function(collection, iteratee) {
	    if (collection == null) {
	      return collection;
	    }
	    if (!isArrayLike(collection)) {
	      return eachFunc(collection, iteratee);
	    }
	    var length = collection.length,
	        index = fromRight ? length : -1,
	        iterable = Object(collection);

	    while ((fromRight ? index-- : ++index < length)) {
	      if (iteratee(iterable[index], index, iterable) === false) {
	        break;
	      }
	    }
	    return collection;
	  };
	}

	var _createBaseEach = createBaseEach$1;

	var baseForOwn = _baseForOwn,
	    createBaseEach = _createBaseEach;

	/**
	 * The base implementation of `_.forEach` without support for iteratee shorthands.
	 *
	 * @private
	 * @param {Array|Object} collection The collection to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array|Object} Returns `collection`.
	 */
	var baseEach$1 = createBaseEach(baseForOwn);

	var _baseEach = baseEach$1;

	var identity = identity_1;

	/**
	 * Casts `value` to `identity` if it's not a function.
	 *
	 * @private
	 * @param {*} value The value to inspect.
	 * @returns {Function} Returns cast function.
	 */
	function castFunction$1(value) {
	  return typeof value == 'function' ? value : identity;
	}

	var _castFunction = castFunction$1;

	var arrayEach$1 = _arrayEach,
	    baseEach = _baseEach,
	    castFunction = _castFunction,
	    isArray$3 = isArray_1;

	/**
	 * Iterates over elements of `collection` and invokes `iteratee` for each element.
	 * The iteratee is invoked with three arguments: (value, index|key, collection).
	 * Iteratee functions may exit iteration early by explicitly returning `false`.
	 *
	 * **Note:** As with other "Collections" methods, objects with a "length"
	 * property are iterated like arrays. To avoid this behavior use `_.forIn`
	 * or `_.forOwn` for object iteration.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @alias each
	 * @category Collection
	 * @param {Array|Object} collection The collection to iterate over.
	 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
	 * @returns {Array|Object} Returns `collection`.
	 * @see _.forEachRight
	 * @example
	 *
	 * _.forEach([1, 2], function(value) {
	 *   console.log(value);
	 * });
	 * // => Logs `1` then `2`.
	 *
	 * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
	 *   console.log(key);
	 * });
	 * // => Logs 'a' then 'b' (iteration order is not guaranteed).
	 */
	function forEach(collection, iteratee) {
	  var func = isArray$3(collection) ? arrayEach$1 : baseEach;
	  return func(collection, castFunction(iteratee));
	}

	var forEach_1 = forEach;

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	function _iterableToArrayLimit(arr, i) {
	  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

	  if (_i == null) return;
	  var _arr = [];
	  var _n = true;
	  var _d = false;

	  var _s, _e;

	  try {
	    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	}

	function _slicedToArray(arr, i) {
	  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
	}

	/**
	 * @author Kuitos
	 * @homepage https://github.com/kuitos/
	 * @since 2019-02-25
	 * fork from https://github.com/systemjs/systemjs/blob/master/src/extras/global.js
	 */
	var isIE11 = typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Trident') !== -1;

	function shouldSkipProperty(global, p) {
	  if (!global.hasOwnProperty(p) || !isNaN(p) && p < global.length) return true;

	  if (isIE11) {
	    // https://github.com/kuitos/import-html-entry/pull/32，最小化 try 范围
	    try {
	      return global[p] && typeof window !== 'undefined' && global[p].parent === window;
	    } catch (err) {
	      return true;
	    }
	  } else {
	    return false;
	  }
	} // safari unpredictably lists some new globals first or second in object order


	var firstGlobalProp, secondGlobalProp, lastGlobalProp;
	function getGlobalProp(global) {
	  var cnt = 0;
	  var lastProp;
	  var hasIframe = false;

	  for (var p in global) {
	    if (shouldSkipProperty(global, p)) continue; // 遍历 iframe，检查 window 上的属性值是否是 iframe，是则跳过后面的 first 和 second 判断

	    for (var i = 0; i < window.frames.length && !hasIframe; i++) {
	      var frame = window.frames[i];

	      if (frame === global[p]) {
	        hasIframe = true;
	        break;
	      }
	    }

	    if (!hasIframe && (cnt === 0 && p !== firstGlobalProp || cnt === 1 && p !== secondGlobalProp)) return p;
	    cnt++;
	    lastProp = p;
	  }

	  if (lastProp !== lastGlobalProp) return lastProp;
	}
	function noteGlobalProps(global) {
	  // alternatively Object.keys(global).pop()
	  // but this may be faster (pending benchmarks)
	  firstGlobalProp = secondGlobalProp = undefined;

	  for (var p in global) {
	    if (shouldSkipProperty(global, p)) continue;
	    if (!firstGlobalProp) firstGlobalProp = p;else if (!secondGlobalProp) secondGlobalProp = p;
	    lastGlobalProp = p;
	  }

	  return lastGlobalProp;
	}
	function getInlineCode(match) {
	  var start = match.indexOf('>') + 1;
	  var end = match.lastIndexOf('<');
	  return match.substring(start, end);
	}
	function defaultGetPublicPath(entry) {
	  if (_typeof(entry) === 'object') {
	    return '/';
	  }

	  try {
	    // URL 构造函数不支持使用 // 前缀的 url
	    var _URL = new URL(entry.startsWith('//') ? "".concat(location.protocol).concat(entry) : entry, location.href),
	        origin = _URL.origin,
	        pathname = _URL.pathname;

	    var paths = pathname.split('/'); // 移除最后一个元素

	    paths.pop();
	    return "".concat(origin).concat(paths.join('/'), "/");
	  } catch (e) {
	    console.warn(e);
	    return '';
	  }
	} // Detect whether browser supports `<script type=module>` or not

	function isModuleScriptSupported() {
	  var s = document.createElement('script');
	  return 'noModule' in s;
	} // RIC and shim for browsers setTimeout() without it

	var requestIdleCallback$1 = window.requestIdleCallback || function requestIdleCallback(cb) {
	  var start = Date.now();
	  return setTimeout(function () {
	    cb({
	      didTimeout: false,
	      timeRemaining: function timeRemaining() {
	        return Math.max(0, 50 - (Date.now() - start));
	      }
	    });
	  }, 1);
	};
	function readResAsString(response, autoDetectCharset) {
	  // 未启用自动检测
	  if (!autoDetectCharset) {
	    return response.text();
	  } // 如果没headers，发生在test环境下的mock数据，为兼容原有测试用例


	  if (!response.headers) {
	    return response.text();
	  } // 如果没返回content-type，走默认逻辑


	  var contentType = response.headers.get('Content-Type');

	  if (!contentType) {
	    return response.text();
	  } // 解析content-type内的charset
	  // Content-Type: text/html; charset=utf-8
	  // Content-Type: multipart/form-data; boundary=something
	  // GET请求下不会出现第二种content-type


	  var charset = 'utf-8';
	  var parts = contentType.split(';');

	  if (parts.length === 2) {
	    var _parts$1$split = parts[1].split('='),
	        _parts$1$split2 = _slicedToArray(_parts$1$split, 2),
	        value = _parts$1$split2[1];

	    var encoding = value && value.trim();

	    if (encoding) {
	      charset = encoding;
	    }
	  } // 如果还是utf-8，那么走默认，兼容原有逻辑，这段代码删除也应该工作


	  if (charset.toUpperCase() === 'UTF-8') {
	    return response.text();
	  } // 走流读取，编码可能是gbk，gb2312等，比如sofa 3默认是gbk编码


	  return response.blob().then(function (file) {
	    return new Promise(function (resolve, reject) {
	      var reader = new window.FileReader();

	      reader.onload = function () {
	        resolve(reader.result);
	      };

	      reader.onerror = reject;
	      reader.readAsText(file, charset);
	    });
	  });
	}

	var ALL_SCRIPT_REGEX = /(<script[\s\S]*?>)[\s\S]*?<\/script>/gi;
	var SCRIPT_TAG_REGEX = /<(script)[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+((?!type=('|')text\/ng\x2Dtemplate\3)[\s\S])*?>[\s\S]*?<\/\1>/i;
	var SCRIPT_SRC_REGEX = /.*\ssrc=('|")?([^>'"\s]+)/;
	var SCRIPT_TYPE_REGEX = /.*\stype=('|")?([^>'"\s]+)/;
	var SCRIPT_ENTRY_REGEX = /.*\sentry\s*.*/;
	var SCRIPT_ASYNC_REGEX = /.*\sasync\s*.*/;
	var SCRIPT_NO_MODULE_REGEX = /.*\snomodule\s*.*/;
	var SCRIPT_MODULE_REGEX = /.*\stype=('|")?module('|")?\s*.*/;
	var LINK_TAG_REGEX = /<(link)[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]*?>/ig;
	var LINK_PRELOAD_OR_PREFETCH_REGEX = /\srel=('|")?(preload|prefetch)\1/;
	var LINK_HREF_REGEX = /.*\shref=('|")?([^>'"\s]+)/;
	var LINK_AS_FONT = /.*\sas=('|")?font\1.*/;
	var STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
	var STYLE_TYPE_REGEX = /\s+rel=('|")?stylesheet\1.*/;
	var STYLE_HREF_REGEX = /.*\shref=('|")?([^>'"\s]+)/;
	var HTML_COMMENT_REGEX = /<!--([\s\S]*?)-->/g;
	var LINK_IGNORE_REGEX = /<link([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]+[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+)ignore([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]*|=[\s\S]*)>/i;
	var STYLE_IGNORE_REGEX = /<style([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]+[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+)ignore([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]*|=[\s\S]*)>/i;
	var SCRIPT_IGNORE_REGEX = /<script([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]+[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+)ignore([\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+[\s\S]*|=[\s\S]*)>/i;

	function hasProtocol(url) {
	  return url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://');
	}

	function getEntirePath(path, baseURI) {
	  return new URL(path, baseURI).toString();
	}

	function isValidJavaScriptType(type) {
	  var handleTypes = ['text/javascript', 'module', 'application/javascript', 'text/ecmascript', 'application/ecmascript'];
	  return !type || handleTypes.indexOf(type) !== -1;
	}

	var genLinkReplaceSymbol = function genLinkReplaceSymbol(linkHref) {
	  var preloadOrPrefetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
	  return "<!-- ".concat(preloadOrPrefetch ? 'prefetch/preload' : '', " link ").concat(linkHref, " replaced by import-html-entry -->");
	};
	var genScriptReplaceSymbol = function genScriptReplaceSymbol(scriptSrc) {
	  var async = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
	  return "<!-- ".concat(async ? 'async' : '', " script ").concat(scriptSrc, " replaced by import-html-entry -->");
	};
	var inlineScriptReplaceSymbol = "<!-- inline scripts replaced by import-html-entry -->";
	var genIgnoreAssetReplaceSymbol = function genIgnoreAssetReplaceSymbol(url) {
	  return "<!-- ignore asset ".concat(url || 'file', " replaced by import-html-entry -->");
	};
	var genModuleScriptReplaceSymbol = function genModuleScriptReplaceSymbol(scriptSrc, moduleSupport) {
	  return "<!-- ".concat(moduleSupport ? 'nomodule' : 'module', " script ").concat(scriptSrc, " ignored by import-html-entry -->");
	};
	/**
	 * parse the script link from the template
	 * 1. collect stylesheets
	 * 2. use global eval to evaluate the inline scripts
	 *    see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function#Difference_between_Function_constructor_and_function_declaration
	 *    see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!
	 * @param tpl
	 * @param baseURI
	 * @stripStyles whether to strip the css links
	 * @returns {{template: void | string | *, scripts: *[], entry: *}}
	 */

	function processTpl(tpl, baseURI) {
	  var scripts = [];
	  var styles = [];
	  var entry = null;
	  var moduleSupport = isModuleScriptSupported();
	  var template = tpl
	  /*
	  remove html comment first
	  */
	  .replace(HTML_COMMENT_REGEX, '').replace(LINK_TAG_REGEX, function (match) {
	    /*
	    change the css link
	    */
	    var styleType = !!match.match(STYLE_TYPE_REGEX);

	    if (styleType) {
	      var styleHref = match.match(STYLE_HREF_REGEX);
	      var styleIgnore = match.match(LINK_IGNORE_REGEX);

	      if (styleHref) {
	        var href = styleHref && styleHref[2];
	        var newHref = href;

	        if (href && !hasProtocol(href)) {
	          newHref = getEntirePath(href, baseURI);
	        }

	        if (styleIgnore) {
	          return genIgnoreAssetReplaceSymbol(newHref);
	        }

	        styles.push(newHref);
	        return genLinkReplaceSymbol(newHref);
	      }
	    }

	    var preloadOrPrefetchType = match.match(LINK_PRELOAD_OR_PREFETCH_REGEX) && match.match(LINK_HREF_REGEX) && !match.match(LINK_AS_FONT);

	    if (preloadOrPrefetchType) {
	      var _match$match = match.match(LINK_HREF_REGEX),
	          _match$match2 = _slicedToArray(_match$match, 3),
	          linkHref = _match$match2[2];

	      return genLinkReplaceSymbol(linkHref, true);
	    }

	    return match;
	  }).replace(STYLE_TAG_REGEX, function (match) {
	    if (STYLE_IGNORE_REGEX.test(match)) {
	      return genIgnoreAssetReplaceSymbol('style file');
	    }

	    return match;
	  }).replace(ALL_SCRIPT_REGEX, function (match, scriptTag) {
	    var scriptIgnore = scriptTag.match(SCRIPT_IGNORE_REGEX);
	    var moduleScriptIgnore = moduleSupport && !!scriptTag.match(SCRIPT_NO_MODULE_REGEX) || !moduleSupport && !!scriptTag.match(SCRIPT_MODULE_REGEX); // in order to keep the exec order of all javascripts

	    var matchedScriptTypeMatch = scriptTag.match(SCRIPT_TYPE_REGEX);
	    var matchedScriptType = matchedScriptTypeMatch && matchedScriptTypeMatch[2];

	    if (!isValidJavaScriptType(matchedScriptType)) {
	      return match;
	    } // if it is a external script


	    if (SCRIPT_TAG_REGEX.test(match) && scriptTag.match(SCRIPT_SRC_REGEX)) {
	      /*
	      collect scripts and replace the ref
	      */
	      var matchedScriptEntry = scriptTag.match(SCRIPT_ENTRY_REGEX);
	      var matchedScriptSrcMatch = scriptTag.match(SCRIPT_SRC_REGEX);
	      var matchedScriptSrc = matchedScriptSrcMatch && matchedScriptSrcMatch[2];

	      if (entry && matchedScriptEntry) {
	        throw new SyntaxError('You should not set multiply entry script!');
	      } else {
	        // append the domain while the script not have an protocol prefix
	        if (matchedScriptSrc && !hasProtocol(matchedScriptSrc)) {
	          matchedScriptSrc = getEntirePath(matchedScriptSrc, baseURI);
	        }

	        entry = entry || matchedScriptEntry && matchedScriptSrc;
	      }

	      if (scriptIgnore) {
	        return genIgnoreAssetReplaceSymbol(matchedScriptSrc || 'js file');
	      }

	      if (moduleScriptIgnore) {
	        return genModuleScriptReplaceSymbol(matchedScriptSrc || 'js file', moduleSupport);
	      }

	      if (matchedScriptSrc) {
	        var asyncScript = !!scriptTag.match(SCRIPT_ASYNC_REGEX);
	        scripts.push(asyncScript ? {
	          async: true,
	          src: matchedScriptSrc
	        } : matchedScriptSrc);
	        return genScriptReplaceSymbol(matchedScriptSrc, asyncScript);
	      }

	      return match;
	    } else {
	      if (scriptIgnore) {
	        return genIgnoreAssetReplaceSymbol('js file');
	      }

	      if (moduleScriptIgnore) {
	        return genModuleScriptReplaceSymbol('js file', moduleSupport);
	      } // if it is an inline script


	      var code = getInlineCode(match); // remove script blocks when all of these lines are comments.

	      var isPureCommentBlock = code.split(/[\r\n]+/).every(function (line) {
	        return !line.trim() || line.trim().startsWith('//');
	      });

	      if (!isPureCommentBlock) {
	        scripts.push(match);
	      }

	      return inlineScriptReplaceSymbol;
	    }
	  });
	  scripts = scripts.filter(function (script) {
	    // filter empty script
	    return !!script;
	  });
	  return {
	    template: template,
	    scripts: scripts,
	    styles: styles,
	    // set the last script as entry if have not set
	    entry: entry || scripts[scripts.length - 1]
	  };
	}

	/**
	 * @author Kuitos
	 * @homepage https://github.com/kuitos/
	 * @since 2018-08-15 11:37
	 */
	var styleCache = {};
	var scriptCache = {};
	var embedHTMLCache = {};

	if (!window.fetch) {
	  throw new Error('[import-html-entry] Here is no "fetch" on the window env, you need to polyfill it');
	}

	var defaultFetch = window.fetch.bind(window);

	function defaultGetTemplate(tpl) {
	  return tpl;
	}
	/**
	 * convert external css link to inline style for performance optimization
	 * @param template
	 * @param styles
	 * @param opts
	 * @return embedHTML
	 */


	function getEmbedHTML(template, styles) {
	  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	  var _opts$fetch = opts.fetch,
	      fetch = _opts$fetch === void 0 ? defaultFetch : _opts$fetch;
	  var embedHTML = template;
	  return _getExternalStyleSheets(styles, fetch).then(function (styleSheets) {
	    embedHTML = styles.reduce(function (html, styleSrc, i) {
	      html = html.replace(genLinkReplaceSymbol(styleSrc), "<style>/* ".concat(styleSrc, " */").concat(styleSheets[i], "</style>"));
	      return html;
	    }, embedHTML);
	    return embedHTML;
	  });
	}

	var isInlineCode = function isInlineCode(code) {
	  return code.startsWith('<');
	};

	function getExecutableScript(scriptSrc, scriptText, proxy, strictGlobal) {
	  var sourceUrl = isInlineCode(scriptSrc) ? '' : "//# sourceURL=".concat(scriptSrc, "\n"); // 通过这种方式获取全局 window，因为 script 也是在全局作用域下运行的，所以我们通过 window.proxy 绑定时也必须确保绑定到全局 window 上
	  // 否则在嵌套场景下， window.proxy 设置的是内层应用的 window，而代码其实是在全局作用域运行的，会导致闭包里的 window.proxy 取的是最外层的微应用的 proxy

	  var globalWindow = (0, eval)('window');
	  globalWindow.proxy = proxy; // TODO 通过 strictGlobal 方式切换切换 with 闭包，待 with 方式坑趟平后再合并

	  return strictGlobal ? ";(function(window, self, globalThis){with(window){;".concat(scriptText, "\n").concat(sourceUrl, "}}).bind(window.proxy)(window.proxy, window.proxy, window.proxy);") : ";(function(window, self, globalThis){;".concat(scriptText, "\n").concat(sourceUrl, "}).bind(window.proxy)(window.proxy, window.proxy, window.proxy);");
	} // for prefetch


	function _getExternalStyleSheets(styles) {
	  var fetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultFetch;
	  return Promise.all(styles.map(function (styleLink) {
	    if (isInlineCode(styleLink)) {
	      // if it is inline style
	      return getInlineCode(styleLink);
	    } else {
	      // external styles
	      return styleCache[styleLink] || (styleCache[styleLink] = fetch(styleLink).then(function (response) {
	        return response.text();
	      }));
	    }
	  }));
	} // for prefetch

	function _getExternalScripts(scripts) {
	  var fetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultFetch;
	  var errorCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};

	  var fetchScript = function fetchScript(scriptUrl) {
	    return scriptCache[scriptUrl] || (scriptCache[scriptUrl] = fetch(scriptUrl).then(function (response) {
	      // usually browser treats 4xx and 5xx response of script loading as an error and will fire a script error event
	      // https://stackoverflow.com/questions/5625420/what-http-headers-responses-trigger-the-onerror-handler-on-a-script-tag/5625603
	      if (response.status >= 400) {
	        errorCallback();
	        throw new Error("".concat(scriptUrl, " load failed with status ").concat(response.status));
	      }

	      return response.text();
	    }));
	  };

	  return Promise.all(scripts.map(function (script) {
	    if (typeof script === 'string') {
	      if (isInlineCode(script)) {
	        // if it is inline script
	        return getInlineCode(script);
	      } else {
	        // external script
	        return fetchScript(script);
	      }
	    } else {
	      // use idle time to load async script
	      var src = script.src,
	          async = script.async;

	      if (async) {
	        return {
	          src: src,
	          async: true,
	          content: new Promise(function (resolve, reject) {
	            return requestIdleCallback$1(function () {
	              return fetchScript(src).then(resolve, reject);
	            });
	          })
	        };
	      }

	      return fetchScript(src);
	    }
	  }));
	}

	function throwNonBlockingError(error, msg) {
	  setTimeout(function () {
	    console.error(msg);
	    throw error;
	  });
	}

	var supportsUserTiming$1 = typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.clearMarks === 'function' && typeof performance.measure === 'function' && typeof performance.clearMeasures === 'function';
	/**
	 * FIXME to consistent with browser behavior, we should only provide callback way to invoke success and error event
	 * @param entry
	 * @param scripts
	 * @param proxy
	 * @param opts
	 * @returns {Promise<unknown>}
	 */

	function _execScripts(entry, scripts) {
	  var proxy = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : window;
	  var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
	  var _opts$fetch2 = opts.fetch,
	      fetch = _opts$fetch2 === void 0 ? defaultFetch : _opts$fetch2,
	      _opts$strictGlobal = opts.strictGlobal,
	      strictGlobal = _opts$strictGlobal === void 0 ? false : _opts$strictGlobal,
	      success = opts.success,
	      _opts$error = opts.error,
	      error = _opts$error === void 0 ? function () {} : _opts$error,
	      _opts$beforeExec = opts.beforeExec,
	      beforeExec = _opts$beforeExec === void 0 ? function () {} : _opts$beforeExec,
	      _opts$afterExec = opts.afterExec,
	      afterExec = _opts$afterExec === void 0 ? function () {} : _opts$afterExec;
	  return _getExternalScripts(scripts, fetch, error).then(function (scriptsText) {
	    var geval = function geval(scriptSrc, inlineScript) {
	      var rawCode = beforeExec(inlineScript, scriptSrc) || inlineScript;
	      var code = getExecutableScript(scriptSrc, rawCode, proxy, strictGlobal);
	      (0, eval)(code);
	      afterExec(inlineScript, scriptSrc);
	    };

	    function exec(scriptSrc, inlineScript, resolve) {
	      var markName = "Evaluating script ".concat(scriptSrc);
	      var measureName = "Evaluating Time Consuming: ".concat(scriptSrc);

	      if (process.env.NODE_ENV === 'development' && supportsUserTiming$1) {
	        performance.mark(markName);
	      }

	      if (scriptSrc === entry) {
	        noteGlobalProps(strictGlobal ? proxy : window);

	        try {
	          // bind window.proxy to change `this` reference in script
	          geval(scriptSrc, inlineScript);
	          var exports = proxy[getGlobalProp(strictGlobal ? proxy : window)] || {};
	          resolve(exports);
	        } catch (e) {
	          // entry error must be thrown to make the promise settled
	          console.error("[import-html-entry]: error occurs while executing entry script ".concat(scriptSrc));
	          throw e;
	        }
	      } else {
	        if (typeof inlineScript === 'string') {
	          try {
	            // bind window.proxy to change `this` reference in script
	            geval(scriptSrc, inlineScript);
	          } catch (e) {
	            // consistent with browser behavior, any independent script evaluation error should not block the others
	            throwNonBlockingError(e, "[import-html-entry]: error occurs while executing normal script ".concat(scriptSrc));
	          }
	        } else {
	          // external script marked with async
	          inlineScript.async && (inlineScript === null || inlineScript === void 0 ? void 0 : inlineScript.content.then(function (downloadedScriptText) {
	            return geval(inlineScript.src, downloadedScriptText);
	          })["catch"](function (e) {
	            throwNonBlockingError(e, "[import-html-entry]: error occurs while executing async script ".concat(inlineScript.src));
	          }));
	        }
	      }

	      if (process.env.NODE_ENV === 'development' && supportsUserTiming$1) {
	        performance.measure(measureName, markName);
	        performance.clearMarks(markName);
	        performance.clearMeasures(measureName);
	      }
	    }

	    function schedule(i, resolvePromise) {
	      if (i < scripts.length) {
	        var scriptSrc = scripts[i];
	        var inlineScript = scriptsText[i];
	        exec(scriptSrc, inlineScript, resolvePromise); // resolve the promise while the last script executed and entry not provided

	        if (!entry && i === scripts.length - 1) {
	          resolvePromise();
	        } else {
	          schedule(i + 1, resolvePromise);
	        }
	      }
	    }

	    return new Promise(function (resolve) {
	      return schedule(0, success || resolve);
	    });
	  });
	}
	function importHTML(url) {
	  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  var fetch = defaultFetch;
	  var autoDecodeResponse = false;
	  var getPublicPath = defaultGetPublicPath;
	  var getTemplate = defaultGetTemplate; // compatible with the legacy importHTML api

	  if (typeof opts === 'function') {
	    fetch = opts;
	  } else {
	    // fetch option is availble
	    if (opts.fetch) {
	      // fetch is a funciton
	      if (typeof opts.fetch === 'function') {
	        fetch = opts.fetch;
	      } else {
	        // configuration
	        fetch = opts.fetch.fn || defaultFetch;
	        autoDecodeResponse = !!opts.fetch.autoDecodeResponse;
	      }
	    }

	    getPublicPath = opts.getPublicPath || opts.getDomain || defaultGetPublicPath;
	    getTemplate = opts.getTemplate || defaultGetTemplate;
	  }

	  return embedHTMLCache[url] || (embedHTMLCache[url] = fetch(url).then(function (response) {
	    return readResAsString(response, autoDecodeResponse);
	  }).then(function (html) {
	    var assetPublicPath = getPublicPath(url);

	    var _processTpl = processTpl(getTemplate(html), assetPublicPath),
	        template = _processTpl.template,
	        scripts = _processTpl.scripts,
	        entry = _processTpl.entry,
	        styles = _processTpl.styles;

	    return getEmbedHTML(template, styles, {
	      fetch: fetch
	    }).then(function (embedHTML) {
	      return {
	        template: embedHTML,
	        assetPublicPath: assetPublicPath,
	        getExternalScripts: function getExternalScripts() {
	          return _getExternalScripts(scripts, fetch);
	        },
	        getExternalStyleSheets: function getExternalStyleSheets() {
	          return _getExternalStyleSheets(styles, fetch);
	        },
	        execScripts: function execScripts(proxy, strictGlobal) {
	          var execScriptsHooks = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

	          if (!scripts.length) {
	            return Promise.resolve();
	          }

	          return _execScripts(entry, scripts, proxy, {
	            fetch: fetch,
	            strictGlobal: strictGlobal,
	            beforeExec: execScriptsHooks.beforeExec,
	            afterExec: execScriptsHooks.afterExec
	          });
	        }
	      };
	    });
	  }));
	}
	function importEntry(entry) {
	  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  var _opts$fetch3 = opts.fetch,
	      fetch = _opts$fetch3 === void 0 ? defaultFetch : _opts$fetch3,
	      _opts$getTemplate = opts.getTemplate,
	      getTemplate = _opts$getTemplate === void 0 ? defaultGetTemplate : _opts$getTemplate;
	  var getPublicPath = opts.getPublicPath || opts.getDomain || defaultGetPublicPath;

	  if (!entry) {
	    throw new SyntaxError('entry should not be empty!');
	  } // html entry


	  if (typeof entry === 'string') {
	    return importHTML(entry, {
	      fetch: fetch,
	      getPublicPath: getPublicPath,
	      getTemplate: getTemplate
	    });
	  } // config entry


	  if (Array.isArray(entry.scripts) || Array.isArray(entry.styles)) {
	    var _entry$scripts = entry.scripts,
	        scripts = _entry$scripts === void 0 ? [] : _entry$scripts,
	        _entry$styles = entry.styles,
	        styles = _entry$styles === void 0 ? [] : _entry$styles,
	        _entry$html = entry.html,
	        html = _entry$html === void 0 ? '' : _entry$html;

	    var setStylePlaceholder2HTML = function setStylePlaceholder2HTML(tpl) {
	      return styles.reduceRight(function (html, styleSrc) {
	        return "".concat(genLinkReplaceSymbol(styleSrc)).concat(html);
	      }, tpl);
	    };

	    var setScriptPlaceholder2HTML = function setScriptPlaceholder2HTML(tpl) {
	      return scripts.reduce(function (html, scriptSrc) {
	        return "".concat(html).concat(genScriptReplaceSymbol(scriptSrc));
	      }, tpl);
	    };

	    return getEmbedHTML(getTemplate(setScriptPlaceholder2HTML(setStylePlaceholder2HTML(html))), styles, {
	      fetch: fetch
	    }).then(function (embedHTML) {
	      return {
	        template: embedHTML,
	        assetPublicPath: getPublicPath(entry),
	        getExternalScripts: function getExternalScripts() {
	          return _getExternalScripts(scripts, fetch);
	        },
	        getExternalStyleSheets: function getExternalStyleSheets() {
	          return _getExternalStyleSheets(styles, fetch);
	        },
	        execScripts: function execScripts(proxy, strictGlobal) {
	          var execScriptsHooks = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

	          if (!scripts.length) {
	            return Promise.resolve();
	          }

	          return _execScripts(scripts[scripts.length - 1], scripts, proxy, {
	            fetch: fetch,
	            strictGlobal: strictGlobal,
	            beforeExec: execScriptsHooks.beforeExec,
	            afterExec: execScriptsHooks.afterExec
	          });
	        }
	      };
	    });
	  } else {
	    throw new SyntaxError('entry scripts or styles should be array!');
	  }
	}

	var rawPublicPath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
	function getAddOn$1(global) {
	  var publicPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';
	  var hasMountedOnce = false;
	  return {
	    beforeLoad: function beforeLoad() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	        return regenerator.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                // eslint-disable-next-line no-param-reassign
	                global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = publicPath;

	              case 1:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee);
	      }));
	    },
	    beforeMount: function beforeMount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	        return regenerator.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                if (hasMountedOnce) {
	                  // eslint-disable-next-line no-param-reassign
	                  global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = publicPath;
	                }

	              case 1:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2);
	      }));
	    },
	    beforeUnmount: function beforeUnmount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee3() {
	        return regenerator.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                if (rawPublicPath === undefined) {
	                  // eslint-disable-next-line no-param-reassign
	                  delete global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
	                } else {
	                  // eslint-disable-next-line no-param-reassign
	                  global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = rawPublicPath;
	                }

	                hasMountedOnce = true;

	              case 2:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3);
	      }));
	    }
	  };
	}

	function getAddOn(global) {
	  return {
	    beforeLoad: function beforeLoad() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	        return regenerator.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                // eslint-disable-next-line no-param-reassign
	                global.__POWERED_BY_QIANKUN__ = true;

	              case 1:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee);
	      }));
	    },
	    beforeMount: function beforeMount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	        return regenerator.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                // eslint-disable-next-line no-param-reassign
	                global.__POWERED_BY_QIANKUN__ = true;

	              case 1:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2);
	      }));
	    },
	    beforeUnmount: function beforeUnmount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee3() {
	        return regenerator.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                // eslint-disable-next-line no-param-reassign
	                delete global.__POWERED_BY_QIANKUN__;

	              case 1:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3);
	      }));
	    }
	  };
	}

	function getAddOns(global, publicPath) {
	  return _mergeWith2({}, getAddOn(global), getAddOn$1(global, publicPath), function (v1, v2) {
	    return _concat(v1 !== null && v1 !== void 0 ? v1 : [], v2 !== null && v2 !== void 0 ? v2 : []);
	  });
	}

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	function _setPrototypeOf(o, p) {
	  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
	    o.__proto__ = p;
	    return o;
	  };

	  return _setPrototypeOf(o, p);
	}

	function _inherits(subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function");
	  }

	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) _setPrototypeOf(subClass, superClass);
	}

	function _getPrototypeOf(o) {
	  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
	    return o.__proto__ || Object.getPrototypeOf(o);
	  };
	  return _getPrototypeOf(o);
	}

	function _isNativeReflectConstruct() {
	  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
	  if (Reflect.construct.sham) return false;
	  if (typeof Proxy === "function") return true;

	  try {
	    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
	    return true;
	  } catch (e) {
	    return false;
	  }
	}

	function _assertThisInitialized(self) {
	  if (self === void 0) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return self;
	}

	function _possibleConstructorReturn(self, call) {
	  if (call && (_typeof(call) === "object" || typeof call === "function")) {
	    return call;
	  } else if (call !== void 0) {
	    throw new TypeError("Derived constructors may only return object or undefined");
	  }

	  return _assertThisInitialized(self);
	}

	function _createSuper(Derived) {
	  var hasNativeReflectConstruct = _isNativeReflectConstruct();
	  return function _createSuperInternal() {
	    var Super = _getPrototypeOf(Derived),
	        result;

	    if (hasNativeReflectConstruct) {
	      var NewTarget = _getPrototypeOf(this).constructor;
	      result = Reflect.construct(Super, arguments, NewTarget);
	    } else {
	      result = Super.apply(this, arguments);
	    }

	    return _possibleConstructorReturn(this, result);
	  };
	}

	function _isNativeFunction(fn) {
	  return Function.toString.call(fn).indexOf("[native code]") !== -1;
	}

	function _construct(Parent, args, Class) {
	  if (_isNativeReflectConstruct()) {
	    _construct = Reflect.construct;
	  } else {
	    _construct = function _construct(Parent, args, Class) {
	      var a = [null];
	      a.push.apply(a, args);
	      var Constructor = Function.bind.apply(Parent, a);
	      var instance = new Constructor();
	      if (Class) _setPrototypeOf(instance, Class.prototype);
	      return instance;
	    };
	  }

	  return _construct.apply(null, arguments);
	}

	function _wrapNativeSuper(Class) {
	  var _cache = typeof Map === "function" ? new Map() : undefined;

	  _wrapNativeSuper = function _wrapNativeSuper(Class) {
	    if (Class === null || !_isNativeFunction(Class)) return Class;

	    if (typeof Class !== "function") {
	      throw new TypeError("Super expression must either be null or a function");
	    }

	    if (typeof _cache !== "undefined") {
	      if (_cache.has(Class)) return _cache.get(Class);

	      _cache.set(Class, Wrapper);
	    }

	    function Wrapper() {
	      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
	    }

	    Wrapper.prototype = Object.create(Class.prototype, {
	      constructor: {
	        value: Wrapper,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	    return _setPrototypeOf(Wrapper, Class);
	  };

	  return _wrapNativeSuper(Class);
	}

	var QiankunError = /*#__PURE__*/function (_Error) {
	  _inherits(QiankunError, _Error);

	  var _super = _createSuper(QiankunError);

	  function QiankunError(message) {
	    _classCallCheck(this, QiankunError);

	    return _super.call(this, "[qiankun]: ".concat(message));
	  }

	  return QiankunError;
	}( /*#__PURE__*/_wrapNativeSuper(Error));

	function _defineProperty(obj, key, value) {
	  if (key in obj) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	  } else {
	    obj[key] = value;
	  }

	  return obj;
	}

	var copyObject$3 = _copyObject,
	    keys$2 = keys_1;

	/**
	 * The base implementation of `_.assign` without support for multiple sources
	 * or `customizer` functions.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @returns {Object} Returns `object`.
	 */
	function baseAssign$1(object, source) {
	  return object && copyObject$3(source, keys$2(source), object);
	}

	var _baseAssign = baseAssign$1;

	var copyObject$2 = _copyObject,
	    keysIn$2 = keysIn_1;

	/**
	 * The base implementation of `_.assignIn` without support for multiple sources
	 * or `customizer` functions.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @returns {Object} Returns `object`.
	 */
	function baseAssignIn$1(object, source) {
	  return object && copyObject$2(source, keysIn$2(source), object);
	}

	var _baseAssignIn = baseAssignIn$1;

	/**
	 * A specialized version of `_.filter` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} predicate The function invoked per iteration.
	 * @returns {Array} Returns the new filtered array.
	 */

	function arrayFilter$1(array, predicate) {
	  var index = -1,
	      length = array == null ? 0 : array.length,
	      resIndex = 0,
	      result = [];

	  while (++index < length) {
	    var value = array[index];
	    if (predicate(value, index, array)) {
	      result[resIndex++] = value;
	    }
	  }
	  return result;
	}

	var _arrayFilter = arrayFilter$1;

	/**
	 * This method returns a new empty array.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {Array} Returns the new empty array.
	 * @example
	 *
	 * var arrays = _.times(2, _.stubArray);
	 *
	 * console.log(arrays);
	 * // => [[], []]
	 *
	 * console.log(arrays[0] === arrays[1]);
	 * // => false
	 */

	function stubArray$2() {
	  return [];
	}

	var stubArray_1 = stubArray$2;

	var arrayFilter = _arrayFilter,
	    stubArray$1 = stubArray_1;

	/** Used for built-in method references. */
	var objectProto$1 = Object.prototype;

	/** Built-in value references. */
	var propertyIsEnumerable = objectProto$1.propertyIsEnumerable;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeGetSymbols$1 = Object.getOwnPropertySymbols;

	/**
	 * Creates an array of the own enumerable symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of symbols.
	 */
	var getSymbols$3 = !nativeGetSymbols$1 ? stubArray$1 : function(object) {
	  if (object == null) {
	    return [];
	  }
	  object = Object(object);
	  return arrayFilter(nativeGetSymbols$1(object), function(symbol) {
	    return propertyIsEnumerable.call(object, symbol);
	  });
	};

	var _getSymbols = getSymbols$3;

	var copyObject$1 = _copyObject,
	    getSymbols$2 = _getSymbols;

	/**
	 * Copies own symbols of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy symbols from.
	 * @param {Object} [object={}] The object to copy symbols to.
	 * @returns {Object} Returns `object`.
	 */
	function copySymbols$1(source, object) {
	  return copyObject$1(source, getSymbols$2(source), object);
	}

	var _copySymbols = copySymbols$1;

	var arrayPush$1 = _arrayPush,
	    getPrototype = _getPrototype,
	    getSymbols$1 = _getSymbols,
	    stubArray = stubArray_1;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeGetSymbols = Object.getOwnPropertySymbols;

	/**
	 * Creates an array of the own and inherited enumerable symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of symbols.
	 */
	var getSymbolsIn$2 = !nativeGetSymbols ? stubArray : function(object) {
	  var result = [];
	  while (object) {
	    arrayPush$1(result, getSymbols$1(object));
	    object = getPrototype(object);
	  }
	  return result;
	};

	var _getSymbolsIn = getSymbolsIn$2;

	var copyObject = _copyObject,
	    getSymbolsIn$1 = _getSymbolsIn;

	/**
	 * Copies own and inherited symbols of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy symbols from.
	 * @param {Object} [object={}] The object to copy symbols to.
	 * @returns {Object} Returns `object`.
	 */
	function copySymbolsIn$1(source, object) {
	  return copyObject(source, getSymbolsIn$1(source), object);
	}

	var _copySymbolsIn = copySymbolsIn$1;

	var arrayPush = _arrayPush,
	    isArray$2 = isArray_1;

	/**
	 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
	 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
	 * symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {Function} keysFunc The function to get the keys of `object`.
	 * @param {Function} symbolsFunc The function to get the symbols of `object`.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function baseGetAllKeys$2(object, keysFunc, symbolsFunc) {
	  var result = keysFunc(object);
	  return isArray$2(object) ? result : arrayPush(result, symbolsFunc(object));
	}

	var _baseGetAllKeys = baseGetAllKeys$2;

	var baseGetAllKeys$1 = _baseGetAllKeys,
	    getSymbols = _getSymbols,
	    keys$1 = keys_1;

	/**
	 * Creates an array of own enumerable property names and symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function getAllKeys$1(object) {
	  return baseGetAllKeys$1(object, keys$1, getSymbols);
	}

	var _getAllKeys = getAllKeys$1;

	var baseGetAllKeys = _baseGetAllKeys,
	    getSymbolsIn = _getSymbolsIn,
	    keysIn$1 = keysIn_1;

	/**
	 * Creates an array of own and inherited enumerable property names and
	 * symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function getAllKeysIn$1(object) {
	  return baseGetAllKeys(object, keysIn$1, getSymbolsIn);
	}

	var _getAllKeysIn = getAllKeysIn$1;

	var getNative$3 = _getNative,
	    root$3 = _root;

	/* Built-in method references that are verified to be native. */
	var DataView$1 = getNative$3(root$3, 'DataView');

	var _DataView = DataView$1;

	var getNative$2 = _getNative,
	    root$2 = _root;

	/* Built-in method references that are verified to be native. */
	var Promise$2 = getNative$2(root$2, 'Promise');

	var _Promise = Promise$2;

	var getNative$1 = _getNative,
	    root$1 = _root;

	/* Built-in method references that are verified to be native. */
	var Set$2 = getNative$1(root$1, 'Set');

	var _Set = Set$2;

	var getNative = _getNative,
	    root = _root;

	/* Built-in method references that are verified to be native. */
	var WeakMap$2 = getNative(root, 'WeakMap');

	var _WeakMap = WeakMap$2;

	var DataView = _DataView,
	    Map$1 = _Map,
	    Promise$1 = _Promise,
	    Set$1 = _Set,
	    WeakMap$1 = _WeakMap,
	    baseGetTag$1 = _baseGetTag,
	    toSource = _toSource;

	/** `Object#toString` result references. */
	var mapTag$3 = '[object Map]',
	    objectTag$1 = '[object Object]',
	    promiseTag = '[object Promise]',
	    setTag$3 = '[object Set]',
	    weakMapTag$1 = '[object WeakMap]';

	var dataViewTag$2 = '[object DataView]';

	/** Used to detect maps, sets, and weakmaps. */
	var dataViewCtorString = toSource(DataView),
	    mapCtorString = toSource(Map$1),
	    promiseCtorString = toSource(Promise$1),
	    setCtorString = toSource(Set$1),
	    weakMapCtorString = toSource(WeakMap$1);

	/**
	 * Gets the `toStringTag` of `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	var getTag$3 = baseGetTag$1;

	// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
	if ((DataView && getTag$3(new DataView(new ArrayBuffer(1))) != dataViewTag$2) ||
	    (Map$1 && getTag$3(new Map$1) != mapTag$3) ||
	    (Promise$1 && getTag$3(Promise$1.resolve()) != promiseTag) ||
	    (Set$1 && getTag$3(new Set$1) != setTag$3) ||
	    (WeakMap$1 && getTag$3(new WeakMap$1) != weakMapTag$1)) {
	  getTag$3 = function(value) {
	    var result = baseGetTag$1(value),
	        Ctor = result == objectTag$1 ? value.constructor : undefined,
	        ctorString = Ctor ? toSource(Ctor) : '';

	    if (ctorString) {
	      switch (ctorString) {
	        case dataViewCtorString: return dataViewTag$2;
	        case mapCtorString: return mapTag$3;
	        case promiseCtorString: return promiseTag;
	        case setCtorString: return setTag$3;
	        case weakMapCtorString: return weakMapTag$1;
	      }
	    }
	    return result;
	  };
	}

	var _getTag = getTag$3;

	/** Used for built-in method references. */

	var objectProto = Object.prototype;

	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;

	/**
	 * Initializes an array clone.
	 *
	 * @private
	 * @param {Array} array The array to clone.
	 * @returns {Array} Returns the initialized clone.
	 */
	function initCloneArray$1(array) {
	  var length = array.length,
	      result = new array.constructor(length);

	  // Add properties assigned by `RegExp#exec`.
	  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
	    result.index = array.index;
	    result.input = array.input;
	  }
	  return result;
	}

	var _initCloneArray = initCloneArray$1;

	var cloneArrayBuffer$1 = _cloneArrayBuffer;

	/**
	 * Creates a clone of `dataView`.
	 *
	 * @private
	 * @param {Object} dataView The data view to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned data view.
	 */
	function cloneDataView$1(dataView, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer$1(dataView.buffer) : dataView.buffer;
	  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
	}

	var _cloneDataView = cloneDataView$1;

	/** Used to match `RegExp` flags from their coerced string values. */

	var reFlags = /\w*$/;

	/**
	 * Creates a clone of `regexp`.
	 *
	 * @private
	 * @param {Object} regexp The regexp to clone.
	 * @returns {Object} Returns the cloned regexp.
	 */
	function cloneRegExp$1(regexp) {
	  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
	  result.lastIndex = regexp.lastIndex;
	  return result;
	}

	var _cloneRegExp = cloneRegExp$1;

	var Symbol$2 = _Symbol;

	/** Used to convert symbols to primitives and strings. */
	var symbolProto$1 = Symbol$2 ? Symbol$2.prototype : undefined,
	    symbolValueOf = symbolProto$1 ? symbolProto$1.valueOf : undefined;

	/**
	 * Creates a clone of the `symbol` object.
	 *
	 * @private
	 * @param {Object} symbol The symbol object to clone.
	 * @returns {Object} Returns the cloned symbol object.
	 */
	function cloneSymbol$1(symbol) {
	  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
	}

	var _cloneSymbol = cloneSymbol$1;

	var cloneArrayBuffer = _cloneArrayBuffer,
	    cloneDataView = _cloneDataView,
	    cloneRegExp = _cloneRegExp,
	    cloneSymbol = _cloneSymbol,
	    cloneTypedArray = _cloneTypedArray;

	/** `Object#toString` result references. */
	var boolTag$1 = '[object Boolean]',
	    dateTag$1 = '[object Date]',
	    mapTag$2 = '[object Map]',
	    numberTag$1 = '[object Number]',
	    regexpTag$1 = '[object RegExp]',
	    setTag$2 = '[object Set]',
	    stringTag$1 = '[object String]',
	    symbolTag$2 = '[object Symbol]';

	var arrayBufferTag$1 = '[object ArrayBuffer]',
	    dataViewTag$1 = '[object DataView]',
	    float32Tag$1 = '[object Float32Array]',
	    float64Tag$1 = '[object Float64Array]',
	    int8Tag$1 = '[object Int8Array]',
	    int16Tag$1 = '[object Int16Array]',
	    int32Tag$1 = '[object Int32Array]',
	    uint8Tag$1 = '[object Uint8Array]',
	    uint8ClampedTag$1 = '[object Uint8ClampedArray]',
	    uint16Tag$1 = '[object Uint16Array]',
	    uint32Tag$1 = '[object Uint32Array]';

	/**
	 * Initializes an object clone based on its `toStringTag`.
	 *
	 * **Note:** This function only supports cloning values with tags of
	 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @param {string} tag The `toStringTag` of the object to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneByTag$1(object, tag, isDeep) {
	  var Ctor = object.constructor;
	  switch (tag) {
	    case arrayBufferTag$1:
	      return cloneArrayBuffer(object);

	    case boolTag$1:
	    case dateTag$1:
	      return new Ctor(+object);

	    case dataViewTag$1:
	      return cloneDataView(object, isDeep);

	    case float32Tag$1: case float64Tag$1:
	    case int8Tag$1: case int16Tag$1: case int32Tag$1:
	    case uint8Tag$1: case uint8ClampedTag$1: case uint16Tag$1: case uint32Tag$1:
	      return cloneTypedArray(object, isDeep);

	    case mapTag$2:
	      return new Ctor;

	    case numberTag$1:
	    case stringTag$1:
	      return new Ctor(object);

	    case regexpTag$1:
	      return cloneRegExp(object);

	    case setTag$2:
	      return new Ctor;

	    case symbolTag$2:
	      return cloneSymbol(object);
	  }
	}

	var _initCloneByTag = initCloneByTag$1;

	var getTag$2 = _getTag,
	    isObjectLike$2 = isObjectLike_1;

	/** `Object#toString` result references. */
	var mapTag$1 = '[object Map]';

	/**
	 * The base implementation of `_.isMap` without Node.js optimizations.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
	 */
	function baseIsMap$1(value) {
	  return isObjectLike$2(value) && getTag$2(value) == mapTag$1;
	}

	var _baseIsMap = baseIsMap$1;

	var baseIsMap = _baseIsMap,
	    baseUnary$1 = _baseUnary,
	    nodeUtil$1 = _nodeUtil.exports;

	/* Node.js helper references. */
	var nodeIsMap = nodeUtil$1 && nodeUtil$1.isMap;

	/**
	 * Checks if `value` is classified as a `Map` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.3.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
	 * @example
	 *
	 * _.isMap(new Map);
	 * // => true
	 *
	 * _.isMap(new WeakMap);
	 * // => false
	 */
	var isMap$1 = nodeIsMap ? baseUnary$1(nodeIsMap) : baseIsMap;

	var isMap_1 = isMap$1;

	var getTag$1 = _getTag,
	    isObjectLike$1 = isObjectLike_1;

	/** `Object#toString` result references. */
	var setTag$1 = '[object Set]';

	/**
	 * The base implementation of `_.isSet` without Node.js optimizations.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
	 */
	function baseIsSet$1(value) {
	  return isObjectLike$1(value) && getTag$1(value) == setTag$1;
	}

	var _baseIsSet = baseIsSet$1;

	var baseIsSet = _baseIsSet,
	    baseUnary = _baseUnary,
	    nodeUtil = _nodeUtil.exports;

	/* Node.js helper references. */
	var nodeIsSet = nodeUtil && nodeUtil.isSet;

	/**
	 * Checks if `value` is classified as a `Set` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.3.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
	 * @example
	 *
	 * _.isSet(new Set);
	 * // => true
	 *
	 * _.isSet(new WeakSet);
	 * // => false
	 */
	var isSet$1 = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;

	var isSet_1 = isSet$1;

	var Stack = _Stack,
	    arrayEach = _arrayEach,
	    assignValue = _assignValue,
	    baseAssign = _baseAssign,
	    baseAssignIn = _baseAssignIn,
	    cloneBuffer = _cloneBuffer.exports,
	    copyArray = _copyArray,
	    copySymbols = _copySymbols,
	    copySymbolsIn = _copySymbolsIn,
	    getAllKeys = _getAllKeys,
	    getAllKeysIn = _getAllKeysIn,
	    getTag = _getTag,
	    initCloneArray = _initCloneArray,
	    initCloneByTag = _initCloneByTag,
	    initCloneObject = _initCloneObject,
	    isArray$1 = isArray_1,
	    isBuffer = isBuffer$3.exports,
	    isMap = isMap_1,
	    isObject = isObject_1,
	    isSet = isSet_1,
	    keys = keys_1,
	    keysIn = keysIn_1;

	/** Used to compose bitmasks for cloning. */
	var CLONE_DEEP_FLAG$1 = 1,
	    CLONE_FLAT_FLAG = 2,
	    CLONE_SYMBOLS_FLAG$1 = 4;

	/** `Object#toString` result references. */
	var argsTag = '[object Arguments]',
	    arrayTag = '[object Array]',
	    boolTag = '[object Boolean]',
	    dateTag = '[object Date]',
	    errorTag = '[object Error]',
	    funcTag = '[object Function]',
	    genTag = '[object GeneratorFunction]',
	    mapTag = '[object Map]',
	    numberTag = '[object Number]',
	    objectTag = '[object Object]',
	    regexpTag = '[object RegExp]',
	    setTag = '[object Set]',
	    stringTag = '[object String]',
	    symbolTag$1 = '[object Symbol]',
	    weakMapTag = '[object WeakMap]';

	var arrayBufferTag = '[object ArrayBuffer]',
	    dataViewTag = '[object DataView]',
	    float32Tag = '[object Float32Array]',
	    float64Tag = '[object Float64Array]',
	    int8Tag = '[object Int8Array]',
	    int16Tag = '[object Int16Array]',
	    int32Tag = '[object Int32Array]',
	    uint8Tag = '[object Uint8Array]',
	    uint8ClampedTag = '[object Uint8ClampedArray]',
	    uint16Tag = '[object Uint16Array]',
	    uint32Tag = '[object Uint32Array]';

	/** Used to identify `toStringTag` values supported by `_.clone`. */
	var cloneableTags = {};
	cloneableTags[argsTag] = cloneableTags[arrayTag] =
	cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
	cloneableTags[boolTag] = cloneableTags[dateTag] =
	cloneableTags[float32Tag] = cloneableTags[float64Tag] =
	cloneableTags[int8Tag] = cloneableTags[int16Tag] =
	cloneableTags[int32Tag] = cloneableTags[mapTag] =
	cloneableTags[numberTag] = cloneableTags[objectTag] =
	cloneableTags[regexpTag] = cloneableTags[setTag] =
	cloneableTags[stringTag] = cloneableTags[symbolTag$1] =
	cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
	cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
	cloneableTags[errorTag] = cloneableTags[funcTag] =
	cloneableTags[weakMapTag] = false;

	/**
	 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
	 * traversed objects.
	 *
	 * @private
	 * @param {*} value The value to clone.
	 * @param {boolean} bitmask The bitmask flags.
	 *  1 - Deep clone
	 *  2 - Flatten inherited properties
	 *  4 - Clone symbols
	 * @param {Function} [customizer] The function to customize cloning.
	 * @param {string} [key] The key of `value`.
	 * @param {Object} [object] The parent object of `value`.
	 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
	 * @returns {*} Returns the cloned value.
	 */
	function baseClone$1(value, bitmask, customizer, key, object, stack) {
	  var result,
	      isDeep = bitmask & CLONE_DEEP_FLAG$1,
	      isFlat = bitmask & CLONE_FLAT_FLAG,
	      isFull = bitmask & CLONE_SYMBOLS_FLAG$1;

	  if (customizer) {
	    result = object ? customizer(value, key, object, stack) : customizer(value);
	  }
	  if (result !== undefined) {
	    return result;
	  }
	  if (!isObject(value)) {
	    return value;
	  }
	  var isArr = isArray$1(value);
	  if (isArr) {
	    result = initCloneArray(value);
	    if (!isDeep) {
	      return copyArray(value, result);
	    }
	  } else {
	    var tag = getTag(value),
	        isFunc = tag == funcTag || tag == genTag;

	    if (isBuffer(value)) {
	      return cloneBuffer(value, isDeep);
	    }
	    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
	      result = (isFlat || isFunc) ? {} : initCloneObject(value);
	      if (!isDeep) {
	        return isFlat
	          ? copySymbolsIn(value, baseAssignIn(result, value))
	          : copySymbols(value, baseAssign(result, value));
	      }
	    } else {
	      if (!cloneableTags[tag]) {
	        return object ? value : {};
	      }
	      result = initCloneByTag(value, tag, isDeep);
	    }
	  }
	  // Check for circular references and return its corresponding clone.
	  stack || (stack = new Stack);
	  var stacked = stack.get(value);
	  if (stacked) {
	    return stacked;
	  }
	  stack.set(value, result);

	  if (isSet(value)) {
	    value.forEach(function(subValue) {
	      result.add(baseClone$1(subValue, bitmask, customizer, subValue, value, stack));
	    });
	  } else if (isMap(value)) {
	    value.forEach(function(subValue, key) {
	      result.set(key, baseClone$1(subValue, bitmask, customizer, key, value, stack));
	    });
	  }

	  var keysFunc = isFull
	    ? (isFlat ? getAllKeysIn : getAllKeys)
	    : (isFlat ? keysIn : keys);

	  var props = isArr ? undefined : keysFunc(value);
	  arrayEach(props || value, function(subValue, key) {
	    if (props) {
	      key = subValue;
	      subValue = value[key];
	    }
	    // Recursively populate clone (susceptible to call stack limits).
	    assignValue(result, key, baseClone$1(subValue, bitmask, customizer, key, value, stack));
	  });
	  return result;
	}

	var _baseClone = baseClone$1;

	var baseClone = _baseClone;

	/** Used to compose bitmasks for cloning. */
	var CLONE_DEEP_FLAG = 1,
	    CLONE_SYMBOLS_FLAG = 4;

	/**
	 * This method is like `_.clone` except that it recursively clones `value`.
	 *
	 * @static
	 * @memberOf _
	 * @since 1.0.0
	 * @category Lang
	 * @param {*} value The value to recursively clone.
	 * @returns {*} Returns the deep cloned value.
	 * @see _.clone
	 * @example
	 *
	 * var objects = [{ 'a': 1 }, { 'b': 2 }];
	 *
	 * var deep = _.cloneDeep(objects);
	 * console.log(deep[0] === objects[0]);
	 * // => false
	 */
	function cloneDeep(value) {
	  return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
	}

	var cloneDeep_1 = cloneDeep;

	var globalState = {};
	var deps = {}; // 触发全局监听

	function emitGlobal(state, prevState) {
	  Object.keys(deps).forEach(function (id) {
	    if (deps[id] instanceof Function) {
	      deps[id](cloneDeep_1(state), cloneDeep_1(prevState));
	    }
	  });
	}

	function initGlobalState() {
	  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	  if (state === globalState) {
	    console.warn('[qiankun] state has not changed！');
	  } else {
	    var prevGlobalState = cloneDeep_1(globalState);

	    globalState = cloneDeep_1(state);
	    emitGlobal(globalState, prevGlobalState);
	  }

	  return getMicroAppStateActions("global-".concat(+new Date()), true);
	}
	function getMicroAppStateActions(id, isMaster) {
	  return {
	    /**
	     * onGlobalStateChange 全局依赖监听
	     *
	     * 收集 setState 时所需要触发的依赖
	     *
	     * 限制条件：每个子应用只有一个激活状态的全局监听，新监听覆盖旧监听，若只是监听部分属性，请使用 onGlobalStateChange
	     *
	     * 这么设计是为了减少全局监听滥用导致的内存爆炸
	     *
	     * 依赖数据结构为：
	     * {
	     *   {id}: callback
	     * }
	     *
	     * @param callback
	     * @param fireImmediately
	     */
	    onGlobalStateChange: function onGlobalStateChange(callback, fireImmediately) {
	      if (!(callback instanceof Function)) {
	        console.error('[qiankun] callback must be function!');
	        return;
	      }

	      if (deps[id]) {
	        console.warn("[qiankun] '".concat(id, "' global listener already exists before this, new listener will overwrite it."));
	      }

	      deps[id] = callback;

	      if (fireImmediately) {
	        var cloneState = cloneDeep_1(globalState);

	        callback(cloneState, cloneState);
	      }
	    },

	    /**
	     * setGlobalState 更新 store 数据
	     *
	     * 1. 对输入 state 的第一层属性做校验，只有初始化时声明过的第一层（bucket）属性才会被更改
	     * 2. 修改 store 并触发全局监听
	     *
	     * @param state
	     */
	    setGlobalState: function setGlobalState() {
	      var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      if (state === globalState) {
	        console.warn('[qiankun] state has not changed！');
	        return false;
	      }

	      var changeKeys = [];

	      var prevGlobalState = cloneDeep_1(globalState);

	      globalState = cloneDeep_1(Object.keys(state).reduce(function (_globalState, changeKey) {
	        if (isMaster || _globalState.hasOwnProperty(changeKey)) {
	          changeKeys.push(changeKey);
	          return Object.assign(_globalState, _defineProperty({}, changeKey, state[changeKey]));
	        }

	        console.warn("[qiankun] '".concat(changeKey, "' not declared when init state\uFF01"));
	        return _globalState;
	      }, globalState));

	      if (changeKeys.length === 0) {
	        console.warn('[qiankun] state has not changed！');
	        return false;
	      }

	      emitGlobal(globalState, prevGlobalState);
	      return true;
	    },
	    // 注销该应用下的依赖
	    offGlobalStateChange: function offGlobalStateChange() {
	      delete deps[id];
	      return true;
	    }
	  };
	}

	function _defineProperties(target, props) {
	  for (var i = 0; i < props.length; i++) {
	    var descriptor = props[i];
	    descriptor.enumerable = descriptor.enumerable || false;
	    descriptor.configurable = true;
	    if ("value" in descriptor) descriptor.writable = true;
	    Object.defineProperty(target, descriptor.key, descriptor);
	  }
	}

	function _createClass(Constructor, protoProps, staticProps) {
	  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
	  if (staticProps) _defineProperties(Constructor, staticProps);
	  return Constructor;
	}

	var SandBoxType;

	(function (SandBoxType) {
	  SandBoxType["Proxy"] = "Proxy";
	  SandBoxType["Snapshot"] = "Snapshot"; // for legacy sandbox
	  // https://github.com/umijs/qiankun/blob/0d1d3f0c5ed1642f01854f96c3fabf0a2148bd26/src/sandbox/legacy/sandbox.ts#L22...L25

	  SandBoxType["LegacyProxy"] = "LegacyProxy";
	})(SandBoxType || (SandBoxType = {}));

	/**
	 * A specialized version of `_.reduce` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @param {*} [accumulator] The initial value.
	 * @param {boolean} [initAccum] Specify using the first element of `array` as
	 *  the initial value.
	 * @returns {*} Returns the accumulated value.
	 */

	function arrayReduce$1(array, iteratee, accumulator, initAccum) {
	  var index = -1,
	      length = array == null ? 0 : array.length;

	  if (initAccum && length) {
	    accumulator = array[++index];
	  }
	  while (++index < length) {
	    accumulator = iteratee(accumulator, array[index], index, array);
	  }
	  return accumulator;
	}

	var _arrayReduce = arrayReduce$1;

	/**
	 * The base implementation of `_.propertyOf` without support for deep paths.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Function} Returns the new accessor function.
	 */

	function basePropertyOf$1(object) {
	  return function(key) {
	    return object == null ? undefined : object[key];
	  };
	}

	var _basePropertyOf = basePropertyOf$1;

	var basePropertyOf = _basePropertyOf;

	/** Used to map Latin Unicode letters to basic Latin letters. */
	var deburredLetters = {
	  // Latin-1 Supplement block.
	  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
	  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
	  '\xc7': 'C',  '\xe7': 'c',
	  '\xd0': 'D',  '\xf0': 'd',
	  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
	  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
	  '\xcc': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
	  '\xec': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
	  '\xd1': 'N',  '\xf1': 'n',
	  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
	  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
	  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
	  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
	  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
	  '\xc6': 'Ae', '\xe6': 'ae',
	  '\xde': 'Th', '\xfe': 'th',
	  '\xdf': 'ss',
	  // Latin Extended-A block.
	  '\u0100': 'A',  '\u0102': 'A', '\u0104': 'A',
	  '\u0101': 'a',  '\u0103': 'a', '\u0105': 'a',
	  '\u0106': 'C',  '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
	  '\u0107': 'c',  '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
	  '\u010e': 'D',  '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
	  '\u0112': 'E',  '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
	  '\u0113': 'e',  '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
	  '\u011c': 'G',  '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
	  '\u011d': 'g',  '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
	  '\u0124': 'H',  '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
	  '\u0128': 'I',  '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
	  '\u0129': 'i',  '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
	  '\u0134': 'J',  '\u0135': 'j',
	  '\u0136': 'K',  '\u0137': 'k', '\u0138': 'k',
	  '\u0139': 'L',  '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
	  '\u013a': 'l',  '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
	  '\u0143': 'N',  '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
	  '\u0144': 'n',  '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
	  '\u014c': 'O',  '\u014e': 'O', '\u0150': 'O',
	  '\u014d': 'o',  '\u014f': 'o', '\u0151': 'o',
	  '\u0154': 'R',  '\u0156': 'R', '\u0158': 'R',
	  '\u0155': 'r',  '\u0157': 'r', '\u0159': 'r',
	  '\u015a': 'S',  '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
	  '\u015b': 's',  '\u015d': 's', '\u015f': 's', '\u0161': 's',
	  '\u0162': 'T',  '\u0164': 'T', '\u0166': 'T',
	  '\u0163': 't',  '\u0165': 't', '\u0167': 't',
	  '\u0168': 'U',  '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
	  '\u0169': 'u',  '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
	  '\u0174': 'W',  '\u0175': 'w',
	  '\u0176': 'Y',  '\u0177': 'y', '\u0178': 'Y',
	  '\u0179': 'Z',  '\u017b': 'Z', '\u017d': 'Z',
	  '\u017a': 'z',  '\u017c': 'z', '\u017e': 'z',
	  '\u0132': 'IJ', '\u0133': 'ij',
	  '\u0152': 'Oe', '\u0153': 'oe',
	  '\u0149': "'n", '\u017f': 's'
	};

	/**
	 * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
	 * letters to basic Latin letters.
	 *
	 * @private
	 * @param {string} letter The matched letter to deburr.
	 * @returns {string} Returns the deburred letter.
	 */
	var deburrLetter$1 = basePropertyOf(deburredLetters);

	var _deburrLetter = deburrLetter$1;

	/**
	 * A specialized version of `_.map` for arrays without support for iteratee
	 * shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns the new mapped array.
	 */

	function arrayMap$1(array, iteratee) {
	  var index = -1,
	      length = array == null ? 0 : array.length,
	      result = Array(length);

	  while (++index < length) {
	    result[index] = iteratee(array[index], index, array);
	  }
	  return result;
	}

	var _arrayMap = arrayMap$1;

	var baseGetTag = _baseGetTag,
	    isObjectLike = isObjectLike_1;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol$1(value) {
	  return typeof value == 'symbol' ||
	    (isObjectLike(value) && baseGetTag(value) == symbolTag);
	}

	var isSymbol_1 = isSymbol$1;

	var Symbol$1 = _Symbol,
	    arrayMap = _arrayMap,
	    isArray = isArray_1,
	    isSymbol = isSymbol_1;

	/** Used as references for various `Number` constants. */
	var INFINITY = 1 / 0;

	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
	    symbolToString = symbolProto ? symbolProto.toString : undefined;

	/**
	 * The base implementation of `_.toString` which doesn't convert nullish
	 * values to empty strings.
	 *
	 * @private
	 * @param {*} value The value to process.
	 * @returns {string} Returns the string.
	 */
	function baseToString$1(value) {
	  // Exit early for strings to avoid a performance hit in some environments.
	  if (typeof value == 'string') {
	    return value;
	  }
	  if (isArray(value)) {
	    // Recursively convert values (susceptible to call stack limits).
	    return arrayMap(value, baseToString$1) + '';
	  }
	  if (isSymbol(value)) {
	    return symbolToString ? symbolToString.call(value) : '';
	  }
	  var result = (value + '');
	  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
	}

	var _baseToString = baseToString$1;

	var baseToString = _baseToString;

	/**
	 * Converts `value` to a string. An empty string is returned for `null`
	 * and `undefined` values. The sign of `-0` is preserved.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to convert.
	 * @returns {string} Returns the converted string.
	 * @example
	 *
	 * _.toString(null);
	 * // => ''
	 *
	 * _.toString(-0);
	 * // => '-0'
	 *
	 * _.toString([1, 2, 3]);
	 * // => '1,2,3'
	 */
	function toString$2(value) {
	  return value == null ? '' : baseToString(value);
	}

	var toString_1 = toString$2;

	var deburrLetter = _deburrLetter,
	    toString$1 = toString_1;

	/** Used to match Latin Unicode letters (excluding mathematical operators). */
	var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

	/** Used to compose unicode character classes. */
	var rsComboMarksRange$1 = '\\u0300-\\u036f',
	    reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
	    rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
	    rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1;

	/** Used to compose unicode capture groups. */
	var rsCombo$1 = '[' + rsComboRange$1 + ']';

	/**
	 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
	 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
	 */
	var reComboMark = RegExp(rsCombo$1, 'g');

	/**
	 * Deburrs `string` by converting
	 * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
	 * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
	 * letters to basic Latin letters and removing
	 * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to deburr.
	 * @returns {string} Returns the deburred string.
	 * @example
	 *
	 * _.deburr('déjà vu');
	 * // => 'deja vu'
	 */
	function deburr$1(string) {
	  string = toString$1(string);
	  return string && string.replace(reLatin, deburrLetter).replace(reComboMark, '');
	}

	var deburr_1 = deburr$1;

	/** Used to match words composed of alphanumeric characters. */

	var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

	/**
	 * Splits an ASCII `string` into an array of its words.
	 *
	 * @private
	 * @param {string} The string to inspect.
	 * @returns {Array} Returns the words of `string`.
	 */
	function asciiWords$1(string) {
	  return string.match(reAsciiWord) || [];
	}

	var _asciiWords = asciiWords$1;

	/** Used to detect strings that need a more robust regexp to match words. */

	var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

	/**
	 * Checks if `string` contains a word composed of Unicode symbols.
	 *
	 * @private
	 * @param {string} string The string to inspect.
	 * @returns {boolean} Returns `true` if a word is found, else `false`.
	 */
	function hasUnicodeWord$1(string) {
	  return reHasUnicodeWord.test(string);
	}

	var _hasUnicodeWord = hasUnicodeWord$1;

	/** Used to compose unicode character classes. */

	var rsAstralRange = '\\ud800-\\udfff',
	    rsComboMarksRange = '\\u0300-\\u036f',
	    reComboHalfMarksRange = '\\ufe20-\\ufe2f',
	    rsComboSymbolsRange = '\\u20d0-\\u20ff',
	    rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
	    rsDingbatRange = '\\u2700-\\u27bf',
	    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
	    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
	    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
	    rsPunctuationRange = '\\u2000-\\u206f',
	    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
	    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
	    rsVarRange = '\\ufe0e\\ufe0f',
	    rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

	/** Used to compose unicode capture groups. */
	var rsApos$1 = "['\u2019]",
	    rsBreak = '[' + rsBreakRange + ']',
	    rsCombo = '[' + rsComboRange + ']',
	    rsDigits = '\\d+',
	    rsDingbat = '[' + rsDingbatRange + ']',
	    rsLower = '[' + rsLowerRange + ']',
	    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
	    rsFitz = '\\ud83c[\\udffb-\\udfff]',
	    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
	    rsNonAstral = '[^' + rsAstralRange + ']',
	    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
	    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
	    rsUpper = '[' + rsUpperRange + ']',
	    rsZWJ = '\\u200d';

	/** Used to compose unicode regexes. */
	var rsMiscLower = '(?:' + rsLower + '|' + rsMisc + ')',
	    rsMiscUpper = '(?:' + rsUpper + '|' + rsMisc + ')',
	    rsOptContrLower = '(?:' + rsApos$1 + '(?:d|ll|m|re|s|t|ve))?',
	    rsOptContrUpper = '(?:' + rsApos$1 + '(?:D|LL|M|RE|S|T|VE))?',
	    reOptMod = rsModifier + '?',
	    rsOptVar = '[' + rsVarRange + ']?',
	    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
	    rsOrdLower = '\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])',
	    rsOrdUpper = '\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])',
	    rsSeq = rsOptVar + reOptMod + rsOptJoin,
	    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq;

	/** Used to match complex or compound words. */
	var reUnicodeWord = RegExp([
	  rsUpper + '?' + rsLower + '+' + rsOptContrLower + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
	  rsMiscUpper + '+' + rsOptContrUpper + '(?=' + [rsBreak, rsUpper + rsMiscLower, '$'].join('|') + ')',
	  rsUpper + '?' + rsMiscLower + '+' + rsOptContrLower,
	  rsUpper + '+' + rsOptContrUpper,
	  rsOrdUpper,
	  rsOrdLower,
	  rsDigits,
	  rsEmoji
	].join('|'), 'g');

	/**
	 * Splits a Unicode `string` into an array of its words.
	 *
	 * @private
	 * @param {string} The string to inspect.
	 * @returns {Array} Returns the words of `string`.
	 */
	function unicodeWords$1(string) {
	  return string.match(reUnicodeWord) || [];
	}

	var _unicodeWords = unicodeWords$1;

	var asciiWords = _asciiWords,
	    hasUnicodeWord = _hasUnicodeWord,
	    toString = toString_1,
	    unicodeWords = _unicodeWords;

	/**
	 * Splits `string` into an array of its words.
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to inspect.
	 * @param {RegExp|string} [pattern] The pattern to match words.
	 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
	 * @returns {Array} Returns the words of `string`.
	 * @example
	 *
	 * _.words('fred, barney, & pebbles');
	 * // => ['fred', 'barney', 'pebbles']
	 *
	 * _.words('fred, barney, & pebbles', /[^, ]+/g);
	 * // => ['fred', 'barney', '&', 'pebbles']
	 */
	function words$1(string, pattern, guard) {
	  string = toString(string);
	  pattern = guard ? undefined : pattern;

	  if (pattern === undefined) {
	    return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
	  }
	  return string.match(pattern) || [];
	}

	var words_1 = words$1;

	var arrayReduce = _arrayReduce,
	    deburr = deburr_1,
	    words = words_1;

	/** Used to compose unicode capture groups. */
	var rsApos = "['\u2019]";

	/** Used to match apostrophes. */
	var reApos = RegExp(rsApos, 'g');

	/**
	 * Creates a function like `_.camelCase`.
	 *
	 * @private
	 * @param {Function} callback The function to combine each word.
	 * @returns {Function} Returns the new compounder function.
	 */
	function createCompounder$1(callback) {
	  return function(string) {
	    return arrayReduce(words(deburr(string).replace(reApos, '')), callback, '');
	  };
	}

	var _createCompounder = createCompounder$1;

	var createCompounder = _createCompounder;

	/**
	 * Converts `string` to
	 * [snake case](https://en.wikipedia.org/wiki/Snake_case).
	 *
	 * @static
	 * @memberOf _
	 * @since 3.0.0
	 * @category String
	 * @param {string} [string=''] The string to convert.
	 * @returns {string} Returns the snake cased string.
	 * @example
	 *
	 * _.snakeCase('Foo Bar');
	 * // => 'foo_bar'
	 *
	 * _.snakeCase('fooBar');
	 * // => 'foo_bar'
	 *
	 * _.snakeCase('--FOO-BAR--');
	 * // => 'foo_bar'
	 */
	var snakeCase = createCompounder(function(result, word, index) {
	  return result + (index ? '_' : '') + word.toLowerCase();
	});

	var snakeCase_1 = snakeCase;

	var version = '2.5.1';

	function toArray(array) {
	  return Array.isArray(array) ? array : [array];
	}

	var nextTick = typeof window.Zone === 'function' ? setTimeout : function (cb) {
	  return Promise.resolve().then(cb);
	};
	var globalTaskPending = false;
	/**
	 * Run a callback before next task executing, and the invocation is idempotent in every singular task
	 * That means even we called nextTask multi times in one task, only the first callback will be pushed to nextTick to be invoked.
	 * @param cb
	 */

	function nextTask(cb) {
	  if (!globalTaskPending) {
	    globalTaskPending = true;
	    nextTick(function () {
	      cb();
	      globalTaskPending = false;
	    });
	  }
	}
	var fnRegexCheckCacheMap = new WeakMap();
	function isConstructable(fn) {
	  // prototype methods might be changed while code running, so we need check it every time
	  var hasPrototypeMethods = fn.prototype && fn.prototype.constructor === fn && Object.getOwnPropertyNames(fn.prototype).length > 1;
	  if (hasPrototypeMethods) return true;

	  if (fnRegexCheckCacheMap.has(fn)) {
	    return fnRegexCheckCacheMap.get(fn);
	  }
	  /*
	    1. 有 prototype 并且 prototype 上有定义一系列非 constructor 属性
	    2. 函数名大写开头
	    3. class 函数
	    满足其一则可认定为构造函数
	   */


	  var constructable = hasPrototypeMethods;

	  if (!constructable) {
	    // fn.toString has a significant performance overhead, if hasPrototypeMethods check not passed, we will check the function string with regex
	    var fnString = fn.toString();
	    var constructableFunctionRegex = /^function\b\s[A-Z].*/;
	    var classRegex = /^class\b/;
	    constructable = constructableFunctionRegex.test(fnString) || classRegex.test(fnString);
	  }

	  fnRegexCheckCacheMap.set(fn, constructable);
	  return constructable;
	}
	/**
	 * in safari
	 * typeof document.all === 'undefined' // true
	 * typeof document.all === 'function' // true
	 * We need to discriminate safari for better performance
	 */

	var naughtySafari = typeof document.all === 'function' && typeof document.all === 'undefined';
	var callableFnCacheMap = new WeakMap();
	var isCallable = function isCallable(fn) {
	  if (callableFnCacheMap.has(fn)) {
	    return true;
	  }

	  var callable = naughtySafari ? typeof fn === 'function' && typeof fn !== 'undefined' : typeof fn === 'function';

	  if (callable) {
	    callableFnCacheMap.set(fn, callable);
	  }

	  return callable;
	};
	var boundedMap = new WeakMap();
	function isBoundedFunction(fn) {
	  if (boundedMap.has(fn)) {
	    return boundedMap.get(fn);
	  }
	  /*
	   indexOf is faster than startsWith
	   see https://jsperf.com/string-startswith/72
	   */


	  var bounded = fn.name.indexOf('bound ') === 0 && !fn.hasOwnProperty('prototype');
	  boundedMap.set(fn, bounded);
	  return bounded;
	}
	function getDefaultTplWrapper(id, name) {
	  return function (tpl) {
	    return "<div id=\"".concat(getWrapperId(id), "\" data-name=\"").concat(name, "\" data-version=\"").concat(version, "\">").concat(tpl, "</div>");
	  };
	}
	function getWrapperId(id) {
	  return "__qiankun_microapp_wrapper_for_".concat(snakeCase_1(id), "__");
	}
	var nativeGlobal = new Function('return this')();
	/** 校验子应用导出的 生命周期 对象是否正确 */

	function validateExportLifecycle(exports) {
	  var _ref = exports !== null && exports !== void 0 ? exports : {},
	      bootstrap = _ref.bootstrap,
	      mount = _ref.mount,
	      unmount = _ref.unmount;

	  return isFunction_1(bootstrap) && isFunction_1(mount) && isFunction_1(unmount);
	}

	var Deferred = function Deferred() {
	  var _this = this;

	  _classCallCheck(this, Deferred);

	  this.promise = new Promise(function (resolve, reject) {
	    _this.resolve = resolve;
	    _this.reject = reject;
	  });
	};
	var supportsUserTiming = typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.clearMarks === 'function' && typeof performance.measure === 'function' && typeof performance.clearMeasures === 'function' && typeof performance.getEntriesByName === 'function';
	function performanceGetEntriesByName(markName, type) {
	  var marks = null;

	  if (supportsUserTiming) {
	    marks = performance.getEntriesByName(markName, type);
	  }

	  return marks;
	}
	function performanceMark(markName) {
	  if (supportsUserTiming) {
	    performance.mark(markName);
	  }
	}
	function performanceMeasure(measureName, markName) {
	  if (supportsUserTiming && performance.getEntriesByName(markName, 'mark').length) {
	    performance.measure(measureName, markName);
	    performance.clearMarks(markName);
	    performance.clearMeasures(measureName);
	  }
	}
	function isEnableScopedCSS(sandbox) {
	  if (_typeof(sandbox) !== 'object') {
	    return false;
	  }

	  if (sandbox.strictStyleIsolation) {
	    return false;
	  }

	  return !!sandbox.experimentalStyleIsolation;
	}
	/**
	 * copy from https://developer.mozilla.org/zh-CN/docs/Using_XPath
	 * @param el
	 * @param document
	 */

	function getXPathForElement(el, document) {
	  // not support that if el not existed in document yet(such as it not append to document before it mounted)
	  if (!document.body.contains(el)) {
	    return undefined;
	  }

	  var xpath = '';
	  var pos;
	  var tmpEle;
	  var element = el;

	  while (element !== document.documentElement) {
	    pos = 0;
	    tmpEle = element;

	    while (tmpEle) {
	      if (tmpEle.nodeType === 1 && tmpEle.nodeName === element.nodeName) {
	        // If it is ELEMENT_NODE of the same name
	        pos += 1;
	      }

	      tmpEle = tmpEle.previousSibling;
	    }

	    xpath = "*[name()='".concat(element.nodeName, "'][").concat(pos, "]/").concat(xpath);
	    element = element.parentNode;
	  }

	  xpath = "/*[name()='".concat(document.documentElement.nodeName, "']/").concat(xpath);
	  xpath = xpath.replace(/\/$/, '');
	  return xpath;
	}
	function getContainer(container) {
	  return typeof container === 'string' ? document.querySelector(container) : container;
	}
	function getContainerXPath(container) {
	  if (container) {
	    var containerElement = getContainer(container);

	    if (containerElement) {
	      return getXPathForElement(containerElement, document);
	    }
	  }

	  return undefined;
	}

	/**
	 * @author Kuitos
	 * @since 2020-04-13
	 */
	var currentRunningApp = null;
	/**
	 * get the app that running tasks at current tick
	 */

	function getCurrentRunningApp() {
	  return currentRunningApp;
	}
	function setCurrentRunningApp(appInstance) {
	  // set currentRunningApp and it's proxySandbox to global window, as its only use case is for document.createElement from now on, which hijacked by a global way
	  currentRunningApp = appInstance;
	}
	var functionBoundedValueMap = new WeakMap();
	function getTargetValue(target, value) {
	  /*
	    仅绑定 isCallable && !isBoundedFunction && !isConstructable 的函数对象，如 window.console、window.atob 这类，不然微应用中调用时会抛出 Illegal invocation 异常
	    目前没有完美的检测方式，这里通过 prototype 中是否还有可枚举的拓展方法的方式来判断
	    @warning 这里不要随意替换成别的判断方式，因为可能触发一些 edge case（比如在 lodash.isFunction 在 iframe 上下文中可能由于调用了 top window 对象触发的安全异常）
	   */
	  if (isCallable(value) && !isBoundedFunction(value) && !isConstructable(value)) {
	    var cachedBoundFunction = functionBoundedValueMap.get(value);

	    if (cachedBoundFunction) {
	      return cachedBoundFunction;
	    }

	    var boundValue = Function.prototype.bind.call(value, target); // some callable function has custom fields, we need to copy the enumerable props to boundValue. such as moment function.
	    // use for..in rather than Object.keys.forEach for performance reason
	    // eslint-disable-next-line guard-for-in,no-restricted-syntax

	    for (var key in value) {
	      boundValue[key] = value[key];
	    } // copy prototype if bound function not have but target one have
	    // as prototype is non-enumerable mostly, we need to copy it from target function manually


	    if (value.hasOwnProperty('prototype') && !boundValue.hasOwnProperty('prototype')) {
	      // we should not use assignment operator to set boundValue prototype like `boundValue.prototype = value.prototype`
	      // as the assignment will also look up prototype chain while it hasn't own prototype property,
	      // when the lookup succeed, the assignment will throw an TypeError like `Cannot assign to read only property 'prototype' of function` if its descriptor configured with writable false or just have a getter accessor
	      // see https://github.com/umijs/qiankun/issues/1121
	      Object.defineProperty(boundValue, 'prototype', {
	        value: value.prototype,
	        enumerable: false,
	        writable: true
	      });
	    }

	    functionBoundedValueMap.set(value, boundValue);
	    return boundValue;
	  }

	  return value;
	}

	function isPropConfigurable(target, prop) {
	  var descriptor = Object.getOwnPropertyDescriptor(target, prop);
	  return descriptor ? descriptor.configurable : true;
	}
	/**
	 * 基于 Proxy 实现的沙箱
	 * TODO: 为了兼容性 singular 模式下依旧使用该沙箱，等新沙箱稳定之后再切换
	 */


	var LegacySandbox = /*#__PURE__*/function () {
	  function LegacySandbox(name) {
	    var _this = this;

	    var globalContext = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

	    _classCallCheck(this, LegacySandbox);

	    /** 沙箱期间新增的全局变量 */
	    this.addedPropsMapInSandbox = new Map();
	    /** 沙箱期间更新的全局变量 */

	    this.modifiedPropsOriginalValueMapInSandbox = new Map();
	    /** 持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做 snapshot */

	    this.currentUpdatedPropsValueMap = new Map();
	    this.sandboxRunning = true;
	    this.latestSetProp = null;
	    this.name = name;
	    this.globalContext = globalContext;
	    this.type = SandBoxType.LegacyProxy;
	    var addedPropsMapInSandbox = this.addedPropsMapInSandbox,
	        modifiedPropsOriginalValueMapInSandbox = this.modifiedPropsOriginalValueMapInSandbox,
	        currentUpdatedPropsValueMap = this.currentUpdatedPropsValueMap;
	    var rawWindow = globalContext;
	    var fakeWindow = Object.create(null);

	    var setTrap = function setTrap(p, value, originalValue) {
	      var sync2Window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

	      if (_this.sandboxRunning) {
	        if (!rawWindow.hasOwnProperty(p)) {
	          addedPropsMapInSandbox.set(p, value);
	        } else if (!modifiedPropsOriginalValueMapInSandbox.has(p)) {
	          // 如果当前 window 对象存在该属性，且 record map 中未记录过，则记录该属性初始值
	          modifiedPropsOriginalValueMapInSandbox.set(p, originalValue);
	        }

	        currentUpdatedPropsValueMap.set(p, value);

	        if (sync2Window) {
	          // 必须重新设置 window 对象保证下次 get 时能拿到已更新的数据
	          rawWindow[p] = value;
	        }

	        _this.latestSetProp = p;
	        return true;
	      }

	      if (process.env.NODE_ENV === 'development') {
	        console.warn("[qiankun] Set window.".concat(p.toString(), " while sandbox destroyed or inactive in ").concat(name, "!"));
	      } // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误


	      return true;
	    };

	    var proxy = new Proxy(fakeWindow, {
	      set: function set(_, p, value) {
	        var originalValue = rawWindow[p];
	        return setTrap(p, value, originalValue, true);
	      },
	      get: function get(_, p) {
	        // avoid who using window.window or window.self to escape the sandbox environment to touch the really window
	        // or use window.top to check if an iframe context
	        // see https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js#L13
	        if (p === 'top' || p === 'parent' || p === 'window' || p === 'self') {
	          return proxy;
	        }

	        var value = rawWindow[p];
	        return getTargetValue(rawWindow, value);
	      },
	      // trap in operator
	      // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
	      has: function has(_, p) {
	        return p in rawWindow;
	      },
	      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(_, p) {
	        var descriptor = Object.getOwnPropertyDescriptor(rawWindow, p); // A property cannot be reported as non-configurable, if it does not exists as an own property of the target object

	        if (descriptor && !descriptor.configurable) {
	          descriptor.configurable = true;
	        }

	        return descriptor;
	      },
	      defineProperty: function defineProperty(_, p, attributes) {
	        var originalValue = rawWindow[p];
	        var done = Reflect.defineProperty(rawWindow, p, attributes);
	        var value = rawWindow[p];
	        setTrap(p, value, originalValue, false);
	        return done;
	      }
	    });
	    this.proxy = proxy;
	  }

	  _createClass(LegacySandbox, [{
	    key: "setWindowProp",
	    value: function setWindowProp(prop, value, toDelete) {
	      if (value === undefined && toDelete) {
	        // eslint-disable-next-line no-param-reassign
	        delete this.globalContext[prop];
	      } else if (isPropConfigurable(this.globalContext, prop) && _typeof(prop) !== 'symbol') {
	        Object.defineProperty(this.globalContext, prop, {
	          writable: true,
	          configurable: true
	        }); // eslint-disable-next-line no-param-reassign

	        this.globalContext[prop] = value;
	      }
	    }
	  }, {
	    key: "active",
	    value: function active() {
	      var _this2 = this;

	      if (!this.sandboxRunning) {
	        this.currentUpdatedPropsValueMap.forEach(function (v, p) {
	          return _this2.setWindowProp(p, v);
	        });
	      }

	      this.sandboxRunning = true;
	    }
	  }, {
	    key: "inactive",
	    value: function inactive() {
	      var _this3 = this;

	      if (process.env.NODE_ENV === 'development') {
	        console.info("[qiankun:sandbox] ".concat(this.name, " modified global properties restore..."), [].concat(_toConsumableArray(this.addedPropsMapInSandbox.keys()), _toConsumableArray(this.modifiedPropsOriginalValueMapInSandbox.keys())));
	      } // renderSandboxSnapshot = snapshot(currentUpdatedPropsValueMapForSnapshot);
	      // restore global props to initial snapshot


	      this.modifiedPropsOriginalValueMapInSandbox.forEach(function (v, p) {
	        return _this3.setWindowProp(p, v);
	      });
	      this.addedPropsMapInSandbox.forEach(function (_, p) {
	        return _this3.setWindowProp(p, undefined, true);
	      });
	      this.sandboxRunning = false;
	    }
	  }]);

	  return LegacySandbox;
	}();

	/**
	 * @author Saviio
	 * @since 2020-4-19
	 */
	// https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
	var RuleType;

	(function (RuleType) {
	  // type: rule will be rewrote
	  RuleType[RuleType["STYLE"] = 1] = "STYLE";
	  RuleType[RuleType["MEDIA"] = 4] = "MEDIA";
	  RuleType[RuleType["SUPPORTS"] = 12] = "SUPPORTS"; // type: value will be kept

	  RuleType[RuleType["IMPORT"] = 3] = "IMPORT";
	  RuleType[RuleType["FONT_FACE"] = 5] = "FONT_FACE";
	  RuleType[RuleType["PAGE"] = 6] = "PAGE";
	  RuleType[RuleType["KEYFRAMES"] = 7] = "KEYFRAMES";
	  RuleType[RuleType["KEYFRAME"] = 8] = "KEYFRAME";
	})(RuleType || (RuleType = {}));

	var arrayify = function arrayify(list) {
	  return [].slice.call(list, 0);
	};

	var rawDocumentBodyAppend = HTMLBodyElement.prototype.appendChild;
	var ScopedCSS = /*#__PURE__*/function () {
	  function ScopedCSS() {
	    _classCallCheck(this, ScopedCSS);

	    var styleNode = document.createElement('style');
	    rawDocumentBodyAppend.call(document.body, styleNode);
	    this.swapNode = styleNode;
	    this.sheet = styleNode.sheet;
	    this.sheet.disabled = true;
	  }

	  _createClass(ScopedCSS, [{
	    key: "process",
	    value: function process(styleNode) {
	      var _this = this;

	      var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

	      var _a;

	      if (styleNode.textContent !== '') {
	        var textNode = document.createTextNode(styleNode.textContent || '');
	        this.swapNode.appendChild(textNode);
	        var sheet = this.swapNode.sheet; // type is missing

	        var rules = arrayify((_a = sheet === null || sheet === void 0 ? void 0 : sheet.cssRules) !== null && _a !== void 0 ? _a : []);
	        var css = this.rewrite(rules, prefix); // eslint-disable-next-line no-param-reassign

	        styleNode.textContent = css; // cleanup

	        this.swapNode.removeChild(textNode);
	        return;
	      }

	      var mutator = new MutationObserver(function (mutations) {
	        var _a;

	        for (var i = 0; i < mutations.length; i += 1) {
	          var mutation = mutations[i];

	          if (ScopedCSS.ModifiedTag in styleNode) {
	            return;
	          }

	          if (mutation.type === 'childList') {
	            var _sheet = styleNode.sheet;

	            var _rules = arrayify((_a = _sheet === null || _sheet === void 0 ? void 0 : _sheet.cssRules) !== null && _a !== void 0 ? _a : []);

	            var _css = _this.rewrite(_rules, prefix); // eslint-disable-next-line no-param-reassign


	            styleNode.textContent = _css; // eslint-disable-next-line no-param-reassign

	            styleNode[ScopedCSS.ModifiedTag] = true;
	          }
	        }
	      }); // since observer will be deleted when node be removed
	      // we dont need create a cleanup function manually
	      // see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect

	      mutator.observe(styleNode, {
	        childList: true
	      });
	    }
	  }, {
	    key: "rewrite",
	    value: function rewrite(rules) {
	      var _this2 = this;

	      var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	      var css = '';
	      rules.forEach(function (rule) {
	        switch (rule.type) {
	          case RuleType.STYLE:
	            css += _this2.ruleStyle(rule, prefix);
	            break;

	          case RuleType.MEDIA:
	            css += _this2.ruleMedia(rule, prefix);
	            break;

	          case RuleType.SUPPORTS:
	            css += _this2.ruleSupport(rule, prefix);
	            break;

	          default:
	            css += "".concat(rule.cssText);
	            break;
	        }
	      });
	      return css;
	    } // handle case:
	    // .app-main {}
	    // html, body {}
	    // eslint-disable-next-line class-methods-use-this

	  }, {
	    key: "ruleStyle",
	    value: function ruleStyle(rule, prefix) {
	      var rootSelectorRE = /((?:[^\w\-.#]|^)(body|html|:root))/gm;
	      var rootCombinationRE = /(html[^\w{[]+)/gm;
	      var selector = rule.selectorText.trim();
	      var cssText = rule.cssText; // handle html { ... }
	      // handle body { ... }
	      // handle :root { ... }

	      if (selector === 'html' || selector === 'body' || selector === ':root') {
	        return cssText.replace(rootSelectorRE, prefix);
	      } // handle html body { ... }
	      // handle html > body { ... }


	      if (rootCombinationRE.test(rule.selectorText)) {
	        var siblingSelectorRE = /(html[^\w{]+)(\+|~)/gm; // since html + body is a non-standard rule for html
	        // transformer will ignore it

	        if (!siblingSelectorRE.test(rule.selectorText)) {
	          cssText = cssText.replace(rootCombinationRE, '');
	        }
	      } // handle grouping selector, a,span,p,div { ... }


	      cssText = cssText.replace(/^[\s\S]+{/, function (selectors) {
	        return selectors.replace(/(^|,\n?)([^,]+)/g, function (item, p, s) {
	          // handle div,body,span { ... }
	          if (rootSelectorRE.test(item)) {
	            return item.replace(rootSelectorRE, function (m) {
	              // do not discard valid previous character, such as body,html or *:not(:root)
	              var whitePrevChars = [',', '('];

	              if (m && whitePrevChars.includes(m[0])) {
	                return "".concat(m[0]).concat(prefix);
	              } // replace root selector with prefix


	              return prefix;
	            });
	          }

	          return "".concat(p).concat(prefix, " ").concat(s.replace(/^ */, ''));
	        });
	      });
	      return cssText;
	    } // handle case:
	    // @media screen and (max-width: 300px) {}

	  }, {
	    key: "ruleMedia",
	    value: function ruleMedia(rule, prefix) {
	      var css = this.rewrite(arrayify(rule.cssRules), prefix);
	      return "@media ".concat(rule.conditionText, " {").concat(css, "}");
	    } // handle case:
	    // @supports (display: grid) {}

	  }, {
	    key: "ruleSupport",
	    value: function ruleSupport(rule, prefix) {
	      var css = this.rewrite(arrayify(rule.cssRules), prefix);
	      return "@supports ".concat(rule.conditionText, " {").concat(css, "}");
	    }
	  }]);

	  return ScopedCSS;
	}();
	ScopedCSS.ModifiedTag = 'Symbol(style-modified-qiankun)';
	var processor;
	var QiankunCSSRewriteAttr = 'data-qiankun';
	var process$1 = function process(appWrapper, stylesheetElement, appName) {
	  // lazy singleton pattern
	  if (!processor) {
	    processor = new ScopedCSS();
	  }

	  if (stylesheetElement.tagName === 'LINK') {
	    console.warn('Feature: sandbox.experimentalStyleIsolation is not support for link element yet.');
	  }

	  var mountDOM = appWrapper;

	  if (!mountDOM) {
	    return;
	  }

	  var tag = (mountDOM.tagName || '').toLowerCase();

	  if (tag && stylesheetElement.tagName === 'STYLE') {
	    var prefix = "".concat(tag, "[").concat(QiankunCSSRewriteAttr, "=\"").concat(appName, "\"]");
	    processor.process(stylesheetElement, prefix);
	  }
	};

	var rawHeadAppendChild = HTMLHeadElement.prototype.appendChild;
	var rawHeadRemoveChild = HTMLHeadElement.prototype.removeChild;
	var rawBodyAppendChild = HTMLBodyElement.prototype.appendChild;
	var rawBodyRemoveChild = HTMLBodyElement.prototype.removeChild;
	var rawHeadInsertBefore = HTMLHeadElement.prototype.insertBefore;
	var rawRemoveChild$1 = HTMLElement.prototype.removeChild;
	var SCRIPT_TAG_NAME = 'SCRIPT';
	var LINK_TAG_NAME = 'LINK';
	var STYLE_TAG_NAME = 'STYLE';
	function isHijackingTag(tagName) {
	  return (tagName === null || tagName === void 0 ? void 0 : tagName.toUpperCase()) === LINK_TAG_NAME || (tagName === null || tagName === void 0 ? void 0 : tagName.toUpperCase()) === STYLE_TAG_NAME || (tagName === null || tagName === void 0 ? void 0 : tagName.toUpperCase()) === SCRIPT_TAG_NAME;
	}
	/**
	 * Check if a style element is a styled-component liked.
	 * A styled-components liked element is which not have textContext but keep the rules in its styleSheet.cssRules.
	 * Such as the style element generated by styled-components and emotion.
	 * @param element
	 */

	function isStyledComponentsLike(element) {
	  var _a, _b;

	  return !element.textContent && (((_a = element.sheet) === null || _a === void 0 ? void 0 : _a.cssRules.length) || ((_b = getStyledElementCSSRules(element)) === null || _b === void 0 ? void 0 : _b.length));
	}

	function patchCustomEvent(e, elementGetter) {
	  Object.defineProperties(e, {
	    srcElement: {
	      get: elementGetter
	    },
	    target: {
	      get: elementGetter
	    }
	  });
	  return e;
	}

	function manualInvokeElementOnLoad(element) {
	  // we need to invoke the onload event manually to notify the event listener that the script was completed
	  // here are the two typical ways of dynamic script loading
	  // 1. element.onload callback way, which webpack and loadjs used, see https://github.com/muicss/loadjs/blob/master/src/loadjs.js#L138
	  // 2. addEventListener way, which toast-loader used, see https://github.com/pyrsmk/toast/blob/master/src/Toast.ts#L64
	  var loadEvent = new CustomEvent('load');
	  var patchedEvent = patchCustomEvent(loadEvent, function () {
	    return element;
	  });

	  if (isFunction_1(element.onload)) {
	    element.onload(patchedEvent);
	  } else {
	    element.dispatchEvent(patchedEvent);
	  }
	}

	function manualInvokeElementOnError(element) {
	  var errorEvent = new CustomEvent('error');
	  var patchedEvent = patchCustomEvent(errorEvent, function () {
	    return element;
	  });

	  if (isFunction_1(element.onerror)) {
	    element.onerror(patchedEvent);
	  } else {
	    element.dispatchEvent(patchedEvent);
	  }
	}

	function convertLinkAsStyle(element, postProcess) {
	  var fetchFn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : fetch;
	  var styleElement = document.createElement('style');
	  var href = element.href; // add source link element href

	  styleElement.dataset.qiankunHref = href;
	  fetchFn(href).then(function (res) {
	    return res.text();
	  }).then(function (styleContext) {
	    styleElement.appendChild(document.createTextNode(styleContext));
	    postProcess(styleElement);
	    manualInvokeElementOnLoad(element);
	  }).catch(function () {
	    return manualInvokeElementOnError(element);
	  });
	  return styleElement;
	}

	var styledComponentCSSRulesMap = new WeakMap();
	var dynamicScriptAttachedCommentMap = new WeakMap();
	var dynamicLinkAttachedInlineStyleMap = new WeakMap();
	function recordStyledComponentsCSSRules(styleElements) {
	  styleElements.forEach(function (styleElement) {
	    /*
	     With a styled-components generated style element, we need to record its cssRules for restore next re-mounting time.
	     We're doing this because the sheet of style element is going to be cleaned automatically by browser after the style element dom removed from document.
	     see https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
	     */
	    if (styleElement instanceof HTMLStyleElement && isStyledComponentsLike(styleElement)) {
	      if (styleElement.sheet) {
	        // record the original css rules of the style element for restore
	        styledComponentCSSRulesMap.set(styleElement, styleElement.sheet.cssRules);
	      }
	    }
	  });
	}
	function getStyledElementCSSRules(styledElement) {
	  return styledComponentCSSRulesMap.get(styledElement);
	}

	function getOverwrittenAppendChildOrInsertBefore(opts) {
	  return function appendChildOrInsertBefore(newChild, refChild) {
	    var _a, _b;

	    var element = newChild;
	    var rawDOMAppendOrInsertBefore = opts.rawDOMAppendOrInsertBefore,
	        isInvokedByMicroApp = opts.isInvokedByMicroApp,
	        containerConfigGetter = opts.containerConfigGetter;

	    if (!isHijackingTag(element.tagName) || !isInvokedByMicroApp(element)) {
	      return rawDOMAppendOrInsertBefore.call(this, element, refChild);
	    }

	    if (element.tagName) {
	      var containerConfig = containerConfigGetter(element);
	      var appName = containerConfig.appName,
	          appWrapperGetter = containerConfig.appWrapperGetter,
	          proxy = containerConfig.proxy,
	          strictGlobal = containerConfig.strictGlobal,
	          dynamicStyleSheetElements = containerConfig.dynamicStyleSheetElements,
	          scopedCSS = containerConfig.scopedCSS,
	          excludeAssetFilter = containerConfig.excludeAssetFilter;

	      switch (element.tagName) {
	        case LINK_TAG_NAME:
	        case STYLE_TAG_NAME:
	          {
	            var stylesheetElement = newChild;
	            var _stylesheetElement = stylesheetElement,
	                href = _stylesheetElement.href;

	            if (excludeAssetFilter && href && excludeAssetFilter(href)) {
	              return rawDOMAppendOrInsertBefore.call(this, element, refChild);
	            }

	            var mountDOM = appWrapperGetter();

	            if (scopedCSS) {
	              // exclude link elements like <link rel="icon" href="favicon.ico">
	              var linkElementUsingStylesheet = ((_a = element.tagName) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === LINK_TAG_NAME && element.rel === 'stylesheet' && element.href;

	              if (linkElementUsingStylesheet) {
	                var _fetch = typeof frameworkConfiguration.fetch === 'function' ? frameworkConfiguration.fetch : (_b = frameworkConfiguration.fetch) === null || _b === void 0 ? void 0 : _b.fn;

	                stylesheetElement = convertLinkAsStyle(element, function (styleElement) {
	                  return process$1(mountDOM, styleElement, appName);
	                }, _fetch);
	                dynamicLinkAttachedInlineStyleMap.set(element, stylesheetElement);
	              } else {
	                process$1(mountDOM, stylesheetElement, appName);
	              }
	            } // eslint-disable-next-line no-shadow


	            dynamicStyleSheetElements.push(stylesheetElement);
	            var referenceNode = mountDOM.contains(refChild) ? refChild : null;
	            return rawDOMAppendOrInsertBefore.call(mountDOM, stylesheetElement, referenceNode);
	          }

	        case SCRIPT_TAG_NAME:
	          {
	            var _element = element,
	                src = _element.src,
	                text = _element.text; // some script like jsonp maybe not support cors which should't use execScripts

	            if (excludeAssetFilter && src && excludeAssetFilter(src)) {
	              return rawDOMAppendOrInsertBefore.call(this, element, refChild);
	            }

	            var _mountDOM = appWrapperGetter();

	            var _fetch2 = frameworkConfiguration.fetch;

	            var _referenceNode = _mountDOM.contains(refChild) ? refChild : null;

	            if (src) {
	              _execScripts(null, [src], proxy, {
	                fetch: _fetch2,
	                strictGlobal: strictGlobal,
	                beforeExec: function beforeExec() {
	                  var isCurrentScriptConfigurable = function isCurrentScriptConfigurable() {
	                    var descriptor = Object.getOwnPropertyDescriptor(document, 'currentScript');
	                    return !descriptor || descriptor.configurable;
	                  };

	                  if (isCurrentScriptConfigurable()) {
	                    Object.defineProperty(document, 'currentScript', {
	                      get: function get() {
	                        return element;
	                      },
	                      configurable: true
	                    });
	                  }
	                },
	                success: function success() {
	                  manualInvokeElementOnLoad(element);
	                  element = null;
	                },
	                error: function error() {
	                  manualInvokeElementOnError(element);
	                  element = null;
	                }
	              });
	              var dynamicScriptCommentElement = document.createComment("dynamic script ".concat(src, " replaced by qiankun"));
	              dynamicScriptAttachedCommentMap.set(element, dynamicScriptCommentElement);
	              return rawDOMAppendOrInsertBefore.call(_mountDOM, dynamicScriptCommentElement, _referenceNode);
	            } // inline script never trigger the onload and onerror event


	            _execScripts(null, ["<script>".concat(text, "</script>")], proxy, {
	              strictGlobal: strictGlobal
	            });
	            var dynamicInlineScriptCommentElement = document.createComment('dynamic inline script replaced by qiankun');
	            dynamicScriptAttachedCommentMap.set(element, dynamicInlineScriptCommentElement);
	            return rawDOMAppendOrInsertBefore.call(_mountDOM, dynamicInlineScriptCommentElement, _referenceNode);
	          }
	      }
	    }

	    return rawDOMAppendOrInsertBefore.call(this, element, refChild);
	  };
	}

	function getNewRemoveChild(headOrBodyRemoveChild, appWrapperGetterGetter) {
	  return function removeChild(child) {
	    var tagName = child.tagName;
	    if (!isHijackingTag(tagName)) return headOrBodyRemoveChild.call(this, child);

	    try {
	      var attachedElement;

	      switch (tagName) {
	        case LINK_TAG_NAME:
	          {
	            attachedElement = dynamicLinkAttachedInlineStyleMap.get(child) || child;
	            break;
	          }

	        case SCRIPT_TAG_NAME:
	          {
	            attachedElement = dynamicScriptAttachedCommentMap.get(child) || child;
	            break;
	          }

	        default:
	          {
	            attachedElement = child;
	          }
	      } // container may had been removed while app unmounting if the removeChild action was async


	      var appWrapperGetter = appWrapperGetterGetter(child);
	      var container = appWrapperGetter();

	      if (container.contains(attachedElement)) {
	        return rawRemoveChild$1.call(container, attachedElement);
	      }
	    } catch (e) {
	      console.warn(e);
	    }

	    return headOrBodyRemoveChild.call(this, child);
	  };
	}

	function patchHTMLDynamicAppendPrototypeFunctions(isInvokedByMicroApp, containerConfigGetter) {
	  // Just overwrite it while it have not been overwrite
	  if (HTMLHeadElement.prototype.appendChild === rawHeadAppendChild && HTMLBodyElement.prototype.appendChild === rawBodyAppendChild && HTMLHeadElement.prototype.insertBefore === rawHeadInsertBefore) {
	    HTMLHeadElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
	      rawDOMAppendOrInsertBefore: rawHeadAppendChild,
	      containerConfigGetter: containerConfigGetter,
	      isInvokedByMicroApp: isInvokedByMicroApp
	    });
	    HTMLBodyElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
	      rawDOMAppendOrInsertBefore: rawBodyAppendChild,
	      containerConfigGetter: containerConfigGetter,
	      isInvokedByMicroApp: isInvokedByMicroApp
	    });
	    HTMLHeadElement.prototype.insertBefore = getOverwrittenAppendChildOrInsertBefore({
	      rawDOMAppendOrInsertBefore: rawHeadInsertBefore,
	      containerConfigGetter: containerConfigGetter,
	      isInvokedByMicroApp: isInvokedByMicroApp
	    });
	  } // Just overwrite it while it have not been overwrite


	  if (HTMLHeadElement.prototype.removeChild === rawHeadRemoveChild && HTMLBodyElement.prototype.removeChild === rawBodyRemoveChild) {
	    HTMLHeadElement.prototype.removeChild = getNewRemoveChild(rawHeadRemoveChild, function (element) {
	      return containerConfigGetter(element).appWrapperGetter;
	    });
	    HTMLBodyElement.prototype.removeChild = getNewRemoveChild(rawBodyRemoveChild, function (element) {
	      return containerConfigGetter(element).appWrapperGetter;
	    });
	  }

	  return function unpatch() {
	    HTMLHeadElement.prototype.appendChild = rawHeadAppendChild;
	    HTMLHeadElement.prototype.removeChild = rawHeadRemoveChild;
	    HTMLBodyElement.prototype.appendChild = rawBodyAppendChild;
	    HTMLBodyElement.prototype.removeChild = rawBodyRemoveChild;
	    HTMLHeadElement.prototype.insertBefore = rawHeadInsertBefore;
	  };
	}
	function rebuildCSSRules(styleSheetElements, reAppendElement) {
	  styleSheetElements.forEach(function (stylesheetElement) {
	    // re-append the dynamic stylesheet to sub-app container
	    var appendSuccess = reAppendElement(stylesheetElement);

	    if (appendSuccess) {
	      /*
	      get the stored css rules from styled-components generated element, and the re-insert rules for them.
	      note that we must do this after style element had been added to document, which stylesheet would be associated to the document automatically.
	      check the spec https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
	       */
	      if (stylesheetElement instanceof HTMLStyleElement && isStyledComponentsLike(stylesheetElement)) {
	        var cssRules = getStyledElementCSSRules(stylesheetElement);

	        if (cssRules) {
	          // eslint-disable-next-line no-plusplus
	          for (var i = 0; i < cssRules.length; i++) {
	            var cssRule = cssRules[i];
	            var cssStyleSheetElement = stylesheetElement.sheet;
	            cssStyleSheetElement.insertRule(cssRule.cssText, cssStyleSheetElement.cssRules.length);
	          }
	        }
	      }
	    }
	  });
	}

	/**
	 * @author Kuitos
	 * @since 2020-10-13
	 */
	var bootstrappingPatchCount$1 = 0;
	var mountingPatchCount$1 = 0;
	/**
	 * Just hijack dynamic head append, that could avoid accidentally hijacking the insertion of elements except in head.
	 * Such a case: ReactDOM.createPortal(<style>.test{color:blue}</style>, container),
	 * this could made we append the style element into app wrapper but it will cause an error while the react portal unmounting, as ReactDOM could not find the style in body children list.
	 * @param appName
	 * @param appWrapperGetter
	 * @param proxy
	 * @param mounting
	 * @param scopedCSS
	 * @param excludeAssetFilter
	 */

	function patchLooseSandbox(appName, appWrapperGetter, proxy) {
	  var mounting = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
	  var scopedCSS = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
	  var excludeAssetFilter = arguments.length > 5 ? arguments[5] : undefined;
	  var dynamicStyleSheetElements = [];
	  var unpatchDynamicAppendPrototypeFunctions = patchHTMLDynamicAppendPrototypeFunctions(
	  /*
	    check if the currently specified application is active
	    While we switch page from qiankun app to a normal react routing page, the normal one may load stylesheet dynamically while page rendering,
	    but the url change listener must to wait until the current call stack is flushed.
	    This scenario may cause we record the stylesheet from react routing page dynamic injection,
	    and remove them after the url change triggered and qiankun app is unmouting
	    see https://github.com/ReactTraining/history/blob/master/modules/createHashHistory.js#L222-L230
	   */
	  function () {
	    return bt(window.location).some(function (name) {
	      return name === appName;
	    });
	  }, function () {
	    return {
	      appName: appName,
	      appWrapperGetter: appWrapperGetter,
	      proxy: proxy,
	      strictGlobal: false,
	      scopedCSS: scopedCSS,
	      dynamicStyleSheetElements: dynamicStyleSheetElements,
	      excludeAssetFilter: excludeAssetFilter
	    };
	  });
	  if (!mounting) bootstrappingPatchCount$1++;
	  if (mounting) mountingPatchCount$1++;
	  return function free() {
	    // bootstrap patch just called once but its freer will be called multiple times
	    if (!mounting && bootstrappingPatchCount$1 !== 0) bootstrappingPatchCount$1--;
	    if (mounting) mountingPatchCount$1--;
	    var allMicroAppUnmounted = mountingPatchCount$1 === 0 && bootstrappingPatchCount$1 === 0; // release the overwrite prototype after all the micro apps unmounted

	    if (allMicroAppUnmounted) unpatchDynamicAppendPrototypeFunctions();
	    recordStyledComponentsCSSRules(dynamicStyleSheetElements); // As now the sub app content all wrapped with a special id container,
	    // the dynamic style sheet would be removed automatically while unmoutting

	    return function rebuild() {
	      rebuildCSSRules(dynamicStyleSheetElements, function (stylesheetElement) {
	        var appWrapper = appWrapperGetter();

	        if (!appWrapper.contains(stylesheetElement)) {
	          // Using document.head.appendChild ensures that appendChild invocation can also directly use the HTMLHeadElement.prototype.appendChild method which is overwritten at mounting phase
	          document.head.appendChild.call(appWrapper, stylesheetElement);
	          return true;
	        }

	        return false;
	      }); // As the patcher will be invoked every mounting phase, we could release the cache for gc after rebuilding

	      if (mounting) {
	        dynamicStyleSheetElements = [];
	      }
	    };
	  };
	}

	/**
	 * @author Kuitos
	 * @since 2020-10-13
	 */

	Object.defineProperty(nativeGlobal, '__proxyAttachContainerConfigMap__', {
	  enumerable: false,
	  writable: true
	}); // Share proxyAttachContainerConfigMap between multiple qiankun instance, thus they could access the same record

	nativeGlobal.__proxyAttachContainerConfigMap__ = nativeGlobal.__proxyAttachContainerConfigMap__ || new WeakMap();
	var proxyAttachContainerConfigMap = nativeGlobal.__proxyAttachContainerConfigMap__;
	var elementAttachContainerConfigMap = new WeakMap();
	var docCreatePatchedMap = new WeakMap();

	function patchDocumentCreateElement() {
	  var docCreateElementFnBeforeOverwrite = docCreatePatchedMap.get(document.createElement);

	  if (!docCreateElementFnBeforeOverwrite) {
	    var rawDocumentCreateElement = document.createElement;

	    Document.prototype.createElement = function createElement(tagName, options) {
	      var element = rawDocumentCreateElement.call(this, tagName, options);

	      if (isHijackingTag(tagName)) {
	        var _ref = getCurrentRunningApp() || {},
	            currentRunningSandboxProxy = _ref.window;

	        if (currentRunningSandboxProxy) {
	          var proxyContainerConfig = proxyAttachContainerConfigMap.get(currentRunningSandboxProxy);

	          if (proxyContainerConfig) {
	            elementAttachContainerConfigMap.set(element, proxyContainerConfig);
	          }
	        }
	      }

	      return element;
	    }; // It means it have been overwritten while createElement is an own property of document


	    if (document.hasOwnProperty('createElement')) {
	      document.createElement = Document.prototype.createElement;
	    }

	    docCreatePatchedMap.set(Document.prototype.createElement, rawDocumentCreateElement);
	  }

	  return function unpatch() {
	    if (docCreateElementFnBeforeOverwrite) {
	      Document.prototype.createElement = docCreateElementFnBeforeOverwrite;
	      document.createElement = docCreateElementFnBeforeOverwrite;
	    }
	  };
	}

	var bootstrappingPatchCount = 0;
	var mountingPatchCount = 0;
	function patchStrictSandbox(appName, appWrapperGetter, proxy) {
	  var mounting = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
	  var scopedCSS = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
	  var excludeAssetFilter = arguments.length > 5 ? arguments[5] : undefined;
	  var containerConfig = proxyAttachContainerConfigMap.get(proxy);

	  if (!containerConfig) {
	    containerConfig = {
	      appName: appName,
	      proxy: proxy,
	      appWrapperGetter: appWrapperGetter,
	      dynamicStyleSheetElements: [],
	      strictGlobal: true,
	      excludeAssetFilter: excludeAssetFilter,
	      scopedCSS: scopedCSS
	    };
	    proxyAttachContainerConfigMap.set(proxy, containerConfig);
	  } // all dynamic style sheets are stored in proxy container


	  var _containerConfig = containerConfig,
	      dynamicStyleSheetElements = _containerConfig.dynamicStyleSheetElements;
	  var unpatchDocumentCreate = patchDocumentCreateElement();
	  var unpatchDynamicAppendPrototypeFunctions = patchHTMLDynamicAppendPrototypeFunctions(function (element) {
	    return elementAttachContainerConfigMap.has(element);
	  }, function (element) {
	    return elementAttachContainerConfigMap.get(element);
	  });
	  if (!mounting) bootstrappingPatchCount++;
	  if (mounting) mountingPatchCount++;
	  return function free() {
	    // bootstrap patch just called once but its freer will be called multiple times
	    if (!mounting && bootstrappingPatchCount !== 0) bootstrappingPatchCount--;
	    if (mounting) mountingPatchCount--;
	    var allMicroAppUnmounted = mountingPatchCount === 0 && bootstrappingPatchCount === 0; // release the overwrite prototype after all the micro apps unmounted

	    if (allMicroAppUnmounted) {
	      unpatchDynamicAppendPrototypeFunctions();
	      unpatchDocumentCreate();
	    }

	    recordStyledComponentsCSSRules(dynamicStyleSheetElements); // As now the sub app content all wrapped with a special id container,
	    // the dynamic style sheet would be removed automatically while unmoutting

	    return function rebuild() {
	      rebuildCSSRules(dynamicStyleSheetElements, function (stylesheetElement) {
	        var appWrapper = appWrapperGetter();

	        if (!appWrapper.contains(stylesheetElement)) {
	          rawHeadAppendChild.call(appWrapper, stylesheetElement);
	          return true;
	        }

	        return false;
	      });
	    };
	  };
	}

	function patch$2() {
	  // FIXME umi unmount feature request
	  // eslint-disable-next-line @typescript-eslint/no-unused-vars
	  var rawHistoryListen = function rawHistoryListen(_) {
	    return noop_1;
	  };

	  var historyListeners = [];
	  var historyUnListens = [];

	  if (window.g_history && isFunction_1(window.g_history.listen)) {
	    rawHistoryListen = window.g_history.listen.bind(window.g_history);

	    window.g_history.listen = function (listener) {
	      historyListeners.push(listener);
	      var unListen = rawHistoryListen(listener);
	      historyUnListens.push(unListen);
	      return function () {
	        unListen();
	        historyUnListens.splice(historyUnListens.indexOf(unListen), 1);
	        historyListeners.splice(historyListeners.indexOf(listener), 1);
	      };
	    };
	  }

	  return function free() {
	    var rebuild = noop_1;
	    /*
	     还存在余量 listener 表明未被卸载，存在两种情况
	     1. 应用在 unmout 时未正确卸载 listener
	     2. listener 是应用 mount 之前绑定的，
	     第二种情况下应用在下次 mount 之前需重新绑定该 listener
	     */

	    if (historyListeners.length) {
	      rebuild = function rebuild() {
	        // 必须使用 window.g_history.listen 的方式重新绑定 listener，从而能保证 rebuild 这部分也能被捕获到，否则在应用卸载后无法正确的移除这部分副作用
	        historyListeners.forEach(function (listener) {
	          return window.g_history.listen(listener);
	        });
	      };
	    } // 卸载余下的 listener


	    historyUnListens.forEach(function (unListen) {
	      return unListen();
	    }); // restore

	    if (window.g_history && isFunction_1(window.g_history.listen)) {
	      window.g_history.listen = rawHistoryListen;
	    }

	    return rebuild;
	  };
	}

	var rawWindowInterval = window.setInterval;
	var rawWindowClearInterval = window.clearInterval;
	function patch$1(global) {
	  var intervals = [];

	  global.clearInterval = function (intervalId) {
	    intervals = intervals.filter(function (id) {
	      return id !== intervalId;
	    });
	    return rawWindowClearInterval.call(window, intervalId);
	  };

	  global.setInterval = function (handler, timeout) {
	    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
	      args[_key - 2] = arguments[_key];
	    }

	    var intervalId = rawWindowInterval.apply(void 0, [handler, timeout].concat(args));
	    intervals = [].concat(_toConsumableArray(intervals), [intervalId]);
	    return intervalId;
	  };

	  return function free() {
	    intervals.forEach(function (id) {
	      return global.clearInterval(id);
	    });
	    global.setInterval = rawWindowInterval;
	    global.clearInterval = rawWindowClearInterval;
	    return noop_1;
	  };
	}

	var rawAddEventListener = window.addEventListener;
	var rawRemoveEventListener = window.removeEventListener;
	function patch(global) {
	  var listenerMap = new Map();

	  global.addEventListener = function (type, listener, options) {
	    var listeners = listenerMap.get(type) || [];
	    listenerMap.set(type, [].concat(_toConsumableArray(listeners), [listener]));
	    return rawAddEventListener.call(window, type, listener, options);
	  };

	  global.removeEventListener = function (type, listener, options) {
	    var storedTypeListeners = listenerMap.get(type);

	    if (storedTypeListeners && storedTypeListeners.length && storedTypeListeners.indexOf(listener) !== -1) {
	      storedTypeListeners.splice(storedTypeListeners.indexOf(listener), 1);
	    }

	    return rawRemoveEventListener.call(window, type, listener, options);
	  };

	  return function free() {
	    listenerMap.forEach(function (listeners, type) {
	      return _toConsumableArray(listeners).forEach(function (listener) {
	        return global.removeEventListener(type, listener);
	      });
	    });
	    global.addEventListener = rawAddEventListener;
	    global.removeEventListener = rawRemoveEventListener;
	    return noop_1;
	  };
	}

	function patchAtMounting(appName, elementGetter, sandbox, scopedCSS, excludeAssetFilter) {
	  var _patchersInSandbox;

	  var _a;

	  var basePatchers = [function () {
	    return patch$1(sandbox.proxy);
	  }, function () {
	    return patch(sandbox.proxy);
	  }, function () {
	    return patch$2();
	  }];
	  var patchersInSandbox = (_patchersInSandbox = {}, _defineProperty(_patchersInSandbox, SandBoxType.LegacyProxy, [].concat(basePatchers, [function () {
	    return patchLooseSandbox(appName, elementGetter, sandbox.proxy, true, scopedCSS, excludeAssetFilter);
	  }])), _defineProperty(_patchersInSandbox, SandBoxType.Proxy, [].concat(basePatchers, [function () {
	    return patchStrictSandbox(appName, elementGetter, sandbox.proxy, true, scopedCSS, excludeAssetFilter);
	  }])), _defineProperty(_patchersInSandbox, SandBoxType.Snapshot, [].concat(basePatchers, [function () {
	    return patchLooseSandbox(appName, elementGetter, sandbox.proxy, true, scopedCSS, excludeAssetFilter);
	  }])), _patchersInSandbox);
	  return (_a = patchersInSandbox[sandbox.type]) === null || _a === void 0 ? void 0 : _a.map(function (patch) {
	    return patch();
	  });
	}
	function patchAtBootstrapping(appName, elementGetter, sandbox, scopedCSS, excludeAssetFilter) {
	  var _patchersInSandbox2;

	  var _a;

	  var patchersInSandbox = (_patchersInSandbox2 = {}, _defineProperty(_patchersInSandbox2, SandBoxType.LegacyProxy, [function () {
	    return patchLooseSandbox(appName, elementGetter, sandbox.proxy, false, scopedCSS, excludeAssetFilter);
	  }]), _defineProperty(_patchersInSandbox2, SandBoxType.Proxy, [function () {
	    return patchStrictSandbox(appName, elementGetter, sandbox.proxy, false, scopedCSS, excludeAssetFilter);
	  }]), _defineProperty(_patchersInSandbox2, SandBoxType.Snapshot, [function () {
	    return patchLooseSandbox(appName, elementGetter, sandbox.proxy, false, scopedCSS, excludeAssetFilter);
	  }]), _patchersInSandbox2);
	  return (_a = patchersInSandbox[sandbox.type]) === null || _a === void 0 ? void 0 : _a.map(function (patch) {
	    return patch();
	  });
	}

	/**
	 * fastest(at most time) unique array method
	 * @see https://jsperf.com/array-filter-unique/30
	 */

	function uniq(array) {
	  return array.filter(function filter(element) {
	    return element in this ? false : this[element] = true;
	  }, Object.create(null));
	} // zone.js will overwrite Object.defineProperty


	var rawObjectDefineProperty = Object.defineProperty;
	var variableWhiteListInDev = process.env.NODE_ENV === 'development' || window.__QIANKUN_DEVELOPMENT__ ? [// for react hot reload
	// see https://github.com/facebook/create-react-app/blob/66bf7dfc43350249e2f09d138a20840dae8a0a4a/packages/react-error-overlay/src/index.js#L180
	'__REACT_ERROR_OVERLAY_GLOBAL_HOOK__'] : []; // who could escape the sandbox

	var variableWhiteList = [// FIXME System.js used a indirect call with eval, which would make it scope escape to global
	// To make System.js works well, we write it back to global window temporary
	// see https://github.com/systemjs/systemjs/blob/457f5b7e8af6bd120a279540477552a07d5de086/src/evaluate.js#L106
	'System', // see https://github.com/systemjs/systemjs/blob/457f5b7e8af6bd120a279540477552a07d5de086/src/instantiate.js#L357
	'__cjsWrapper'].concat(variableWhiteListInDev);
	/*
	 variables who are impossible to be overwrite need to be escaped from proxy sandbox for performance reasons
	 */

	var unscopables = {
	  undefined: true,
	  Array: true,
	  Object: true,
	  String: true,
	  Boolean: true,
	  Math: true,
	  Number: true,
	  Symbol: true,
	  parseFloat: true,
	  Float32Array: true
	};
	var useNativeWindowForBindingsProps = new Map([['fetch', true], ['mockDomAPIInBlackList', process.env.NODE_ENV === 'test']]);

	function createFakeWindow(globalContext) {
	  // map always has the fastest performance in has check scenario
	  // see https://jsperf.com/array-indexof-vs-set-has/23
	  var propertiesWithGetter = new Map();
	  var fakeWindow = {};
	  /*
	   copy the non-configurable property of global to fakeWindow
	   see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
	   > A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
	   */

	  Object.getOwnPropertyNames(globalContext).filter(function (p) {
	    var descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
	    return !(descriptor === null || descriptor === void 0 ? void 0 : descriptor.configurable);
	  }).forEach(function (p) {
	    var descriptor = Object.getOwnPropertyDescriptor(globalContext, p);

	    if (descriptor) {
	      var hasGetter = Object.prototype.hasOwnProperty.call(descriptor, 'get');
	      /*
	       make top/self/window property configurable and writable, otherwise it will cause TypeError while get trap return.
	       see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get
	       > The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable data property.
	       */

	      if (p === 'top' || p === 'parent' || p === 'self' || p === 'window' || process.env.NODE_ENV === 'test' && (p === 'mockTop' || p === 'mockSafariTop')) {
	        descriptor.configurable = true;
	        /*
	         The descriptor of window.window/window.top/window.self in Safari/FF are accessor descriptors, we need to avoid adding a data descriptor while it was
	         Example:
	          Safari/FF: Object.getOwnPropertyDescriptor(window, 'top') -> {get: function, set: undefined, enumerable: true, configurable: false}
	          Chrome: Object.getOwnPropertyDescriptor(window, 'top') -> {value: Window, writable: false, enumerable: true, configurable: false}
	         */

	        if (!hasGetter) {
	          descriptor.writable = true;
	        }
	      }

	      if (hasGetter) propertiesWithGetter.set(p, true); // freeze the descriptor to avoid being modified by zone.js
	      // see https://github.com/angular/zone.js/blob/a5fe09b0fac27ac5df1fa746042f96f05ccb6a00/lib/browser/define-property.ts#L71

	      rawObjectDefineProperty(fakeWindow, p, Object.freeze(descriptor));
	    }
	  });
	  return {
	    fakeWindow: fakeWindow,
	    propertiesWithGetter: propertiesWithGetter
	  };
	}

	var activeSandboxCount = 0;
	/**
	 * 基于 Proxy 实现的沙箱
	 */

	var ProxySandbox = /*#__PURE__*/function () {
	  function ProxySandbox(name) {
	    var _this = this;

	    var globalContext = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

	    _classCallCheck(this, ProxySandbox);

	    /** window 值变更记录 */
	    this.updatedValueSet = new Set();
	    this.sandboxRunning = true;
	    this.latestSetProp = null;
	    this.name = name;
	    this.globalContext = globalContext;
	    this.type = SandBoxType.Proxy;
	    var updatedValueSet = this.updatedValueSet;

	    var _createFakeWindow = createFakeWindow(globalContext),
	        fakeWindow = _createFakeWindow.fakeWindow,
	        propertiesWithGetter = _createFakeWindow.propertiesWithGetter;

	    var descriptorTargetMap = new Map();

	    var hasOwnProperty = function hasOwnProperty(key) {
	      return fakeWindow.hasOwnProperty(key) || globalContext.hasOwnProperty(key);
	    };

	    var proxy = new Proxy(fakeWindow, {
	      set: function set(target, p, value) {
	        if (_this.sandboxRunning) {
	          _this.registerRunningApp(name, proxy); // We must kept its description while the property existed in globalContext before


	          if (!target.hasOwnProperty(p) && globalContext.hasOwnProperty(p)) {
	            var descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
	            var writable = descriptor.writable,
	                configurable = descriptor.configurable,
	                enumerable = descriptor.enumerable;

	            if (writable) {
	              Object.defineProperty(target, p, {
	                configurable: configurable,
	                enumerable: enumerable,
	                writable: writable,
	                value: value
	              });
	            }
	          } else {
	            // @ts-ignore
	            target[p] = value;
	          }

	          if (variableWhiteList.indexOf(p) !== -1) {
	            // @ts-ignore
	            globalContext[p] = value;
	          }

	          updatedValueSet.add(p);
	          _this.latestSetProp = p;
	          return true;
	        }

	        if (process.env.NODE_ENV === 'development') {
	          console.warn("[qiankun] Set window.".concat(p.toString(), " while sandbox destroyed or inactive in ").concat(name, "!"));
	        } // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误


	        return true;
	      },
	      get: function get(target, p) {
	        _this.registerRunningApp(name, proxy);

	        if (p === Symbol.unscopables) return unscopables; // avoid who using window.window or window.self to escape the sandbox environment to touch the really window
	        // see https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js#L13

	        if (p === 'window' || p === 'self') {
	          return proxy;
	        } // hijack globalWindow accessing with globalThis keyword


	        if (p === 'globalThis') {
	          return proxy;
	        }

	        if (p === 'top' || p === 'parent' || process.env.NODE_ENV === 'test' && (p === 'mockTop' || p === 'mockSafariTop')) {
	          // if your master app in an iframe context, allow these props escape the sandbox
	          if (globalContext === globalContext.parent) {
	            return proxy;
	          }

	          return globalContext[p];
	        } // proxy.hasOwnProperty would invoke getter firstly, then its value represented as globalContext.hasOwnProperty


	        if (p === 'hasOwnProperty') {
	          return hasOwnProperty;
	        }

	        if (p === 'document') {
	          return document;
	        }

	        if (p === 'eval') {
	          return eval;
	        }

	        var value = propertiesWithGetter.has(p) ? globalContext[p] : p in target ? target[p] : globalContext[p];
	        /* Some dom api must be bound to native window, otherwise it would cause exception like 'TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation'
	           See this code:
	             const proxy = new Proxy(window, {});
	             const proxyFetch = fetch.bind(proxy);
	             proxyFetch('https://qiankun.com');
	        */

	        var boundTarget = useNativeWindowForBindingsProps.get(p) ? nativeGlobal : globalContext;
	        return getTargetValue(boundTarget, value);
	      },
	      // trap in operator
	      // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
	      has: function has(target, p) {
	        return p in unscopables || p in target || p in globalContext;
	      },
	      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, p) {
	        /*
	         as the descriptor of top/self/window/mockTop in raw window are configurable but not in proxy target, we need to get it from target to avoid TypeError
	         see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
	         > A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
	         */
	        if (target.hasOwnProperty(p)) {
	          var descriptor = Object.getOwnPropertyDescriptor(target, p);
	          descriptorTargetMap.set(p, 'target');
	          return descriptor;
	        }

	        if (globalContext.hasOwnProperty(p)) {
	          var _descriptor = Object.getOwnPropertyDescriptor(globalContext, p);

	          descriptorTargetMap.set(p, 'globalContext'); // A property cannot be reported as non-configurable, if it does not exists as an own property of the target object

	          if (_descriptor && !_descriptor.configurable) {
	            _descriptor.configurable = true;
	          }

	          return _descriptor;
	        }

	        return undefined;
	      },
	      // trap to support iterator with sandbox
	      ownKeys: function ownKeys(target) {
	        return uniq(Reflect.ownKeys(globalContext).concat(Reflect.ownKeys(target)));
	      },
	      defineProperty: function defineProperty(target, p, attributes) {
	        var from = descriptorTargetMap.get(p);
	        /*
	         Descriptor must be defined to native window while it comes from native window via Object.getOwnPropertyDescriptor(window, p),
	         otherwise it would cause a TypeError with illegal invocation.
	         */

	        switch (from) {
	          case 'globalContext':
	            return Reflect.defineProperty(globalContext, p, attributes);

	          default:
	            return Reflect.defineProperty(target, p, attributes);
	        }
	      },
	      deleteProperty: function deleteProperty(target, p) {
	        _this.registerRunningApp(name, proxy);

	        if (target.hasOwnProperty(p)) {
	          // @ts-ignore
	          delete target[p];
	          updatedValueSet.delete(p);
	          return true;
	        }

	        return true;
	      },
	      // makes sure `window instanceof Window` returns truthy in micro app
	      getPrototypeOf: function getPrototypeOf() {
	        return Reflect.getPrototypeOf(globalContext);
	      }
	    });
	    this.proxy = proxy;
	    activeSandboxCount++;
	  }

	  _createClass(ProxySandbox, [{
	    key: "registerRunningApp",
	    value: function registerRunningApp(name, proxy) {
	      if (this.sandboxRunning) {
	        setCurrentRunningApp({
	          name: name,
	          window: proxy
	        }); // FIXME if you have any other good ideas
	        // remove the mark in next tick, thus we can identify whether it in micro app or not
	        // this approach is just a workaround, it could not cover all complex cases, such as the micro app runs in the same task context with master in some case

	        nextTask(function () {
	          setCurrentRunningApp(null);
	        });
	      }
	    }
	  }, {
	    key: "active",
	    value: function active() {
	      if (!this.sandboxRunning) activeSandboxCount++;
	      this.sandboxRunning = true;
	    }
	  }, {
	    key: "inactive",
	    value: function inactive() {
	      var _this2 = this;

	      if (process.env.NODE_ENV === 'development') {
	        console.info("[qiankun:sandbox] ".concat(this.name, " modified global properties restore..."), _toConsumableArray(this.updatedValueSet.keys()));
	      }

	      if (--activeSandboxCount === 0) {
	        variableWhiteList.forEach(function (p) {
	          if (_this2.proxy.hasOwnProperty(p)) {
	            // @ts-ignore
	            delete _this2.globalContext[p];
	          }
	        });
	      }

	      this.sandboxRunning = false;
	    }
	  }]);

	  return ProxySandbox;
	}();

	function iter(obj, callbackFn) {
	  // eslint-disable-next-line guard-for-in, no-restricted-syntax
	  for (var prop in obj) {
	    // patch for clearInterval for compatible reason, see #1490
	    if (obj.hasOwnProperty(prop) || prop === 'clearInterval') {
	      callbackFn(prop);
	    }
	  }
	}
	/**
	 * 基于 diff 方式实现的沙箱，用于不支持 Proxy 的低版本浏览器
	 */


	var SnapshotSandbox = /*#__PURE__*/function () {
	  function SnapshotSandbox(name) {
	    _classCallCheck(this, SnapshotSandbox);

	    this.sandboxRunning = true;
	    this.modifyPropsMap = {};
	    this.name = name;
	    this.proxy = window;
	    this.type = SandBoxType.Snapshot;
	  }

	  _createClass(SnapshotSandbox, [{
	    key: "active",
	    value: function active() {
	      var _this = this;

	      // 记录当前快照
	      this.windowSnapshot = {};
	      iter(window, function (prop) {
	        _this.windowSnapshot[prop] = window[prop];
	      }); // 恢复之前的变更

	      Object.keys(this.modifyPropsMap).forEach(function (p) {
	        window[p] = _this.modifyPropsMap[p];
	      });
	      this.sandboxRunning = true;
	    }
	  }, {
	    key: "inactive",
	    value: function inactive() {
	      var _this2 = this;

	      this.modifyPropsMap = {};
	      iter(window, function (prop) {
	        if (window[prop] !== _this2.windowSnapshot[prop]) {
	          // 记录变更，恢复环境
	          _this2.modifyPropsMap[prop] = window[prop];
	          window[prop] = _this2.windowSnapshot[prop];
	        }
	      });

	      if (process.env.NODE_ENV === 'development') {
	        console.info("[qiankun:sandbox] ".concat(this.name, " origin window restore..."), Object.keys(this.modifyPropsMap));
	      }

	      this.sandboxRunning = false;
	    }
	  }]);

	  return SnapshotSandbox;
	}();

	/**
	 * 生成应用运行时沙箱
	 *
	 * 沙箱分两个类型：
	 * 1. app 环境沙箱
	 *  app 环境沙箱是指应用初始化过之后，应用会在什么样的上下文环境运行。每个应用的环境沙箱只会初始化一次，因为子应用只会触发一次 bootstrap 。
	 *  子应用在切换时，实际上切换的是 app 环境沙箱。
	 * 2. render 沙箱
	 *  子应用在 app mount 开始前生成好的的沙箱。每次子应用切换过后，render 沙箱都会重现初始化。
	 *
	 * 这么设计的目的是为了保证每个子应用切换回来之后，还能运行在应用 bootstrap 之后的环境下。
	 *
	 * @param appName
	 * @param elementGetter
	 * @param scopedCSS
	 * @param useLooseSandbox
	 * @param excludeAssetFilter
	 * @param globalContext
	 */

	function createSandboxContainer(appName, elementGetter, scopedCSS, useLooseSandbox, excludeAssetFilter, globalContext) {
	  var sandbox;

	  if (window.Proxy) {
	    sandbox = useLooseSandbox ? new LegacySandbox(appName, globalContext) : new ProxySandbox(appName, globalContext);
	  } else {
	    sandbox = new SnapshotSandbox(appName);
	  } // some side effect could be be invoked while bootstrapping, such as dynamic stylesheet injection with style-loader, especially during the development phase


	  var bootstrappingFreers = patchAtBootstrapping(appName, elementGetter, sandbox, scopedCSS, excludeAssetFilter); // mounting freers are one-off and should be re-init at every mounting time

	  var mountingFreers = [];
	  var sideEffectsRebuilders = [];
	  return {
	    instance: sandbox,

	    /**
	     * 沙箱被 mount
	     * 可能是从 bootstrap 状态进入的 mount
	     * 也可能是从 unmount 之后再次唤醒进入 mount
	     */
	    mount: function mount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	        var sideEffectsRebuildersAtBootstrapping, sideEffectsRebuildersAtMounting;
	        return regenerator.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                /* ------------------------------------------ 因为有上下文依赖（window），以下代码执行顺序不能变 ------------------------------------------ */

	                /* ------------------------------------------ 1. 启动/恢复 沙箱------------------------------------------ */
	                sandbox.active();
	                sideEffectsRebuildersAtBootstrapping = sideEffectsRebuilders.slice(0, bootstrappingFreers.length);
	                sideEffectsRebuildersAtMounting = sideEffectsRebuilders.slice(bootstrappingFreers.length); // must rebuild the side effects which added at bootstrapping firstly to recovery to nature state

	                if (sideEffectsRebuildersAtBootstrapping.length) {
	                  sideEffectsRebuildersAtBootstrapping.forEach(function (rebuild) {
	                    return rebuild();
	                  });
	                }
	                /* ------------------------------------------ 2. 开启全局变量补丁 ------------------------------------------*/
	                // render 沙箱启动时开始劫持各类全局监听，尽量不要在应用初始化阶段有 事件监听/定时器 等副作用


	                mountingFreers = patchAtMounting(appName, elementGetter, sandbox, scopedCSS, excludeAssetFilter);
	                /* ------------------------------------------ 3. 重置一些初始化时的副作用 ------------------------------------------*/
	                // 存在 rebuilder 则表明有些副作用需要重建

	                if (sideEffectsRebuildersAtMounting.length) {
	                  sideEffectsRebuildersAtMounting.forEach(function (rebuild) {
	                    return rebuild();
	                  });
	                } // clean up rebuilders


	                sideEffectsRebuilders = [];

	              case 7:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee);
	      }));
	    },

	    /**
	     * 恢复 global 状态，使其能回到应用加载之前的状态
	     */
	    unmount: function unmount() {
	      return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	        return regenerator.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                // record the rebuilders of window side effects (event listeners or timers)
	                // note that the frees of mounting phase are one-off as it will be re-init at next mounting
	                sideEffectsRebuilders = [].concat(_toConsumableArray(bootstrappingFreers), _toConsumableArray(mountingFreers)).map(function (free) {
	                  return free();
	                });
	                sandbox.inactive();

	              case 2:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2);
	      }));
	    }
	  };
	}

	function assertElementExist(element, msg) {
	  if (!element) {
	    if (msg) {
	      throw new QiankunError(msg);
	    }

	    throw new QiankunError('element not existed!');
	  }
	}

	function execHooksChain(hooks, app) {
	  var global = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : window;

	  if (hooks.length) {
	    return hooks.reduce(function (chain, hook) {
	      return chain.then(function () {
	        return hook(app, global);
	      });
	    }, Promise.resolve());
	  }

	  return Promise.resolve();
	}

	function validateSingularMode(validate, app) {
	  return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	    return regenerator.wrap(function _callee$(_context) {
	      while (1) {
	        switch (_context.prev = _context.next) {
	          case 0:
	            return _context.abrupt("return", typeof validate === 'function' ? validate(app) : !!validate);

	          case 1:
	          case "end":
	            return _context.stop();
	        }
	      }
	    }, _callee);
	  }));
	} // @ts-ignore


	var supportShadowDOM = document.head.attachShadow || document.head.createShadowRoot;

	function createElement(appContent, strictStyleIsolation, scopedCSS, appName) {
	  var containerElement = document.createElement('div');
	  containerElement.innerHTML = appContent; // appContent always wrapped with a singular div

	  var appElement = containerElement.firstChild;

	  if (strictStyleIsolation) {
	    if (!supportShadowDOM) {
	      console.warn('[qiankun]: As current browser not support shadow dom, your strictStyleIsolation configuration will be ignored!');
	    } else {
	      var innerHTML = appElement.innerHTML;
	      appElement.innerHTML = '';
	      var shadow;

	      if (appElement.attachShadow) {
	        shadow = appElement.attachShadow({
	          mode: 'open'
	        });
	      } else {
	        // createShadowRoot was proposed in initial spec, which has then been deprecated
	        shadow = appElement.createShadowRoot();
	      }

	      shadow.innerHTML = innerHTML;
	    }
	  }

	  if (scopedCSS) {
	    var attr = appElement.getAttribute(QiankunCSSRewriteAttr);

	    if (!attr) {
	      appElement.setAttribute(QiankunCSSRewriteAttr, appName);
	    }

	    var styleNodes = appElement.querySelectorAll('style') || [];

	    forEach_1(styleNodes, function (stylesheetElement) {
	      process$1(appElement, stylesheetElement, appName);
	    });
	  }

	  return appElement;
	}
	/** generate app wrapper dom getter */


	function getAppWrapperGetter(appName, appInstanceId, useLegacyRender, strictStyleIsolation, scopedCSS, elementGetter) {
	  return function () {
	    if (useLegacyRender) {
	      if (strictStyleIsolation) throw new QiankunError('strictStyleIsolation can not be used with legacy render!');
	      if (scopedCSS) throw new QiankunError('experimentalStyleIsolation can not be used with legacy render!');
	      var appWrapper = document.getElementById(getWrapperId(appInstanceId));
	      assertElementExist(appWrapper, "Wrapper element for ".concat(appName, " with instance ").concat(appInstanceId, " is not existed!"));
	      return appWrapper;
	    }

	    var element = elementGetter();
	    assertElementExist(element, "Wrapper element for ".concat(appName, " with instance ").concat(appInstanceId, " is not existed!"));

	    if (strictStyleIsolation && supportShadowDOM) {
	      return element.shadowRoot;
	    }

	    return element;
	  };
	}

	var rawAppendChild = HTMLElement.prototype.appendChild;
	var rawRemoveChild = HTMLElement.prototype.removeChild;
	/**
	 * Get the render function
	 * If the legacy render function is provide, used as it, otherwise we will insert the app element to target container by qiankun
	 * @param appName
	 * @param appContent
	 * @param legacyRender
	 */

	function getRender(appName, appContent, legacyRender) {
	  var render = function render(_ref, phase) {
	    var element = _ref.element,
	        loading = _ref.loading,
	        container = _ref.container;

	    if (legacyRender) {
	      if (process.env.NODE_ENV === 'development') {
	        console.warn('[qiankun] Custom rendering function is deprecated, you can use the container element setting instead!');
	      }

	      return legacyRender({
	        loading: loading,
	        appContent: element ? appContent : ''
	      });
	    }

	    var containerElement = getContainer(container); // The container might have be removed after micro app unmounted.
	    // Such as the micro app unmount lifecycle called by a react componentWillUnmount lifecycle, after micro app unmounted, the react component might also be removed

	    if (phase !== 'unmounted') {
	      var errorMsg = function () {
	        switch (phase) {
	          case 'loading':
	          case 'mounting':
	            return "Target container with ".concat(container, " not existed while ").concat(appName, " ").concat(phase, "!");

	          case 'mounted':
	            return "Target container with ".concat(container, " not existed after ").concat(appName, " ").concat(phase, "!");

	          default:
	            return "Target container with ".concat(container, " not existed while ").concat(appName, " rendering!");
	        }
	      }();

	      assertElementExist(containerElement, errorMsg);
	    }

	    if (containerElement && !containerElement.contains(element)) {
	      // clear the container
	      while (containerElement.firstChild) {
	        rawRemoveChild.call(containerElement, containerElement.firstChild);
	      } // append the element to container if it exist


	      if (element) {
	        rawAppendChild.call(containerElement, element);
	      }
	    }

	    return undefined;
	  };

	  return render;
	}

	function getLifecyclesFromExports(scriptExports, appName, global, globalLatestSetProp) {
	  if (validateExportLifecycle(scriptExports)) {
	    return scriptExports;
	  } // fallback to sandbox latest set property if it had


	  if (globalLatestSetProp) {
	    var lifecycles = global[globalLatestSetProp];

	    if (validateExportLifecycle(lifecycles)) {
	      return lifecycles;
	    }
	  }

	  if (process.env.NODE_ENV === 'development') {
	    console.warn("[qiankun] lifecycle not found from ".concat(appName, " entry exports, fallback to get from window['").concat(appName, "']"));
	  } // fallback to global variable who named with ${appName} while module exports not found


	  var globalVariableExports = global[appName];

	  if (validateExportLifecycle(globalVariableExports)) {
	    return globalVariableExports;
	  }

	  throw new QiankunError("You need to export lifecycle functions in ".concat(appName, " entry"));
	}

	var prevAppUnmountedDeferred;
	function loadApp(app) {
	  var configuration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  var lifeCycles = arguments.length > 2 ? arguments[2] : undefined;

	  var _a;

	  return __awaiter(this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee17() {
	    var _this = this;

	    var entry, appName, appInstanceId, markName, _configuration$singul, singular, _configuration$sandbo, sandbox, excludeAssetFilter, _configuration$global, globalContext, importEntryOpts, _yield$importEntry, template, execScripts, assetPublicPath, appContent, strictStyleIsolation, scopedCSS, initialAppWrapperElement, initialContainer, legacyRender, render, initialAppWrapperGetter, global, mountSandbox, unmountSandbox, useLooseSandbox, sandboxContainer, _mergeWith, _mergeWith$beforeUnmo, beforeUnmount, _mergeWith$afterUnmou, afterUnmount, _mergeWith$afterMount, afterMount, _mergeWith$beforeMoun, beforeMount, _mergeWith$beforeLoad, beforeLoad, scriptExports, _getLifecyclesFromExp, bootstrap, mount, unmount, update, _getMicroAppStateActi, onGlobalStateChange, setGlobalState, offGlobalStateChange, syncAppWrapperElement2Sandbox, parcelConfigGetter;

	    return regenerator.wrap(function _callee17$(_context17) {
	      while (1) {
	        switch (_context17.prev = _context17.next) {
	          case 0:
	            entry = app.entry, appName = app.name;
	            appInstanceId = "".concat(appName, "_").concat(+new Date(), "_").concat(Math.floor(Math.random() * 1000));
	            markName = "[qiankun] App ".concat(appInstanceId, " Loading");

	            if (process.env.NODE_ENV === 'development') {
	              performanceMark(markName);
	            }

	            _configuration$singul = configuration.singular, singular = _configuration$singul === void 0 ? false : _configuration$singul, _configuration$sandbo = configuration.sandbox, sandbox = _configuration$sandbo === void 0 ? true : _configuration$sandbo, excludeAssetFilter = configuration.excludeAssetFilter, _configuration$global = configuration.globalContext, globalContext = _configuration$global === void 0 ? window : _configuration$global, importEntryOpts = __rest(configuration, ["singular", "sandbox", "excludeAssetFilter", "globalContext"]); // get the entry html content and script executor

	            _context17.next = 7;
	            return importEntry(entry, importEntryOpts);

	          case 7:
	            _yield$importEntry = _context17.sent;
	            template = _yield$importEntry.template;
	            execScripts = _yield$importEntry.execScripts;
	            assetPublicPath = _yield$importEntry.assetPublicPath;
	            _context17.next = 13;
	            return validateSingularMode(singular, app);

	          case 13:
	            if (!_context17.sent) {
	              _context17.next = 16;
	              break;
	            }

	            _context17.next = 16;
	            return prevAppUnmountedDeferred && prevAppUnmountedDeferred.promise;

	          case 16:
	            appContent = getDefaultTplWrapper(appInstanceId, appName)(template);
	            strictStyleIsolation = _typeof(sandbox) === 'object' && !!sandbox.strictStyleIsolation;
	            scopedCSS = isEnableScopedCSS(sandbox);
	            initialAppWrapperElement = createElement(appContent, strictStyleIsolation, scopedCSS, appName);
	            initialContainer = 'container' in app ? app.container : undefined;
	            legacyRender = 'render' in app ? app.render : undefined;
	            render = getRender(appName, appContent, legacyRender); // 第一次加载设置应用可见区域 dom 结构
	            // 确保每次应用加载前容器 dom 结构已经设置完毕

	            render({
	              element: initialAppWrapperElement,
	              loading: true,
	              container: initialContainer
	            }, 'loading');
	            initialAppWrapperGetter = getAppWrapperGetter(appName, appInstanceId, !!legacyRender, strictStyleIsolation, scopedCSS, function () {
	              return initialAppWrapperElement;
	            });
	            global = globalContext;

	            mountSandbox = function mountSandbox() {
	              return Promise.resolve();
	            };

	            unmountSandbox = function unmountSandbox() {
	              return Promise.resolve();
	            };

	            useLooseSandbox = _typeof(sandbox) === 'object' && !!sandbox.loose;

	            if (sandbox) {
	              sandboxContainer = createSandboxContainer(appName, // FIXME should use a strict sandbox logic while remount, see https://github.com/umijs/qiankun/issues/518
	              initialAppWrapperGetter, scopedCSS, useLooseSandbox, excludeAssetFilter, global); // 用沙箱的代理对象作为接下来使用的全局对象

	              global = sandboxContainer.instance.proxy;
	              mountSandbox = sandboxContainer.mount;
	              unmountSandbox = sandboxContainer.unmount;
	            }

	            _mergeWith = _mergeWith2({}, getAddOns(global, assetPublicPath), lifeCycles, function (v1, v2) {
	              return _concat(v1 !== null && v1 !== void 0 ? v1 : [], v2 !== null && v2 !== void 0 ? v2 : []);
	            }), _mergeWith$beforeUnmo = _mergeWith.beforeUnmount, beforeUnmount = _mergeWith$beforeUnmo === void 0 ? [] : _mergeWith$beforeUnmo, _mergeWith$afterUnmou = _mergeWith.afterUnmount, afterUnmount = _mergeWith$afterUnmou === void 0 ? [] : _mergeWith$afterUnmou, _mergeWith$afterMount = _mergeWith.afterMount, afterMount = _mergeWith$afterMount === void 0 ? [] : _mergeWith$afterMount, _mergeWith$beforeMoun = _mergeWith.beforeMount, beforeMount = _mergeWith$beforeMoun === void 0 ? [] : _mergeWith$beforeMoun, _mergeWith$beforeLoad = _mergeWith.beforeLoad, beforeLoad = _mergeWith$beforeLoad === void 0 ? [] : _mergeWith$beforeLoad;
	            _context17.next = 33;
	            return execHooksChain(toArray(beforeLoad), app, global);

	          case 33:
	            _context17.next = 35;
	            return execScripts(global, sandbox && !useLooseSandbox);

	          case 35:
	            scriptExports = _context17.sent;
	            _getLifecyclesFromExp = getLifecyclesFromExports(scriptExports, appName, global, (_a = sandboxContainer === null || sandboxContainer === void 0 ? void 0 : sandboxContainer.instance) === null || _a === void 0 ? void 0 : _a.latestSetProp), bootstrap = _getLifecyclesFromExp.bootstrap, mount = _getLifecyclesFromExp.mount, unmount = _getLifecyclesFromExp.unmount, update = _getLifecyclesFromExp.update;
	            _getMicroAppStateActi = getMicroAppStateActions(appInstanceId), onGlobalStateChange = _getMicroAppStateActi.onGlobalStateChange, setGlobalState = _getMicroAppStateActi.setGlobalState, offGlobalStateChange = _getMicroAppStateActi.offGlobalStateChange; // FIXME temporary way

	            syncAppWrapperElement2Sandbox = function syncAppWrapperElement2Sandbox(element) {
	              return initialAppWrapperElement = element;
	            };

	            parcelConfigGetter = function parcelConfigGetter() {
	              var remountContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialContainer;
	              var appWrapperElement;
	              var appWrapperGetter;
	              var parcelConfig = {
	                name: appInstanceId,
	                bootstrap: bootstrap,
	                mount: [function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	                    var marks;
	                    return regenerator.wrap(function _callee2$(_context2) {
	                      while (1) {
	                        switch (_context2.prev = _context2.next) {
	                          case 0:
	                            if (process.env.NODE_ENV === 'development') {
	                              marks = performanceGetEntriesByName(markName, 'mark'); // mark length is zero means the app is remounting

	                              if (marks && !marks.length) {
	                                performanceMark(markName);
	                              }
	                            }

	                          case 1:
	                          case "end":
	                            return _context2.stop();
	                        }
	                      }
	                    }, _callee2);
	                  }));
	                }, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee3() {
	                    return regenerator.wrap(function _callee3$(_context3) {
	                      while (1) {
	                        switch (_context3.prev = _context3.next) {
	                          case 0:
	                            _context3.next = 2;
	                            return validateSingularMode(singular, app);

	                          case 2:
	                            _context3.t0 = _context3.sent;

	                            if (!_context3.t0) {
	                              _context3.next = 5;
	                              break;
	                            }

	                            _context3.t0 = prevAppUnmountedDeferred;

	                          case 5:
	                            if (!_context3.t0) {
	                              _context3.next = 7;
	                              break;
	                            }

	                            return _context3.abrupt("return", prevAppUnmountedDeferred.promise);

	                          case 7:
	                            return _context3.abrupt("return", undefined);

	                          case 8:
	                          case "end":
	                            return _context3.stop();
	                        }
	                      }
	                    }, _callee3);
	                  }));
	                }, // initial wrapper element before app mount/remount
	                function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee4() {
	                    return regenerator.wrap(function _callee4$(_context4) {
	                      while (1) {
	                        switch (_context4.prev = _context4.next) {
	                          case 0:
	                            appWrapperElement = initialAppWrapperElement;
	                            appWrapperGetter = getAppWrapperGetter(appName, appInstanceId, !!legacyRender, strictStyleIsolation, scopedCSS, function () {
	                              return appWrapperElement;
	                            });

	                          case 2:
	                          case "end":
	                            return _context4.stop();
	                        }
	                      }
	                    }, _callee4);
	                  }));
	                }, // 添加 mount hook, 确保每次应用加载前容器 dom 结构已经设置完毕
	                function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee5() {
	                    var useNewContainer;
	                    return regenerator.wrap(function _callee5$(_context5) {
	                      while (1) {
	                        switch (_context5.prev = _context5.next) {
	                          case 0:
	                            useNewContainer = remountContainer !== initialContainer;

	                            if (useNewContainer || !appWrapperElement) {
	                              // element will be destroyed after unmounted, we need to recreate it if it not exist
	                              // or we try to remount into a new container
	                              appWrapperElement = createElement(appContent, strictStyleIsolation, scopedCSS, appName);
	                              syncAppWrapperElement2Sandbox(appWrapperElement);
	                            }

	                            render({
	                              element: appWrapperElement,
	                              loading: true,
	                              container: remountContainer
	                            }, 'mounting');

	                          case 3:
	                          case "end":
	                            return _context5.stop();
	                        }
	                      }
	                    }, _callee5);
	                  }));
	                }, mountSandbox, // exec the chain after rendering to keep the behavior with beforeLoad
	                function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee6() {
	                    return regenerator.wrap(function _callee6$(_context6) {
	                      while (1) {
	                        switch (_context6.prev = _context6.next) {
	                          case 0:
	                            return _context6.abrupt("return", execHooksChain(toArray(beforeMount), app, global));

	                          case 1:
	                          case "end":
	                            return _context6.stop();
	                        }
	                      }
	                    }, _callee6);
	                  }));
	                }, function (props) {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee7() {
	                    return regenerator.wrap(function _callee7$(_context7) {
	                      while (1) {
	                        switch (_context7.prev = _context7.next) {
	                          case 0:
	                            return _context7.abrupt("return", mount(Object.assign(Object.assign({}, props), {
	                              container: appWrapperGetter(),
	                              setGlobalState: setGlobalState,
	                              onGlobalStateChange: onGlobalStateChange
	                            })));

	                          case 1:
	                          case "end":
	                            return _context7.stop();
	                        }
	                      }
	                    }, _callee7);
	                  }));
	                }, // finish loading after app mounted
	                function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee8() {
	                    return regenerator.wrap(function _callee8$(_context8) {
	                      while (1) {
	                        switch (_context8.prev = _context8.next) {
	                          case 0:
	                            return _context8.abrupt("return", render({
	                              element: appWrapperElement,
	                              loading: false,
	                              container: remountContainer
	                            }, 'mounted'));

	                          case 1:
	                          case "end":
	                            return _context8.stop();
	                        }
	                      }
	                    }, _callee8);
	                  }));
	                }, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee9() {
	                    return regenerator.wrap(function _callee9$(_context9) {
	                      while (1) {
	                        switch (_context9.prev = _context9.next) {
	                          case 0:
	                            return _context9.abrupt("return", execHooksChain(toArray(afterMount), app, global));

	                          case 1:
	                          case "end":
	                            return _context9.stop();
	                        }
	                      }
	                    }, _callee9);
	                  }));
	                }, // initialize the unmount defer after app mounted and resolve the defer after it unmounted
	                function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee10() {
	                    return regenerator.wrap(function _callee10$(_context10) {
	                      while (1) {
	                        switch (_context10.prev = _context10.next) {
	                          case 0:
	                            _context10.next = 2;
	                            return validateSingularMode(singular, app);

	                          case 2:
	                            if (!_context10.sent) {
	                              _context10.next = 4;
	                              break;
	                            }

	                            prevAppUnmountedDeferred = new Deferred();

	                          case 4:
	                          case "end":
	                            return _context10.stop();
	                        }
	                      }
	                    }, _callee10);
	                  }));
	                }, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee11() {
	                    var measureName;
	                    return regenerator.wrap(function _callee11$(_context11) {
	                      while (1) {
	                        switch (_context11.prev = _context11.next) {
	                          case 0:
	                            if (process.env.NODE_ENV === 'development') {
	                              measureName = "[qiankun] App ".concat(appInstanceId, " Loading Consuming");
	                              performanceMeasure(measureName, markName);
	                            }

	                          case 1:
	                          case "end":
	                            return _context11.stop();
	                        }
	                      }
	                    }, _callee11);
	                  }));
	                }],
	                unmount: [function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee12() {
	                    return regenerator.wrap(function _callee12$(_context12) {
	                      while (1) {
	                        switch (_context12.prev = _context12.next) {
	                          case 0:
	                            return _context12.abrupt("return", execHooksChain(toArray(beforeUnmount), app, global));

	                          case 1:
	                          case "end":
	                            return _context12.stop();
	                        }
	                      }
	                    }, _callee12);
	                  }));
	                }, function (props) {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee13() {
	                    return regenerator.wrap(function _callee13$(_context13) {
	                      while (1) {
	                        switch (_context13.prev = _context13.next) {
	                          case 0:
	                            return _context13.abrupt("return", unmount(Object.assign(Object.assign({}, props), {
	                              container: appWrapperGetter()
	                            })));

	                          case 1:
	                          case "end":
	                            return _context13.stop();
	                        }
	                      }
	                    }, _callee13);
	                  }));
	                }, unmountSandbox, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee14() {
	                    return regenerator.wrap(function _callee14$(_context14) {
	                      while (1) {
	                        switch (_context14.prev = _context14.next) {
	                          case 0:
	                            return _context14.abrupt("return", execHooksChain(toArray(afterUnmount), app, global));

	                          case 1:
	                          case "end":
	                            return _context14.stop();
	                        }
	                      }
	                    }, _callee14);
	                  }));
	                }, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee15() {
	                    return regenerator.wrap(function _callee15$(_context15) {
	                      while (1) {
	                        switch (_context15.prev = _context15.next) {
	                          case 0:
	                            render({
	                              element: null,
	                              loading: false,
	                              container: remountContainer
	                            }, 'unmounted');
	                            offGlobalStateChange(appInstanceId); // for gc

	                            appWrapperElement = null;
	                            syncAppWrapperElement2Sandbox(appWrapperElement);

	                          case 4:
	                          case "end":
	                            return _context15.stop();
	                        }
	                      }
	                    }, _callee15);
	                  }));
	                }, function () {
	                  return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee16() {
	                    return regenerator.wrap(function _callee16$(_context16) {
	                      while (1) {
	                        switch (_context16.prev = _context16.next) {
	                          case 0:
	                            _context16.next = 2;
	                            return validateSingularMode(singular, app);

	                          case 2:
	                            _context16.t0 = _context16.sent;

	                            if (!_context16.t0) {
	                              _context16.next = 5;
	                              break;
	                            }

	                            _context16.t0 = prevAppUnmountedDeferred;

	                          case 5:
	                            if (!_context16.t0) {
	                              _context16.next = 7;
	                              break;
	                            }

	                            prevAppUnmountedDeferred.resolve();

	                          case 7:
	                          case "end":
	                            return _context16.stop();
	                        }
	                      }
	                    }, _callee16);
	                  }));
	                }]
	              };

	              if (typeof update === 'function') {
	                parcelConfig.update = update;
	              }

	              return parcelConfig;
	            };

	            return _context17.abrupt("return", parcelConfigGetter);

	          case 41:
	          case "end":
	            return _context17.stop();
	        }
	      }
	    }, _callee17);
	  }));
	}

	var requestIdleCallback = window.requestIdleCallback || function requestIdleCallback(cb) {
	  var start = Date.now();
	  return setTimeout(function () {
	    cb({
	      didTimeout: false,
	      timeRemaining: function timeRemaining() {
	        return Math.max(0, 50 - (Date.now() - start));
	      }
	    });
	  }, 1);
	};

	var isSlowNetwork = navigator.connection ? navigator.connection.saveData || navigator.connection.type !== 'wifi' && navigator.connection.type !== 'ethernet' && /([23])g/.test(navigator.connection.effectiveType) : false;
	/**
	 * prefetch assets, do nothing while in mobile network
	 * @param entry
	 * @param opts
	 */

	function prefetch(entry, opts) {
	  var _this = this;

	  if (!navigator.onLine || isSlowNetwork) {
	    // Don't prefetch if in a slow network or offline
	    return;
	  }

	  requestIdleCallback(function () {
	    return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	      var _yield$importEntry, getExternalScripts, getExternalStyleSheets;

	      return regenerator.wrap(function _callee$(_context) {
	        while (1) {
	          switch (_context.prev = _context.next) {
	            case 0:
	              _context.next = 2;
	              return importEntry(entry, opts);

	            case 2:
	              _yield$importEntry = _context.sent;
	              getExternalScripts = _yield$importEntry.getExternalScripts;
	              getExternalStyleSheets = _yield$importEntry.getExternalStyleSheets;
	              requestIdleCallback(getExternalStyleSheets);
	              requestIdleCallback(getExternalScripts);

	            case 7:
	            case "end":
	              return _context.stop();
	          }
	        }
	      }, _callee);
	    }));
	  });
	}

	function prefetchAfterFirstMounted(apps, opts) {
	  window.addEventListener('single-spa:first-mount', function listener() {
	    var notLoadedApps = apps.filter(function (app) {
	      return Pt(app.name) === l;
	    });

	    if (process.env.NODE_ENV === 'development') {
	      var mountedApps = Et();
	      console.log("[qiankun] prefetch starting after ".concat(mountedApps, " mounted..."), notLoadedApps);
	    }

	    notLoadedApps.forEach(function (_ref) {
	      var entry = _ref.entry;
	      return prefetch(entry, opts);
	    });
	    window.removeEventListener('single-spa:first-mount', listener);
	  });
	}

	function prefetchImmediately(apps, opts) {
	  if (process.env.NODE_ENV === 'development') {
	    console.log('[qiankun] prefetch starting for apps...', apps);
	  }

	  apps.forEach(function (_ref2) {
	    var entry = _ref2.entry;
	    return prefetch(entry, opts);
	  });
	}
	function doPrefetchStrategy(apps, prefetchStrategy, importEntryOpts) {
	  var _this2 = this;

	  var appsName2Apps = function appsName2Apps(names) {
	    return apps.filter(function (app) {
	      return names.includes(app.name);
	    });
	  };

	  if (Array.isArray(prefetchStrategy)) {
	    prefetchAfterFirstMounted(appsName2Apps(prefetchStrategy), importEntryOpts);
	  } else if (isFunction_1(prefetchStrategy)) {
	    (function () {
	      return __awaiter(_this2, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	        var _yield$prefetchStrate, _yield$prefetchStrate2, criticalAppNames, _yield$prefetchStrate3, minorAppsName;

	        return regenerator.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                _context2.next = 2;
	                return prefetchStrategy(apps);

	              case 2:
	                _yield$prefetchStrate = _context2.sent;
	                _yield$prefetchStrate2 = _yield$prefetchStrate.criticalAppNames;
	                criticalAppNames = _yield$prefetchStrate2 === void 0 ? [] : _yield$prefetchStrate2;
	                _yield$prefetchStrate3 = _yield$prefetchStrate.minorAppsName;
	                minorAppsName = _yield$prefetchStrate3 === void 0 ? [] : _yield$prefetchStrate3;
	                prefetchImmediately(appsName2Apps(criticalAppNames), importEntryOpts);
	                prefetchAfterFirstMounted(appsName2Apps(minorAppsName), importEntryOpts);

	              case 9:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2);
	      }));
	    })();
	  } else {
	    switch (prefetchStrategy) {
	      case true:
	        prefetchAfterFirstMounted(apps, importEntryOpts);
	        break;

	      case 'all':
	        prefetchImmediately(apps, importEntryOpts);
	        break;
	    }
	  }
	}

	var microApps = [];
	var frameworkConfiguration = {};
	var started = false;
	var defaultUrlRerouteOnly = true;
	var frameworkStartedDefer = new Deferred();

	var autoDowngradeForLowVersionBrowser = function autoDowngradeForLowVersionBrowser(configuration) {
	  var sandbox = configuration.sandbox,
	      singular = configuration.singular;

	  if (sandbox) {
	    if (!window.Proxy) {
	      console.warn('[qiankun] Miss window.Proxy, proxySandbox will degenerate into snapshotSandbox');

	      if (singular === false) {
	        console.warn('[qiankun] Setting singular as false may cause unexpected behavior while your browser not support window.Proxy');
	      }

	      return Object.assign(Object.assign({}, configuration), {
	        sandbox: _typeof(sandbox) === 'object' ? Object.assign(Object.assign({}, sandbox), {
	          loose: true
	        }) : {
	          loose: true
	        }
	      });
	    }
	  }

	  return configuration;
	};

	function registerMicroApps(apps, lifeCycles) {
	  var _this = this;

	  // Each app only needs to be registered once
	  var unregisteredApps = apps.filter(function (app) {
	    return !microApps.some(function (registeredApp) {
	      return registeredApp.name === app.name;
	    });
	  });
	  microApps = [].concat(_toConsumableArray(microApps), _toConsumableArray(unregisteredApps));
	  unregisteredApps.forEach(function (app) {
	    var name = app.name,
	        activeRule = app.activeRule,
	        _app$loader = app.loader,
	        loader = _app$loader === void 0 ? noop_1 : _app$loader,
	        props = app.props,
	        appConfig = __rest(app, ["name", "activeRule", "loader", "props"]);

	    Ot({
	      name: name,
	      app: function app() {
	        return __awaiter(_this, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee3() {
	          var _this2 = this;

	          var _a, mount, otherMicroAppConfigs;

	          return regenerator.wrap(function _callee3$(_context3) {
	            while (1) {
	              switch (_context3.prev = _context3.next) {
	                case 0:
	                  loader(true);
	                  _context3.next = 3;
	                  return frameworkStartedDefer.promise;

	                case 3:
	                  _context3.next = 5;
	                  return loadApp(Object.assign({
	                    name: name,
	                    props: props
	                  }, appConfig), frameworkConfiguration, lifeCycles);

	                case 5:
	                  _context3.t0 = _context3.sent;
	                  _a = (0, _context3.t0)();
	                  mount = _a.mount;
	                  otherMicroAppConfigs = __rest(_a, ["mount"]);
	                  return _context3.abrupt("return", Object.assign({
	                    mount: [function () {
	                      return __awaiter(_this2, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee() {
	                        return regenerator.wrap(function _callee$(_context) {
	                          while (1) {
	                            switch (_context.prev = _context.next) {
	                              case 0:
	                                return _context.abrupt("return", loader(true));

	                              case 1:
	                              case "end":
	                                return _context.stop();
	                            }
	                          }
	                        }, _callee);
	                      }));
	                    }].concat(_toConsumableArray(toArray(mount)), [function () {
	                      return __awaiter(_this2, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee2() {
	                        return regenerator.wrap(function _callee2$(_context2) {
	                          while (1) {
	                            switch (_context2.prev = _context2.next) {
	                              case 0:
	                                return _context2.abrupt("return", loader(false));

	                              case 1:
	                              case "end":
	                                return _context2.stop();
	                            }
	                          }
	                        }, _callee2);
	                      }));
	                    }])
	                  }, otherMicroAppConfigs));

	                case 10:
	                case "end":
	                  return _context3.stop();
	              }
	            }
	          }, _callee3);
	        }));
	      },
	      activeWhen: activeRule,
	      customProps: props
	    });
	  });
	}
	var appConfigPromiseGetterMap = new Map();
	var containerMicroAppsMap = new Map();
	function loadMicroApp(app, configuration, lifeCycles) {
	  var _this3 = this;

	  var _a;

	  var props = app.props,
	      name = app.name;
	  var container = 'container' in app ? app.container : undefined; // Must compute the container xpath at beginning to keep it consist around app running
	  // If we compute it every time, the container dom structure most probably been changed and result in a different xpath value

	  var containerXPath = getContainerXPath(container);
	  var appContainerXPathKey = "".concat(name, "-").concat(containerXPath);
	  var microApp;

	  var wrapParcelConfigForRemount = function wrapParcelConfigForRemount(config) {
	    var microAppConfig = config;

	    if (container) {
	      if (containerXPath) {
	        var containerMicroApps = containerMicroAppsMap.get(appContainerXPathKey);

	        if (containerMicroApps === null || containerMicroApps === void 0 ? void 0 : containerMicroApps.length) {
	          var mount = [function () {
	            return __awaiter(_this3, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee4() {
	              var prevLoadMicroApps, prevLoadMicroAppsWhichNotBroken;
	              return regenerator.wrap(function _callee4$(_context4) {
	                while (1) {
	                  switch (_context4.prev = _context4.next) {
	                    case 0:
	                      // While there are multiple micro apps mounted on the same container, we must wait until the prev instances all had unmounted
	                      // Otherwise it will lead some concurrent issues
	                      prevLoadMicroApps = containerMicroApps.slice(0, containerMicroApps.indexOf(microApp));
	                      prevLoadMicroAppsWhichNotBroken = prevLoadMicroApps.filter(function (v) {
	                        return v.getStatus() !== 'LOAD_ERROR' && v.getStatus() !== 'SKIP_BECAUSE_BROKEN';
	                      });
	                      _context4.next = 4;
	                      return Promise.all(prevLoadMicroAppsWhichNotBroken.map(function (v) {
	                        return v.unmountPromise;
	                      }));

	                    case 4:
	                    case "end":
	                      return _context4.stop();
	                  }
	                }
	              }, _callee4);
	            }));
	          }].concat(_toConsumableArray(toArray(microAppConfig.mount)));
	          microAppConfig = Object.assign(Object.assign({}, config), {
	            mount: mount
	          });
	        }
	      }
	    }

	    return Object.assign(Object.assign({}, microAppConfig), {
	      // empty bootstrap hook which should not run twice while it calling from cached micro app
	      bootstrap: function bootstrap() {
	        return Promise.resolve();
	      }
	    });
	  };
	  /**
	   * using name + container xpath as the micro app instance id,
	   * it means if you rendering a micro app to a dom which have been rendered before,
	   * the micro app would not load and evaluate its lifecycles again
	   */


	  var memorizedLoadingFn = function memorizedLoadingFn() {
	    return __awaiter(_this3, void 0, void 0, /*#__PURE__*/regenerator.mark(function _callee5() {
	      var userConfiguration, $$cacheLifecycleByAppName, parcelConfigGetterPromise, _parcelConfigGetterPromise, parcelConfigObjectGetterPromise;

	      return regenerator.wrap(function _callee5$(_context5) {
	        while (1) {
	          switch (_context5.prev = _context5.next) {
	            case 0:
	              userConfiguration = autoDowngradeForLowVersionBrowser(configuration !== null && configuration !== void 0 ? configuration : Object.assign(Object.assign({}, frameworkConfiguration), {
	                singular: false
	              }));
	              $$cacheLifecycleByAppName = userConfiguration.$$cacheLifecycleByAppName;

	              if (!container) {
	                _context5.next = 21;
	                break;
	              }

	              if (!$$cacheLifecycleByAppName) {
	                _context5.next = 12;
	                break;
	              }

	              parcelConfigGetterPromise = appConfigPromiseGetterMap.get(name);

	              if (!parcelConfigGetterPromise) {
	                _context5.next = 12;
	                break;
	              }

	              _context5.t0 = wrapParcelConfigForRemount;
	              _context5.next = 9;
	              return parcelConfigGetterPromise;

	            case 9:
	              _context5.t1 = _context5.sent;
	              _context5.t2 = (0, _context5.t1)(container);
	              return _context5.abrupt("return", (0, _context5.t0)(_context5.t2));

	            case 12:
	              if (!containerXPath) {
	                _context5.next = 21;
	                break;
	              }

	              _parcelConfigGetterPromise = appConfigPromiseGetterMap.get(appContainerXPathKey);

	              if (!_parcelConfigGetterPromise) {
	                _context5.next = 21;
	                break;
	              }

	              _context5.t3 = wrapParcelConfigForRemount;
	              _context5.next = 18;
	              return _parcelConfigGetterPromise;

	            case 18:
	              _context5.t4 = _context5.sent;
	              _context5.t5 = (0, _context5.t4)(container);
	              return _context5.abrupt("return", (0, _context5.t3)(_context5.t5));

	            case 21:
	              parcelConfigObjectGetterPromise = loadApp(app, userConfiguration, lifeCycles);

	              if (container) {
	                if ($$cacheLifecycleByAppName) {
	                  appConfigPromiseGetterMap.set(name, parcelConfigObjectGetterPromise);
	                } else if (containerXPath) appConfigPromiseGetterMap.set(appContainerXPathKey, parcelConfigObjectGetterPromise);
	              }

	              _context5.next = 25;
	              return parcelConfigObjectGetterPromise;

	            case 25:
	              _context5.t6 = _context5.sent;
	              return _context5.abrupt("return", (0, _context5.t6)(container));

	            case 27:
	            case "end":
	              return _context5.stop();
	          }
	        }
	      }, _callee5);
	    }));
	  };

	  if (!started) {
	    // We need to invoke start method of single-spa as the popstate event should be dispatched while the main app calling pushState/replaceState automatically,
	    // but in single-spa it will check the start status before it dispatch popstate
	    // see https://github.com/single-spa/single-spa/blob/f28b5963be1484583a072c8145ac0b5a28d91235/src/navigation/navigation-events.js#L101
	    // ref https://github.com/umijs/qiankun/pull/1071
	    xt({
	      urlRerouteOnly: (_a = frameworkConfiguration.urlRerouteOnly) !== null && _a !== void 0 ? _a : defaultUrlRerouteOnly
	    });
	  }

	  microApp = C(memorizedLoadingFn, Object.assign({
	    domElement: document.createElement('div')
	  }, props));

	  if (container) {
	    if (containerXPath) {
	      // Store the microApps which they mounted on the same container
	      var microAppsRef = containerMicroAppsMap.get(appContainerXPathKey) || [];
	      microAppsRef.push(microApp);
	      containerMicroAppsMap.set(appContainerXPathKey, microAppsRef);

	      var cleanup = function cleanup() {
	        var index = microAppsRef.indexOf(microApp);
	        microAppsRef.splice(index, 1); // @ts-ignore

	        microApp = null;
	      }; // gc after unmount


	      microApp.unmountPromise.then(cleanup).catch(cleanup);
	    }
	  }

	  return microApp;
	}
	function start() {
	  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  frameworkConfiguration = Object.assign({
	    prefetch: true,
	    singular: true,
	    sandbox: true
	  }, opts);

	  var _frameworkConfigurati = frameworkConfiguration,
	      prefetch = _frameworkConfigurati.prefetch;
	      _frameworkConfigurati.sandbox;
	      _frameworkConfigurati.singular;
	      var _frameworkConfigurati2 = _frameworkConfigurati.urlRerouteOnly,
	      urlRerouteOnly = _frameworkConfigurati2 === void 0 ? defaultUrlRerouteOnly : _frameworkConfigurati2,
	      importEntryOpts = __rest(frameworkConfiguration, ["prefetch", "sandbox", "singular", "urlRerouteOnly"]);

	  if (prefetch) {
	    doPrefetchStrategy(microApps, prefetch, importEntryOpts);
	  }

	  frameworkConfiguration = autoDowngradeForLowVersionBrowser(frameworkConfiguration);
	  xt({
	    urlRerouteOnly: urlRerouteOnly
	  });
	  started = true;
	  frameworkStartedDefer.resolve();
	}

	/**
	 * @author Kuitos
	 * @since 2020-02-21
	 */
	function addGlobalUncaughtErrorHandler(errorHandler) {
	  window.addEventListener('error', errorHandler);
	  window.addEventListener('unhandledrejection', errorHandler);
	}
	function removeGlobalUncaughtErrorHandler(errorHandler) {
	  window.removeEventListener('error', errorHandler);
	  window.removeEventListener('unhandledrejection', errorHandler);
	}

	/**
	 * @author Kuitos
	 * @since 2019-02-19
	 */
	var firstMountLogLabel = '[qiankun] first app mounted';

	if (process.env.NODE_ENV === 'development') {
	  console.time(firstMountLogLabel);
	}

	function setDefaultMountApp(defaultAppLink) {
	  // can not use addEventListener once option for ie support
	  window.addEventListener('single-spa:no-app-change', function listener() {
	    var mountedApps = Et();

	    if (!mountedApps.length) {
	      nt(defaultAppLink);
	    }

	    window.removeEventListener('single-spa:no-app-change', listener);
	  });
	}
	function runDefaultMountEffects(defaultAppLink) {
	  console.warn('[qiankun] runDefaultMountEffects will be removed in next version, please use setDefaultMountApp instead');
	  setDefaultMountApp(defaultAppLink);
	}
	function runAfterFirstMounted(effect) {
	  // can not use addEventListener once option for ie support
	  window.addEventListener('single-spa:first-mount', function listener() {
	    if (process.env.NODE_ENV === 'development') {
	      console.timeEnd(firstMountLogLabel);
	    }

	    effect();
	    window.removeEventListener('single-spa:first-mount', listener);
	  });
	}

	/**
	 * @author Kuitos
	 * @since 2019-04-25
	 */

	var QK = /*#__PURE__*/Object.freeze({
		__proto__: null,
		loadMicroApp: loadMicroApp,
		registerMicroApps: registerMicroApps,
		start: start,
		initGlobalState: initGlobalState,
		__internalGetCurrentRunningApp: getCurrentRunningApp,
		prefetchApps: prefetchImmediately,
		addErrorHandler: a,
		removeErrorHandler: c$1,
		addGlobalUncaughtErrorHandler: addGlobalUncaughtErrorHandler,
		removeGlobalUncaughtErrorHandler: removeGlobalUncaughtErrorHandler,
		setDefaultMountApp: setDefaultMountApp,
		runDefaultMountEffects: runDefaultMountEffects,
		runAfterFirstMounted: runAfterFirstMounted,
		get SandBoxType () { return SandBoxType; }
	});

	const getActiveRule = hash => location => location.hash.startsWith(hash);

	const activeRuleCheck = (mode, name) => {
	  return mode === 'hash' ? getActiveRule(`#/${name.split('-')[0]}`) : `/${name.split('-')[0]}`;
	};
	function registerMicroAppsConfig(microApps, option) {
	  const {
	    mode,
	    container = '#micro-app-container',
	    env = 'dev',
	    devParam = []
	  } = option;
	  microApps.forEach(apps => {
	    const entry = devParam && devParam.find(({
	      key,
	      url
	    }) => key === apps.name) || null;
	    apps.activeRule = activeRuleCheck(mode, apps.name);
	    apps.container = container;
	    apps.entry = entry && env ? entry.url : `/${apps.name}/`;
	  });
	}

	/**
	 * 样式
	 */
	const otherStyle = 'color:#FFF;padding: 2px 3px;';
	const radius = 'border-radius:3px;';
	const leftRadius = 'border-radius: 3px 0 0 3px;';
	const rightRadius = 'border-radius: 0 3px 3px 0;';
	const bold = 'font-weight:bold;';
	/**
	 * 颜色集合
	 */
	const ColorMap = new Map([
	    // general
	    ['red', 'color:red'],
	    ['blue', 'color:blue'],
	    ['yellow', 'color:yellow'],
	    ['green', 'color:green'],
	    ['orange', 'color:orange'],
	    // bold general
	    ['boldRed', `${bold}color:red`],
	    ['boldBlue', `${bold}color:blue`],
	    ['boldYellow', `${bold}color:yellow`],
	    ['boldGreen', `${bold}color:green`],
	    ['boldOrange', `${bold}color:orange`],
	    // bg
	    ['bgRed', `${otherStyle}${radius}${bold}background:#FF0000;`],
	    ['bgBlack', `${otherStyle}${radius}${bold}background:#000;`],
	    ['bgBlue', `${otherStyle}${radius}${bold}background:#00F;`],
	    ['bgOrange', `${otherStyle}${radius}${bold}background:#FF8C00;`],
	    ['bgSpringGreen', `${otherStyle}${radius}${bold}background:#3CB371;`],
	    ['bgYellow', `${otherStyle.replace('#FFF', '#000')}${radius}${bold}background:#FF0;`],
	    ['bgGreen', `${otherStyle.replace('#FFF', '#000')}${radius}${bold}background:#0F0;`],
	    // lineargradient
	    ['gradientBlack', `${otherStyle}${radius}${bold}background:linear-gradient(#FFF, #000);`],
	    ['gradientGreen', `${otherStyle}${radius}${bold}background:linear-gradient(#FFF, #3CB371);`]
	    // border
	]);
	/**
	 * @param text 文本
	 * @param type 颜色
	 * @returns
	 */
	const colors = (text, type) => {
	    return [`%c ${text} `, ColorMap.get(type)];
	};
	/**
	 *
	 * @param text 文本
	 * @param type 颜色
	 * @returns
	 */
	const groupColors = (text, type) => {
	    return [
	        text.map((t) => `%c ${t} `).join(''),
	        ...type.map((t, i) => {
	            let r = '';
	            if (i === 0) {
	                r = leftRadius;
	            }
	            else if (i + 1 === type.length) {
	                r = `${rightRadius}`;
	            }
	            return `${ColorMap.get(t)}${r}`;
	        })
	    ];
	};
	function c(colors, value) {
	    if (value) {
	        return console.log(...colors, value);
	    }
	    else {
	        return console.log(...colors);
	    }
	}

	// bg
	const bgBlack = (text, value) => {
	    return c(colors(text, 'bgBlack'), value);
	};
	const bgRed = (text, value) => {
	    return c(colors(text, 'bgRed'), value);
	};
	const bgBlue = (text, value) => {
	    return c(colors(text, 'bgBlue'), value);
	};
	const bgYellow = (text, value) => {
	    return c(colors(text, 'bgYellow'), value);
	};
	const bgGreen = (text, value) => {
	    return c(colors(text, 'bgGreen'), value);
	};
	const bgOrange = (text, value) => {
	    return c(colors(text, 'bgOrange'), value);
	};
	const bgSpringGreen = (text, value) => {
	    return c(colors(text, 'bgSpringGreen'), value);
	};
	// gradient
	const gradientBlack = (text, value) => {
	    return c(colors(text, 'gradientBlack'), value);
	};
	const gradientGreen = (text, value) => {
	    return c(colors(text, 'gradientGreen'), value);
	};
	// 多组背景变色
	const bgGroup = (text, colors, value) => {
	    return c(groupColors(text, colors), value);
	};

	// 红
	const red = (text, value) => {
	    return c(colors(text, 'red'), value);
	};
	// 蓝
	const blue = (text, value) => {
	    return c(colors(text, 'blue'), value);
	};
	// 绿
	const green = (text, value) => {
	    return c(colors(text, 'green'), value);
	};
	// 黄
	const yellow = (text, value) => {
	    return c(colors(text, 'yellow'), value);
	};
	// 橘黄
	const orange = (text, value) => {
	    return c(colors(text, 'orange'), value);
	};
	// 加粗
	// 红
	const boldRed = (text, value) => {
	    return c(colors(text, 'boldRed'), value);
	};
	// 蓝
	const boldBlue = (text, value) => {
	    return c(colors(text, 'boldBlue'), value);
	};
	// 绿
	const boldGreen = (text, value) => {
	    return c(colors(text, 'boldGreen'), value);
	};
	// 黄
	const boldYellow = (text, value) => {
	    return c(colors(text, 'boldYellow'), value);
	};
	// 橘黄
	const boldOrange = (text, value) => {
	    return c(colors(text, 'boldOrange'), value);
	};

	// console.log('LogColor');
	// console.log('============= general ==========');
	// red('test red');
	// yellow('test red');
	// blue('test red');
	// green('test red');
	// orange('test red');
	// console.log('============= bold general ==========');
	// boldRed('test red');
	// boldBlue('test red');
	// boldGreen('test red');
	// boldOrange('test red');
	// boldYellow('test red');
	// console.log('============= bg bold general ==========');
	// bgBlack('test bg red', 121);
	// bgRed('test bg red');
	// bgBlue('test bg red');
	// bgGreen('test bg red');
	// bgYellow('test bg red');
	// bgOrange('test bg red');
	// bgSpringGreen('test bg red');
	// console.log('============= bg bold general ==========');
	// gradientBlack('test bg red');
	// gradientGreen('test bg red');
	// console.log('============= bg group black ==============');
	// bgGroup(['test bg group 1', 'test bg group 2'], ['bgRed', 'bgBlue'], '121231');
	const BrowserLogColor = {
	    red,
	    yellow,
	    blue,
	    green,
	    orange,
	    boldRed,
	    boldBlue,
	    boldGreen,
	    boldOrange,
	    boldYellow,
	    bgRed,
	    bgBlue,
	    bgGreen,
	    bgYellow,
	    bgOrange,
	    bgSpringGreen,
	    gradientGreen,
	    bgBlack,
	    gradientBlack,
	    bgGroup
	};

	const beforeLoad = async app => {
	  BrowserLogColor.bgSpringGreen('[QK] before load', app.name);
	};

	const beforeMount = async app => {
	  BrowserLogColor.bgSpringGreen('[QK] before mount', app.name);
	};

	class UseApp {
	  constructor({
	    routes,
	    config,
	    action
	  }, isLogs) {
	    this.useAppAction(routes, config, action, isLogs);
	  }

	  start(option) {
	    start(option);
	  }

	  loadApps(env, app, isLogs) {
	    const {
	      name,
	      entry,
	      container = '#load-micro-app-container',
	      props
	    } = app;

	    if (isLogs) {
	      BrowserLogColor.bgBlack(`[手动加载 ${app.name}]：`);
	      console.table(app);
	    }

	    return loadMicroApp({
	      name,
	      entry: env === 'dev' ? `/${name}/` : entry,
	      container,
	      props
	    });
	  }

	  useAppAction($routes = [], $config = {
	    mode: 'hash',
	    env: 'dev'
	  }, $action = {}, isLogs) {
	    const _self = this;

	    if (typeof isLogs === 'boolean' && typeof isLogs !== 'undefined') {
	      _self.$logs = isLogs;
	    } else {
	      _self.$logs = ($config === null || $config === void 0 ? void 0 : $config.env) === 'dev';
	    }

	    if (!$routes || !$routes.length) {
	      throw new Error('[QK] micro apps routes is undefined .');
	    }

	    if ($config.env === 'prod') {
	      registerMicroAppsConfig($routes, $config);
	    } else {
	      if (!$config.devParam) {
	        throw new Error('[QK] default url address not exists !');
	      }

	      const entryArr = [];

	      for (const key in $config.devParam) {
	        if (Object.prototype.hasOwnProperty.call($config.devParam, key)) {
	          const url = $config.devParam[key];
	          entryArr.push({
	            key,
	            url
	          });
	        }
	      }

	      registerMicroAppsConfig($routes, Object.assign($config, {
	        devParam: entryArr
	      }));
	    }

	    registerMicroApps($routes, Object.assign({
	      beforeLoad,
	      beforeMount
	    }, $action));

	    if (_self.$logs) {
	      BrowserLogColor.bgBlack('注册应用信息：');
	      console.table($routes);
	    }
	  }

	}

	function registerRouteConfig(routes, option) {
	  const {
	    history,
	    component,
	    activeRule,
	    local
	  } = option;
	  const isHash = history === 'hash' || typeof history !== 'string';
	  const isVue3Router = typeof history !== 'string';
	  routes.forEach(route => {
	    if (window.__POWERED_BY_QIANKUN__ && isHash) {
	      route.path = `${route.path}`;
	    } else {
	      route.path = `/${route.path}`;
	    }
	  });
	  const base = window.__POWERED_BY_QIANKUN__ ? `/${activeRule}/` : local;
	  const common = isVue3Router ? {
	    history: window.__POWERED_BY_QIANKUN__ ? history(`/${activeRule}/`) : history(`${local}`)
	  } : {
	    base,
	    mode: history
	  };
	  let config = { ...common,
	    routes
	  };

	  if (isHash) {
	    if (!component) {
	      throw new Error('[vue-router] component is undefined');
	    }

	    config = { ...common,
	      routes: [{
	        path: base,
	        name: 'container',
	        component,
	        children: routes
	      }]
	    };
	  }

	  return config;
	}

	class UseMicroApp {
	  constructor({
	    version = '2',
	    option,
	    Vue,
	    VueRouter,
	    render
	  }, isLogs) {
	    const {
	      history,
	      routes,
	      name,
	      component,
	      store,
	      local = false
	    } = option;

	    if (!component) {
	      throw new Error('component is not define');
	    }

	    const _self = this;

	    _self.$version = version;
	    _self.$log = isLogs;
	    _self.$name = name;
	    _self.$history = history;
	    _self.$routes = routes;
	    _self.$component = component;
	    _self.$activeRule = `${name.split('-')[0]}`;
	    _self.$local = local ? '/' : `${name}`;
	    _self.$store = store;
	    _self.$VueRouter = VueRouter;
	    _self.$Vue = Vue;
	    _self.$render = render;
	  }

	  render(props = {}) {
	    const _self = this;

	    const {
	      container
	    } = props;
	    const routeOption = registerRouteConfig(_self.$routes, {
	      history: _self.$history,
	      component: _self.$component,
	      activeRule: _self.$activeRule,
	      local: _self.$local
	    });
	    _self.$router = new _self.$VueRouter(routeOption);
	    Number(_self.$version) === 2 ? _self.v2(container) : _self.v3(container);
	  }

	  bootstrap() {
	    return Promise.resolve();
	  }

	  mount(props) {
	    const _self = this;

	    _self.render(props);
	  }

	  unmount() {
	    const _self = this;

	    if (_self.$version === '2') {
	      _self.$instance.$destroy();

	      _self.$instance.$el.innerHTML = '';
	    } else {
	      _self.$instance.unmount();
	    }

	    _self.$instance = null;
	    _self.$router = null;
	    _self.$store = null;
	  }

	  update(props) {
	    return Promise.resolve(props);
	  }

	  start() {
	    const _self = this;

	    if (_self.$log) {
	      BrowserLogColor.bgBlack(`[启动应用 ${_self.$name}]:`);
	      const table = {
	        是否有主应用: window.__POWERED_BY_QIANKUN__,
	        应用名称: _self.$name,
	        vue版本: _self.$version,
	        是否开启Log: _self.$log,
	        路由模式: _self.$history,
	        路由地址: _self.$activeRule,
	        子应用入口: _self.$component,
	        是否存在store: _self.$store ? true : false,
	        是否允许独立运行: _self.$local
	      };
	      console.table(table);
	    }

	    if (window.__POWERED_BY_QIANKUN__) {
	      __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
	    }

	    if (!window.__POWERED_BY_QIANKUN__) {
	      _self.render();
	    }
	  }

	  v2(container) {
	    const _self = this;

	    _self.$instance = new _self.$Vue({
	      router: _self.$router,
	      store: _self.$store || null,
	      render: h => h(_self.$render)
	    }).$mount(container ? container.querySelector('#app') : '#app');
	  }

	  v3(container) {
	    const _self = this;

	    _self.$instance = _self.$Vue(_self.$render).use(_self.$router);

	    if (_self.$store) {
	      _self.$instance.use(_self.$store);
	    }

	    _self.$instance.mount(container ? container.querySelector('#app') : '#app');
	  }

	}

	const QKRegisterApp = (option, isLogs) => new UseApp(option, isLogs);
	const QKRegisterMicroApp = (option, isLogs) => new UseMicroApp(option, isLogs);

	exports.QKRegisterApp = QKRegisterApp;
	exports.QKRegisterMicroApp = QKRegisterMicroApp;
	exports["default"] = QK;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
