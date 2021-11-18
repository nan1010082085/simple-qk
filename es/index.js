import _noop from 'lodash/noop';
import _concat from 'lodash/concat';
import _mergeWith from 'lodash/mergeWith';
import _forEach from 'lodash/forEach';
import _cloneDeep from 'lodash/cloneDeep';
import _isFunction from 'lodash/isFunction';
import _snakeCase from 'lodash/snakeCase';

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
var t=Object.freeze({__proto__:null,get start(){return xt},get ensureJQuerySupport(){return ft},get setBootstrapMaxTime(){return F},get setMountMaxTime(){return J},get setUnmountMaxTime(){return H},get setUnloadMaxTime(){return Q},get registerApplication(){return Ot},get unregisterApplication(){return Tt},get getMountedApps(){return Et},get getAppStatus(){return Pt},get unloadApplication(){return At},get checkActivityFunctions(){return bt},get getAppNames(){return yt},get pathToActiveWhen(){return _t},get navigateToUrl(){return nt},get triggerAppChange(){return Mt},get addErrorHandler(){return a},get removeErrorHandler(){return c},get mountRootParcel(){return C},get NOT_LOADED(){return l},get LOADING_SOURCE_CODE(){return p},get NOT_BOOTSTRAPPED(){return h},get BOOTSTRAPPING(){return m},get NOT_MOUNTED(){return v},get MOUNTING(){return d},get UPDATING(){return g},get LOAD_ERROR(){return y},get MOUNTED(){return w},get UNMOUNTING(){return E},get SKIP_BECAUSE_BROKEN(){return P}});function n(t){return (n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function e(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}var r=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{}).CustomEvent,o=function(){try{var t=new r("cat",{detail:{foo:"bar"}});return "cat"===t.type&&"bar"===t.detail.foo}catch(t){}return !1}()?r:"undefined"!=typeof document&&"function"==typeof document.createEvent?function(t,n){var e=document.createEvent("CustomEvent");return n?e.initCustomEvent(t,n.bubbles,n.cancelable,n.detail):e.initCustomEvent(t,!1,!1,void 0),e}:function(t,n){var e=document.createEventObject();return e.type=t,n?(e.bubbles=Boolean(n.bubbles),e.cancelable=Boolean(n.cancelable),e.detail=n.detail):(e.bubbles=!1,e.cancelable=!1,e.detail=void 0),e},i=[];function u(t,n,e){var r=f(t,n,e);i.length?i.forEach((function(t){return t(r)})):setTimeout((function(){throw r}));}function a(t){if("function"!=typeof t)throw Error(s(28,!1));i.push(t);}function c(t){if("function"!=typeof t)throw Error(s(29,!1));var n=!1;return i=i.filter((function(e){var r=e===t;return n=n||r,!r})),n}function s(t,n){for(var e=arguments.length,r=new Array(e>2?e-2:0),o=2;o<e;o++)r[o-2]=arguments[o];return "single-spa minified message #".concat(t,": ").concat(n?n+" ":"","See https://single-spa.js.org/error/?code=").concat(t).concat(r.length?"&arg=".concat(r.join("&arg=")):"")}function f(t,n,e){var r,o="".concat(N(n)," '").concat(T(n),"' died in status ").concat(n.status,": ");if(t instanceof Error){try{t.message=o+t.message;}catch(t){}r=t;}else {console.warn(s(30,!1,n.status,T(n)));try{r=Error(o+JSON.stringify(t));}catch(n){r=t;}}return r.appOrParcelName=T(n),n.status=e,r}var l="NOT_LOADED",p="LOADING_SOURCE_CODE",h="NOT_BOOTSTRAPPED",m="BOOTSTRAPPING",v="NOT_MOUNTED",d="MOUNTING",w="MOUNTED",g="UPDATING",E="UNMOUNTING",y="LOAD_ERROR",P="SKIP_BECAUSE_BROKEN";function O(t){return t.status===w}function b(t){try{return t.activeWhen(window.location)}catch(n){return u(n,t,P),!1}}function T(t){return t.name}function A(t){return Boolean(t.unmountThisParcel)}function N(t){return A(t)?"parcel":"application"}function S(){for(var t=arguments.length-1;t>0;t--)for(var n in arguments[t])"__proto__"!==n&&(arguments[t-1][n]=arguments[t][n]);return arguments[0]}function _(t,n){for(var e=0;e<t.length;e++)if(n(t[e]))return t[e];return null}function D(t){return t&&("function"==typeof t||(n=t,Array.isArray(n)&&!_(n,(function(t){return "function"!=typeof t}))));var n;}function U(t,n){var e=t[n]||[];0===(e=Array.isArray(e)?e:[e]).length&&(e=[function(){return Promise.resolve()}]);var r=N(t),o=T(t);return function(t){return e.reduce((function(e,i,u){return e.then((function(){var e=i(t);return j(e)?e:Promise.reject(s(15,!1,r,o,n,u))}))}),Promise.resolve())}}function j(t){return t&&"function"==typeof t.then&&"function"==typeof t.catch}function M(t,n){return Promise.resolve().then((function(){return t.status!==h?t:(t.status=m,t.bootstrap?V(t,"bootstrap").then(e).catch((function(e){if(n)throw f(e,t,P);return u(e,t,P),t})):Promise.resolve().then(e))}));function e(){return t.status=v,t}}function L(t,n){return Promise.resolve().then((function(){if(t.status!==w)return t;t.status=E;var e=Object.keys(t.parcels).map((function(n){return t.parcels[n].unmountThisParcel()}));return Promise.all(e).then(r,(function(e){return r().then((function(){var r=Error(e.message);if(n)throw f(r,t,P);u(r,t,P);}))})).then((function(){return t}));function r(){return V(t,"unmount").then((function(){t.status=v;})).catch((function(e){if(n)throw f(e,t,P);u(e,t,P);}))}}))}var R=!1,I=!1;function x(t,n){return Promise.resolve().then((function(){return t.status!==v?t:(R||(window.dispatchEvent(new o("single-spa:before-first-mount")),R=!0),V(t,"mount").then((function(){return t.status=w,I||(window.dispatchEvent(new o("single-spa:first-mount")),I=!0),t})).catch((function(e){return t.status=w,L(t,!0).then(r,r);function r(){if(n)throw f(e,t,P);return u(e,t,P),t}})))}))}var B=0,G={parcels:{}};function C(){return W.apply(G,arguments)}function W(t,e){var r=this;if(!t||"object"!==n(t)&&"function"!=typeof t)throw Error(s(2,!1));if(t.name&&"string"!=typeof t.name)throw Error(s(3,!1,n(t.name)));if("object"!==n(e))throw Error(s(4,!1,name,n(e)));if(!e.domElement)throw Error(s(5,!1,name));var o,i=B++,u="function"==typeof t,a=u?t:function(){return Promise.resolve(t)},c={id:i,parcels:{},status:u?p:h,customProps:e,parentName:T(r),unmountThisParcel:function(){return y.then((function(){if(c.status!==w)throw Error(s(6,!1,name,c.status));return L(c,!0)})).then((function(t){return c.parentName&&delete r.parcels[c.id],t})).then((function(t){return m(t),t})).catch((function(t){throw c.status=P,d(t),t}))}};r.parcels[i]=c;var l=a();if(!l||"function"!=typeof l.then)throw Error(s(7,!1));var m,d,E=(l=l.then((function(t){if(!t)throw Error(s(8,!1));var n=t.name||"parcel-".concat(i);if(Object.prototype.hasOwnProperty.call(t,"bootstrap")&&!D(t.bootstrap))throw Error(s(9,!1,n));if(!D(t.mount))throw Error(s(10,!1,n));if(!D(t.unmount))throw Error(s(11,!1,n));if(t.update&&!D(t.update))throw Error(s(12,!1,n));var e=U(t,"bootstrap"),r=U(t,"mount"),u=U(t,"unmount");c.status=h,c.name=n,c.bootstrap=e,c.mount=r,c.unmount=u,c.timeouts=q(t.timeouts),t.update&&(c.update=U(t,"update"),o.update=function(t){return c.customProps=t,$(function(t){return Promise.resolve().then((function(){if(t.status!==w)throw Error(s(32,!1,T(t)));return t.status=g,V(t,"update").then((function(){return t.status=w,t})).catch((function(n){throw f(n,t,P)}))}))}(c))});}))).then((function(){return M(c,!0)})),y=E.then((function(){return x(c,!0)})),O=new Promise((function(t,n){m=t,d=n;}));return o={mount:function(){return $(Promise.resolve().then((function(){if(c.status!==v)throw Error(s(13,!1,name,c.status));return r.parcels[i]=c,x(c)})))},unmount:function(){return $(c.unmountThisParcel())},getStatus:function(){return c.status},loadPromise:$(l),bootstrapPromise:$(E),mountPromise:$(y),unmountPromise:$(O)}}function $(t){return t.then((function(){return null}))}function k(e){var r=T(e),o="function"==typeof e.customProps?e.customProps(r,window.location):e.customProps;("object"!==n(o)||null===o||Array.isArray(o))&&(o={},console.warn(s(40,!1),r,o));var i=S({},o,{name:r,mountParcel:W.bind(e),singleSpa:t});return A(e)&&(i.unmountSelf=e.unmountThisParcel),i}var K={bootstrap:{millis:4e3,dieOnTimeout:!1,warningMillis:1e3},mount:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},unmount:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},unload:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3},update:{millis:3e3,dieOnTimeout:!1,warningMillis:1e3}};function F(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(16,!1));K.bootstrap={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function J(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(17,!1));K.mount={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function H(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(18,!1));K.unmount={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function Q(t,n,e){if("number"!=typeof t||t<=0)throw Error(s(19,!1));K.unload={millis:t,dieOnTimeout:n,warningMillis:e||1e3};}function V(t,n){var e=t.timeouts[n],r=e.warningMillis,o=N(t);return new Promise((function(i,u){var a=!1,c=!1;t[n](k(t)).then((function(t){a=!0,i(t);})).catch((function(t){a=!0,u(t);})),setTimeout((function(){return l(1)}),r),setTimeout((function(){return l(!0)}),e.millis);var f=s(31,!1,n,o,T(t),e.millis);function l(t){if(!a)if(!0===t)c=!0,e.dieOnTimeout?u(Error(f)):console.error(f);else if(!c){var n=t,o=n*r;console.warn(f),o+r<e.millis&&setTimeout((function(){return l(n+1)}),r);}}}))}function q(t){var n={};for(var e in K)n[e]=S({},K[e],t&&t[e]||{});return n}function z(t){return Promise.resolve().then((function(){return t.loadPromise?t.loadPromise:t.status!==l&&t.status!==y?t:(t.status=p,t.loadPromise=Promise.resolve().then((function(){var o=t.loadApp(k(t));if(!j(o))throw r=!0,Error(s(33,!1,T(t)));return o.then((function(r){var o;t.loadErrorTime=null,"object"!==n(e=r)&&(o=34),Object.prototype.hasOwnProperty.call(e,"bootstrap")&&!D(e.bootstrap)&&(o=35),D(e.mount)||(o=36),D(e.unmount)||(o=37);var i=N(e);if(o){var a;try{a=JSON.stringify(e);}catch(t){}return console.error(s(o,!1,i,T(t),a),e),u(void 0,t,P),t}return e.devtools&&e.devtools.overlays&&(t.devtools.overlays=S({},t.devtools.overlays,e.devtools.overlays)),t.status=h,t.bootstrap=U(e,"bootstrap"),t.mount=U(e,"mount"),t.unmount=U(e,"unmount"),t.unload=U(e,"unload"),t.timeouts=q(e.timeouts),delete t.loadPromise,t}))})).catch((function(n){var e;return delete t.loadPromise,r?e=P:(e=y,t.loadErrorTime=(new Date).getTime()),u(n,t,e),t})));var e,r;}))}var X,Y="undefined"!=typeof window,Z={hashchange:[],popstate:[]},tt=["hashchange","popstate"];function nt(t){var n;if("string"==typeof t)n=t;else if(this&&this.href)n=this.href;else {if(!(t&&t.currentTarget&&t.currentTarget.href&&t.preventDefault))throw Error(s(14,!1));n=t.currentTarget.href,t.preventDefault();}var e=ct(window.location.href),r=ct(n);0===n.indexOf("#")?window.location.hash=r.hash:e.host!==r.host&&r.host?window.location.href=n:r.pathname===e.pathname&&r.search===e.search?window.location.hash=r.hash:window.history.pushState(null,null,n);}function et(t){var n=this;if(t){var e=t[0].type;tt.indexOf(e)>=0&&Z[e].forEach((function(e){try{e.apply(n,t);}catch(t){setTimeout((function(){throw t}));}}));}}function rt(){Lt([],arguments);}function ot(t,n){return function(){var e=window.location.href,r=t.apply(this,arguments),o=window.location.href;return X&&e===o||(Bt()?window.dispatchEvent(it(window.history.state,n)):Lt([])),r}}function it(t,n){var e;try{e=new PopStateEvent("popstate",{state:t});}catch(n){(e=document.createEvent("PopStateEvent")).initPopStateEvent("popstate",!1,!1,t);}return e.singleSpa=!0,e.singleSpaTrigger=n,e}if(Y){window.addEventListener("hashchange",rt),window.addEventListener("popstate",rt);var ut=window.addEventListener,at=window.removeEventListener;window.addEventListener=function(t,n){if(!("function"==typeof n&&tt.indexOf(t)>=0)||_(Z[t],(function(t){return t===n})))return ut.apply(this,arguments);Z[t].push(n);},window.removeEventListener=function(t,n){if(!("function"==typeof n&&tt.indexOf(t)>=0))return at.apply(this,arguments);Z[t]=Z[t].filter((function(t){return t!==n}));},window.history.pushState=ot(window.history.pushState,"pushState"),window.history.replaceState=ot(window.history.replaceState,"replaceState"),window.singleSpaNavigate?console.warn(s(41,!1)):window.singleSpaNavigate=nt;}function ct(t){var n=document.createElement("a");return n.href=t,n}var st=!1;function ft(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:window.jQuery;if(t||window.$&&window.$.fn&&window.$.fn.jquery&&(t=window.$),t&&!st){var n=t.fn.on,e=t.fn.off;t.fn.on=function(t,e){return lt.call(this,n,window.addEventListener,t,e,arguments)},t.fn.off=function(t,n){return lt.call(this,e,window.removeEventListener,t,n,arguments)},st=!0;}}function lt(t,n,e,r,o){return "string"!=typeof e?t.apply(this,o):(e.split(/\s+/).forEach((function(t){tt.indexOf(t)>=0&&(n(t,r),e=e.replace(t,""));})),""===e.trim()?this:t.apply(this,o))}var pt={};function ht(t){return Promise.resolve().then((function(){var n=pt[T(t)];if(!n)return t;if(t.status===l)return mt(t,n),t;if("UNLOADING"===t.status)return n.promise.then((function(){return t}));if(t.status!==v&&t.status!==y)return t;var e=t.status===y?Promise.resolve():V(t,"unload");return t.status="UNLOADING",e.then((function(){return mt(t,n),t})).catch((function(e){return function(t,n,e){delete pt[T(t)],delete t.bootstrap,delete t.mount,delete t.unmount,delete t.unload,u(e,t,P),n.reject(e);}(t,n,e),t}))}))}function mt(t,n){delete pt[T(t)],delete t.bootstrap,delete t.mount,delete t.unmount,delete t.unload,t.status=l,n.resolve();}function vt(t,n,e,r){pt[T(t)]={app:t,resolve:e,reject:r},Object.defineProperty(pt[T(t)],"promise",{get:n});}function dt(t){return pt[t]}var wt=[];function gt(){var t=[],n=[],e=[],r=[],o=(new Date).getTime();return wt.forEach((function(i){var u=i.status!==P&&b(i);switch(i.status){case y:u&&o-i.loadErrorTime>=200&&e.push(i);break;case l:case p:u&&e.push(i);break;case h:case v:!u&&dt(T(i))?t.push(i):u&&r.push(i);break;case w:u||n.push(i);}})),{appsToUnload:t,appsToUnmount:n,appsToLoad:e,appsToMount:r}}function Et(){return wt.filter(O).map(T)}function yt(){return wt.map(T)}function Pt(t){var n=_(wt,(function(n){return T(n)===t}));return n?n.status:null}function Ot(t,e,r,o){var i=function(t,e,r,o){var i,u={name:null,loadApp:null,activeWhen:null,customProps:null};return "object"===n(t)?(function(t){if(Array.isArray(t)||null===t)throw Error(s(39,!1));var e=["name","app","activeWhen","customProps"],r=Object.keys(t).reduce((function(t,n){return e.indexOf(n)>=0?t:t.concat(n)}),[]);if(0!==r.length)throw Error(s(38,!1,e.join(", "),r.join(", ")));if("string"!=typeof t.name||0===t.name.length)throw Error(s(20,!1));if("object"!==n(t.app)&&"function"!=typeof t.app)throw Error(s(20,!1));var o=function(t){return "string"==typeof t||"function"==typeof t};if(!(o(t.activeWhen)||Array.isArray(t.activeWhen)&&t.activeWhen.every(o)))throw Error(s(24,!1));if(!St(t.customProps))throw Error(s(22,!1))}(t),u.name=t.name,u.loadApp=t.app,u.activeWhen=t.activeWhen,u.customProps=t.customProps):(function(t,n,e,r){if("string"!=typeof t||0===t.length)throw Error(s(20,!1));if(!n)throw Error(s(23,!1));if("function"!=typeof e)throw Error(s(24,!1));if(!St(r))throw Error(s(22,!1))}(t,e,r,o),u.name=t,u.loadApp=e,u.activeWhen=r,u.customProps=o),u.loadApp="function"!=typeof(i=u.loadApp)?function(){return Promise.resolve(i)}:i,u.customProps=function(t){return t||{}}(u.customProps),u.activeWhen=function(t){var n=Array.isArray(t)?t:[t];return n=n.map((function(t){return "function"==typeof t?t:_t(t)})),function(t){return n.some((function(n){return n(t)}))}}(u.activeWhen),u}(t,e,r,o);if(-1!==yt().indexOf(i.name))throw Error(s(21,!1,i.name));wt.push(S({loadErrorTime:null,status:l,parcels:{},devtools:{overlays:{options:{},selectors:[]}}},i)),Y&&(ft(),Lt());}function bt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:window.location;return wt.filter((function(n){return n.activeWhen(t)})).map(T)}function Tt(t){if(0===wt.filter((function(n){return T(n)===t})).length)throw Error(s(25,!1,t));return At(t).then((function(){var n=wt.map(T).indexOf(t);wt.splice(n,1);}))}function At(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{waitForUnmount:!1};if("string"!=typeof t)throw Error(s(26,!1));var e=_(wt,(function(n){return T(n)===t}));if(!e)throw Error(s(27,!1,t));var r,o=dt(T(e));if(n&&n.waitForUnmount){if(o)return o.promise;var i=new Promise((function(t,n){vt(e,(function(){return i}),t,n);}));return i}return o?(r=o.promise,Nt(e,o.resolve,o.reject)):r=new Promise((function(t,n){vt(e,(function(){return r}),t,n),Nt(e,t,n);})),r}function Nt(t,n,e){L(t).then(ht).then((function(){n(),setTimeout((function(){Lt();}));})).catch(e);}function St(t){return !t||"function"==typeof t||"object"===n(t)&&null!==t&&!Array.isArray(t)}function _t(t,n){var e=function(t,n){var e=0,r=!1,o="^";"/"!==t[0]&&(t="/"+t);for(var i=0;i<t.length;i++){var u=t[i];(!r&&":"===u||r&&"/"===u)&&a(i);}return a(t.length),new RegExp(o,"i");function a(i){var u=t.slice(e,i).replace(/[|\\{}()[\]^$+*?.]/g,"\\$&");if(o+=r?"[^/]+/?":u,i===t.length)if(r)n&&(o+="$");else {var a=n?"":".*";o="/"===o.charAt(o.length-1)?"".concat(o).concat(a,"$"):"".concat(o,"(/").concat(a,")?(#.*)?$");}r=!r,e=i;}}(t,n);return function(t){var n=t.origin;n||(n="".concat(t.protocol,"//").concat(t.host));var r=t.href.replace(n,"").replace(t.search,"").split("?")[0];return e.test(r)}}var Dt=!1,Ut=[],jt=Y&&window.location.href;function Mt(){return Lt()}function Lt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],n=arguments.length>1?arguments[1]:void 0;if(Dt)return new Promise((function(t,e){Ut.push({resolve:t,reject:e,eventArguments:n});}));var r,i=gt(),u=i.appsToUnload,a=i.appsToUnmount,c=i.appsToLoad,s=i.appsToMount,f=!1,p=jt,h=jt=window.location.href;return Bt()?(Dt=!0,r=u.concat(c,a,s),g()):(r=c,d());function m(){f=!0;}function d(){return Promise.resolve().then((function(){var t=c.map(z);return Promise.all(t).then(y).then((function(){return []})).catch((function(t){throw y(),t}))}))}function g(){return Promise.resolve().then((function(){if(window.dispatchEvent(new o(0===r.length?"single-spa:before-no-app-change":"single-spa:before-app-change",O(!0))),window.dispatchEvent(new o("single-spa:before-routing-event",O(!0,{cancelNavigation:m}))),f)return window.dispatchEvent(new o("single-spa:before-mount-routing-event",O(!0))),E(),void nt(p);var n=u.map(ht),e=a.map(L).map((function(t){return t.then(ht)})).concat(n),i=Promise.all(e);i.then((function(){window.dispatchEvent(new o("single-spa:before-mount-routing-event",O(!0)));}));var l=c.map((function(t){return z(t).then((function(t){return Rt(t,i)}))})),h=s.filter((function(t){return c.indexOf(t)<0})).map((function(t){return Rt(t,i)}));return i.catch((function(t){throw y(),t})).then((function(){return y(),Promise.all(l.concat(h)).catch((function(n){throw t.forEach((function(t){return t.reject(n)})),n})).then(E)}))}))}function E(){var n=Et();t.forEach((function(t){return t.resolve(n)}));try{var e=0===r.length?"single-spa:no-app-change":"single-spa:app-change";window.dispatchEvent(new o(e,O())),window.dispatchEvent(new o("single-spa:routing-event",O()));}catch(t){setTimeout((function(){throw t}));}if(Dt=!1,Ut.length>0){var i=Ut;Ut=[],Lt(i);}return n}function y(){t.forEach((function(t){et(t.eventArguments);})),et(n);}function O(){var t,o=arguments.length>0&&void 0!==arguments[0]&&arguments[0],i=arguments.length>1?arguments[1]:void 0,m={},d=(e(t={},w,[]),e(t,v,[]),e(t,l,[]),e(t,P,[]),t);o?(c.concat(s).forEach((function(t,n){E(t,w);})),u.forEach((function(t){E(t,l);})),a.forEach((function(t){E(t,v);}))):r.forEach((function(t){E(t);}));var g={detail:{newAppStatuses:m,appsByNewStatus:d,totalAppChanges:r.length,originalEvent:null==n?void 0:n[0],oldUrl:p,newUrl:h,navigationIsCanceled:f}};return i&&S(g.detail,i),g;function E(t,n){var e=T(t);n=n||Pt(e),m[e]=n,(d[n]=d[n]||[]).push(e);}}}function Rt(t,n){return b(t)?M(t).then((function(t){return n.then((function(){return b(t)?x(t):t}))})):n.then((function(){return t}))}var It=!1;function xt(t){var n;It=!0,t&&t.urlRerouteOnly&&(n=t.urlRerouteOnly,X=n),Y&&Lt();}function Bt(){return It}Y&&setTimeout((function(){It||console.warn(s(1,!1));}),5e3);var Gt={getRawAppData:function(){return [].concat(wt)},reroute:Lt,NOT_LOADED:l,toLoadPromise:z,toBootstrapPromise:M,unregisterApplication:Tt};Y&&window.__SINGLE_SPA_DEVTOOLS__&&(window.__SINGLE_SPA_DEVTOOLS__.exposedMethods=Gt);

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
  return _mergeWith({}, getAddOn(global), getAddOn$1(global, publicPath), function (v1, v2) {
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

var globalState = {};
var deps = {}; // 触发全局监听

function emitGlobal(state, prevState) {
  Object.keys(deps).forEach(function (id) {
    if (deps[id] instanceof Function) {
      deps[id](_cloneDeep(state), _cloneDeep(prevState));
    }
  });
}

function initGlobalState() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (state === globalState) {
    console.warn('[qiankun] state has not changed！');
  } else {
    var prevGlobalState = _cloneDeep(globalState);

    globalState = _cloneDeep(state);
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
        var cloneState = _cloneDeep(globalState);

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

      var prevGlobalState = _cloneDeep(globalState);

      globalState = _cloneDeep(Object.keys(state).reduce(function (_globalState, changeKey) {
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
  return "__qiankun_microapp_wrapper_for_".concat(_snakeCase(id), "__");
}
var nativeGlobal = new Function('return this')();
/** 校验子应用导出的 生命周期 对象是否正确 */

function validateExportLifecycle(exports) {
  var _ref = exports !== null && exports !== void 0 ? exports : {},
      bootstrap = _ref.bootstrap,
      mount = _ref.mount,
      unmount = _ref.unmount;

  return _isFunction(bootstrap) && _isFunction(mount) && _isFunction(unmount);
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

  if (_isFunction(element.onload)) {
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

  if (_isFunction(element.onerror)) {
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
    return _noop;
  };

  var historyListeners = [];
  var historyUnListens = [];

  if (window.g_history && _isFunction(window.g_history.listen)) {
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
    var rebuild = _noop;
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

    if (window.g_history && _isFunction(window.g_history.listen)) {
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
    return _noop;
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
    return _noop;
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

    _forEach(styleNodes, function (stylesheetElement) {
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

    var entry, appName, appInstanceId, markName, _configuration$singul, singular, _configuration$sandbo, sandbox, excludeAssetFilter, _configuration$global, globalContext, importEntryOpts, _yield$importEntry, template, execScripts, assetPublicPath, appContent, strictStyleIsolation, scopedCSS, initialAppWrapperElement, initialContainer, legacyRender, render, initialAppWrapperGetter, global, mountSandbox, unmountSandbox, useLooseSandbox, sandboxContainer, _mergeWith$1, _mergeWith$beforeUnmo, beforeUnmount, _mergeWith$afterUnmou, afterUnmount, _mergeWith$afterMount, afterMount, _mergeWith$beforeMoun, beforeMount, _mergeWith$beforeLoad, beforeLoad, scriptExports, _getLifecyclesFromExp, bootstrap, mount, unmount, update, _getMicroAppStateActi, onGlobalStateChange, setGlobalState, offGlobalStateChange, syncAppWrapperElement2Sandbox, parcelConfigGetter;

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

            _mergeWith$1 = _mergeWith({}, getAddOns(global, assetPublicPath), lifeCycles, function (v1, v2) {
              return _concat(v1 !== null && v1 !== void 0 ? v1 : [], v2 !== null && v2 !== void 0 ? v2 : []);
            }), _mergeWith$beforeUnmo = _mergeWith$1.beforeUnmount, beforeUnmount = _mergeWith$beforeUnmo === void 0 ? [] : _mergeWith$beforeUnmo, _mergeWith$afterUnmou = _mergeWith$1.afterUnmount, afterUnmount = _mergeWith$afterUnmou === void 0 ? [] : _mergeWith$afterUnmou, _mergeWith$afterMount = _mergeWith$1.afterMount, afterMount = _mergeWith$afterMount === void 0 ? [] : _mergeWith$afterMount, _mergeWith$beforeMoun = _mergeWith$1.beforeMount, beforeMount = _mergeWith$beforeMoun === void 0 ? [] : _mergeWith$beforeMoun, _mergeWith$beforeLoad = _mergeWith$1.beforeLoad, beforeLoad = _mergeWith$beforeLoad === void 0 ? [] : _mergeWith$beforeLoad;
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
  } else if (_isFunction(prefetchStrategy)) {
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
        loader = _app$loader === void 0 ? _noop : _app$loader,
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
  removeErrorHandler: c,
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
    container = '#container-micro-app',
    env = 'dev',
    devParam
  } = option;
  const {
    key = '',
    url = ''
  } = devParam || {};
  microApps.forEach(apps => {
    apps.activeRule = activeRuleCheck(mode, apps.name);
    apps.container = container;
    apps.entry = key === apps.name && env ? url : `/${apps.name}/`;
  });
}

const beforeLoad = async app => {
  console.log('[QK] before load', app.name);
};

const beforeMount = async app => {
  console.log('[QK] before mount', app.name);
};

class UseApp {
  start = start;

  constructor({
    isMicro = false,
    routes,
    config,
    action
  }) {
    if (!isMicro) {
      this.useAppAction(routes, config, action);
    }
  }

  useAppAction($routes = [], $config = {
    mode: 'hash',
    env: 'dev'
  }, $action = {}) {
    if (!$routes || !$routes.length) {
      throw new Error('[QK] micro apps routes is undefined .');
    }

    if ($config.env === 'prod') {
      registerMicroAppsConfig($routes, $config);
    } else {
      if (!$config.devParam) {
        throw new Error('[QK] default url address not exists !');
      }

      for (const key in $config.devParam) {
        if (Object.prototype.hasOwnProperty.call($config.devParam, key)) {
          const url = $config.devParam[key];
          registerMicroAppsConfig($routes, Object.assign($config, {
            devParam: {
              key,
              url
            }
          }));
        }
      }
    }

    registerMicroApps($routes, Object.assign({
      beforeLoad,
      beforeMount
    }, $action));
  }

}

function registerRouteConfig(routes, option) {
  const {
    mode,
    component,
    activeRule,
    local
  } = option;
  const base = window.__POWERED_BY_QIANKUN__ ? `/${activeRule}/` : local;
  routes.forEach(route => {
    route.path = window.__POWERED_BY_QIANKUN__ && mode === 'hash' ? `${route.path}` : `/${route.path}`;
  });
  let config = {
    base,
    mode,
    routes
  };

  if (mode === 'hash') {
    if (!component) {
      throw new Error('[vue-router] component is undefined');
    }

    config = {
      base,
      mode,
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
  $instance = null;

  constructor({
    option,
    Vue,
    VueRouter,
    render
  }) {
    const {
      routes,
      name,
      component,
      store,
      local = false,
      log = true
    } = option;
    this.$log = log;
    this.$name = name;
    this.$routes = routes;
    this.$component = component ? component : () => import('./index-096c4393.js');
    this.$activeRule = `${name.split('-')[0]}`;
    this.$local = local ? '/' : `${name}`;
    this.$store = store;
    this.$VueRouter = VueRouter;
    this.$Vue = Vue;
    this.$render = render;
  }

  render(props = {}) {
    const {
      container
    } = props;
    const routeOption = registerRouteConfig(this.$routes, {
      mode: 'hash',
      component: this.$component,
      activeRule: this.$activeRule,
      local: this.$local
    });
    this.$router = new this.$VueRouter(routeOption);
    this.$instance = new this.$Vue({
      router: this.$router,
      store: this.$store || null,
      render: h => h(this.$render)
    }).$mount(container ? container.querySelector('#app') : '#app');
  }

  bootstrap() {
    return Promise.resolve();
  }

  mount(props) {
    this.render(props);
  }

  unmount() {
    this.$instance.$destroy();
    this.$instance.$el.innerHTML = '';
    this.$instance = null;
    this.$router = null;
  }

  update(props) {
    return Promise.resolve(props);
  }

  start() {
    if (this.$log) {
      console.log(`[start ${this.$name} app] is primary app :`, window.__POWERED_BY_QIANKUN__);
    }

    if (window.__POWERED_BY_QIANKUN__) {
      __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
    }

    if (!window.__POWERED_BY_QIANKUN__) {
      this.render();
    }
  }

}

const QKRegisterApp = option => new UseApp(option);
const QKRegisterMicroApp = option => new UseMicroApp(option);

export { QKRegisterApp, QKRegisterMicroApp, QK as default };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9yZWdlbmVyYXRvci1ydW50aW1lL3J1bnRpbWUuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvcmVnZW5lcmF0b3IvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vYXJyYXlMaWtlVG9BcnJheS5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9hcnJheVdpdGhvdXRIb2xlcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9pdGVyYWJsZVRvQXJyYXkuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vbm9uSXRlcmFibGVTcHJlYWQuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vdG9Db25zdW1hYmxlQXJyYXkuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vdHlwZW9mLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIi4uL25vZGVfbW9kdWxlcy9zaW5nbGUtc3BhL2xpYi9lc20vc2luZ2xlLXNwYS5taW4uanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vYXJyYXlXaXRoSG9sZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vaXRlcmFibGVUb0FycmF5TGltaXQuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vbm9uSXRlcmFibGVSZXN0LmpzIiwiLi4vbm9kZV9tb2R1bGVzL0BiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3NsaWNlZFRvQXJyYXkuanMiLCIuLi9ub2RlX21vZHVsZXMvaW1wb3J0LWh0bWwtZW50cnkvZXNtL3V0aWxzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2ltcG9ydC1odG1sLWVudHJ5L2VzbS9wcm9jZXNzLXRwbC5qcyIsIi4uL25vZGVfbW9kdWxlcy9pbXBvcnQtaHRtbC1lbnRyeS9lc20vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9hZGRvbnMvcnVudGltZVB1YmxpY1BhdGguanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9hZGRvbnMvZW5naW5lRmxhZy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL2FkZG9ucy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jbGFzc0NhbGxDaGVjay5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9zZXRQcm90b3R5cGVPZi5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9pbmhlcml0cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9nZXRQcm90b3R5cGVPZi5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vYXNzZXJ0VGhpc0luaXRpYWxpemVkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL0BiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4uanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vY3JlYXRlU3VwZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vaXNOYXRpdmVGdW5jdGlvbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jb25zdHJ1Y3QuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vd3JhcE5hdGl2ZVN1cGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvZXJyb3IuanMiLCIuLi9ub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vZGVmaW5lUHJvcGVydHkuanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9nbG9iYWxTdGF0ZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jcmVhdGVDbGFzcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL2ludGVyZmFjZXMuanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy92ZXJzaW9uLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvdXRpbHMuanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L2NvbW1vbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL3NhbmRib3gvbGVnYWN5L3NhbmRib3guanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L3BhdGNoZXJzL2Nzcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL3NhbmRib3gvcGF0Y2hlcnMvZHluYW1pY0FwcGVuZC9jb21tb24uanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L3BhdGNoZXJzL2R5bmFtaWNBcHBlbmQvZm9yTG9vc2VTYW5kYm94LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvc2FuZGJveC9wYXRjaGVycy9keW5hbWljQXBwZW5kL2ZvclN0cmljdFNhbmRib3guanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L3BhdGNoZXJzL2hpc3RvcnlMaXN0ZW5lci5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL3NhbmRib3gvcGF0Y2hlcnMvaW50ZXJ2YWwuanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L3BhdGNoZXJzL3dpbmRvd0xpc3RlbmVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvc2FuZGJveC9wYXRjaGVycy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL3NhbmRib3gvcHJveHlTYW5kYm94LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvc2FuZGJveC9zbmFwc2hvdFNhbmRib3guanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9zYW5kYm94L2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvbG9hZGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvcHJlZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvcWlhbmt1bi9lcy9hcGlzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvZXJyb3JIYW5kbGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FpYW5rdW4vZXMvZWZmZWN0cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xaWFua3VuL2VzL2luZGV4LmpzIiwiLi4vc3JjL21haW4vcmVnaXN0ZXJNaWNyb0FwcHMudHMiLCIuLi9zcmMvbWFpbi9pbmRleC50cyIsIi4uL3NyYy9hcHBzL3JlZ2lzdGVyUm91dGVDb25maWcudHMiLCIuLi9zcmMvYXBwcy9pbmRleC50cyIsIi4uL3NyYy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLlxuICovXG5cbnZhciBydW50aW1lID0gKGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBPcCA9IE9iamVjdC5wcm90b3R5cGU7XG4gIHZhciBoYXNPd24gPSBPcC5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIHVuZGVmaW5lZDsgLy8gTW9yZSBjb21wcmVzc2libGUgdGhhbiB2b2lkIDAuXG4gIHZhciAkU3ltYm9sID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiID8gU3ltYm9sIDoge307XG4gIHZhciBpdGVyYXRvclN5bWJvbCA9ICRTeW1ib2wuaXRlcmF0b3IgfHwgXCJAQGl0ZXJhdG9yXCI7XG4gIHZhciBhc3luY0l0ZXJhdG9yU3ltYm9sID0gJFN5bWJvbC5hc3luY0l0ZXJhdG9yIHx8IFwiQEBhc3luY0l0ZXJhdG9yXCI7XG4gIHZhciB0b1N0cmluZ1RhZ1N5bWJvbCA9ICRTeW1ib2wudG9TdHJpbmdUYWcgfHwgXCJAQHRvU3RyaW5nVGFnXCI7XG5cbiAgZnVuY3Rpb24gZGVmaW5lKG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgcmV0dXJuIG9ialtrZXldO1xuICB9XG4gIHRyeSB7XG4gICAgLy8gSUUgOCBoYXMgYSBicm9rZW4gT2JqZWN0LmRlZmluZVByb3BlcnR5IHRoYXQgb25seSB3b3JrcyBvbiBET00gb2JqZWN0cy5cbiAgICBkZWZpbmUoe30sIFwiXCIpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBkZWZpbmUgPSBmdW5jdGlvbihvYmosIGtleSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiBvYmpba2V5XSA9IHZhbHVlO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxvY3NMaXN0KSB7XG4gICAgLy8gSWYgb3V0ZXJGbiBwcm92aWRlZCBhbmQgb3V0ZXJGbi5wcm90b3R5cGUgaXMgYSBHZW5lcmF0b3IsIHRoZW4gb3V0ZXJGbi5wcm90b3R5cGUgaW5zdGFuY2VvZiBHZW5lcmF0b3IuXG4gICAgdmFyIHByb3RvR2VuZXJhdG9yID0gb3V0ZXJGbiAmJiBvdXRlckZuLnByb3RvdHlwZSBpbnN0YW5jZW9mIEdlbmVyYXRvciA/IG91dGVyRm4gOiBHZW5lcmF0b3I7XG4gICAgdmFyIGdlbmVyYXRvciA9IE9iamVjdC5jcmVhdGUocHJvdG9HZW5lcmF0b3IucHJvdG90eXBlKTtcbiAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHRyeUxvY3NMaXN0IHx8IFtdKTtcblxuICAgIC8vIFRoZSAuX2ludm9rZSBtZXRob2QgdW5pZmllcyB0aGUgaW1wbGVtZW50YXRpb25zIG9mIHRoZSAubmV4dCxcbiAgICAvLyAudGhyb3csIGFuZCAucmV0dXJuIG1ldGhvZHMuXG4gICAgZ2VuZXJhdG9yLl9pbnZva2UgPSBtYWtlSW52b2tlTWV0aG9kKGlubmVyRm4sIHNlbGYsIGNvbnRleHQpO1xuXG4gICAgcmV0dXJuIGdlbmVyYXRvcjtcbiAgfVxuICBleHBvcnRzLndyYXAgPSB3cmFwO1xuXG4gIC8vIFRyeS9jYXRjaCBoZWxwZXIgdG8gbWluaW1pemUgZGVvcHRpbWl6YXRpb25zLiBSZXR1cm5zIGEgY29tcGxldGlvblxuICAvLyByZWNvcmQgbGlrZSBjb250ZXh0LnRyeUVudHJpZXNbaV0uY29tcGxldGlvbi4gVGhpcyBpbnRlcmZhY2UgY291bGRcbiAgLy8gaGF2ZSBiZWVuIChhbmQgd2FzIHByZXZpb3VzbHkpIGRlc2lnbmVkIHRvIHRha2UgYSBjbG9zdXJlIHRvIGJlXG4gIC8vIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMsIGJ1dCBpbiBhbGwgdGhlIGNhc2VzIHdlIGNhcmUgYWJvdXQgd2VcbiAgLy8gYWxyZWFkeSBoYXZlIGFuIGV4aXN0aW5nIG1ldGhvZCB3ZSB3YW50IHRvIGNhbGwsIHNvIHRoZXJlJ3Mgbm8gbmVlZFxuICAvLyB0byBjcmVhdGUgYSBuZXcgZnVuY3Rpb24gb2JqZWN0LiBXZSBjYW4gZXZlbiBnZXQgYXdheSB3aXRoIGFzc3VtaW5nXG4gIC8vIHRoZSBtZXRob2QgdGFrZXMgZXhhY3RseSBvbmUgYXJndW1lbnQsIHNpbmNlIHRoYXQgaGFwcGVucyB0byBiZSB0cnVlXG4gIC8vIGluIGV2ZXJ5IGNhc2UsIHNvIHdlIGRvbid0IGhhdmUgdG8gdG91Y2ggdGhlIGFyZ3VtZW50cyBvYmplY3QuIFRoZVxuICAvLyBvbmx5IGFkZGl0aW9uYWwgYWxsb2NhdGlvbiByZXF1aXJlZCBpcyB0aGUgY29tcGxldGlvbiByZWNvcmQsIHdoaWNoXG4gIC8vIGhhcyBhIHN0YWJsZSBzaGFwZSBhbmQgc28gaG9wZWZ1bGx5IHNob3VsZCBiZSBjaGVhcCB0byBhbGxvY2F0ZS5cbiAgZnVuY3Rpb24gdHJ5Q2F0Y2goZm4sIG9iaiwgYXJnKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB7IHR5cGU6IFwibm9ybWFsXCIsIGFyZzogZm4uY2FsbChvYmosIGFyZykgfTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6IFwidGhyb3dcIiwgYXJnOiBlcnIgfTtcbiAgICB9XG4gIH1cblxuICB2YXIgR2VuU3RhdGVTdXNwZW5kZWRTdGFydCA9IFwic3VzcGVuZGVkU3RhcnRcIjtcbiAgdmFyIEdlblN0YXRlU3VzcGVuZGVkWWllbGQgPSBcInN1c3BlbmRlZFlpZWxkXCI7XG4gIHZhciBHZW5TdGF0ZUV4ZWN1dGluZyA9IFwiZXhlY3V0aW5nXCI7XG4gIHZhciBHZW5TdGF0ZUNvbXBsZXRlZCA9IFwiY29tcGxldGVkXCI7XG5cbiAgLy8gUmV0dXJuaW5nIHRoaXMgb2JqZWN0IGZyb20gdGhlIGlubmVyRm4gaGFzIHRoZSBzYW1lIGVmZmVjdCBhc1xuICAvLyBicmVha2luZyBvdXQgb2YgdGhlIGRpc3BhdGNoIHN3aXRjaCBzdGF0ZW1lbnQuXG4gIHZhciBDb250aW51ZVNlbnRpbmVsID0ge307XG5cbiAgLy8gRHVtbXkgY29uc3RydWN0b3IgZnVuY3Rpb25zIHRoYXQgd2UgdXNlIGFzIHRoZSAuY29uc3RydWN0b3IgYW5kXG4gIC8vIC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgcHJvcGVydGllcyBmb3IgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIEdlbmVyYXRvclxuICAvLyBvYmplY3RzLiBGb3IgZnVsbCBzcGVjIGNvbXBsaWFuY2UsIHlvdSBtYXkgd2lzaCB0byBjb25maWd1cmUgeW91clxuICAvLyBtaW5pZmllciBub3QgdG8gbWFuZ2xlIHRoZSBuYW1lcyBvZiB0aGVzZSB0d28gZnVuY3Rpb25zLlxuICBmdW5jdGlvbiBHZW5lcmF0b3IoKSB7fVxuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvbigpIHt9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlKCkge31cblxuICAvLyBUaGlzIGlzIGEgcG9seWZpbGwgZm9yICVJdGVyYXRvclByb3RvdHlwZSUgZm9yIGVudmlyb25tZW50cyB0aGF0XG4gIC8vIGRvbid0IG5hdGl2ZWx5IHN1cHBvcnQgaXQuXG4gIHZhciBJdGVyYXRvclByb3RvdHlwZSA9IHt9O1xuICBkZWZpbmUoSXRlcmF0b3JQcm90b3R5cGUsIGl0ZXJhdG9yU3ltYm9sLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbiAgdmFyIE5hdGl2ZUl0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG8gJiYgZ2V0UHJvdG8oZ2V0UHJvdG8odmFsdWVzKFtdKSkpO1xuICBpZiAoTmF0aXZlSXRlcmF0b3JQcm90b3R5cGUgJiZcbiAgICAgIE5hdGl2ZUl0ZXJhdG9yUHJvdG90eXBlICE9PSBPcCAmJlxuICAgICAgaGFzT3duLmNhbGwoTmF0aXZlSXRlcmF0b3JQcm90b3R5cGUsIGl0ZXJhdG9yU3ltYm9sKSkge1xuICAgIC8vIFRoaXMgZW52aXJvbm1lbnQgaGFzIGEgbmF0aXZlICVJdGVyYXRvclByb3RvdHlwZSU7IHVzZSBpdCBpbnN0ZWFkXG4gICAgLy8gb2YgdGhlIHBvbHlmaWxsLlxuICAgIEl0ZXJhdG9yUHJvdG90eXBlID0gTmF0aXZlSXRlcmF0b3JQcm90b3R5cGU7XG4gIH1cblxuICB2YXIgR3AgPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUgPVxuICAgIEdlbmVyYXRvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEl0ZXJhdG9yUHJvdG90eXBlKTtcbiAgR2VuZXJhdG9yRnVuY3Rpb24ucHJvdG90eXBlID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gIGRlZmluZShHcCwgXCJjb25zdHJ1Y3RvclwiLCBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSk7XG4gIGRlZmluZShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSwgXCJjb25zdHJ1Y3RvclwiLCBHZW5lcmF0b3JGdW5jdGlvbik7XG4gIEdlbmVyYXRvckZ1bmN0aW9uLmRpc3BsYXlOYW1lID0gZGVmaW5lKFxuICAgIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLFxuICAgIHRvU3RyaW5nVGFnU3ltYm9sLFxuICAgIFwiR2VuZXJhdG9yRnVuY3Rpb25cIlxuICApO1xuXG4gIC8vIEhlbHBlciBmb3IgZGVmaW5pbmcgdGhlIC5uZXh0LCAudGhyb3csIGFuZCAucmV0dXJuIG1ldGhvZHMgb2YgdGhlXG4gIC8vIEl0ZXJhdG9yIGludGVyZmFjZSBpbiB0ZXJtcyBvZiBhIHNpbmdsZSAuX2ludm9rZSBtZXRob2QuXG4gIGZ1bmN0aW9uIGRlZmluZUl0ZXJhdG9yTWV0aG9kcyhwcm90b3R5cGUpIHtcbiAgICBbXCJuZXh0XCIsIFwidGhyb3dcIiwgXCJyZXR1cm5cIl0uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgIGRlZmluZShwcm90b3R5cGUsIG1ldGhvZCwgZnVuY3Rpb24oYXJnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZva2UobWV0aG9kLCBhcmcpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBleHBvcnRzLmlzR2VuZXJhdG9yRnVuY3Rpb24gPSBmdW5jdGlvbihnZW5GdW4pIHtcbiAgICB2YXIgY3RvciA9IHR5cGVvZiBnZW5GdW4gPT09IFwiZnVuY3Rpb25cIiAmJiBnZW5GdW4uY29uc3RydWN0b3I7XG4gICAgcmV0dXJuIGN0b3JcbiAgICAgID8gY3RvciA9PT0gR2VuZXJhdG9yRnVuY3Rpb24gfHxcbiAgICAgICAgLy8gRm9yIHRoZSBuYXRpdmUgR2VuZXJhdG9yRnVuY3Rpb24gY29uc3RydWN0b3IsIHRoZSBiZXN0IHdlIGNhblxuICAgICAgICAvLyBkbyBpcyB0byBjaGVjayBpdHMgLm5hbWUgcHJvcGVydHkuXG4gICAgICAgIChjdG9yLmRpc3BsYXlOYW1lIHx8IGN0b3IubmFtZSkgPT09IFwiR2VuZXJhdG9yRnVuY3Rpb25cIlxuICAgICAgOiBmYWxzZTtcbiAgfTtcblxuICBleHBvcnRzLm1hcmsgPSBmdW5jdGlvbihnZW5GdW4pIHtcbiAgICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoZ2VuRnVuLCBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdlbkZ1bi5fX3Byb3RvX18gPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgICAgIGRlZmluZShnZW5GdW4sIHRvU3RyaW5nVGFnU3ltYm9sLCBcIkdlbmVyYXRvckZ1bmN0aW9uXCIpO1xuICAgIH1cbiAgICBnZW5GdW4ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShHcCk7XG4gICAgcmV0dXJuIGdlbkZ1bjtcbiAgfTtcblxuICAvLyBXaXRoaW4gdGhlIGJvZHkgb2YgYW55IGFzeW5jIGZ1bmN0aW9uLCBgYXdhaXQgeGAgaXMgdHJhbnNmb3JtZWQgdG9cbiAgLy8gYHlpZWxkIHJlZ2VuZXJhdG9yUnVudGltZS5hd3JhcCh4KWAsIHNvIHRoYXQgdGhlIHJ1bnRpbWUgY2FuIHRlc3RcbiAgLy8gYGhhc093bi5jYWxsKHZhbHVlLCBcIl9fYXdhaXRcIilgIHRvIGRldGVybWluZSBpZiB0aGUgeWllbGRlZCB2YWx1ZSBpc1xuICAvLyBtZWFudCB0byBiZSBhd2FpdGVkLlxuICBleHBvcnRzLmF3cmFwID0gZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIHsgX19hd2FpdDogYXJnIH07XG4gIH07XG5cbiAgZnVuY3Rpb24gQXN5bmNJdGVyYXRvcihnZW5lcmF0b3IsIFByb21pc2VJbXBsKSB7XG4gICAgZnVuY3Rpb24gaW52b2tlKG1ldGhvZCwgYXJnLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZWNvcmQgPSB0cnlDYXRjaChnZW5lcmF0b3JbbWV0aG9kXSwgZ2VuZXJhdG9yLCBhcmcpO1xuICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgcmVqZWN0KHJlY29yZC5hcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29yZC5hcmc7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlICYmXG4gICAgICAgICAgICB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgICAgIGhhc093bi5jYWxsKHZhbHVlLCBcIl9fYXdhaXRcIikpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZUltcGwucmVzb2x2ZSh2YWx1ZS5fX2F3YWl0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpbnZva2UoXCJuZXh0XCIsIHZhbHVlLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgaW52b2tlKFwidGhyb3dcIiwgZXJyLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2VJbXBsLnJlc29sdmUodmFsdWUpLnRoZW4oZnVuY3Rpb24odW53cmFwcGVkKSB7XG4gICAgICAgICAgLy8gV2hlbiBhIHlpZWxkZWQgUHJvbWlzZSBpcyByZXNvbHZlZCwgaXRzIGZpbmFsIHZhbHVlIGJlY29tZXNcbiAgICAgICAgICAvLyB0aGUgLnZhbHVlIG9mIHRoZSBQcm9taXNlPHt2YWx1ZSxkb25lfT4gcmVzdWx0IGZvciB0aGVcbiAgICAgICAgICAvLyBjdXJyZW50IGl0ZXJhdGlvbi5cbiAgICAgICAgICByZXN1bHQudmFsdWUgPSB1bndyYXBwZWQ7XG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgIC8vIElmIGEgcmVqZWN0ZWQgUHJvbWlzZSB3YXMgeWllbGRlZCwgdGhyb3cgdGhlIHJlamVjdGlvbiBiYWNrXG4gICAgICAgICAgLy8gaW50byB0aGUgYXN5bmMgZ2VuZXJhdG9yIGZ1bmN0aW9uIHNvIGl0IGNhbiBiZSBoYW5kbGVkIHRoZXJlLlxuICAgICAgICAgIHJldHVybiBpbnZva2UoXCJ0aHJvd1wiLCBlcnJvciwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHByZXZpb3VzUHJvbWlzZTtcblxuICAgIGZ1bmN0aW9uIGVucXVldWUobWV0aG9kLCBhcmcpIHtcbiAgICAgIGZ1bmN0aW9uIGNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2VJbXBsKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIGludm9rZShtZXRob2QsIGFyZywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcmV2aW91c1Byb21pc2UgPVxuICAgICAgICAvLyBJZiBlbnF1ZXVlIGhhcyBiZWVuIGNhbGxlZCBiZWZvcmUsIHRoZW4gd2Ugd2FudCB0byB3YWl0IHVudGlsXG4gICAgICAgIC8vIGFsbCBwcmV2aW91cyBQcm9taXNlcyBoYXZlIGJlZW4gcmVzb2x2ZWQgYmVmb3JlIGNhbGxpbmcgaW52b2tlLFxuICAgICAgICAvLyBzbyB0aGF0IHJlc3VsdHMgYXJlIGFsd2F5cyBkZWxpdmVyZWQgaW4gdGhlIGNvcnJlY3Qgb3JkZXIuIElmXG4gICAgICAgIC8vIGVucXVldWUgaGFzIG5vdCBiZWVuIGNhbGxlZCBiZWZvcmUsIHRoZW4gaXQgaXMgaW1wb3J0YW50IHRvXG4gICAgICAgIC8vIGNhbGwgaW52b2tlIGltbWVkaWF0ZWx5LCB3aXRob3V0IHdhaXRpbmcgb24gYSBjYWxsYmFjayB0byBmaXJlLFxuICAgICAgICAvLyBzbyB0aGF0IHRoZSBhc3luYyBnZW5lcmF0b3IgZnVuY3Rpb24gaGFzIHRoZSBvcHBvcnR1bml0eSB0byBkb1xuICAgICAgICAvLyBhbnkgbmVjZXNzYXJ5IHNldHVwIGluIGEgcHJlZGljdGFibGUgd2F5LiBUaGlzIHByZWRpY3RhYmlsaXR5XG4gICAgICAgIC8vIGlzIHdoeSB0aGUgUHJvbWlzZSBjb25zdHJ1Y3RvciBzeW5jaHJvbm91c2x5IGludm9rZXMgaXRzXG4gICAgICAgIC8vIGV4ZWN1dG9yIGNhbGxiYWNrLCBhbmQgd2h5IGFzeW5jIGZ1bmN0aW9ucyBzeW5jaHJvbm91c2x5XG4gICAgICAgIC8vIGV4ZWN1dGUgY29kZSBiZWZvcmUgdGhlIGZpcnN0IGF3YWl0LiBTaW5jZSB3ZSBpbXBsZW1lbnQgc2ltcGxlXG4gICAgICAgIC8vIGFzeW5jIGZ1bmN0aW9ucyBpbiB0ZXJtcyBvZiBhc3luYyBnZW5lcmF0b3JzLCBpdCBpcyBlc3BlY2lhbGx5XG4gICAgICAgIC8vIGltcG9ydGFudCB0byBnZXQgdGhpcyByaWdodCwgZXZlbiB0aG91Z2ggaXQgcmVxdWlyZXMgY2FyZS5cbiAgICAgICAgcHJldmlvdXNQcm9taXNlID8gcHJldmlvdXNQcm9taXNlLnRoZW4oXG4gICAgICAgICAgY2FsbEludm9rZVdpdGhNZXRob2RBbmRBcmcsXG4gICAgICAgICAgLy8gQXZvaWQgcHJvcGFnYXRpbmcgZmFpbHVyZXMgdG8gUHJvbWlzZXMgcmV0dXJuZWQgYnkgbGF0ZXJcbiAgICAgICAgICAvLyBpbnZvY2F0aW9ucyBvZiB0aGUgaXRlcmF0b3IuXG4gICAgICAgICAgY2FsbEludm9rZVdpdGhNZXRob2RBbmRBcmdcbiAgICAgICAgKSA6IGNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnKCk7XG4gICAgfVxuXG4gICAgLy8gRGVmaW5lIHRoZSB1bmlmaWVkIGhlbHBlciBtZXRob2QgdGhhdCBpcyB1c2VkIHRvIGltcGxlbWVudCAubmV4dCxcbiAgICAvLyAudGhyb3csIGFuZCAucmV0dXJuIChzZWUgZGVmaW5lSXRlcmF0b3JNZXRob2RzKS5cbiAgICB0aGlzLl9pbnZva2UgPSBlbnF1ZXVlO1xuICB9XG5cbiAgZGVmaW5lSXRlcmF0b3JNZXRob2RzKEFzeW5jSXRlcmF0b3IucHJvdG90eXBlKTtcbiAgZGVmaW5lKEFzeW5jSXRlcmF0b3IucHJvdG90eXBlLCBhc3luY0l0ZXJhdG9yU3ltYm9sLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuICBleHBvcnRzLkFzeW5jSXRlcmF0b3IgPSBBc3luY0l0ZXJhdG9yO1xuXG4gIC8vIE5vdGUgdGhhdCBzaW1wbGUgYXN5bmMgZnVuY3Rpb25zIGFyZSBpbXBsZW1lbnRlZCBvbiB0b3Agb2ZcbiAgLy8gQXN5bmNJdGVyYXRvciBvYmplY3RzOyB0aGV5IGp1c3QgcmV0dXJuIGEgUHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9mXG4gIC8vIHRoZSBmaW5hbCByZXN1bHQgcHJvZHVjZWQgYnkgdGhlIGl0ZXJhdG9yLlxuICBleHBvcnRzLmFzeW5jID0gZnVuY3Rpb24oaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TG9jc0xpc3QsIFByb21pc2VJbXBsKSB7XG4gICAgaWYgKFByb21pc2VJbXBsID09PSB2b2lkIDApIFByb21pc2VJbXBsID0gUHJvbWlzZTtcblxuICAgIHZhciBpdGVyID0gbmV3IEFzeW5jSXRlcmF0b3IoXG4gICAgICB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxvY3NMaXN0KSxcbiAgICAgIFByb21pc2VJbXBsXG4gICAgKTtcblxuICAgIHJldHVybiBleHBvcnRzLmlzR2VuZXJhdG9yRnVuY3Rpb24ob3V0ZXJGbilcbiAgICAgID8gaXRlciAvLyBJZiBvdXRlckZuIGlzIGEgZ2VuZXJhdG9yLCByZXR1cm4gdGhlIGZ1bGwgaXRlcmF0b3IuXG4gICAgICA6IGl0ZXIubmV4dCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC5kb25lID8gcmVzdWx0LnZhbHVlIDogaXRlci5uZXh0KCk7XG4gICAgICAgIH0pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG1ha2VJbnZva2VNZXRob2QoaW5uZXJGbiwgc2VsZiwgY29udGV4dCkge1xuICAgIHZhciBzdGF0ZSA9IEdlblN0YXRlU3VzcGVuZGVkU3RhcnQ7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gaW52b2tlKG1ldGhvZCwgYXJnKSB7XG4gICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlRXhlY3V0aW5nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IHJ1bm5pbmdcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVDb21wbGV0ZWQpIHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgdGhyb3cgYXJnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQmUgZm9yZ2l2aW5nLCBwZXIgMjUuMy4zLjMuMyBvZiB0aGUgc3BlYzpcbiAgICAgICAgLy8gaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWdlbmVyYXRvcnJlc3VtZVxuICAgICAgICByZXR1cm4gZG9uZVJlc3VsdCgpO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0Lm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgIGNvbnRleHQuYXJnID0gYXJnO1xuXG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB2YXIgZGVsZWdhdGUgPSBjb250ZXh0LmRlbGVnYXRlO1xuICAgICAgICBpZiAoZGVsZWdhdGUpIHtcbiAgICAgICAgICB2YXIgZGVsZWdhdGVSZXN1bHQgPSBtYXliZUludm9rZURlbGVnYXRlKGRlbGVnYXRlLCBjb250ZXh0KTtcbiAgICAgICAgICBpZiAoZGVsZWdhdGVSZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChkZWxlZ2F0ZVJlc3VsdCA9PT0gQ29udGludWVTZW50aW5lbCkgY29udGludWU7XG4gICAgICAgICAgICByZXR1cm4gZGVsZWdhdGVSZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRleHQubWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAgIC8vIFNldHRpbmcgY29udGV4dC5fc2VudCBmb3IgbGVnYWN5IHN1cHBvcnQgb2YgQmFiZWwnc1xuICAgICAgICAgIC8vIGZ1bmN0aW9uLnNlbnQgaW1wbGVtZW50YXRpb24uXG4gICAgICAgICAgY29udGV4dC5zZW50ID0gY29udGV4dC5fc2VudCA9IGNvbnRleHQuYXJnO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoY29udGV4dC5tZXRob2QgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydCkge1xuICAgICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUNvbXBsZXRlZDtcbiAgICAgICAgICAgIHRocm93IGNvbnRleHQuYXJnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnRleHQuZGlzcGF0Y2hFeGNlcHRpb24oY29udGV4dC5hcmcpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoY29udGV4dC5tZXRob2QgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgICAgICBjb250ZXh0LmFicnVwdChcInJldHVyblwiLCBjb250ZXh0LmFyZyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZSA9IEdlblN0YXRlRXhlY3V0aW5nO1xuXG4gICAgICAgIHZhciByZWNvcmQgPSB0cnlDYXRjaChpbm5lckZuLCBzZWxmLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgLy8gSWYgYW4gZXhjZXB0aW9uIGlzIHRocm93biBmcm9tIGlubmVyRm4sIHdlIGxlYXZlIHN0YXRlID09PVxuICAgICAgICAgIC8vIEdlblN0YXRlRXhlY3V0aW5nIGFuZCBsb29wIGJhY2sgZm9yIGFub3RoZXIgaW52b2NhdGlvbi5cbiAgICAgICAgICBzdGF0ZSA9IGNvbnRleHQuZG9uZVxuICAgICAgICAgICAgPyBHZW5TdGF0ZUNvbXBsZXRlZFxuICAgICAgICAgICAgOiBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkO1xuXG4gICAgICAgICAgaWYgKHJlY29yZC5hcmcgPT09IENvbnRpbnVlU2VudGluZWwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogcmVjb3JkLmFyZyxcbiAgICAgICAgICAgIGRvbmU6IGNvbnRleHQuZG9uZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUNvbXBsZXRlZDtcbiAgICAgICAgICAvLyBEaXNwYXRjaCB0aGUgZXhjZXB0aW9uIGJ5IGxvb3BpbmcgYmFjayBhcm91bmQgdG8gdGhlXG4gICAgICAgICAgLy8gY29udGV4dC5kaXNwYXRjaEV4Y2VwdGlvbihjb250ZXh0LmFyZykgY2FsbCBhYm92ZS5cbiAgICAgICAgICBjb250ZXh0Lm1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgICBjb250ZXh0LmFyZyA9IHJlY29yZC5hcmc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gQ2FsbCBkZWxlZ2F0ZS5pdGVyYXRvcltjb250ZXh0Lm1ldGhvZF0oY29udGV4dC5hcmcpIGFuZCBoYW5kbGUgdGhlXG4gIC8vIHJlc3VsdCwgZWl0aGVyIGJ5IHJldHVybmluZyBhIHsgdmFsdWUsIGRvbmUgfSByZXN1bHQgZnJvbSB0aGVcbiAgLy8gZGVsZWdhdGUgaXRlcmF0b3IsIG9yIGJ5IG1vZGlmeWluZyBjb250ZXh0Lm1ldGhvZCBhbmQgY29udGV4dC5hcmcsXG4gIC8vIHNldHRpbmcgY29udGV4dC5kZWxlZ2F0ZSB0byBudWxsLCBhbmQgcmV0dXJuaW5nIHRoZSBDb250aW51ZVNlbnRpbmVsLlxuICBmdW5jdGlvbiBtYXliZUludm9rZURlbGVnYXRlKGRlbGVnYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIG1ldGhvZCA9IGRlbGVnYXRlLml0ZXJhdG9yW2NvbnRleHQubWV0aG9kXTtcbiAgICBpZiAobWV0aG9kID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIEEgLnRocm93IG9yIC5yZXR1cm4gd2hlbiB0aGUgZGVsZWdhdGUgaXRlcmF0b3IgaGFzIG5vIC50aHJvd1xuICAgICAgLy8gbWV0aG9kIGFsd2F5cyB0ZXJtaW5hdGVzIHRoZSB5aWVsZCogbG9vcC5cbiAgICAgIGNvbnRleHQuZGVsZWdhdGUgPSBudWxsO1xuXG4gICAgICBpZiAoY29udGV4dC5tZXRob2QgPT09IFwidGhyb3dcIikge1xuICAgICAgICAvLyBOb3RlOiBbXCJyZXR1cm5cIl0gbXVzdCBiZSB1c2VkIGZvciBFUzMgcGFyc2luZyBjb21wYXRpYmlsaXR5LlxuICAgICAgICBpZiAoZGVsZWdhdGUuaXRlcmF0b3JbXCJyZXR1cm5cIl0pIHtcbiAgICAgICAgICAvLyBJZiB0aGUgZGVsZWdhdGUgaXRlcmF0b3IgaGFzIGEgcmV0dXJuIG1ldGhvZCwgZ2l2ZSBpdCBhXG4gICAgICAgICAgLy8gY2hhbmNlIHRvIGNsZWFuIHVwLlxuICAgICAgICAgIGNvbnRleHQubWV0aG9kID0gXCJyZXR1cm5cIjtcbiAgICAgICAgICBjb250ZXh0LmFyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBtYXliZUludm9rZURlbGVnYXRlKGRlbGVnYXRlLCBjb250ZXh0KTtcblxuICAgICAgICAgIGlmIChjb250ZXh0Lm1ldGhvZCA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgICAvLyBJZiBtYXliZUludm9rZURlbGVnYXRlKGNvbnRleHQpIGNoYW5nZWQgY29udGV4dC5tZXRob2QgZnJvbVxuICAgICAgICAgICAgLy8gXCJyZXR1cm5cIiB0byBcInRocm93XCIsIGxldCB0aGF0IG92ZXJyaWRlIHRoZSBUeXBlRXJyb3IgYmVsb3cuXG4gICAgICAgICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0Lm1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgY29udGV4dC5hcmcgPSBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIFwiVGhlIGl0ZXJhdG9yIGRvZXMgbm90IHByb3ZpZGUgYSAndGhyb3cnIG1ldGhvZFwiKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gICAgfVxuXG4gICAgdmFyIHJlY29yZCA9IHRyeUNhdGNoKG1ldGhvZCwgZGVsZWdhdGUuaXRlcmF0b3IsIGNvbnRleHQuYXJnKTtcblxuICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICBjb250ZXh0Lm1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgIGNvbnRleHQuYXJnID0gcmVjb3JkLmFyZztcbiAgICAgIGNvbnRleHQuZGVsZWdhdGUgPSBudWxsO1xuICAgICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gICAgfVxuXG4gICAgdmFyIGluZm8gPSByZWNvcmQuYXJnO1xuXG4gICAgaWYgKCEgaW5mbykge1xuICAgICAgY29udGV4dC5tZXRob2QgPSBcInRocm93XCI7XG4gICAgICBjb250ZXh0LmFyZyA9IG5ldyBUeXBlRXJyb3IoXCJpdGVyYXRvciByZXN1bHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgIGNvbnRleHQuZGVsZWdhdGUgPSBudWxsO1xuICAgICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gICAgfVxuXG4gICAgaWYgKGluZm8uZG9uZSkge1xuICAgICAgLy8gQXNzaWduIHRoZSByZXN1bHQgb2YgdGhlIGZpbmlzaGVkIGRlbGVnYXRlIHRvIHRoZSB0ZW1wb3JhcnlcbiAgICAgIC8vIHZhcmlhYmxlIHNwZWNpZmllZCBieSBkZWxlZ2F0ZS5yZXN1bHROYW1lIChzZWUgZGVsZWdhdGVZaWVsZCkuXG4gICAgICBjb250ZXh0W2RlbGVnYXRlLnJlc3VsdE5hbWVdID0gaW5mby52YWx1ZTtcblxuICAgICAgLy8gUmVzdW1lIGV4ZWN1dGlvbiBhdCB0aGUgZGVzaXJlZCBsb2NhdGlvbiAoc2VlIGRlbGVnYXRlWWllbGQpLlxuICAgICAgY29udGV4dC5uZXh0ID0gZGVsZWdhdGUubmV4dExvYztcblxuICAgICAgLy8gSWYgY29udGV4dC5tZXRob2Qgd2FzIFwidGhyb3dcIiBidXQgdGhlIGRlbGVnYXRlIGhhbmRsZWQgdGhlXG4gICAgICAvLyBleGNlcHRpb24sIGxldCB0aGUgb3V0ZXIgZ2VuZXJhdG9yIHByb2NlZWQgbm9ybWFsbHkuIElmXG4gICAgICAvLyBjb250ZXh0Lm1ldGhvZCB3YXMgXCJuZXh0XCIsIGZvcmdldCBjb250ZXh0LmFyZyBzaW5jZSBpdCBoYXMgYmVlblxuICAgICAgLy8gXCJjb25zdW1lZFwiIGJ5IHRoZSBkZWxlZ2F0ZSBpdGVyYXRvci4gSWYgY29udGV4dC5tZXRob2Qgd2FzXG4gICAgICAvLyBcInJldHVyblwiLCBhbGxvdyB0aGUgb3JpZ2luYWwgLnJldHVybiBjYWxsIHRvIGNvbnRpbnVlIGluIHRoZVxuICAgICAgLy8gb3V0ZXIgZ2VuZXJhdG9yLlxuICAgICAgaWYgKGNvbnRleHQubWV0aG9kICE9PSBcInJldHVyblwiKSB7XG4gICAgICAgIGNvbnRleHQubWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgIGNvbnRleHQuYXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJlLXlpZWxkIHRoZSByZXN1bHQgcmV0dXJuZWQgYnkgdGhlIGRlbGVnYXRlIG1ldGhvZC5cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIFRoZSBkZWxlZ2F0ZSBpdGVyYXRvciBpcyBmaW5pc2hlZCwgc28gZm9yZ2V0IGl0IGFuZCBjb250aW51ZSB3aXRoXG4gICAgLy8gdGhlIG91dGVyIGdlbmVyYXRvci5cbiAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcbiAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgfVxuXG4gIC8vIERlZmluZSBHZW5lcmF0b3IucHJvdG90eXBlLntuZXh0LHRocm93LHJldHVybn0gaW4gdGVybXMgb2YgdGhlXG4gIC8vIHVuaWZpZWQgLl9pbnZva2UgaGVscGVyIG1ldGhvZC5cbiAgZGVmaW5lSXRlcmF0b3JNZXRob2RzKEdwKTtcblxuICBkZWZpbmUoR3AsIHRvU3RyaW5nVGFnU3ltYm9sLCBcIkdlbmVyYXRvclwiKTtcblxuICAvLyBBIEdlbmVyYXRvciBzaG91bGQgYWx3YXlzIHJldHVybiBpdHNlbGYgYXMgdGhlIGl0ZXJhdG9yIG9iamVjdCB3aGVuIHRoZVxuICAvLyBAQGl0ZXJhdG9yIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbiBpdC4gU29tZSBicm93c2VycycgaW1wbGVtZW50YXRpb25zIG9mIHRoZVxuICAvLyBpdGVyYXRvciBwcm90b3R5cGUgY2hhaW4gaW5jb3JyZWN0bHkgaW1wbGVtZW50IHRoaXMsIGNhdXNpbmcgdGhlIEdlbmVyYXRvclxuICAvLyBvYmplY3QgdG8gbm90IGJlIHJldHVybmVkIGZyb20gdGhpcyBjYWxsLiBUaGlzIGVuc3VyZXMgdGhhdCBkb2Vzbid0IGhhcHBlbi5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWdlbmVyYXRvci9pc3N1ZXMvMjc0IGZvciBtb3JlIGRldGFpbHMuXG4gIGRlZmluZShHcCwgaXRlcmF0b3JTeW1ib2wsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9KTtcblxuICBkZWZpbmUoR3AsIFwidG9TdHJpbmdcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBHZW5lcmF0b3JdXCI7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHB1c2hUcnlFbnRyeShsb2NzKSB7XG4gICAgdmFyIGVudHJ5ID0geyB0cnlMb2M6IGxvY3NbMF0gfTtcblxuICAgIGlmICgxIGluIGxvY3MpIHtcbiAgICAgIGVudHJ5LmNhdGNoTG9jID0gbG9jc1sxXTtcbiAgICB9XG5cbiAgICBpZiAoMiBpbiBsb2NzKSB7XG4gICAgICBlbnRyeS5maW5hbGx5TG9jID0gbG9jc1syXTtcbiAgICAgIGVudHJ5LmFmdGVyTG9jID0gbG9jc1szXTtcbiAgICB9XG5cbiAgICB0aGlzLnRyeUVudHJpZXMucHVzaChlbnRyeSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNldFRyeUVudHJ5KGVudHJ5KSB7XG4gICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb24gfHwge307XG4gICAgcmVjb3JkLnR5cGUgPSBcIm5vcm1hbFwiO1xuICAgIGRlbGV0ZSByZWNvcmQuYXJnO1xuICAgIGVudHJ5LmNvbXBsZXRpb24gPSByZWNvcmQ7XG4gIH1cblxuICBmdW5jdGlvbiBDb250ZXh0KHRyeUxvY3NMaXN0KSB7XG4gICAgLy8gVGhlIHJvb3QgZW50cnkgb2JqZWN0IChlZmZlY3RpdmVseSBhIHRyeSBzdGF0ZW1lbnQgd2l0aG91dCBhIGNhdGNoXG4gICAgLy8gb3IgYSBmaW5hbGx5IGJsb2NrKSBnaXZlcyB1cyBhIHBsYWNlIHRvIHN0b3JlIHZhbHVlcyB0aHJvd24gZnJvbVxuICAgIC8vIGxvY2F0aW9ucyB3aGVyZSB0aGVyZSBpcyBubyBlbmNsb3NpbmcgdHJ5IHN0YXRlbWVudC5cbiAgICB0aGlzLnRyeUVudHJpZXMgPSBbeyB0cnlMb2M6IFwicm9vdFwiIH1dO1xuICAgIHRyeUxvY3NMaXN0LmZvckVhY2gocHVzaFRyeUVudHJ5LCB0aGlzKTtcbiAgICB0aGlzLnJlc2V0KHRydWUpO1xuICB9XG5cbiAgZXhwb3J0cy5rZXlzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICB9XG4gICAga2V5cy5yZXZlcnNlKCk7XG5cbiAgICAvLyBSYXRoZXIgdGhhbiByZXR1cm5pbmcgYW4gb2JqZWN0IHdpdGggYSBuZXh0IG1ldGhvZCwgd2Uga2VlcFxuICAgIC8vIHRoaW5ncyBzaW1wbGUgYW5kIHJldHVybiB0aGUgbmV4dCBmdW5jdGlvbiBpdHNlbGYuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICB3aGlsZSAoa2V5cy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXMucG9wKCk7XG4gICAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgbmV4dC52YWx1ZSA9IGtleTtcbiAgICAgICAgICBuZXh0LmRvbmUgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBUbyBhdm9pZCBjcmVhdGluZyBhbiBhZGRpdGlvbmFsIG9iamVjdCwgd2UganVzdCBoYW5nIHRoZSAudmFsdWVcbiAgICAgIC8vIGFuZCAuZG9uZSBwcm9wZXJ0aWVzIG9mZiB0aGUgbmV4dCBmdW5jdGlvbiBvYmplY3QgaXRzZWxmLiBUaGlzXG4gICAgICAvLyBhbHNvIGVuc3VyZXMgdGhhdCB0aGUgbWluaWZpZXIgd2lsbCBub3QgYW5vbnltaXplIHRoZSBmdW5jdGlvbi5cbiAgICAgIG5leHQuZG9uZSA9IHRydWU7XG4gICAgICByZXR1cm4gbmV4dDtcbiAgICB9O1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcyhpdGVyYWJsZSkge1xuICAgIGlmIChpdGVyYWJsZSkge1xuICAgICAgdmFyIGl0ZXJhdG9yTWV0aG9kID0gaXRlcmFibGVbaXRlcmF0b3JTeW1ib2xdO1xuICAgICAgaWYgKGl0ZXJhdG9yTWV0aG9kKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvck1ldGhvZC5jYWxsKGl0ZXJhYmxlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBpdGVyYWJsZS5uZXh0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhYmxlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzTmFOKGl0ZXJhYmxlLmxlbmd0aCkpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbmV4dCA9IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IGl0ZXJhYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKGl0ZXJhYmxlLCBpKSkge1xuICAgICAgICAgICAgICBuZXh0LnZhbHVlID0gaXRlcmFibGVbaV07XG4gICAgICAgICAgICAgIG5leHQuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuZXh0LnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIG5leHQuZG9uZSA9IHRydWU7XG5cbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbmV4dC5uZXh0ID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYW4gaXRlcmF0b3Igd2l0aCBubyB2YWx1ZXMuXG4gICAgcmV0dXJuIHsgbmV4dDogZG9uZVJlc3VsdCB9O1xuICB9XG4gIGV4cG9ydHMudmFsdWVzID0gdmFsdWVzO1xuXG4gIGZ1bmN0aW9uIGRvbmVSZXN1bHQoKSB7XG4gICAgcmV0dXJuIHsgdmFsdWU6IHVuZGVmaW5lZCwgZG9uZTogdHJ1ZSB9O1xuICB9XG5cbiAgQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IENvbnRleHQsXG5cbiAgICByZXNldDogZnVuY3Rpb24oc2tpcFRlbXBSZXNldCkge1xuICAgICAgdGhpcy5wcmV2ID0gMDtcbiAgICAgIHRoaXMubmV4dCA9IDA7XG4gICAgICAvLyBSZXNldHRpbmcgY29udGV4dC5fc2VudCBmb3IgbGVnYWN5IHN1cHBvcnQgb2YgQmFiZWwnc1xuICAgICAgLy8gZnVuY3Rpb24uc2VudCBpbXBsZW1lbnRhdGlvbi5cbiAgICAgIHRoaXMuc2VudCA9IHRoaXMuX3NlbnQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgIHRoaXMuZGVsZWdhdGUgPSBudWxsO1xuXG4gICAgICB0aGlzLm1ldGhvZCA9IFwibmV4dFwiO1xuICAgICAgdGhpcy5hcmcgPSB1bmRlZmluZWQ7XG5cbiAgICAgIHRoaXMudHJ5RW50cmllcy5mb3JFYWNoKHJlc2V0VHJ5RW50cnkpO1xuXG4gICAgICBpZiAoIXNraXBUZW1wUmVzZXQpIHtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzKSB7XG4gICAgICAgICAgLy8gTm90IHN1cmUgYWJvdXQgdGhlIG9wdGltYWwgb3JkZXIgb2YgdGhlc2UgY29uZGl0aW9uczpcbiAgICAgICAgICBpZiAobmFtZS5jaGFyQXQoMCkgPT09IFwidFwiICYmXG4gICAgICAgICAgICAgIGhhc093bi5jYWxsKHRoaXMsIG5hbWUpICYmXG4gICAgICAgICAgICAgICFpc05hTigrbmFtZS5zbGljZSgxKSkpIHtcbiAgICAgICAgICAgIHRoaXNbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgICAgdmFyIHJvb3RFbnRyeSA9IHRoaXMudHJ5RW50cmllc1swXTtcbiAgICAgIHZhciByb290UmVjb3JkID0gcm9vdEVudHJ5LmNvbXBsZXRpb247XG4gICAgICBpZiAocm9vdFJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgdGhyb3cgcm9vdFJlY29yZC5hcmc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnJ2YWw7XG4gICAgfSxcblxuICAgIGRpc3BhdGNoRXhjZXB0aW9uOiBmdW5jdGlvbihleGNlcHRpb24pIHtcbiAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgICBmdW5jdGlvbiBoYW5kbGUobG9jLCBjYXVnaHQpIHtcbiAgICAgICAgcmVjb3JkLnR5cGUgPSBcInRocm93XCI7XG4gICAgICAgIHJlY29yZC5hcmcgPSBleGNlcHRpb247XG4gICAgICAgIGNvbnRleHQubmV4dCA9IGxvYztcblxuICAgICAgICBpZiAoY2F1Z2h0KSB7XG4gICAgICAgICAgLy8gSWYgdGhlIGRpc3BhdGNoZWQgZXhjZXB0aW9uIHdhcyBjYXVnaHQgYnkgYSBjYXRjaCBibG9jayxcbiAgICAgICAgICAvLyB0aGVuIGxldCB0aGF0IGNhdGNoIGJsb2NrIGhhbmRsZSB0aGUgZXhjZXB0aW9uIG5vcm1hbGx5LlxuICAgICAgICAgIGNvbnRleHQubWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgICAgY29udGV4dC5hcmcgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gISEgY2F1Z2h0O1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb247XG5cbiAgICAgICAgaWYgKGVudHJ5LnRyeUxvYyA9PT0gXCJyb290XCIpIHtcbiAgICAgICAgICAvLyBFeGNlcHRpb24gdGhyb3duIG91dHNpZGUgb2YgYW55IHRyeSBibG9jayB0aGF0IGNvdWxkIGhhbmRsZVxuICAgICAgICAgIC8vIGl0LCBzbyBzZXQgdGhlIGNvbXBsZXRpb24gdmFsdWUgb2YgdGhlIGVudGlyZSBmdW5jdGlvbiB0b1xuICAgICAgICAgIC8vIHRocm93IHRoZSBleGNlcHRpb24uXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZShcImVuZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2KSB7XG4gICAgICAgICAgdmFyIGhhc0NhdGNoID0gaGFzT3duLmNhbGwoZW50cnksIFwiY2F0Y2hMb2NcIik7XG4gICAgICAgICAgdmFyIGhhc0ZpbmFsbHkgPSBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpO1xuXG4gICAgICAgICAgaWYgKGhhc0NhdGNoICYmIGhhc0ZpbmFsbHkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5jYXRjaExvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmNhdGNoTG9jLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChoYXNDYXRjaCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmNhdGNoTG9jKSB7XG4gICAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuY2F0Y2hMb2MsIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChoYXNGaW5hbGx5KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRyeSBzdGF0ZW1lbnQgd2l0aG91dCBjYXRjaCBvciBmaW5hbGx5XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBhYnJ1cHQ6IGZ1bmN0aW9uKHR5cGUsIGFyZykge1xuICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2ICYmXG4gICAgICAgICAgICBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpICYmXG4gICAgICAgICAgICB0aGlzLnByZXYgPCBlbnRyeS5maW5hbGx5TG9jKSB7XG4gICAgICAgICAgdmFyIGZpbmFsbHlFbnRyeSA9IGVudHJ5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChmaW5hbGx5RW50cnkgJiZcbiAgICAgICAgICAodHlwZSA9PT0gXCJicmVha1wiIHx8XG4gICAgICAgICAgIHR5cGUgPT09IFwiY29udGludWVcIikgJiZcbiAgICAgICAgICBmaW5hbGx5RW50cnkudHJ5TG9jIDw9IGFyZyAmJlxuICAgICAgICAgIGFyZyA8PSBmaW5hbGx5RW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAvLyBJZ25vcmUgdGhlIGZpbmFsbHkgZW50cnkgaWYgY29udHJvbCBpcyBub3QganVtcGluZyB0byBhXG4gICAgICAgIC8vIGxvY2F0aW9uIG91dHNpZGUgdGhlIHRyeS9jYXRjaCBibG9jay5cbiAgICAgICAgZmluYWxseUVudHJ5ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlY29yZCA9IGZpbmFsbHlFbnRyeSA/IGZpbmFsbHlFbnRyeS5jb21wbGV0aW9uIDoge307XG4gICAgICByZWNvcmQudHlwZSA9IHR5cGU7XG4gICAgICByZWNvcmQuYXJnID0gYXJnO1xuXG4gICAgICBpZiAoZmluYWxseUVudHJ5KSB7XG4gICAgICAgIHRoaXMubWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgIHRoaXMubmV4dCA9IGZpbmFsbHlFbnRyeS5maW5hbGx5TG9jO1xuICAgICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGUocmVjb3JkKTtcbiAgICB9LFxuXG4gICAgY29tcGxldGU6IGZ1bmN0aW9uKHJlY29yZCwgYWZ0ZXJMb2MpIHtcbiAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgIHRocm93IHJlY29yZC5hcmc7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJicmVha1wiIHx8XG4gICAgICAgICAgcmVjb3JkLnR5cGUgPT09IFwiY29udGludWVcIikge1xuICAgICAgICB0aGlzLm5leHQgPSByZWNvcmQuYXJnO1xuICAgICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gXCJyZXR1cm5cIikge1xuICAgICAgICB0aGlzLnJ2YWwgPSB0aGlzLmFyZyA9IHJlY29yZC5hcmc7XG4gICAgICAgIHRoaXMubWV0aG9kID0gXCJyZXR1cm5cIjtcbiAgICAgICAgdGhpcy5uZXh0ID0gXCJlbmRcIjtcbiAgICAgIH0gZWxzZSBpZiAocmVjb3JkLnR5cGUgPT09IFwibm9ybWFsXCIgJiYgYWZ0ZXJMb2MpIHtcbiAgICAgICAgdGhpcy5uZXh0ID0gYWZ0ZXJMb2M7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICAgIH0sXG5cbiAgICBmaW5pc2g6IGZ1bmN0aW9uKGZpbmFsbHlMb2MpIHtcbiAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgICBpZiAoZW50cnkuZmluYWxseUxvYyA9PT0gZmluYWxseUxvYykge1xuICAgICAgICAgIHRoaXMuY29tcGxldGUoZW50cnkuY29tcGxldGlvbiwgZW50cnkuYWZ0ZXJMb2MpO1xuICAgICAgICAgIHJlc2V0VHJ5RW50cnkoZW50cnkpO1xuICAgICAgICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIFwiY2F0Y2hcIjogZnVuY3Rpb24odHJ5TG9jKSB7XG4gICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgICAgaWYgKGVudHJ5LnRyeUxvYyA9PT0gdHJ5TG9jKSB7XG4gICAgICAgICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb247XG4gICAgICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICAgIHZhciB0aHJvd24gPSByZWNvcmQuYXJnO1xuICAgICAgICAgICAgcmVzZXRUcnlFbnRyeShlbnRyeSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0aHJvd247XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGNvbnRleHQuY2F0Y2ggbWV0aG9kIG11c3Qgb25seSBiZSBjYWxsZWQgd2l0aCBhIGxvY2F0aW9uXG4gICAgICAvLyBhcmd1bWVudCB0aGF0IGNvcnJlc3BvbmRzIHRvIGEga25vd24gY2F0Y2ggYmxvY2suXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbGxlZ2FsIGNhdGNoIGF0dGVtcHRcIik7XG4gICAgfSxcblxuICAgIGRlbGVnYXRlWWllbGQ6IGZ1bmN0aW9uKGl0ZXJhYmxlLCByZXN1bHROYW1lLCBuZXh0TG9jKSB7XG4gICAgICB0aGlzLmRlbGVnYXRlID0ge1xuICAgICAgICBpdGVyYXRvcjogdmFsdWVzKGl0ZXJhYmxlKSxcbiAgICAgICAgcmVzdWx0TmFtZTogcmVzdWx0TmFtZSxcbiAgICAgICAgbmV4dExvYzogbmV4dExvY1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXMubWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAvLyBEZWxpYmVyYXRlbHkgZm9yZ2V0IHRoZSBsYXN0IHNlbnQgdmFsdWUgc28gdGhhdCB3ZSBkb24ndFxuICAgICAgICAvLyBhY2NpZGVudGFsbHkgcGFzcyBpdCBvbiB0byB0aGUgZGVsZWdhdGUuXG4gICAgICAgIHRoaXMuYXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICB9XG4gIH07XG5cbiAgLy8gUmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoaXMgc2NyaXB0IGlzIGV4ZWN1dGluZyBhcyBhIENvbW1vbkpTIG1vZHVsZVxuICAvLyBvciBub3QsIHJldHVybiB0aGUgcnVudGltZSBvYmplY3Qgc28gdGhhdCB3ZSBjYW4gZGVjbGFyZSB0aGUgdmFyaWFibGVcbiAgLy8gcmVnZW5lcmF0b3JSdW50aW1lIGluIHRoZSBvdXRlciBzY29wZSwgd2hpY2ggYWxsb3dzIHRoaXMgbW9kdWxlIHRvIGJlXG4gIC8vIGluamVjdGVkIGVhc2lseSBieSBgYmluL3JlZ2VuZXJhdG9yIC0taW5jbHVkZS1ydW50aW1lIHNjcmlwdC5qc2AuXG4gIHJldHVybiBleHBvcnRzO1xuXG59KFxuICAvLyBJZiB0aGlzIHNjcmlwdCBpcyBleGVjdXRpbmcgYXMgYSBDb21tb25KUyBtb2R1bGUsIHVzZSBtb2R1bGUuZXhwb3J0c1xuICAvLyBhcyB0aGUgcmVnZW5lcmF0b3JSdW50aW1lIG5hbWVzcGFjZS4gT3RoZXJ3aXNlIGNyZWF0ZSBhIG5ldyBlbXB0eVxuICAvLyBvYmplY3QuIEVpdGhlciB3YXksIHRoZSByZXN1bHRpbmcgb2JqZWN0IHdpbGwgYmUgdXNlZCB0byBpbml0aWFsaXplXG4gIC8vIHRoZSByZWdlbmVyYXRvclJ1bnRpbWUgdmFyaWFibGUgYXQgdGhlIHRvcCBvZiB0aGlzIGZpbGUuXG4gIHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgPyBtb2R1bGUuZXhwb3J0cyA6IHt9XG4pKTtcblxudHJ5IHtcbiAgcmVnZW5lcmF0b3JSdW50aW1lID0gcnVudGltZTtcbn0gY2F0Y2ggKGFjY2lkZW50YWxTdHJpY3RNb2RlKSB7XG4gIC8vIFRoaXMgbW9kdWxlIHNob3VsZCBub3QgYmUgcnVubmluZyBpbiBzdHJpY3QgbW9kZSwgc28gdGhlIGFib3ZlXG4gIC8vIGFzc2lnbm1lbnQgc2hvdWxkIGFsd2F5cyB3b3JrIHVubGVzcyBzb21ldGhpbmcgaXMgbWlzY29uZmlndXJlZC4gSnVzdFxuICAvLyBpbiBjYXNlIHJ1bnRpbWUuanMgYWNjaWRlbnRhbGx5IHJ1bnMgaW4gc3RyaWN0IG1vZGUsIGluIG1vZGVybiBlbmdpbmVzXG4gIC8vIHdlIGNhbiBleHBsaWNpdGx5IGFjY2VzcyBnbG9iYWxUaGlzLiBJbiBvbGRlciBlbmdpbmVzIHdlIGNhbiBlc2NhcGVcbiAgLy8gc3RyaWN0IG1vZGUgdXNpbmcgYSBnbG9iYWwgRnVuY3Rpb24gY2FsbC4gVGhpcyBjb3VsZCBjb25jZWl2YWJseSBmYWlsXG4gIC8vIGlmIGEgQ29udGVudCBTZWN1cml0eSBQb2xpY3kgZm9yYmlkcyB1c2luZyBGdW5jdGlvbiwgYnV0IGluIHRoYXQgY2FzZVxuICAvLyB0aGUgcHJvcGVyIHNvbHV0aW9uIGlzIHRvIGZpeCB0aGUgYWNjaWRlbnRhbCBzdHJpY3QgbW9kZSBwcm9ibGVtLiBJZlxuICAvLyB5b3UndmUgbWlzY29uZmlndXJlZCB5b3VyIGJ1bmRsZXIgdG8gZm9yY2Ugc3RyaWN0IG1vZGUgYW5kIGFwcGxpZWQgYVxuICAvLyBDU1AgdG8gZm9yYmlkIEZ1bmN0aW9uLCBhbmQgeW91J3JlIG5vdCB3aWxsaW5nIHRvIGZpeCBlaXRoZXIgb2YgdGhvc2VcbiAgLy8gcHJvYmxlbXMsIHBsZWFzZSBkZXRhaWwgeW91ciB1bmlxdWUgcHJlZGljYW1lbnQgaW4gYSBHaXRIdWIgaXNzdWUuXG4gIGlmICh0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gXCJvYmplY3RcIikge1xuICAgIGdsb2JhbFRoaXMucmVnZW5lcmF0b3JSdW50aW1lID0gcnVudGltZTtcbiAgfSBlbHNlIHtcbiAgICBGdW5jdGlvbihcInJcIiwgXCJyZWdlbmVyYXRvclJ1bnRpbWUgPSByXCIpKHJ1bnRpbWUpO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJyZWdlbmVyYXRvci1ydW50aW1lXCIpO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gX2FycmF5TGlrZVRvQXJyYXkoYXJyLCBsZW4pIHtcbiAgaWYgKGxlbiA9PSBudWxsIHx8IGxlbiA+IGFyci5sZW5ndGgpIGxlbiA9IGFyci5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBuZXcgQXJyYXkobGVuKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgYXJyMltpXSA9IGFycltpXTtcbiAgfVxuXG4gIHJldHVybiBhcnIyO1xufSIsImltcG9ydCBhcnJheUxpa2VUb0FycmF5IGZyb20gXCIuL2FycmF5TGlrZVRvQXJyYXkuanNcIjtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9hcnJheVdpdGhvdXRIb2xlcyhhcnIpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgcmV0dXJuIGFycmF5TGlrZVRvQXJyYXkoYXJyKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfaXRlcmFibGVUb0FycmF5KGl0ZXIpIHtcbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09IFwidW5kZWZpbmVkXCIgJiYgaXRlcltTeW1ib2wuaXRlcmF0b3JdICE9IG51bGwgfHwgaXRlcltcIkBAaXRlcmF0b3JcIl0gIT0gbnVsbCkgcmV0dXJuIEFycmF5LmZyb20oaXRlcik7XG59IiwiaW1wb3J0IGFycmF5TGlrZVRvQXJyYXkgZnJvbSBcIi4vYXJyYXlMaWtlVG9BcnJheS5qc1wiO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gX3Vuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KG8sIG1pbkxlbikge1xuICBpZiAoIW8pIHJldHVybjtcbiAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSByZXR1cm4gYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pO1xuICB2YXIgbiA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LCAtMSk7XG4gIGlmIChuID09PSBcIk9iamVjdFwiICYmIG8uY29uc3RydWN0b3IpIG4gPSBvLmNvbnN0cnVjdG9yLm5hbWU7XG4gIGlmIChuID09PSBcIk1hcFwiIHx8IG4gPT09IFwiU2V0XCIpIHJldHVybiBBcnJheS5mcm9tKG8pO1xuICBpZiAobiA9PT0gXCJBcmd1bWVudHNcIiB8fCAvXig/OlVpfEkpbnQoPzo4fDE2fDMyKSg/OkNsYW1wZWQpP0FycmF5JC8udGVzdChuKSkgcmV0dXJuIGFycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfbm9uSXRlcmFibGVTcHJlYWQoKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gc3ByZWFkIG5vbi1pdGVyYWJsZSBpbnN0YW5jZS5cXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuXCIpO1xufSIsImltcG9ydCBhcnJheVdpdGhvdXRIb2xlcyBmcm9tIFwiLi9hcnJheVdpdGhvdXRIb2xlcy5qc1wiO1xuaW1wb3J0IGl0ZXJhYmxlVG9BcnJheSBmcm9tIFwiLi9pdGVyYWJsZVRvQXJyYXkuanNcIjtcbmltcG9ydCB1bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheSBmcm9tIFwiLi91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheS5qc1wiO1xuaW1wb3J0IG5vbkl0ZXJhYmxlU3ByZWFkIGZyb20gXCIuL25vbkl0ZXJhYmxlU3ByZWFkLmpzXCI7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7XG4gIHJldHVybiBhcnJheVdpdGhvdXRIb2xlcyhhcnIpIHx8IGl0ZXJhYmxlVG9BcnJheShhcnIpIHx8IHVuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KGFycikgfHwgbm9uSXRlcmFibGVTcHJlYWQoKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfdHlwZW9mKG9iaikge1xuICBcIkBiYWJlbC9oZWxwZXJzIC0gdHlwZW9mXCI7XG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7XG4gICAgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iajtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBfdHlwZW9mKG9iaik7XG59IiwiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XHJcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xyXG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY3JlYXRlQmluZGluZyhvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBleHBvcnRzKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSByZXN1bHRba10gPSBtb2Rba107XHJcbiAgICByZXN1bHQuZGVmYXVsdCA9IG1vZDtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiLyogc2luZ2xlLXNwYUA1LjkuMyAtIEVTTSAtIHByb2QgKi9cbnZhciB0PU9iamVjdC5mcmVlemUoe19fcHJvdG9fXzpudWxsLGdldCBzdGFydCgpe3JldHVybiB4dH0sZ2V0IGVuc3VyZUpRdWVyeVN1cHBvcnQoKXtyZXR1cm4gZnR9LGdldCBzZXRCb290c3RyYXBNYXhUaW1lKCl7cmV0dXJuIEZ9LGdldCBzZXRNb3VudE1heFRpbWUoKXtyZXR1cm4gSn0sZ2V0IHNldFVubW91bnRNYXhUaW1lKCl7cmV0dXJuIEh9LGdldCBzZXRVbmxvYWRNYXhUaW1lKCl7cmV0dXJuIFF9LGdldCByZWdpc3RlckFwcGxpY2F0aW9uKCl7cmV0dXJuIE90fSxnZXQgdW5yZWdpc3RlckFwcGxpY2F0aW9uKCl7cmV0dXJuIFR0fSxnZXQgZ2V0TW91bnRlZEFwcHMoKXtyZXR1cm4gRXR9LGdldCBnZXRBcHBTdGF0dXMoKXtyZXR1cm4gUHR9LGdldCB1bmxvYWRBcHBsaWNhdGlvbigpe3JldHVybiBBdH0sZ2V0IGNoZWNrQWN0aXZpdHlGdW5jdGlvbnMoKXtyZXR1cm4gYnR9LGdldCBnZXRBcHBOYW1lcygpe3JldHVybiB5dH0sZ2V0IHBhdGhUb0FjdGl2ZVdoZW4oKXtyZXR1cm4gX3R9LGdldCBuYXZpZ2F0ZVRvVXJsKCl7cmV0dXJuIG50fSxnZXQgdHJpZ2dlckFwcENoYW5nZSgpe3JldHVybiBNdH0sZ2V0IGFkZEVycm9ySGFuZGxlcigpe3JldHVybiBhfSxnZXQgcmVtb3ZlRXJyb3JIYW5kbGVyKCl7cmV0dXJuIGN9LGdldCBtb3VudFJvb3RQYXJjZWwoKXtyZXR1cm4gQ30sZ2V0IE5PVF9MT0FERUQoKXtyZXR1cm4gbH0sZ2V0IExPQURJTkdfU09VUkNFX0NPREUoKXtyZXR1cm4gcH0sZ2V0IE5PVF9CT09UU1RSQVBQRUQoKXtyZXR1cm4gaH0sZ2V0IEJPT1RTVFJBUFBJTkcoKXtyZXR1cm4gbX0sZ2V0IE5PVF9NT1VOVEVEKCl7cmV0dXJuIHZ9LGdldCBNT1VOVElORygpe3JldHVybiBkfSxnZXQgVVBEQVRJTkcoKXtyZXR1cm4gZ30sZ2V0IExPQURfRVJST1IoKXtyZXR1cm4geX0sZ2V0IE1PVU5URUQoKXtyZXR1cm4gd30sZ2V0IFVOTU9VTlRJTkcoKXtyZXR1cm4gRX0sZ2V0IFNLSVBfQkVDQVVTRV9CUk9LRU4oKXtyZXR1cm4gUH19KTtmdW5jdGlvbiBuKHQpe3JldHVybihuPVwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmXCJzeW1ib2xcIj09dHlwZW9mIFN5bWJvbC5pdGVyYXRvcj9mdW5jdGlvbih0KXtyZXR1cm4gdHlwZW9mIHR9OmZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJnQuY29uc3RydWN0b3I9PT1TeW1ib2wmJnQhPT1TeW1ib2wucHJvdG90eXBlP1wic3ltYm9sXCI6dHlwZW9mIHR9KSh0KX1mdW5jdGlvbiBlKHQsbixlKXtyZXR1cm4gbiBpbiB0P09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LG4se3ZhbHVlOmUsZW51bWVyYWJsZTohMCxjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITB9KTp0W25dPWUsdH12YXIgcj0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbFRoaXM/Z2xvYmFsVGhpczpcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P3dpbmRvdzpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2dsb2JhbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZj9zZWxmOnt9KS5DdXN0b21FdmVudCxvPWZ1bmN0aW9uKCl7dHJ5e3ZhciB0PW5ldyByKFwiY2F0XCIse2RldGFpbDp7Zm9vOlwiYmFyXCJ9fSk7cmV0dXJuXCJjYXRcIj09PXQudHlwZSYmXCJiYXJcIj09PXQuZGV0YWlsLmZvb31jYXRjaCh0KXt9cmV0dXJuITF9KCk/cjpcInVuZGVmaW5lZFwiIT10eXBlb2YgZG9jdW1lbnQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50P2Z1bmN0aW9uKHQsbil7dmFyIGU9ZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtyZXR1cm4gbj9lLmluaXRDdXN0b21FdmVudCh0LG4uYnViYmxlcyxuLmNhbmNlbGFibGUsbi5kZXRhaWwpOmUuaW5pdEN1c3RvbUV2ZW50KHQsITEsITEsdm9pZCAwKSxlfTpmdW5jdGlvbih0LG4pe3ZhciBlPWRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7cmV0dXJuIGUudHlwZT10LG4/KGUuYnViYmxlcz1Cb29sZWFuKG4uYnViYmxlcyksZS5jYW5jZWxhYmxlPUJvb2xlYW4obi5jYW5jZWxhYmxlKSxlLmRldGFpbD1uLmRldGFpbCk6KGUuYnViYmxlcz0hMSxlLmNhbmNlbGFibGU9ITEsZS5kZXRhaWw9dm9pZCAwKSxlfSxpPVtdO2Z1bmN0aW9uIHUodCxuLGUpe3ZhciByPWYodCxuLGUpO2kubGVuZ3RoP2kuZm9yRWFjaCgoZnVuY3Rpb24odCl7cmV0dXJuIHQocil9KSk6c2V0VGltZW91dCgoZnVuY3Rpb24oKXt0aHJvdyByfSkpfWZ1bmN0aW9uIGEodCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBFcnJvcihzKDI4LCExKSk7aS5wdXNoKHQpfWZ1bmN0aW9uIGModCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBFcnJvcihzKDI5LCExKSk7dmFyIG49ITE7cmV0dXJuIGk9aS5maWx0ZXIoKGZ1bmN0aW9uKGUpe3ZhciByPWU9PT10O3JldHVybiBuPW58fHIsIXJ9KSksbn1mdW5jdGlvbiBzKHQsbil7Zm9yKHZhciBlPWFyZ3VtZW50cy5sZW5ndGgscj1uZXcgQXJyYXkoZT4yP2UtMjowKSxvPTI7bzxlO28rKylyW28tMl09YXJndW1lbnRzW29dO3JldHVyblwic2luZ2xlLXNwYSBtaW5pZmllZCBtZXNzYWdlICNcIi5jb25jYXQodCxcIjogXCIpLmNvbmNhdChuP24rXCIgXCI6XCJcIixcIlNlZSBodHRwczovL3NpbmdsZS1zcGEuanMub3JnL2Vycm9yLz9jb2RlPVwiKS5jb25jYXQodCkuY29uY2F0KHIubGVuZ3RoP1wiJmFyZz1cIi5jb25jYXQoci5qb2luKFwiJmFyZz1cIikpOlwiXCIpfWZ1bmN0aW9uIGYodCxuLGUpe3ZhciByLG89XCJcIi5jb25jYXQoTihuKSxcIiAnXCIpLmNvbmNhdChUKG4pLFwiJyBkaWVkIGluIHN0YXR1cyBcIikuY29uY2F0KG4uc3RhdHVzLFwiOiBcIik7aWYodCBpbnN0YW5jZW9mIEVycm9yKXt0cnl7dC5tZXNzYWdlPW8rdC5tZXNzYWdlfWNhdGNoKHQpe31yPXR9ZWxzZXtjb25zb2xlLndhcm4ocygzMCwhMSxuLnN0YXR1cyxUKG4pKSk7dHJ5e3I9RXJyb3IobytKU09OLnN0cmluZ2lmeSh0KSl9Y2F0Y2gobil7cj10fX1yZXR1cm4gci5hcHBPclBhcmNlbE5hbWU9VChuKSxuLnN0YXR1cz1lLHJ9dmFyIGw9XCJOT1RfTE9BREVEXCIscD1cIkxPQURJTkdfU09VUkNFX0NPREVcIixoPVwiTk9UX0JPT1RTVFJBUFBFRFwiLG09XCJCT09UU1RSQVBQSU5HXCIsdj1cIk5PVF9NT1VOVEVEXCIsZD1cIk1PVU5USU5HXCIsdz1cIk1PVU5URURcIixnPVwiVVBEQVRJTkdcIixFPVwiVU5NT1VOVElOR1wiLHk9XCJMT0FEX0VSUk9SXCIsUD1cIlNLSVBfQkVDQVVTRV9CUk9LRU5cIjtmdW5jdGlvbiBPKHQpe3JldHVybiB0LnN0YXR1cz09PXd9ZnVuY3Rpb24gYih0KXt0cnl7cmV0dXJuIHQuYWN0aXZlV2hlbih3aW5kb3cubG9jYXRpb24pfWNhdGNoKG4pe3JldHVybiB1KG4sdCxQKSwhMX19ZnVuY3Rpb24gVCh0KXtyZXR1cm4gdC5uYW1lfWZ1bmN0aW9uIEEodCl7cmV0dXJuIEJvb2xlYW4odC51bm1vdW50VGhpc1BhcmNlbCl9ZnVuY3Rpb24gTih0KXtyZXR1cm4gQSh0KT9cInBhcmNlbFwiOlwiYXBwbGljYXRpb25cIn1mdW5jdGlvbiBTKCl7Zm9yKHZhciB0PWFyZ3VtZW50cy5sZW5ndGgtMTt0PjA7dC0tKWZvcih2YXIgbiBpbiBhcmd1bWVudHNbdF0pXCJfX3Byb3RvX19cIiE9PW4mJihhcmd1bWVudHNbdC0xXVtuXT1hcmd1bWVudHNbdF1bbl0pO3JldHVybiBhcmd1bWVudHNbMF19ZnVuY3Rpb24gXyh0LG4pe2Zvcih2YXIgZT0wO2U8dC5sZW5ndGg7ZSsrKWlmKG4odFtlXSkpcmV0dXJuIHRbZV07cmV0dXJuIG51bGx9ZnVuY3Rpb24gRCh0KXtyZXR1cm4gdCYmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHR8fChuPXQsQXJyYXkuaXNBcnJheShuKSYmIV8obiwoZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiIT10eXBlb2YgdH0pKSkpO3ZhciBufWZ1bmN0aW9uIFUodCxuKXt2YXIgZT10W25dfHxbXTswPT09KGU9QXJyYXkuaXNBcnJheShlKT9lOltlXSkubGVuZ3RoJiYoZT1bZnVuY3Rpb24oKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCl9XSk7dmFyIHI9Tih0KSxvPVQodCk7cmV0dXJuIGZ1bmN0aW9uKHQpe3JldHVybiBlLnJlZHVjZSgoZnVuY3Rpb24oZSxpLHUpe3JldHVybiBlLnRoZW4oKGZ1bmN0aW9uKCl7dmFyIGU9aSh0KTtyZXR1cm4gaihlKT9lOlByb21pc2UucmVqZWN0KHMoMTUsITEscixvLG4sdSkpfSkpfSksUHJvbWlzZS5yZXNvbHZlKCkpfX1mdW5jdGlvbiBqKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRoZW4mJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQuY2F0Y2h9ZnVuY3Rpb24gTSh0LG4pe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe3JldHVybiB0LnN0YXR1cyE9PWg/dDoodC5zdGF0dXM9bSx0LmJvb3RzdHJhcD9WKHQsXCJib290c3RyYXBcIikudGhlbihlKS5jYXRjaCgoZnVuY3Rpb24oZSl7aWYobil0aHJvdyBmKGUsdCxQKTtyZXR1cm4gdShlLHQsUCksdH0pKTpQcm9taXNlLnJlc29sdmUoKS50aGVuKGUpKX0pKTtmdW5jdGlvbiBlKCl7cmV0dXJuIHQuc3RhdHVzPXYsdH19ZnVuY3Rpb24gTCh0LG4pe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe2lmKHQuc3RhdHVzIT09dylyZXR1cm4gdDt0LnN0YXR1cz1FO3ZhciBlPU9iamVjdC5rZXlzKHQucGFyY2VscykubWFwKChmdW5jdGlvbihuKXtyZXR1cm4gdC5wYXJjZWxzW25dLnVubW91bnRUaGlzUGFyY2VsKCl9KSk7cmV0dXJuIFByb21pc2UuYWxsKGUpLnRoZW4ociwoZnVuY3Rpb24oZSl7cmV0dXJuIHIoKS50aGVuKChmdW5jdGlvbigpe3ZhciByPUVycm9yKGUubWVzc2FnZSk7aWYobil0aHJvdyBmKHIsdCxQKTt1KHIsdCxQKX0pKX0pKS50aGVuKChmdW5jdGlvbigpe3JldHVybiB0fSkpO2Z1bmN0aW9uIHIoKXtyZXR1cm4gVih0LFwidW5tb3VudFwiKS50aGVuKChmdW5jdGlvbigpe3Quc3RhdHVzPXZ9KSkuY2F0Y2goKGZ1bmN0aW9uKGUpe2lmKG4pdGhyb3cgZihlLHQsUCk7dShlLHQsUCl9KSl9fSkpfXZhciBSPSExLEk9ITE7ZnVuY3Rpb24geCh0LG4pe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe3JldHVybiB0LnN0YXR1cyE9PXY/dDooUnx8KHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBvKFwic2luZ2xlLXNwYTpiZWZvcmUtZmlyc3QtbW91bnRcIikpLFI9ITApLFYodCxcIm1vdW50XCIpLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIHQuc3RhdHVzPXcsSXx8KHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBvKFwic2luZ2xlLXNwYTpmaXJzdC1tb3VudFwiKSksST0hMCksdH0pKS5jYXRjaCgoZnVuY3Rpb24oZSl7cmV0dXJuIHQuc3RhdHVzPXcsTCh0LCEwKS50aGVuKHIscik7ZnVuY3Rpb24gcigpe2lmKG4pdGhyb3cgZihlLHQsUCk7cmV0dXJuIHUoZSx0LFApLHR9fSkpKX0pKX12YXIgQj0wLEc9e3BhcmNlbHM6e319O2Z1bmN0aW9uIEMoKXtyZXR1cm4gVy5hcHBseShHLGFyZ3VtZW50cyl9ZnVuY3Rpb24gVyh0LGUpe3ZhciByPXRoaXM7aWYoIXR8fFwib2JqZWN0XCIhPT1uKHQpJiZcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IEVycm9yKHMoMiwhMSkpO2lmKHQubmFtZSYmXCJzdHJpbmdcIiE9dHlwZW9mIHQubmFtZSl0aHJvdyBFcnJvcihzKDMsITEsbih0Lm5hbWUpKSk7aWYoXCJvYmplY3RcIiE9PW4oZSkpdGhyb3cgRXJyb3Iocyg0LCExLG5hbWUsbihlKSkpO2lmKCFlLmRvbUVsZW1lbnQpdGhyb3cgRXJyb3Iocyg1LCExLG5hbWUpKTt2YXIgbyxpPUIrKyx1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHQsYT11P3Q6ZnVuY3Rpb24oKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHQpfSxjPXtpZDppLHBhcmNlbHM6e30sc3RhdHVzOnU/cDpoLGN1c3RvbVByb3BzOmUscGFyZW50TmFtZTpUKHIpLHVubW91bnRUaGlzUGFyY2VsOmZ1bmN0aW9uKCl7cmV0dXJuIHkudGhlbigoZnVuY3Rpb24oKXtpZihjLnN0YXR1cyE9PXcpdGhyb3cgRXJyb3Iocyg2LCExLG5hbWUsYy5zdGF0dXMpKTtyZXR1cm4gTChjLCEwKX0pKS50aGVuKChmdW5jdGlvbih0KXtyZXR1cm4gYy5wYXJlbnROYW1lJiZkZWxldGUgci5wYXJjZWxzW2MuaWRdLHR9KSkudGhlbigoZnVuY3Rpb24odCl7cmV0dXJuIG0odCksdH0pKS5jYXRjaCgoZnVuY3Rpb24odCl7dGhyb3cgYy5zdGF0dXM9UCxkKHQpLHR9KSl9fTtyLnBhcmNlbHNbaV09Yzt2YXIgbD1hKCk7aWYoIWx8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGwudGhlbil0aHJvdyBFcnJvcihzKDcsITEpKTt2YXIgbSxkLEU9KGw9bC50aGVuKChmdW5jdGlvbih0KXtpZighdCl0aHJvdyBFcnJvcihzKDgsITEpKTt2YXIgbj10Lm5hbWV8fFwicGFyY2VsLVwiLmNvbmNhdChpKTtpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodCxcImJvb3RzdHJhcFwiKSYmIUQodC5ib290c3RyYXApKXRocm93IEVycm9yKHMoOSwhMSxuKSk7aWYoIUQodC5tb3VudCkpdGhyb3cgRXJyb3IocygxMCwhMSxuKSk7aWYoIUQodC51bm1vdW50KSl0aHJvdyBFcnJvcihzKDExLCExLG4pKTtpZih0LnVwZGF0ZSYmIUQodC51cGRhdGUpKXRocm93IEVycm9yKHMoMTIsITEsbikpO3ZhciBlPVUodCxcImJvb3RzdHJhcFwiKSxyPVUodCxcIm1vdW50XCIpLHU9VSh0LFwidW5tb3VudFwiKTtjLnN0YXR1cz1oLGMubmFtZT1uLGMuYm9vdHN0cmFwPWUsYy5tb3VudD1yLGMudW5tb3VudD11LGMudGltZW91dHM9cSh0LnRpbWVvdXRzKSx0LnVwZGF0ZSYmKGMudXBkYXRlPVUodCxcInVwZGF0ZVwiKSxvLnVwZGF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gYy5jdXN0b21Qcm9wcz10LCQoZnVuY3Rpb24odCl7cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKGZ1bmN0aW9uKCl7aWYodC5zdGF0dXMhPT13KXRocm93IEVycm9yKHMoMzIsITEsVCh0KSkpO3JldHVybiB0LnN0YXR1cz1nLFYodCxcInVwZGF0ZVwiKS50aGVuKChmdW5jdGlvbigpe3JldHVybiB0LnN0YXR1cz13LHR9KSkuY2F0Y2goKGZ1bmN0aW9uKG4pe3Rocm93IGYobix0LFApfSkpfSkpfShjKSl9KX0pKSkudGhlbigoZnVuY3Rpb24oKXtyZXR1cm4gTShjLCEwKX0pKSx5PUUudGhlbigoZnVuY3Rpb24oKXtyZXR1cm4geChjLCEwKX0pKSxPPW5ldyBQcm9taXNlKChmdW5jdGlvbih0LG4pe209dCxkPW59KSk7cmV0dXJuIG89e21vdW50OmZ1bmN0aW9uKCl7cmV0dXJuICQoUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoZnVuY3Rpb24oKXtpZihjLnN0YXR1cyE9PXYpdGhyb3cgRXJyb3IocygxMywhMSxuYW1lLGMuc3RhdHVzKSk7cmV0dXJuIHIucGFyY2Vsc1tpXT1jLHgoYyl9KSkpfSx1bm1vdW50OmZ1bmN0aW9uKCl7cmV0dXJuICQoYy51bm1vdW50VGhpc1BhcmNlbCgpKX0sZ2V0U3RhdHVzOmZ1bmN0aW9uKCl7cmV0dXJuIGMuc3RhdHVzfSxsb2FkUHJvbWlzZTokKGwpLGJvb3RzdHJhcFByb21pc2U6JChFKSxtb3VudFByb21pc2U6JCh5KSx1bm1vdW50UHJvbWlzZTokKE8pfX1mdW5jdGlvbiAkKHQpe3JldHVybiB0LnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIG51bGx9KSl9ZnVuY3Rpb24gayhlKXt2YXIgcj1UKGUpLG89XCJmdW5jdGlvblwiPT10eXBlb2YgZS5jdXN0b21Qcm9wcz9lLmN1c3RvbVByb3BzKHIsd2luZG93LmxvY2F0aW9uKTplLmN1c3RvbVByb3BzOyhcIm9iamVjdFwiIT09bihvKXx8bnVsbD09PW98fEFycmF5LmlzQXJyYXkobykpJiYobz17fSxjb25zb2xlLndhcm4ocyg0MCwhMSkscixvKSk7dmFyIGk9Uyh7fSxvLHtuYW1lOnIsbW91bnRQYXJjZWw6Vy5iaW5kKGUpLHNpbmdsZVNwYTp0fSk7cmV0dXJuIEEoZSkmJihpLnVubW91bnRTZWxmPWUudW5tb3VudFRoaXNQYXJjZWwpLGl9dmFyIEs9e2Jvb3RzdHJhcDp7bWlsbGlzOjRlMyxkaWVPblRpbWVvdXQ6ITEsd2FybmluZ01pbGxpczoxZTN9LG1vdW50OnttaWxsaXM6M2UzLGRpZU9uVGltZW91dDohMSx3YXJuaW5nTWlsbGlzOjFlM30sdW5tb3VudDp7bWlsbGlzOjNlMyxkaWVPblRpbWVvdXQ6ITEsd2FybmluZ01pbGxpczoxZTN9LHVubG9hZDp7bWlsbGlzOjNlMyxkaWVPblRpbWVvdXQ6ITEsd2FybmluZ01pbGxpczoxZTN9LHVwZGF0ZTp7bWlsbGlzOjNlMyxkaWVPblRpbWVvdXQ6ITEsd2FybmluZ01pbGxpczoxZTN9fTtmdW5jdGlvbiBGKHQsbixlKXtpZihcIm51bWJlclwiIT10eXBlb2YgdHx8dDw9MCl0aHJvdyBFcnJvcihzKDE2LCExKSk7Sy5ib290c3RyYXA9e21pbGxpczp0LGRpZU9uVGltZW91dDpuLHdhcm5pbmdNaWxsaXM6ZXx8MWUzfX1mdW5jdGlvbiBKKHQsbixlKXtpZihcIm51bWJlclwiIT10eXBlb2YgdHx8dDw9MCl0aHJvdyBFcnJvcihzKDE3LCExKSk7Sy5tb3VudD17bWlsbGlzOnQsZGllT25UaW1lb3V0Om4sd2FybmluZ01pbGxpczplfHwxZTN9fWZ1bmN0aW9uIEgodCxuLGUpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiB0fHx0PD0wKXRocm93IEVycm9yKHMoMTgsITEpKTtLLnVubW91bnQ9e21pbGxpczp0LGRpZU9uVGltZW91dDpuLHdhcm5pbmdNaWxsaXM6ZXx8MWUzfX1mdW5jdGlvbiBRKHQsbixlKXtpZihcIm51bWJlclwiIT10eXBlb2YgdHx8dDw9MCl0aHJvdyBFcnJvcihzKDE5LCExKSk7Sy51bmxvYWQ9e21pbGxpczp0LGRpZU9uVGltZW91dDpuLHdhcm5pbmdNaWxsaXM6ZXx8MWUzfX1mdW5jdGlvbiBWKHQsbil7dmFyIGU9dC50aW1lb3V0c1tuXSxyPWUud2FybmluZ01pbGxpcyxvPU4odCk7cmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihpLHUpe3ZhciBhPSExLGM9ITE7dFtuXShrKHQpKS50aGVuKChmdW5jdGlvbih0KXthPSEwLGkodCl9KSkuY2F0Y2goKGZ1bmN0aW9uKHQpe2E9ITAsdSh0KX0pKSxzZXRUaW1lb3V0KChmdW5jdGlvbigpe3JldHVybiBsKDEpfSksciksc2V0VGltZW91dCgoZnVuY3Rpb24oKXtyZXR1cm4gbCghMCl9KSxlLm1pbGxpcyk7dmFyIGY9cygzMSwhMSxuLG8sVCh0KSxlLm1pbGxpcyk7ZnVuY3Rpb24gbCh0KXtpZighYSlpZighMD09PXQpYz0hMCxlLmRpZU9uVGltZW91dD91KEVycm9yKGYpKTpjb25zb2xlLmVycm9yKGYpO2Vsc2UgaWYoIWMpe3ZhciBuPXQsbz1uKnI7Y29uc29sZS53YXJuKGYpLG8rcjxlLm1pbGxpcyYmc2V0VGltZW91dCgoZnVuY3Rpb24oKXtyZXR1cm4gbChuKzEpfSkscil9fX0pKX1mdW5jdGlvbiBxKHQpe3ZhciBuPXt9O2Zvcih2YXIgZSBpbiBLKW5bZV09Uyh7fSxLW2VdLHQmJnRbZV18fHt9KTtyZXR1cm4gbn1mdW5jdGlvbiB6KHQpe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe3JldHVybiB0LmxvYWRQcm9taXNlP3QubG9hZFByb21pc2U6dC5zdGF0dXMhPT1sJiZ0LnN0YXR1cyE9PXk/dDoodC5zdGF0dXM9cCx0LmxvYWRQcm9taXNlPVByb21pc2UucmVzb2x2ZSgpLnRoZW4oKGZ1bmN0aW9uKCl7dmFyIG89dC5sb2FkQXBwKGsodCkpO2lmKCFqKG8pKXRocm93IHI9ITAsRXJyb3IocygzMywhMSxUKHQpKSk7cmV0dXJuIG8udGhlbigoZnVuY3Rpb24ocil7dmFyIG87dC5sb2FkRXJyb3JUaW1lPW51bGwsXCJvYmplY3RcIiE9PW4oZT1yKSYmKG89MzQpLE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChlLFwiYm9vdHN0cmFwXCIpJiYhRChlLmJvb3RzdHJhcCkmJihvPTM1KSxEKGUubW91bnQpfHwobz0zNiksRChlLnVubW91bnQpfHwobz0zNyk7dmFyIGk9TihlKTtpZihvKXt2YXIgYTt0cnl7YT1KU09OLnN0cmluZ2lmeShlKX1jYXRjaCh0KXt9cmV0dXJuIGNvbnNvbGUuZXJyb3IocyhvLCExLGksVCh0KSxhKSxlKSx1KHZvaWQgMCx0LFApLHR9cmV0dXJuIGUuZGV2dG9vbHMmJmUuZGV2dG9vbHMub3ZlcmxheXMmJih0LmRldnRvb2xzLm92ZXJsYXlzPVMoe30sdC5kZXZ0b29scy5vdmVybGF5cyxlLmRldnRvb2xzLm92ZXJsYXlzKSksdC5zdGF0dXM9aCx0LmJvb3RzdHJhcD1VKGUsXCJib290c3RyYXBcIiksdC5tb3VudD1VKGUsXCJtb3VudFwiKSx0LnVubW91bnQ9VShlLFwidW5tb3VudFwiKSx0LnVubG9hZD1VKGUsXCJ1bmxvYWRcIiksdC50aW1lb3V0cz1xKGUudGltZW91dHMpLGRlbGV0ZSB0LmxvYWRQcm9taXNlLHR9KSl9KSkuY2F0Y2goKGZ1bmN0aW9uKG4pe3ZhciBlO3JldHVybiBkZWxldGUgdC5sb2FkUHJvbWlzZSxyP2U9UDooZT15LHQubG9hZEVycm9yVGltZT0obmV3IERhdGUpLmdldFRpbWUoKSksdShuLHQsZSksdH0pKSk7dmFyIGUscn0pKX12YXIgWCxZPVwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3csWj17aGFzaGNoYW5nZTpbXSxwb3BzdGF0ZTpbXX0sdHQ9W1wiaGFzaGNoYW5nZVwiLFwicG9wc3RhdGVcIl07ZnVuY3Rpb24gbnQodCl7dmFyIG47aWYoXCJzdHJpbmdcIj09dHlwZW9mIHQpbj10O2Vsc2UgaWYodGhpcyYmdGhpcy5ocmVmKW49dGhpcy5ocmVmO2Vsc2V7aWYoISh0JiZ0LmN1cnJlbnRUYXJnZXQmJnQuY3VycmVudFRhcmdldC5ocmVmJiZ0LnByZXZlbnREZWZhdWx0KSl0aHJvdyBFcnJvcihzKDE0LCExKSk7bj10LmN1cnJlbnRUYXJnZXQuaHJlZix0LnByZXZlbnREZWZhdWx0KCl9dmFyIGU9Y3Qod2luZG93LmxvY2F0aW9uLmhyZWYpLHI9Y3Qobik7MD09PW4uaW5kZXhPZihcIiNcIik/d2luZG93LmxvY2F0aW9uLmhhc2g9ci5oYXNoOmUuaG9zdCE9PXIuaG9zdCYmci5ob3N0P3dpbmRvdy5sb2NhdGlvbi5ocmVmPW46ci5wYXRobmFtZT09PWUucGF0aG5hbWUmJnIuc2VhcmNoPT09ZS5zZWFyY2g/d2luZG93LmxvY2F0aW9uLmhhc2g9ci5oYXNoOndpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLG51bGwsbil9ZnVuY3Rpb24gZXQodCl7dmFyIG49dGhpcztpZih0KXt2YXIgZT10WzBdLnR5cGU7dHQuaW5kZXhPZihlKT49MCYmWltlXS5mb3JFYWNoKChmdW5jdGlvbihlKXt0cnl7ZS5hcHBseShuLHQpfWNhdGNoKHQpe3NldFRpbWVvdXQoKGZ1bmN0aW9uKCl7dGhyb3cgdH0pKX19KSl9fWZ1bmN0aW9uIHJ0KCl7THQoW10sYXJndW1lbnRzKX1mdW5jdGlvbiBvdCh0LG4pe3JldHVybiBmdW5jdGlvbigpe3ZhciBlPXdpbmRvdy5sb2NhdGlvbi5ocmVmLHI9dC5hcHBseSh0aGlzLGFyZ3VtZW50cyksbz13aW5kb3cubG9jYXRpb24uaHJlZjtyZXR1cm4gWCYmZT09PW98fChCdCgpP3dpbmRvdy5kaXNwYXRjaEV2ZW50KGl0KHdpbmRvdy5oaXN0b3J5LnN0YXRlLG4pKTpMdChbXSkpLHJ9fWZ1bmN0aW9uIGl0KHQsbil7dmFyIGU7dHJ5e2U9bmV3IFBvcFN0YXRlRXZlbnQoXCJwb3BzdGF0ZVwiLHtzdGF0ZTp0fSl9Y2F0Y2gobil7KGU9ZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJQb3BTdGF0ZUV2ZW50XCIpKS5pbml0UG9wU3RhdGVFdmVudChcInBvcHN0YXRlXCIsITEsITEsdCl9cmV0dXJuIGUuc2luZ2xlU3BhPSEwLGUuc2luZ2xlU3BhVHJpZ2dlcj1uLGV9aWYoWSl7d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJoYXNoY2hhbmdlXCIscnQpLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIixydCk7dmFyIHV0PXdpbmRvdy5hZGRFdmVudExpc3RlbmVyLGF0PXdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyO3dpbmRvdy5hZGRFdmVudExpc3RlbmVyPWZ1bmN0aW9uKHQsbil7aWYoIShcImZ1bmN0aW9uXCI9PXR5cGVvZiBuJiZ0dC5pbmRleE9mKHQpPj0wKXx8XyhaW3RdLChmdW5jdGlvbih0KXtyZXR1cm4gdD09PW59KSkpcmV0dXJuIHV0LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtaW3RdLnB1c2gobil9LHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyPWZ1bmN0aW9uKHQsbil7aWYoIShcImZ1bmN0aW9uXCI9PXR5cGVvZiBuJiZ0dC5pbmRleE9mKHQpPj0wKSlyZXR1cm4gYXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1pbdF09Wlt0XS5maWx0ZXIoKGZ1bmN0aW9uKHQpe3JldHVybiB0IT09bn0pKX0sd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlPW90KHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSxcInB1c2hTdGF0ZVwiKSx3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGU9b3Qod2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlLFwicmVwbGFjZVN0YXRlXCIpLHdpbmRvdy5zaW5nbGVTcGFOYXZpZ2F0ZT9jb25zb2xlLndhcm4ocyg0MSwhMSkpOndpbmRvdy5zaW5nbGVTcGFOYXZpZ2F0ZT1udH1mdW5jdGlvbiBjdCh0KXt2YXIgbj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtyZXR1cm4gbi5ocmVmPXQsbn12YXIgc3Q9ITE7ZnVuY3Rpb24gZnQoKXt2YXIgdD1hcmd1bWVudHMubGVuZ3RoPjAmJnZvaWQgMCE9PWFyZ3VtZW50c1swXT9hcmd1bWVudHNbMF06d2luZG93LmpRdWVyeTtpZih0fHx3aW5kb3cuJCYmd2luZG93LiQuZm4mJndpbmRvdy4kLmZuLmpxdWVyeSYmKHQ9d2luZG93LiQpLHQmJiFzdCl7dmFyIG49dC5mbi5vbixlPXQuZm4ub2ZmO3QuZm4ub249ZnVuY3Rpb24odCxlKXtyZXR1cm4gbHQuY2FsbCh0aGlzLG4sd2luZG93LmFkZEV2ZW50TGlzdGVuZXIsdCxlLGFyZ3VtZW50cyl9LHQuZm4ub2ZmPWZ1bmN0aW9uKHQsbil7cmV0dXJuIGx0LmNhbGwodGhpcyxlLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyLHQsbixhcmd1bWVudHMpfSxzdD0hMH19ZnVuY3Rpb24gbHQodCxuLGUscixvKXtyZXR1cm5cInN0cmluZ1wiIT10eXBlb2YgZT90LmFwcGx5KHRoaXMsbyk6KGUuc3BsaXQoL1xccysvKS5mb3JFYWNoKChmdW5jdGlvbih0KXt0dC5pbmRleE9mKHQpPj0wJiYobih0LHIpLGU9ZS5yZXBsYWNlKHQsXCJcIikpfSkpLFwiXCI9PT1lLnRyaW0oKT90aGlzOnQuYXBwbHkodGhpcyxvKSl9dmFyIHB0PXt9O2Z1bmN0aW9uIGh0KHQpe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe3ZhciBuPXB0W1QodCldO2lmKCFuKXJldHVybiB0O2lmKHQuc3RhdHVzPT09bClyZXR1cm4gbXQodCxuKSx0O2lmKFwiVU5MT0FESU5HXCI9PT10LnN0YXR1cylyZXR1cm4gbi5wcm9taXNlLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIHR9KSk7aWYodC5zdGF0dXMhPT12JiZ0LnN0YXR1cyE9PXkpcmV0dXJuIHQ7dmFyIGU9dC5zdGF0dXM9PT15P1Byb21pc2UucmVzb2x2ZSgpOlYodCxcInVubG9hZFwiKTtyZXR1cm4gdC5zdGF0dXM9XCJVTkxPQURJTkdcIixlLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIG10KHQsbiksdH0pKS5jYXRjaCgoZnVuY3Rpb24oZSl7cmV0dXJuIGZ1bmN0aW9uKHQsbixlKXtkZWxldGUgcHRbVCh0KV0sZGVsZXRlIHQuYm9vdHN0cmFwLGRlbGV0ZSB0Lm1vdW50LGRlbGV0ZSB0LnVubW91bnQsZGVsZXRlIHQudW5sb2FkLHUoZSx0LFApLG4ucmVqZWN0KGUpfSh0LG4sZSksdH0pKX0pKX1mdW5jdGlvbiBtdCh0LG4pe2RlbGV0ZSBwdFtUKHQpXSxkZWxldGUgdC5ib290c3RyYXAsZGVsZXRlIHQubW91bnQsZGVsZXRlIHQudW5tb3VudCxkZWxldGUgdC51bmxvYWQsdC5zdGF0dXM9bCxuLnJlc29sdmUoKX1mdW5jdGlvbiB2dCh0LG4sZSxyKXtwdFtUKHQpXT17YXBwOnQscmVzb2x2ZTplLHJlamVjdDpyfSxPYmplY3QuZGVmaW5lUHJvcGVydHkocHRbVCh0KV0sXCJwcm9taXNlXCIse2dldDpufSl9ZnVuY3Rpb24gZHQodCl7cmV0dXJuIHB0W3RdfXZhciB3dD1bXTtmdW5jdGlvbiBndCgpe3ZhciB0PVtdLG49W10sZT1bXSxyPVtdLG89KG5ldyBEYXRlKS5nZXRUaW1lKCk7cmV0dXJuIHd0LmZvckVhY2goKGZ1bmN0aW9uKGkpe3ZhciB1PWkuc3RhdHVzIT09UCYmYihpKTtzd2l0Y2goaS5zdGF0dXMpe2Nhc2UgeTp1JiZvLWkubG9hZEVycm9yVGltZT49MjAwJiZlLnB1c2goaSk7YnJlYWs7Y2FzZSBsOmNhc2UgcDp1JiZlLnB1c2goaSk7YnJlYWs7Y2FzZSBoOmNhc2UgdjohdSYmZHQoVChpKSk/dC5wdXNoKGkpOnUmJnIucHVzaChpKTticmVhaztjYXNlIHc6dXx8bi5wdXNoKGkpfX0pKSx7YXBwc1RvVW5sb2FkOnQsYXBwc1RvVW5tb3VudDpuLGFwcHNUb0xvYWQ6ZSxhcHBzVG9Nb3VudDpyfX1mdW5jdGlvbiBFdCgpe3JldHVybiB3dC5maWx0ZXIoTykubWFwKFQpfWZ1bmN0aW9uIHl0KCl7cmV0dXJuIHd0Lm1hcChUKX1mdW5jdGlvbiBQdCh0KXt2YXIgbj1fKHd0LChmdW5jdGlvbihuKXtyZXR1cm4gVChuKT09PXR9KSk7cmV0dXJuIG4/bi5zdGF0dXM6bnVsbH1mdW5jdGlvbiBPdCh0LGUscixvKXt2YXIgaT1mdW5jdGlvbih0LGUscixvKXt2YXIgaSx1PXtuYW1lOm51bGwsbG9hZEFwcDpudWxsLGFjdGl2ZVdoZW46bnVsbCxjdXN0b21Qcm9wczpudWxsfTtyZXR1cm5cIm9iamVjdFwiPT09bih0KT8oZnVuY3Rpb24odCl7aWYoQXJyYXkuaXNBcnJheSh0KXx8bnVsbD09PXQpdGhyb3cgRXJyb3IocygzOSwhMSkpO3ZhciBlPVtcIm5hbWVcIixcImFwcFwiLFwiYWN0aXZlV2hlblwiLFwiY3VzdG9tUHJvcHNcIl0scj1PYmplY3Qua2V5cyh0KS5yZWR1Y2UoKGZ1bmN0aW9uKHQsbil7cmV0dXJuIGUuaW5kZXhPZihuKT49MD90OnQuY29uY2F0KG4pfSksW10pO2lmKDAhPT1yLmxlbmd0aCl0aHJvdyBFcnJvcihzKDM4LCExLGUuam9pbihcIiwgXCIpLHIuam9pbihcIiwgXCIpKSk7aWYoXCJzdHJpbmdcIiE9dHlwZW9mIHQubmFtZXx8MD09PXQubmFtZS5sZW5ndGgpdGhyb3cgRXJyb3IocygyMCwhMSkpO2lmKFwib2JqZWN0XCIhPT1uKHQuYXBwKSYmXCJmdW5jdGlvblwiIT10eXBlb2YgdC5hcHApdGhyb3cgRXJyb3IocygyMCwhMSkpO3ZhciBvPWZ1bmN0aW9uKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0fHxcImZ1bmN0aW9uXCI9PXR5cGVvZiB0fTtpZighKG8odC5hY3RpdmVXaGVuKXx8QXJyYXkuaXNBcnJheSh0LmFjdGl2ZVdoZW4pJiZ0LmFjdGl2ZVdoZW4uZXZlcnkobykpKXRocm93IEVycm9yKHMoMjQsITEpKTtpZighU3QodC5jdXN0b21Qcm9wcykpdGhyb3cgRXJyb3IocygyMiwhMSkpfSh0KSx1Lm5hbWU9dC5uYW1lLHUubG9hZEFwcD10LmFwcCx1LmFjdGl2ZVdoZW49dC5hY3RpdmVXaGVuLHUuY3VzdG9tUHJvcHM9dC5jdXN0b21Qcm9wcyk6KGZ1bmN0aW9uKHQsbixlLHIpe2lmKFwic3RyaW5nXCIhPXR5cGVvZiB0fHwwPT09dC5sZW5ndGgpdGhyb3cgRXJyb3IocygyMCwhMSkpO2lmKCFuKXRocm93IEVycm9yKHMoMjMsITEpKTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IEVycm9yKHMoMjQsITEpKTtpZighU3QocikpdGhyb3cgRXJyb3IocygyMiwhMSkpfSh0LGUscixvKSx1Lm5hbWU9dCx1LmxvYWRBcHA9ZSx1LmFjdGl2ZVdoZW49cix1LmN1c3RvbVByb3BzPW8pLHUubG9hZEFwcD1cImZ1bmN0aW9uXCIhPXR5cGVvZihpPXUubG9hZEFwcCk/ZnVuY3Rpb24oKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGkpfTppLHUuY3VzdG9tUHJvcHM9ZnVuY3Rpb24odCl7cmV0dXJuIHR8fHt9fSh1LmN1c3RvbVByb3BzKSx1LmFjdGl2ZVdoZW49ZnVuY3Rpb24odCl7dmFyIG49QXJyYXkuaXNBcnJheSh0KT90Olt0XTtyZXR1cm4gbj1uLm1hcCgoZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdD90Ol90KHQpfSkpLGZ1bmN0aW9uKHQpe3JldHVybiBuLnNvbWUoKGZ1bmN0aW9uKG4pe3JldHVybiBuKHQpfSkpfX0odS5hY3RpdmVXaGVuKSx1fSh0LGUscixvKTtpZigtMSE9PXl0KCkuaW5kZXhPZihpLm5hbWUpKXRocm93IEVycm9yKHMoMjEsITEsaS5uYW1lKSk7d3QucHVzaChTKHtsb2FkRXJyb3JUaW1lOm51bGwsc3RhdHVzOmwscGFyY2Vsczp7fSxkZXZ0b29sczp7b3ZlcmxheXM6e29wdGlvbnM6e30sc2VsZWN0b3JzOltdfX19LGkpKSxZJiYoZnQoKSxMdCgpKX1mdW5jdGlvbiBidCgpe3ZhciB0PWFyZ3VtZW50cy5sZW5ndGg+MCYmdm9pZCAwIT09YXJndW1lbnRzWzBdP2FyZ3VtZW50c1swXTp3aW5kb3cubG9jYXRpb247cmV0dXJuIHd0LmZpbHRlcigoZnVuY3Rpb24obil7cmV0dXJuIG4uYWN0aXZlV2hlbih0KX0pKS5tYXAoVCl9ZnVuY3Rpb24gVHQodCl7aWYoMD09PXd0LmZpbHRlcigoZnVuY3Rpb24obil7cmV0dXJuIFQobik9PT10fSkpLmxlbmd0aCl0aHJvdyBFcnJvcihzKDI1LCExLHQpKTtyZXR1cm4gQXQodCkudGhlbigoZnVuY3Rpb24oKXt2YXIgbj13dC5tYXAoVCkuaW5kZXhPZih0KTt3dC5zcGxpY2UobiwxKX0pKX1mdW5jdGlvbiBBdCh0KXt2YXIgbj1hcmd1bWVudHMubGVuZ3RoPjEmJnZvaWQgMCE9PWFyZ3VtZW50c1sxXT9hcmd1bWVudHNbMV06e3dhaXRGb3JVbm1vdW50OiExfTtpZihcInN0cmluZ1wiIT10eXBlb2YgdCl0aHJvdyBFcnJvcihzKDI2LCExKSk7dmFyIGU9Xyh3dCwoZnVuY3Rpb24obil7cmV0dXJuIFQobik9PT10fSkpO2lmKCFlKXRocm93IEVycm9yKHMoMjcsITEsdCkpO3ZhciByLG89ZHQoVChlKSk7aWYobiYmbi53YWl0Rm9yVW5tb3VudCl7aWYobylyZXR1cm4gby5wcm9taXNlO3ZhciBpPW5ldyBQcm9taXNlKChmdW5jdGlvbih0LG4pe3Z0KGUsKGZ1bmN0aW9uKCl7cmV0dXJuIGl9KSx0LG4pfSkpO3JldHVybiBpfXJldHVybiBvPyhyPW8ucHJvbWlzZSxOdChlLG8ucmVzb2x2ZSxvLnJlamVjdCkpOnI9bmV3IFByb21pc2UoKGZ1bmN0aW9uKHQsbil7dnQoZSwoZnVuY3Rpb24oKXtyZXR1cm4gcn0pLHQsbiksTnQoZSx0LG4pfSkpLHJ9ZnVuY3Rpb24gTnQodCxuLGUpe0wodCkudGhlbihodCkudGhlbigoZnVuY3Rpb24oKXtuKCksc2V0VGltZW91dCgoZnVuY3Rpb24oKXtMdCgpfSkpfSkpLmNhdGNoKGUpfWZ1bmN0aW9uIFN0KHQpe3JldHVybiF0fHxcImZ1bmN0aW9uXCI9PXR5cGVvZiB0fHxcIm9iamVjdFwiPT09bih0KSYmbnVsbCE9PXQmJiFBcnJheS5pc0FycmF5KHQpfWZ1bmN0aW9uIF90KHQsbil7dmFyIGU9ZnVuY3Rpb24odCxuKXt2YXIgZT0wLHI9ITEsbz1cIl5cIjtcIi9cIiE9PXRbMF0mJih0PVwiL1wiK3QpO2Zvcih2YXIgaT0wO2k8dC5sZW5ndGg7aSsrKXt2YXIgdT10W2ldOyghciYmXCI6XCI9PT11fHxyJiZcIi9cIj09PXUpJiZhKGkpfXJldHVybiBhKHQubGVuZ3RoKSxuZXcgUmVnRXhwKG8sXCJpXCIpO2Z1bmN0aW9uIGEoaSl7dmFyIHU9dC5zbGljZShlLGkpLnJlcGxhY2UoL1t8XFxcXHt9KClbXFxdXiQrKj8uXS9nLFwiXFxcXCQmXCIpO2lmKG8rPXI/XCJbXi9dKy8/XCI6dSxpPT09dC5sZW5ndGgpaWYociluJiYobys9XCIkXCIpO2Vsc2V7dmFyIGE9bj9cIlwiOlwiLipcIjtvPVwiL1wiPT09by5jaGFyQXQoby5sZW5ndGgtMSk/XCJcIi5jb25jYXQobykuY29uY2F0KGEsXCIkXCIpOlwiXCIuY29uY2F0KG8sXCIoL1wiKS5jb25jYXQoYSxcIik/KCMuKik/JFwiKX1yPSFyLGU9aX19KHQsbik7cmV0dXJuIGZ1bmN0aW9uKHQpe3ZhciBuPXQub3JpZ2luO258fChuPVwiXCIuY29uY2F0KHQucHJvdG9jb2wsXCIvL1wiKS5jb25jYXQodC5ob3N0KSk7dmFyIHI9dC5ocmVmLnJlcGxhY2UobixcIlwiKS5yZXBsYWNlKHQuc2VhcmNoLFwiXCIpLnNwbGl0KFwiP1wiKVswXTtyZXR1cm4gZS50ZXN0KHIpfX12YXIgRHQ9ITEsVXQ9W10sanQ9WSYmd2luZG93LmxvY2F0aW9uLmhyZWY7ZnVuY3Rpb24gTXQoKXtyZXR1cm4gTHQoKX1mdW5jdGlvbiBMdCgpe3ZhciB0PWFyZ3VtZW50cy5sZW5ndGg+MCYmdm9pZCAwIT09YXJndW1lbnRzWzBdP2FyZ3VtZW50c1swXTpbXSxuPWFyZ3VtZW50cy5sZW5ndGg+MT9hcmd1bWVudHNbMV06dm9pZCAwO2lmKER0KXJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXtVdC5wdXNoKHtyZXNvbHZlOnQscmVqZWN0OmUsZXZlbnRBcmd1bWVudHM6bn0pfSkpO3ZhciByLGk9Z3QoKSx1PWkuYXBwc1RvVW5sb2FkLGE9aS5hcHBzVG9Vbm1vdW50LGM9aS5hcHBzVG9Mb2FkLHM9aS5hcHBzVG9Nb3VudCxmPSExLHA9anQsaD1qdD13aW5kb3cubG9jYXRpb24uaHJlZjtyZXR1cm4gQnQoKT8oRHQ9ITAscj11LmNvbmNhdChjLGEscyksZygpKToocj1jLGQoKSk7ZnVuY3Rpb24gbSgpe2Y9ITB9ZnVuY3Rpb24gZCgpe3JldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKChmdW5jdGlvbigpe3ZhciB0PWMubWFwKHopO3JldHVybiBQcm9taXNlLmFsbCh0KS50aGVuKHkpLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuW119KSkuY2F0Y2goKGZ1bmN0aW9uKHQpe3Rocm93IHkoKSx0fSkpfSkpfWZ1bmN0aW9uIGcoKXtyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoZnVuY3Rpb24oKXtpZih3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgbygwPT09ci5sZW5ndGg/XCJzaW5nbGUtc3BhOmJlZm9yZS1uby1hcHAtY2hhbmdlXCI6XCJzaW5nbGUtc3BhOmJlZm9yZS1hcHAtY2hhbmdlXCIsTyghMCkpKSx3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgbyhcInNpbmdsZS1zcGE6YmVmb3JlLXJvdXRpbmctZXZlbnRcIixPKCEwLHtjYW5jZWxOYXZpZ2F0aW9uOm19KSkpLGYpcmV0dXJuIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBvKFwic2luZ2xlLXNwYTpiZWZvcmUtbW91bnQtcm91dGluZy1ldmVudFwiLE8oITApKSksRSgpLHZvaWQgbnQocCk7dmFyIG49dS5tYXAoaHQpLGU9YS5tYXAoTCkubWFwKChmdW5jdGlvbih0KXtyZXR1cm4gdC50aGVuKGh0KX0pKS5jb25jYXQobiksaT1Qcm9taXNlLmFsbChlKTtpLnRoZW4oKGZ1bmN0aW9uKCl7d2luZG93LmRpc3BhdGNoRXZlbnQobmV3IG8oXCJzaW5nbGUtc3BhOmJlZm9yZS1tb3VudC1yb3V0aW5nLWV2ZW50XCIsTyghMCkpKX0pKTt2YXIgbD1jLm1hcCgoZnVuY3Rpb24odCl7cmV0dXJuIHoodCkudGhlbigoZnVuY3Rpb24odCl7cmV0dXJuIFJ0KHQsaSl9KSl9KSksaD1zLmZpbHRlcigoZnVuY3Rpb24odCl7cmV0dXJuIGMuaW5kZXhPZih0KTwwfSkpLm1hcCgoZnVuY3Rpb24odCl7cmV0dXJuIFJ0KHQsaSl9KSk7cmV0dXJuIGkuY2F0Y2goKGZ1bmN0aW9uKHQpe3Rocm93IHkoKSx0fSkpLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIHkoKSxQcm9taXNlLmFsbChsLmNvbmNhdChoKSkuY2F0Y2goKGZ1bmN0aW9uKG4pe3Rocm93IHQuZm9yRWFjaCgoZnVuY3Rpb24odCl7cmV0dXJuIHQucmVqZWN0KG4pfSkpLG59KSkudGhlbihFKX0pKX0pKX1mdW5jdGlvbiBFKCl7dmFyIG49RXQoKTt0LmZvckVhY2goKGZ1bmN0aW9uKHQpe3JldHVybiB0LnJlc29sdmUobil9KSk7dHJ5e3ZhciBlPTA9PT1yLmxlbmd0aD9cInNpbmdsZS1zcGE6bm8tYXBwLWNoYW5nZVwiOlwic2luZ2xlLXNwYTphcHAtY2hhbmdlXCI7d2luZG93LmRpc3BhdGNoRXZlbnQobmV3IG8oZSxPKCkpKSx3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgbyhcInNpbmdsZS1zcGE6cm91dGluZy1ldmVudFwiLE8oKSkpfWNhdGNoKHQpe3NldFRpbWVvdXQoKGZ1bmN0aW9uKCl7dGhyb3cgdH0pKX1pZihEdD0hMSxVdC5sZW5ndGg+MCl7dmFyIGk9VXQ7VXQ9W10sTHQoaSl9cmV0dXJuIG59ZnVuY3Rpb24geSgpe3QuZm9yRWFjaCgoZnVuY3Rpb24odCl7ZXQodC5ldmVudEFyZ3VtZW50cyl9KSksZXQobil9ZnVuY3Rpb24gTygpe3ZhciB0LG89YXJndW1lbnRzLmxlbmd0aD4wJiZ2b2lkIDAhPT1hcmd1bWVudHNbMF0mJmFyZ3VtZW50c1swXSxpPWFyZ3VtZW50cy5sZW5ndGg+MT9hcmd1bWVudHNbMV06dm9pZCAwLG09e30sZD0oZSh0PXt9LHcsW10pLGUodCx2LFtdKSxlKHQsbCxbXSksZSh0LFAsW10pLHQpO28/KGMuY29uY2F0KHMpLmZvckVhY2goKGZ1bmN0aW9uKHQsbil7RSh0LHcpfSkpLHUuZm9yRWFjaCgoZnVuY3Rpb24odCl7RSh0LGwpfSkpLGEuZm9yRWFjaCgoZnVuY3Rpb24odCl7RSh0LHYpfSkpKTpyLmZvckVhY2goKGZ1bmN0aW9uKHQpe0UodCl9KSk7dmFyIGc9e2RldGFpbDp7bmV3QXBwU3RhdHVzZXM6bSxhcHBzQnlOZXdTdGF0dXM6ZCx0b3RhbEFwcENoYW5nZXM6ci5sZW5ndGgsb3JpZ2luYWxFdmVudDpudWxsPT1uP3ZvaWQgMDpuWzBdLG9sZFVybDpwLG5ld1VybDpoLG5hdmlnYXRpb25Jc0NhbmNlbGVkOmZ9fTtyZXR1cm4gaSYmUyhnLmRldGFpbCxpKSxnO2Z1bmN0aW9uIEUodCxuKXt2YXIgZT1UKHQpO249bnx8UHQoZSksbVtlXT1uLChkW25dPWRbbl18fFtdKS5wdXNoKGUpfX19ZnVuY3Rpb24gUnQodCxuKXtyZXR1cm4gYih0KT9NKHQpLnRoZW4oKGZ1bmN0aW9uKHQpe3JldHVybiBuLnRoZW4oKGZ1bmN0aW9uKCl7cmV0dXJuIGIodCk/eCh0KTp0fSkpfSkpOm4udGhlbigoZnVuY3Rpb24oKXtyZXR1cm4gdH0pKX12YXIgSXQ9ITE7ZnVuY3Rpb24geHQodCl7dmFyIG47SXQ9ITAsdCYmdC51cmxSZXJvdXRlT25seSYmKG49dC51cmxSZXJvdXRlT25seSxYPW4pLFkmJkx0KCl9ZnVuY3Rpb24gQnQoKXtyZXR1cm4gSXR9WSYmc2V0VGltZW91dCgoZnVuY3Rpb24oKXtJdHx8Y29uc29sZS53YXJuKHMoMSwhMSkpfSksNWUzKTt2YXIgR3Q9e2dldFJhd0FwcERhdGE6ZnVuY3Rpb24oKXtyZXR1cm5bXS5jb25jYXQod3QpfSxyZXJvdXRlOkx0LE5PVF9MT0FERUQ6bCx0b0xvYWRQcm9taXNlOnosdG9Cb290c3RyYXBQcm9taXNlOk0sdW5yZWdpc3RlckFwcGxpY2F0aW9uOlR0fTtZJiZ3aW5kb3cuX19TSU5HTEVfU1BBX0RFVlRPT0xTX18mJih3aW5kb3cuX19TSU5HTEVfU1BBX0RFVlRPT0xTX18uZXhwb3NlZE1ldGhvZHM9R3QpO2V4cG9ydHttIGFzIEJPT1RTVFJBUFBJTkcscCBhcyBMT0FESU5HX1NPVVJDRV9DT0RFLHkgYXMgTE9BRF9FUlJPUix3IGFzIE1PVU5URUQsZCBhcyBNT1VOVElORyxoIGFzIE5PVF9CT09UU1RSQVBQRUQsbCBhcyBOT1RfTE9BREVELHYgYXMgTk9UX01PVU5URUQsUCBhcyBTS0lQX0JFQ0FVU0VfQlJPS0VOLEUgYXMgVU5NT1VOVElORyxnIGFzIFVQREFUSU5HLGEgYXMgYWRkRXJyb3JIYW5kbGVyLGJ0IGFzIGNoZWNrQWN0aXZpdHlGdW5jdGlvbnMsZnQgYXMgZW5zdXJlSlF1ZXJ5U3VwcG9ydCx5dCBhcyBnZXRBcHBOYW1lcyxQdCBhcyBnZXRBcHBTdGF0dXMsRXQgYXMgZ2V0TW91bnRlZEFwcHMsQyBhcyBtb3VudFJvb3RQYXJjZWwsbnQgYXMgbmF2aWdhdGVUb1VybCxfdCBhcyBwYXRoVG9BY3RpdmVXaGVuLE90IGFzIHJlZ2lzdGVyQXBwbGljYXRpb24sYyBhcyByZW1vdmVFcnJvckhhbmRsZXIsRiBhcyBzZXRCb290c3RyYXBNYXhUaW1lLEogYXMgc2V0TW91bnRNYXhUaW1lLFEgYXMgc2V0VW5sb2FkTWF4VGltZSxIIGFzIHNldFVubW91bnRNYXhUaW1lLHh0IGFzIHN0YXJ0LE10IGFzIHRyaWdnZXJBcHBDaGFuZ2UsQXQgYXMgdW5sb2FkQXBwbGljYXRpb24sVHQgYXMgdW5yZWdpc3RlckFwcGxpY2F0aW9ufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNpbmdsZS1zcGEubWluLmpzLm1hcFxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gX2FycmF5V2l0aEhvbGVzKGFycikge1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gYXJyO1xufSIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHtcbiAgdmFyIF9pID0gYXJyID09IG51bGwgPyBudWxsIDogdHlwZW9mIFN5bWJvbCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBhcnJbU3ltYm9sLml0ZXJhdG9yXSB8fCBhcnJbXCJAQGl0ZXJhdG9yXCJdO1xuXG4gIGlmIChfaSA9PSBudWxsKSByZXR1cm47XG4gIHZhciBfYXJyID0gW107XG4gIHZhciBfbiA9IHRydWU7XG4gIHZhciBfZCA9IGZhbHNlO1xuXG4gIHZhciBfcywgX2U7XG5cbiAgdHJ5IHtcbiAgICBmb3IgKF9pID0gX2kuY2FsbChhcnIpOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG4gICAgICBfYXJyLnB1c2goX3MudmFsdWUpO1xuXG4gICAgICBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBfZCA9IHRydWU7XG4gICAgX2UgPSBlcnI7XG4gIH0gZmluYWxseSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0gIT0gbnVsbCkgX2lbXCJyZXR1cm5cIl0oKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKF9kKSB0aHJvdyBfZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gX2Fycjtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfbm9uSXRlcmFibGVSZXN0KCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZS5cXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuXCIpO1xufSIsImltcG9ydCBhcnJheVdpdGhIb2xlcyBmcm9tIFwiLi9hcnJheVdpdGhIb2xlcy5qc1wiO1xuaW1wb3J0IGl0ZXJhYmxlVG9BcnJheUxpbWl0IGZyb20gXCIuL2l0ZXJhYmxlVG9BcnJheUxpbWl0LmpzXCI7XG5pbXBvcnQgdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkgZnJvbSBcIi4vdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkuanNcIjtcbmltcG9ydCBub25JdGVyYWJsZVJlc3QgZnJvbSBcIi4vbm9uSXRlcmFibGVSZXN0LmpzXCI7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfc2xpY2VkVG9BcnJheShhcnIsIGkpIHtcbiAgcmV0dXJuIGFycmF5V2l0aEhvbGVzKGFycikgfHwgaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB8fCB1bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShhcnIsIGkpIHx8IG5vbkl0ZXJhYmxlUmVzdCgpO1xufSIsImltcG9ydCBfc2xpY2VkVG9BcnJheSBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9zbGljZWRUb0FycmF5XCI7XG5pbXBvcnQgX3R5cGVvZiBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy90eXBlb2ZcIjtcblxuLyoqXG4gKiBAYXV0aG9yIEt1aXRvc1xuICogQGhvbWVwYWdlIGh0dHBzOi8vZ2l0aHViLmNvbS9rdWl0b3MvXG4gKiBAc2luY2UgMjAxOS0wMi0yNVxuICogZm9yayBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zeXN0ZW1qcy9zeXN0ZW1qcy9ibG9iL21hc3Rlci9zcmMvZXh0cmFzL2dsb2JhbC5qc1xuICovXG52YXIgaXNJRTExID0gdHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdUcmlkZW50JykgIT09IC0xO1xuXG5mdW5jdGlvbiBzaG91bGRTa2lwUHJvcGVydHkoZ2xvYmFsLCBwKSB7XG4gIGlmICghZ2xvYmFsLmhhc093blByb3BlcnR5KHApIHx8ICFpc05hTihwKSAmJiBwIDwgZ2xvYmFsLmxlbmd0aCkgcmV0dXJuIHRydWU7XG5cbiAgaWYgKGlzSUUxMSkge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9rdWl0b3MvaW1wb3J0LWh0bWwtZW50cnkvcHVsbC8zMu+8jOacgOWwj+WMliB0cnkg6IyD5Zu0XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBnbG9iYWxbcF0gJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgZ2xvYmFsW3BdLnBhcmVudCA9PT0gd2luZG93O1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSAvLyBzYWZhcmkgdW5wcmVkaWN0YWJseSBsaXN0cyBzb21lIG5ldyBnbG9iYWxzIGZpcnN0IG9yIHNlY29uZCBpbiBvYmplY3Qgb3JkZXJcblxuXG52YXIgZmlyc3RHbG9iYWxQcm9wLCBzZWNvbmRHbG9iYWxQcm9wLCBsYXN0R2xvYmFsUHJvcDtcbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxQcm9wKGdsb2JhbCkge1xuICB2YXIgY250ID0gMDtcbiAgdmFyIGxhc3RQcm9wO1xuICB2YXIgaGFzSWZyYW1lID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgcCBpbiBnbG9iYWwpIHtcbiAgICBpZiAoc2hvdWxkU2tpcFByb3BlcnR5KGdsb2JhbCwgcCkpIGNvbnRpbnVlOyAvLyDpgY3ljoYgaWZyYW1l77yM5qOA5p+lIHdpbmRvdyDkuIrnmoTlsZ7mgKflgLzmmK/lkKbmmK8gaWZyYW1l77yM5piv5YiZ6Lez6L+H5ZCO6Z2i55qEIGZpcnN0IOWSjCBzZWNvbmQg5Yik5patXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpbmRvdy5mcmFtZXMubGVuZ3RoICYmICFoYXNJZnJhbWU7IGkrKykge1xuICAgICAgdmFyIGZyYW1lID0gd2luZG93LmZyYW1lc1tpXTtcblxuICAgICAgaWYgKGZyYW1lID09PSBnbG9iYWxbcF0pIHtcbiAgICAgICAgaGFzSWZyYW1lID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFoYXNJZnJhbWUgJiYgKGNudCA9PT0gMCAmJiBwICE9PSBmaXJzdEdsb2JhbFByb3AgfHwgY250ID09PSAxICYmIHAgIT09IHNlY29uZEdsb2JhbFByb3ApKSByZXR1cm4gcDtcbiAgICBjbnQrKztcbiAgICBsYXN0UHJvcCA9IHA7XG4gIH1cblxuICBpZiAobGFzdFByb3AgIT09IGxhc3RHbG9iYWxQcm9wKSByZXR1cm4gbGFzdFByb3A7XG59XG5leHBvcnQgZnVuY3Rpb24gbm90ZUdsb2JhbFByb3BzKGdsb2JhbCkge1xuICAvLyBhbHRlcm5hdGl2ZWx5IE9iamVjdC5rZXlzKGdsb2JhbCkucG9wKClcbiAgLy8gYnV0IHRoaXMgbWF5IGJlIGZhc3RlciAocGVuZGluZyBiZW5jaG1hcmtzKVxuICBmaXJzdEdsb2JhbFByb3AgPSBzZWNvbmRHbG9iYWxQcm9wID0gdW5kZWZpbmVkO1xuXG4gIGZvciAodmFyIHAgaW4gZ2xvYmFsKSB7XG4gICAgaWYgKHNob3VsZFNraXBQcm9wZXJ0eShnbG9iYWwsIHApKSBjb250aW51ZTtcbiAgICBpZiAoIWZpcnN0R2xvYmFsUHJvcCkgZmlyc3RHbG9iYWxQcm9wID0gcDtlbHNlIGlmICghc2Vjb25kR2xvYmFsUHJvcCkgc2Vjb25kR2xvYmFsUHJvcCA9IHA7XG4gICAgbGFzdEdsb2JhbFByb3AgPSBwO1xuICB9XG5cbiAgcmV0dXJuIGxhc3RHbG9iYWxQcm9wO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldElubGluZUNvZGUobWF0Y2gpIHtcbiAgdmFyIHN0YXJ0ID0gbWF0Y2guaW5kZXhPZignPicpICsgMTtcbiAgdmFyIGVuZCA9IG1hdGNoLmxhc3RJbmRleE9mKCc8Jyk7XG4gIHJldHVybiBtYXRjaC5zdWJzdHJpbmcoc3RhcnQsIGVuZCk7XG59XG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdEdldFB1YmxpY1BhdGgoZW50cnkpIHtcbiAgaWYgKF90eXBlb2YoZW50cnkpID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiAnLyc7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFVSTCDmnoTpgKDlh73mlbDkuI3mlK/mjIHkvb/nlKggLy8g5YmN57yA55qEIHVybFxuICAgIHZhciBfVVJMID0gbmV3IFVSTChlbnRyeS5zdGFydHNXaXRoKCcvLycpID8gXCJcIi5jb25jYXQobG9jYXRpb24ucHJvdG9jb2wpLmNvbmNhdChlbnRyeSkgOiBlbnRyeSwgbG9jYXRpb24uaHJlZiksXG4gICAgICAgIG9yaWdpbiA9IF9VUkwub3JpZ2luLFxuICAgICAgICBwYXRobmFtZSA9IF9VUkwucGF0aG5hbWU7XG5cbiAgICB2YXIgcGF0aHMgPSBwYXRobmFtZS5zcGxpdCgnLycpOyAvLyDnp7vpmaTmnIDlkI7kuIDkuKrlhYPntKBcblxuICAgIHBhdGhzLnBvcCgpO1xuICAgIHJldHVybiBcIlwiLmNvbmNhdChvcmlnaW4pLmNvbmNhdChwYXRocy5qb2luKCcvJyksIFwiL1wiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUud2FybihlKTtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn0gLy8gRGV0ZWN0IHdoZXRoZXIgYnJvd3NlciBzdXBwb3J0cyBgPHNjcmlwdCB0eXBlPW1vZHVsZT5gIG9yIG5vdFxuXG5leHBvcnQgZnVuY3Rpb24gaXNNb2R1bGVTY3JpcHRTdXBwb3J0ZWQoKSB7XG4gIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gIHJldHVybiAnbm9Nb2R1bGUnIGluIHM7XG59IC8vIFJJQyBhbmQgc2hpbSBmb3IgYnJvd3NlcnMgc2V0VGltZW91dCgpIHdpdGhvdXQgaXRcblxuZXhwb3J0IHZhciByZXF1ZXN0SWRsZUNhbGxiYWNrID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgZnVuY3Rpb24gcmVxdWVzdElkbGVDYWxsYmFjayhjYikge1xuICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpO1xuICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgY2Ioe1xuICAgICAgZGlkVGltZW91dDogZmFsc2UsXG4gICAgICB0aW1lUmVtYWluaW5nOiBmdW5jdGlvbiB0aW1lUmVtYWluaW5nKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgNTAgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sIDEpO1xufTtcbmV4cG9ydCBmdW5jdGlvbiByZWFkUmVzQXNTdHJpbmcocmVzcG9uc2UsIGF1dG9EZXRlY3RDaGFyc2V0KSB7XG4gIC8vIOacquWQr+eUqOiHquWKqOajgOa1i1xuICBpZiAoIWF1dG9EZXRlY3RDaGFyc2V0KSB7XG4gICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgfSAvLyDlpoLmnpzmsqFoZWFkZXJz77yM5Y+R55Sf5ZyodGVzdOeOr+Wig+S4i+eahG1vY2vmlbDmja7vvIzkuLrlhbzlrrnljp/mnInmtYvor5XnlKjkvotcblxuXG4gIGlmICghcmVzcG9uc2UuaGVhZGVycykge1xuICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gIH0gLy8g5aaC5p6c5rKh6L+U5ZueY29udGVudC10eXBl77yM6LWw6buY6K6k6YC76L6RXG5cblxuICB2YXIgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG5cbiAgaWYgKCFjb250ZW50VHlwZSkge1xuICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gIH0gLy8g6Kej5p6QY29udGVudC10eXBl5YaF55qEY2hhcnNldFxuICAvLyBDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD11dGYtOFxuICAvLyBDb250ZW50LVR5cGU6IG11bHRpcGFydC9mb3JtLWRhdGE7IGJvdW5kYXJ5PXNvbWV0aGluZ1xuICAvLyBHRVTor7fmsYLkuIvkuI3kvJrlh7rnjrDnrKzkuoznp41jb250ZW50LXR5cGVcblxuXG4gIHZhciBjaGFyc2V0ID0gJ3V0Zi04JztcbiAgdmFyIHBhcnRzID0gY29udGVudFR5cGUuc3BsaXQoJzsnKTtcblxuICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgdmFyIF9wYXJ0cyQxJHNwbGl0ID0gcGFydHNbMV0uc3BsaXQoJz0nKSxcbiAgICAgICAgX3BhcnRzJDEkc3BsaXQyID0gX3NsaWNlZFRvQXJyYXkoX3BhcnRzJDEkc3BsaXQsIDIpLFxuICAgICAgICB2YWx1ZSA9IF9wYXJ0cyQxJHNwbGl0MlsxXTtcblxuICAgIHZhciBlbmNvZGluZyA9IHZhbHVlICYmIHZhbHVlLnRyaW0oKTtcblxuICAgIGlmIChlbmNvZGluZykge1xuICAgICAgY2hhcnNldCA9IGVuY29kaW5nO1xuICAgIH1cbiAgfSAvLyDlpoLmnpzov5jmmK91dGYtOO+8jOmCo+S5iOi1sOm7mOiupO+8jOWFvOWuueWOn+aciemAu+i+ke+8jOi/meauteS7o+eggeWIoOmZpOS5n+W6lOivpeW3peS9nFxuXG5cbiAgaWYgKGNoYXJzZXQudG9VcHBlckNhc2UoKSA9PT0gJ1VURi04Jykge1xuICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gIH0gLy8g6LWw5rWB6K+75Y+W77yM57yW56CB5Y+v6IO95pivZ2Jr77yMZ2IyMzEy562J77yM5q+U5aaCc29mYSAz6buY6K6k5pivZ2Jr57yW56CBXG5cblxuICByZXR1cm4gcmVzcG9uc2UuYmxvYigpLnRoZW4oZnVuY3Rpb24gKGZpbGUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlYWRlciA9IG5ldyB3aW5kb3cuRmlsZVJlYWRlcigpO1xuXG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlLCBjaGFyc2V0KTtcbiAgICB9KTtcbiAgfSk7XG59IiwiaW1wb3J0IF9zbGljZWRUb0FycmF5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL3NsaWNlZFRvQXJyYXlcIjtcblxuLyoqXG4gKiBAYXV0aG9yIEt1aXRvc1xuICogQGhvbWVwYWdlIGh0dHBzOi8vZ2l0aHViLmNvbS9rdWl0b3MvXG4gKiBAc2luY2UgMjAxOC0wOS0wMyAxNTowNFxuICovXG5pbXBvcnQgeyBnZXRJbmxpbmVDb2RlLCBpc01vZHVsZVNjcmlwdFN1cHBvcnRlZCB9IGZyb20gJy4vdXRpbHMnO1xudmFyIEFMTF9TQ1JJUFRfUkVHRVggPSAvKDxzY3JpcHRbXFxzXFxTXSo/PilbXFxzXFxTXSo/PFxcL3NjcmlwdD4vZ2k7XG52YXIgU0NSSVBUX1RBR19SRUdFWCA9IC88KHNjcmlwdClbXFx0LVxcciBcXHhBMFxcdTE2ODBcXHUyMDAwLVxcdTIwMEFcXHUyMDI4XFx1MjAyOVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkZdKygoPyF0eXBlPSgnfCcpdGV4dFxcL25nXFx4MkR0ZW1wbGF0ZVxcMylbXFxzXFxTXSkqPz5bXFxzXFxTXSo/PFxcL1xcMT4vaTtcbnZhciBTQ1JJUFRfU1JDX1JFR0VYID0gLy4qXFxzc3JjPSgnfFwiKT8oW14+J1wiXFxzXSspLztcbnZhciBTQ1JJUFRfVFlQRV9SRUdFWCA9IC8uKlxcc3R5cGU9KCd8XCIpPyhbXj4nXCJcXHNdKykvO1xudmFyIFNDUklQVF9FTlRSWV9SRUdFWCA9IC8uKlxcc2VudHJ5XFxzKi4qLztcbnZhciBTQ1JJUFRfQVNZTkNfUkVHRVggPSAvLipcXHNhc3luY1xccyouKi87XG52YXIgU0NSSVBUX05PX01PRFVMRV9SRUdFWCA9IC8uKlxcc25vbW9kdWxlXFxzKi4qLztcbnZhciBTQ1JJUFRfTU9EVUxFX1JFR0VYID0gLy4qXFxzdHlwZT0oJ3xcIik/bW9kdWxlKCd8XCIpP1xccyouKi87XG52YXIgTElOS19UQUdfUkVHRVggPSAvPChsaW5rKVtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rW1xcc1xcU10qPz4vaWc7XG52YXIgTElOS19QUkVMT0FEX09SX1BSRUZFVENIX1JFR0VYID0gL1xcc3JlbD0oJ3xcIik/KHByZWxvYWR8cHJlZmV0Y2gpXFwxLztcbnZhciBMSU5LX0hSRUZfUkVHRVggPSAvLipcXHNocmVmPSgnfFwiKT8oW14+J1wiXFxzXSspLztcbnZhciBMSU5LX0FTX0ZPTlQgPSAvLipcXHNhcz0oJ3xcIik/Zm9udFxcMS4qLztcbnZhciBTVFlMRV9UQUdfUkVHRVggPSAvPHN0eWxlW14+XSo+W1xcc1xcU10qPzxcXC9zdHlsZT4vZ2k7XG52YXIgU1RZTEVfVFlQRV9SRUdFWCA9IC9cXHMrcmVsPSgnfFwiKT9zdHlsZXNoZWV0XFwxLiovO1xudmFyIFNUWUxFX0hSRUZfUkVHRVggPSAvLipcXHNocmVmPSgnfFwiKT8oW14+J1wiXFxzXSspLztcbnZhciBIVE1MX0NPTU1FTlRfUkVHRVggPSAvPCEtLShbXFxzXFxTXSo/KS0tPi9nO1xudmFyIExJTktfSUdOT1JFX1JFR0VYID0gLzxsaW5rKFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rfFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rW1xcc1xcU10rW1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXSspaWdub3JlKFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0qfFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rW1xcc1xcU10qfD1bXFxzXFxTXSopPi9pO1xudmFyIFNUWUxFX0lHTk9SRV9SRUdFWCA9IC88c3R5bGUoW1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXSt8W1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXStbXFxzXFxTXStbXFx0LVxcciBcXHhBMFxcdTE2ODBcXHUyMDAwLVxcdTIwMEFcXHUyMDI4XFx1MjAyOVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkZdKylpZ25vcmUoW1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXSp8W1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXStbXFxzXFxTXSp8PVtcXHNcXFNdKik+L2k7XG52YXIgU0NSSVBUX0lHTk9SRV9SRUdFWCA9IC88c2NyaXB0KFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rfFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rW1xcc1xcU10rW1xcdC1cXHIgXFx4QTBcXHUxNjgwXFx1MjAwMC1cXHUyMDBBXFx1MjAyOFxcdTIwMjlcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGXSspaWdub3JlKFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0qfFtcXHQtXFxyIFxceEEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwQVxcdTIwMjhcXHUyMDI5XFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRl0rW1xcc1xcU10qfD1bXFxzXFxTXSopPi9pO1xuXG5mdW5jdGlvbiBoYXNQcm90b2NvbCh1cmwpIHtcbiAgcmV0dXJuIHVybC5zdGFydHNXaXRoKCcvLycpIHx8IHVybC5zdGFydHNXaXRoKCdodHRwOi8vJykgfHwgdXJsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJyk7XG59XG5cbmZ1bmN0aW9uIGdldEVudGlyZVBhdGgocGF0aCwgYmFzZVVSSSkge1xuICByZXR1cm4gbmV3IFVSTChwYXRoLCBiYXNlVVJJKS50b1N0cmluZygpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkSmF2YVNjcmlwdFR5cGUodHlwZSkge1xuICB2YXIgaGFuZGxlVHlwZXMgPSBbJ3RleHQvamF2YXNjcmlwdCcsICdtb2R1bGUnLCAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsICd0ZXh0L2VjbWFzY3JpcHQnLCAnYXBwbGljYXRpb24vZWNtYXNjcmlwdCddO1xuICByZXR1cm4gIXR5cGUgfHwgaGFuZGxlVHlwZXMuaW5kZXhPZih0eXBlKSAhPT0gLTE7XG59XG5cbmV4cG9ydCB2YXIgZ2VuTGlua1JlcGxhY2VTeW1ib2wgPSBmdW5jdGlvbiBnZW5MaW5rUmVwbGFjZVN5bWJvbChsaW5rSHJlZikge1xuICB2YXIgcHJlbG9hZE9yUHJlZmV0Y2ggPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IGZhbHNlO1xuICByZXR1cm4gXCI8IS0tIFwiLmNvbmNhdChwcmVsb2FkT3JQcmVmZXRjaCA/ICdwcmVmZXRjaC9wcmVsb2FkJyA6ICcnLCBcIiBsaW5rIFwiKS5jb25jYXQobGlua0hyZWYsIFwiIHJlcGxhY2VkIGJ5IGltcG9ydC1odG1sLWVudHJ5IC0tPlwiKTtcbn07XG5leHBvcnQgdmFyIGdlblNjcmlwdFJlcGxhY2VTeW1ib2wgPSBmdW5jdGlvbiBnZW5TY3JpcHRSZXBsYWNlU3ltYm9sKHNjcmlwdFNyYykge1xuICB2YXIgYXN5bmMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IGZhbHNlO1xuICByZXR1cm4gXCI8IS0tIFwiLmNvbmNhdChhc3luYyA/ICdhc3luYycgOiAnJywgXCIgc2NyaXB0IFwiKS5jb25jYXQoc2NyaXB0U3JjLCBcIiByZXBsYWNlZCBieSBpbXBvcnQtaHRtbC1lbnRyeSAtLT5cIik7XG59O1xuZXhwb3J0IHZhciBpbmxpbmVTY3JpcHRSZXBsYWNlU3ltYm9sID0gXCI8IS0tIGlubGluZSBzY3JpcHRzIHJlcGxhY2VkIGJ5IGltcG9ydC1odG1sLWVudHJ5IC0tPlwiO1xuZXhwb3J0IHZhciBnZW5JZ25vcmVBc3NldFJlcGxhY2VTeW1ib2wgPSBmdW5jdGlvbiBnZW5JZ25vcmVBc3NldFJlcGxhY2VTeW1ib2wodXJsKSB7XG4gIHJldHVybiBcIjwhLS0gaWdub3JlIGFzc2V0IFwiLmNvbmNhdCh1cmwgfHwgJ2ZpbGUnLCBcIiByZXBsYWNlZCBieSBpbXBvcnQtaHRtbC1lbnRyeSAtLT5cIik7XG59O1xuZXhwb3J0IHZhciBnZW5Nb2R1bGVTY3JpcHRSZXBsYWNlU3ltYm9sID0gZnVuY3Rpb24gZ2VuTW9kdWxlU2NyaXB0UmVwbGFjZVN5bWJvbChzY3JpcHRTcmMsIG1vZHVsZVN1cHBvcnQpIHtcbiAgcmV0dXJuIFwiPCEtLSBcIi5jb25jYXQobW9kdWxlU3VwcG9ydCA/ICdub21vZHVsZScgOiAnbW9kdWxlJywgXCIgc2NyaXB0IFwiKS5jb25jYXQoc2NyaXB0U3JjLCBcIiBpZ25vcmVkIGJ5IGltcG9ydC1odG1sLWVudHJ5IC0tPlwiKTtcbn07XG4vKipcbiAqIHBhcnNlIHRoZSBzY3JpcHQgbGluayBmcm9tIHRoZSB0ZW1wbGF0ZVxuICogMS4gY29sbGVjdCBzdHlsZXNoZWV0c1xuICogMi4gdXNlIGdsb2JhbCBldmFsIHRvIGV2YWx1YXRlIHRoZSBpbmxpbmUgc2NyaXB0c1xuICogICAgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Z1bmN0aW9uI0RpZmZlcmVuY2VfYmV0d2Vlbl9GdW5jdGlvbl9jb25zdHJ1Y3Rvcl9hbmRfZnVuY3Rpb25fZGVjbGFyYXRpb25cbiAqICAgIHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9ldmFsI0RvX25vdF9ldmVyX3VzZV9ldmFsIVxuICogQHBhcmFtIHRwbFxuICogQHBhcmFtIGJhc2VVUklcbiAqIEBzdHJpcFN0eWxlcyB3aGV0aGVyIHRvIHN0cmlwIHRoZSBjc3MgbGlua3NcbiAqIEByZXR1cm5zIHt7dGVtcGxhdGU6IHZvaWQgfCBzdHJpbmcgfCAqLCBzY3JpcHRzOiAqW10sIGVudHJ5OiAqfX1cbiAqL1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwcm9jZXNzVHBsKHRwbCwgYmFzZVVSSSkge1xuICB2YXIgc2NyaXB0cyA9IFtdO1xuICB2YXIgc3R5bGVzID0gW107XG4gIHZhciBlbnRyeSA9IG51bGw7XG4gIHZhciBtb2R1bGVTdXBwb3J0ID0gaXNNb2R1bGVTY3JpcHRTdXBwb3J0ZWQoKTtcbiAgdmFyIHRlbXBsYXRlID0gdHBsXG4gIC8qXG4gIHJlbW92ZSBodG1sIGNvbW1lbnQgZmlyc3RcbiAgKi9cbiAgLnJlcGxhY2UoSFRNTF9DT01NRU5UX1JFR0VYLCAnJykucmVwbGFjZShMSU5LX1RBR19SRUdFWCwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgLypcbiAgICBjaGFuZ2UgdGhlIGNzcyBsaW5rXG4gICAgKi9cbiAgICB2YXIgc3R5bGVUeXBlID0gISFtYXRjaC5tYXRjaChTVFlMRV9UWVBFX1JFR0VYKTtcblxuICAgIGlmIChzdHlsZVR5cGUpIHtcbiAgICAgIHZhciBzdHlsZUhyZWYgPSBtYXRjaC5tYXRjaChTVFlMRV9IUkVGX1JFR0VYKTtcbiAgICAgIHZhciBzdHlsZUlnbm9yZSA9IG1hdGNoLm1hdGNoKExJTktfSUdOT1JFX1JFR0VYKTtcblxuICAgICAgaWYgKHN0eWxlSHJlZikge1xuICAgICAgICB2YXIgaHJlZiA9IHN0eWxlSHJlZiAmJiBzdHlsZUhyZWZbMl07XG4gICAgICAgIHZhciBuZXdIcmVmID0gaHJlZjtcblxuICAgICAgICBpZiAoaHJlZiAmJiAhaGFzUHJvdG9jb2woaHJlZikpIHtcbiAgICAgICAgICBuZXdIcmVmID0gZ2V0RW50aXJlUGF0aChocmVmLCBiYXNlVVJJKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHlsZUlnbm9yZSkge1xuICAgICAgICAgIHJldHVybiBnZW5JZ25vcmVBc3NldFJlcGxhY2VTeW1ib2wobmV3SHJlZik7XG4gICAgICAgIH1cblxuICAgICAgICBzdHlsZXMucHVzaChuZXdIcmVmKTtcbiAgICAgICAgcmV0dXJuIGdlbkxpbmtSZXBsYWNlU3ltYm9sKG5ld0hyZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBwcmVsb2FkT3JQcmVmZXRjaFR5cGUgPSBtYXRjaC5tYXRjaChMSU5LX1BSRUxPQURfT1JfUFJFRkVUQ0hfUkVHRVgpICYmIG1hdGNoLm1hdGNoKExJTktfSFJFRl9SRUdFWCkgJiYgIW1hdGNoLm1hdGNoKExJTktfQVNfRk9OVCk7XG5cbiAgICBpZiAocHJlbG9hZE9yUHJlZmV0Y2hUeXBlKSB7XG4gICAgICB2YXIgX21hdGNoJG1hdGNoID0gbWF0Y2gubWF0Y2goTElOS19IUkVGX1JFR0VYKSxcbiAgICAgICAgICBfbWF0Y2gkbWF0Y2gyID0gX3NsaWNlZFRvQXJyYXkoX21hdGNoJG1hdGNoLCAzKSxcbiAgICAgICAgICBsaW5rSHJlZiA9IF9tYXRjaCRtYXRjaDJbMl07XG5cbiAgICAgIHJldHVybiBnZW5MaW5rUmVwbGFjZVN5bWJvbChsaW5rSHJlZiwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoO1xuICB9KS5yZXBsYWNlKFNUWUxFX1RBR19SRUdFWCwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgaWYgKFNUWUxFX0lHTk9SRV9SRUdFWC50ZXN0KG1hdGNoKSkge1xuICAgICAgcmV0dXJuIGdlbklnbm9yZUFzc2V0UmVwbGFjZVN5bWJvbCgnc3R5bGUgZmlsZScpO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaDtcbiAgfSkucmVwbGFjZShBTExfU0NSSVBUX1JFR0VYLCBmdW5jdGlvbiAobWF0Y2gsIHNjcmlwdFRhZykge1xuICAgIHZhciBzY3JpcHRJZ25vcmUgPSBzY3JpcHRUYWcubWF0Y2goU0NSSVBUX0lHTk9SRV9SRUdFWCk7XG4gICAgdmFyIG1vZHVsZVNjcmlwdElnbm9yZSA9IG1vZHVsZVN1cHBvcnQgJiYgISFzY3JpcHRUYWcubWF0Y2goU0NSSVBUX05PX01PRFVMRV9SRUdFWCkgfHwgIW1vZHVsZVN1cHBvcnQgJiYgISFzY3JpcHRUYWcubWF0Y2goU0NSSVBUX01PRFVMRV9SRUdFWCk7IC8vIGluIG9yZGVyIHRvIGtlZXAgdGhlIGV4ZWMgb3JkZXIgb2YgYWxsIGphdmFzY3JpcHRzXG5cbiAgICB2YXIgbWF0Y2hlZFNjcmlwdFR5cGVNYXRjaCA9IHNjcmlwdFRhZy5tYXRjaChTQ1JJUFRfVFlQRV9SRUdFWCk7XG4gICAgdmFyIG1hdGNoZWRTY3JpcHRUeXBlID0gbWF0Y2hlZFNjcmlwdFR5cGVNYXRjaCAmJiBtYXRjaGVkU2NyaXB0VHlwZU1hdGNoWzJdO1xuXG4gICAgaWYgKCFpc1ZhbGlkSmF2YVNjcmlwdFR5cGUobWF0Y2hlZFNjcmlwdFR5cGUpKSB7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSAvLyBpZiBpdCBpcyBhIGV4dGVybmFsIHNjcmlwdFxuXG5cbiAgICBpZiAoU0NSSVBUX1RBR19SRUdFWC50ZXN0KG1hdGNoKSAmJiBzY3JpcHRUYWcubWF0Y2goU0NSSVBUX1NSQ19SRUdFWCkpIHtcbiAgICAgIC8qXG4gICAgICBjb2xsZWN0IHNjcmlwdHMgYW5kIHJlcGxhY2UgdGhlIHJlZlxuICAgICAgKi9cbiAgICAgIHZhciBtYXRjaGVkU2NyaXB0RW50cnkgPSBzY3JpcHRUYWcubWF0Y2goU0NSSVBUX0VOVFJZX1JFR0VYKTtcbiAgICAgIHZhciBtYXRjaGVkU2NyaXB0U3JjTWF0Y2ggPSBzY3JpcHRUYWcubWF0Y2goU0NSSVBUX1NSQ19SRUdFWCk7XG4gICAgICB2YXIgbWF0Y2hlZFNjcmlwdFNyYyA9IG1hdGNoZWRTY3JpcHRTcmNNYXRjaCAmJiBtYXRjaGVkU2NyaXB0U3JjTWF0Y2hbMl07XG5cbiAgICAgIGlmIChlbnRyeSAmJiBtYXRjaGVkU2NyaXB0RW50cnkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdZb3Ugc2hvdWxkIG5vdCBzZXQgbXVsdGlwbHkgZW50cnkgc2NyaXB0IScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYXBwZW5kIHRoZSBkb21haW4gd2hpbGUgdGhlIHNjcmlwdCBub3QgaGF2ZSBhbiBwcm90b2NvbCBwcmVmaXhcbiAgICAgICAgaWYgKG1hdGNoZWRTY3JpcHRTcmMgJiYgIWhhc1Byb3RvY29sKG1hdGNoZWRTY3JpcHRTcmMpKSB7XG4gICAgICAgICAgbWF0Y2hlZFNjcmlwdFNyYyA9IGdldEVudGlyZVBhdGgobWF0Y2hlZFNjcmlwdFNyYywgYmFzZVVSSSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbnRyeSA9IGVudHJ5IHx8IG1hdGNoZWRTY3JpcHRFbnRyeSAmJiBtYXRjaGVkU2NyaXB0U3JjO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2NyaXB0SWdub3JlKSB7XG4gICAgICAgIHJldHVybiBnZW5JZ25vcmVBc3NldFJlcGxhY2VTeW1ib2wobWF0Y2hlZFNjcmlwdFNyYyB8fCAnanMgZmlsZScpO1xuICAgICAgfVxuXG4gICAgICBpZiAobW9kdWxlU2NyaXB0SWdub3JlKSB7XG4gICAgICAgIHJldHVybiBnZW5Nb2R1bGVTY3JpcHRSZXBsYWNlU3ltYm9sKG1hdGNoZWRTY3JpcHRTcmMgfHwgJ2pzIGZpbGUnLCBtb2R1bGVTdXBwb3J0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1hdGNoZWRTY3JpcHRTcmMpIHtcbiAgICAgICAgdmFyIGFzeW5jU2NyaXB0ID0gISFzY3JpcHRUYWcubWF0Y2goU0NSSVBUX0FTWU5DX1JFR0VYKTtcbiAgICAgICAgc2NyaXB0cy5wdXNoKGFzeW5jU2NyaXB0ID8ge1xuICAgICAgICAgIGFzeW5jOiB0cnVlLFxuICAgICAgICAgIHNyYzogbWF0Y2hlZFNjcmlwdFNyY1xuICAgICAgICB9IDogbWF0Y2hlZFNjcmlwdFNyYyk7XG4gICAgICAgIHJldHVybiBnZW5TY3JpcHRSZXBsYWNlU3ltYm9sKG1hdGNoZWRTY3JpcHRTcmMsIGFzeW5jU2NyaXB0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc2NyaXB0SWdub3JlKSB7XG4gICAgICAgIHJldHVybiBnZW5JZ25vcmVBc3NldFJlcGxhY2VTeW1ib2woJ2pzIGZpbGUnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1vZHVsZVNjcmlwdElnbm9yZSkge1xuICAgICAgICByZXR1cm4gZ2VuTW9kdWxlU2NyaXB0UmVwbGFjZVN5bWJvbCgnanMgZmlsZScsIG1vZHVsZVN1cHBvcnQpO1xuICAgICAgfSAvLyBpZiBpdCBpcyBhbiBpbmxpbmUgc2NyaXB0XG5cblxuICAgICAgdmFyIGNvZGUgPSBnZXRJbmxpbmVDb2RlKG1hdGNoKTsgLy8gcmVtb3ZlIHNjcmlwdCBibG9ja3Mgd2hlbiBhbGwgb2YgdGhlc2UgbGluZXMgYXJlIGNvbW1lbnRzLlxuXG4gICAgICB2YXIgaXNQdXJlQ29tbWVudEJsb2NrID0gY29kZS5zcGxpdCgvW1xcclxcbl0rLykuZXZlcnkoZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgcmV0dXJuICFsaW5lLnRyaW0oKSB8fCBsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCcvLycpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICghaXNQdXJlQ29tbWVudEJsb2NrKSB7XG4gICAgICAgIHNjcmlwdHMucHVzaChtYXRjaCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbmxpbmVTY3JpcHRSZXBsYWNlU3ltYm9sO1xuICAgIH1cbiAgfSk7XG4gIHNjcmlwdHMgPSBzY3JpcHRzLmZpbHRlcihmdW5jdGlvbiAoc2NyaXB0KSB7XG4gICAgLy8gZmlsdGVyIGVtcHR5IHNjcmlwdFxuICAgIHJldHVybiAhIXNjcmlwdDtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgIHNjcmlwdHM6IHNjcmlwdHMsXG4gICAgc3R5bGVzOiBzdHlsZXMsXG4gICAgLy8gc2V0IHRoZSBsYXN0IHNjcmlwdCBhcyBlbnRyeSBpZiBoYXZlIG5vdCBzZXRcbiAgICBlbnRyeTogZW50cnkgfHwgc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdXG4gIH07XG59IiwiLyoqXG4gKiBAYXV0aG9yIEt1aXRvc1xuICogQGhvbWVwYWdlIGh0dHBzOi8vZ2l0aHViLmNvbS9rdWl0b3MvXG4gKiBAc2luY2UgMjAxOC0wOC0xNSAxMTozN1xuICovXG5pbXBvcnQgcHJvY2Vzc1RwbCwgeyBnZW5MaW5rUmVwbGFjZVN5bWJvbCwgZ2VuU2NyaXB0UmVwbGFjZVN5bWJvbCB9IGZyb20gJy4vcHJvY2Vzcy10cGwnO1xuaW1wb3J0IHsgZGVmYXVsdEdldFB1YmxpY1BhdGgsIGdldEdsb2JhbFByb3AsIGdldElubGluZUNvZGUsIG5vdGVHbG9iYWxQcm9wcywgcmVhZFJlc0FzU3RyaW5nLCByZXF1ZXN0SWRsZUNhbGxiYWNrIH0gZnJvbSAnLi91dGlscyc7XG52YXIgc3R5bGVDYWNoZSA9IHt9O1xudmFyIHNjcmlwdENhY2hlID0ge307XG52YXIgZW1iZWRIVE1MQ2FjaGUgPSB7fTtcblxuaWYgKCF3aW5kb3cuZmV0Y2gpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdbaW1wb3J0LWh0bWwtZW50cnldIEhlcmUgaXMgbm8gXCJmZXRjaFwiIG9uIHRoZSB3aW5kb3cgZW52LCB5b3UgbmVlZCB0byBwb2x5ZmlsbCBpdCcpO1xufVxuXG52YXIgZGVmYXVsdEZldGNoID0gd2luZG93LmZldGNoLmJpbmQod2luZG93KTtcblxuZnVuY3Rpb24gZGVmYXVsdEdldFRlbXBsYXRlKHRwbCkge1xuICByZXR1cm4gdHBsO1xufVxuLyoqXG4gKiBjb252ZXJ0IGV4dGVybmFsIGNzcyBsaW5rIHRvIGlubGluZSBzdHlsZSBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gKiBAcGFyYW0gdGVtcGxhdGVcbiAqIEBwYXJhbSBzdHlsZXNcbiAqIEBwYXJhbSBvcHRzXG4gKiBAcmV0dXJuIGVtYmVkSFRNTFxuICovXG5cblxuZnVuY3Rpb24gZ2V0RW1iZWRIVE1MKHRlbXBsYXRlLCBzdHlsZXMpIHtcbiAgdmFyIG9wdHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHt9O1xuICB2YXIgX29wdHMkZmV0Y2ggPSBvcHRzLmZldGNoLFxuICAgICAgZmV0Y2ggPSBfb3B0cyRmZXRjaCA9PT0gdm9pZCAwID8gZGVmYXVsdEZldGNoIDogX29wdHMkZmV0Y2g7XG4gIHZhciBlbWJlZEhUTUwgPSB0ZW1wbGF0ZTtcbiAgcmV0dXJuIF9nZXRFeHRlcm5hbFN0eWxlU2hlZXRzKHN0eWxlcywgZmV0Y2gpLnRoZW4oZnVuY3Rpb24gKHN0eWxlU2hlZXRzKSB7XG4gICAgZW1iZWRIVE1MID0gc3R5bGVzLnJlZHVjZShmdW5jdGlvbiAoaHRtbCwgc3R5bGVTcmMsIGkpIHtcbiAgICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoZ2VuTGlua1JlcGxhY2VTeW1ib2woc3R5bGVTcmMpLCBcIjxzdHlsZT4vKiBcIi5jb25jYXQoc3R5bGVTcmMsIFwiICovXCIpLmNvbmNhdChzdHlsZVNoZWV0c1tpXSwgXCI8L3N0eWxlPlwiKSk7XG4gICAgICByZXR1cm4gaHRtbDtcbiAgICB9LCBlbWJlZEhUTUwpO1xuICAgIHJldHVybiBlbWJlZEhUTUw7XG4gIH0pO1xufVxuXG52YXIgaXNJbmxpbmVDb2RlID0gZnVuY3Rpb24gaXNJbmxpbmVDb2RlKGNvZGUpIHtcbiAgcmV0dXJuIGNvZGUuc3RhcnRzV2l0aCgnPCcpO1xufTtcblxuZnVuY3Rpb24gZ2V0RXhlY3V0YWJsZVNjcmlwdChzY3JpcHRTcmMsIHNjcmlwdFRleHQsIHByb3h5LCBzdHJpY3RHbG9iYWwpIHtcbiAgdmFyIHNvdXJjZVVybCA9IGlzSW5saW5lQ29kZShzY3JpcHRTcmMpID8gJycgOiBcIi8vIyBzb3VyY2VVUkw9XCIuY29uY2F0KHNjcmlwdFNyYywgXCJcXG5cIik7IC8vIOmAmui/h+i/meenjeaWueW8j+iOt+WPluWFqOWxgCB3aW5kb3fvvIzlm6DkuLogc2NyaXB0IOS5n+aYr+WcqOWFqOWxgOS9nOeUqOWfn+S4i+i/kOihjOeahO+8jOaJgOS7peaIkeS7rOmAmui/hyB3aW5kb3cucHJveHkg57uR5a6a5pe25Lmf5b+F6aG756Gu5L+d57uR5a6a5Yiw5YWo5bGAIHdpbmRvdyDkuIpcbiAgLy8g5ZCm5YiZ5Zyo5bWM5aWX5Zy65pmv5LiL77yMIHdpbmRvdy5wcm94eSDorr7nva7nmoTmmK/lhoXlsYLlupTnlKjnmoQgd2luZG9377yM6ICM5Luj56CB5YW25a6e5piv5Zyo5YWo5bGA5L2c55So5Z+f6L+Q6KGM55qE77yM5Lya5a+86Ie06Zet5YyF6YeM55qEIHdpbmRvdy5wcm94eSDlj5bnmoTmmK/mnIDlpJblsYLnmoTlvq7lupTnlKjnmoQgcHJveHlcblxuICB2YXIgZ2xvYmFsV2luZG93ID0gKDAsIGV2YWwpKCd3aW5kb3cnKTtcbiAgZ2xvYmFsV2luZG93LnByb3h5ID0gcHJveHk7IC8vIFRPRE8g6YCa6L+HIHN0cmljdEdsb2JhbCDmlrnlvI/liIfmjaLliIfmjaIgd2l0aCDpl63ljIXvvIzlvoUgd2l0aCDmlrnlvI/lnZHotp/lubPlkI7lho3lkIjlubZcblxuICByZXR1cm4gc3RyaWN0R2xvYmFsID8gXCI7KGZ1bmN0aW9uKHdpbmRvdywgc2VsZiwgZ2xvYmFsVGhpcyl7d2l0aCh3aW5kb3cpeztcIi5jb25jYXQoc2NyaXB0VGV4dCwgXCJcXG5cIikuY29uY2F0KHNvdXJjZVVybCwgXCJ9fSkuYmluZCh3aW5kb3cucHJveHkpKHdpbmRvdy5wcm94eSwgd2luZG93LnByb3h5LCB3aW5kb3cucHJveHkpO1wiKSA6IFwiOyhmdW5jdGlvbih3aW5kb3csIHNlbGYsIGdsb2JhbFRoaXMpeztcIi5jb25jYXQoc2NyaXB0VGV4dCwgXCJcXG5cIikuY29uY2F0KHNvdXJjZVVybCwgXCJ9KS5iaW5kKHdpbmRvdy5wcm94eSkod2luZG93LnByb3h5LCB3aW5kb3cucHJveHksIHdpbmRvdy5wcm94eSk7XCIpO1xufSAvLyBmb3IgcHJlZmV0Y2hcblxuXG5mdW5jdGlvbiBfZ2V0RXh0ZXJuYWxTdHlsZVNoZWV0cyhzdHlsZXMpIHtcbiAgdmFyIGZldGNoID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBkZWZhdWx0RmV0Y2g7XG4gIHJldHVybiBQcm9taXNlLmFsbChzdHlsZXMubWFwKGZ1bmN0aW9uIChzdHlsZUxpbmspIHtcbiAgICBpZiAoaXNJbmxpbmVDb2RlKHN0eWxlTGluaykpIHtcbiAgICAgIC8vIGlmIGl0IGlzIGlubGluZSBzdHlsZVxuICAgICAgcmV0dXJuIGdldElubGluZUNvZGUoc3R5bGVMaW5rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZXh0ZXJuYWwgc3R5bGVzXG4gICAgICByZXR1cm4gc3R5bGVDYWNoZVtzdHlsZUxpbmtdIHx8IChzdHlsZUNhY2hlW3N0eWxlTGlua10gPSBmZXRjaChzdHlsZUxpbmspLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgICB9KSk7XG4gICAgfVxuICB9KSk7XG59IC8vIGZvciBwcmVmZXRjaFxuXG5cbmV4cG9ydCB7IF9nZXRFeHRlcm5hbFN0eWxlU2hlZXRzIGFzIGdldEV4dGVybmFsU3R5bGVTaGVldHMgfTtcblxuZnVuY3Rpb24gX2dldEV4dGVybmFsU2NyaXB0cyhzY3JpcHRzKSB7XG4gIHZhciBmZXRjaCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogZGVmYXVsdEZldGNoO1xuICB2YXIgZXJyb3JDYWxsYmFjayA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogZnVuY3Rpb24gKCkge307XG5cbiAgdmFyIGZldGNoU2NyaXB0ID0gZnVuY3Rpb24gZmV0Y2hTY3JpcHQoc2NyaXB0VXJsKSB7XG4gICAgcmV0dXJuIHNjcmlwdENhY2hlW3NjcmlwdFVybF0gfHwgKHNjcmlwdENhY2hlW3NjcmlwdFVybF0gPSBmZXRjaChzY3JpcHRVcmwpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAvLyB1c3VhbGx5IGJyb3dzZXIgdHJlYXRzIDR4eCBhbmQgNXh4IHJlc3BvbnNlIG9mIHNjcmlwdCBsb2FkaW5nIGFzIGFuIGVycm9yIGFuZCB3aWxsIGZpcmUgYSBzY3JpcHQgZXJyb3IgZXZlbnRcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU2MjU0MjAvd2hhdC1odHRwLWhlYWRlcnMtcmVzcG9uc2VzLXRyaWdnZXItdGhlLW9uZXJyb3ItaGFuZGxlci1vbi1hLXNjcmlwdC10YWcvNTYyNTYwM1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgZXJyb3JDYWxsYmFjaygpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcIi5jb25jYXQoc2NyaXB0VXJsLCBcIiBsb2FkIGZhaWxlZCB3aXRoIHN0YXR1cyBcIikuY29uY2F0KHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzcG9uc2UudGV4dCgpO1xuICAgIH0pKTtcbiAgfTtcblxuICByZXR1cm4gUHJvbWlzZS5hbGwoc2NyaXB0cy5tYXAoZnVuY3Rpb24gKHNjcmlwdCkge1xuICAgIGlmICh0eXBlb2Ygc2NyaXB0ID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKGlzSW5saW5lQ29kZShzY3JpcHQpKSB7XG4gICAgICAgIC8vIGlmIGl0IGlzIGlubGluZSBzY3JpcHRcbiAgICAgICAgcmV0dXJuIGdldElubGluZUNvZGUoc2NyaXB0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGV4dGVybmFsIHNjcmlwdFxuICAgICAgICByZXR1cm4gZmV0Y2hTY3JpcHQoc2NyaXB0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdXNlIGlkbGUgdGltZSB0byBsb2FkIGFzeW5jIHNjcmlwdFxuICAgICAgdmFyIHNyYyA9IHNjcmlwdC5zcmMsXG4gICAgICAgICAgYXN5bmMgPSBzY3JpcHQuYXN5bmM7XG5cbiAgICAgIGlmIChhc3luYykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNyYzogc3JjLFxuICAgICAgICAgIGFzeW5jOiB0cnVlLFxuICAgICAgICAgIGNvbnRlbnQ6IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0SWRsZUNhbGxiYWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZldGNoU2NyaXB0KHNyYykudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZldGNoU2NyaXB0KHNyYyk7XG4gICAgfVxuICB9KSk7XG59XG5cbmV4cG9ydCB7IF9nZXRFeHRlcm5hbFNjcmlwdHMgYXMgZ2V0RXh0ZXJuYWxTY3JpcHRzIH07XG5cbmZ1bmN0aW9uIHRocm93Tm9uQmxvY2tpbmdFcnJvcihlcnJvciwgbXNnKSB7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfSk7XG59XG5cbnZhciBzdXBwb3J0c1VzZXJUaW1pbmcgPSB0eXBlb2YgcGVyZm9ybWFuY2UgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5tYXJrID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5jbGVhck1hcmtzID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5tZWFzdXJlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzID09PSAnZnVuY3Rpb24nO1xuLyoqXG4gKiBGSVhNRSB0byBjb25zaXN0ZW50IHdpdGggYnJvd3NlciBiZWhhdmlvciwgd2Ugc2hvdWxkIG9ubHkgcHJvdmlkZSBjYWxsYmFjayB3YXkgdG8gaW52b2tlIHN1Y2Nlc3MgYW5kIGVycm9yIGV2ZW50XG4gKiBAcGFyYW0gZW50cnlcbiAqIEBwYXJhbSBzY3JpcHRzXG4gKiBAcGFyYW0gcHJveHlcbiAqIEBwYXJhbSBvcHRzXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx1bmtub3duPn1cbiAqL1xuXG5mdW5jdGlvbiBfZXhlY1NjcmlwdHMoZW50cnksIHNjcmlwdHMpIHtcbiAgdmFyIHByb3h5ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiB3aW5kb3c7XG4gIHZhciBvcHRzID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiB7fTtcbiAgdmFyIF9vcHRzJGZldGNoMiA9IG9wdHMuZmV0Y2gsXG4gICAgICBmZXRjaCA9IF9vcHRzJGZldGNoMiA9PT0gdm9pZCAwID8gZGVmYXVsdEZldGNoIDogX29wdHMkZmV0Y2gyLFxuICAgICAgX29wdHMkc3RyaWN0R2xvYmFsID0gb3B0cy5zdHJpY3RHbG9iYWwsXG4gICAgICBzdHJpY3RHbG9iYWwgPSBfb3B0cyRzdHJpY3RHbG9iYWwgPT09IHZvaWQgMCA/IGZhbHNlIDogX29wdHMkc3RyaWN0R2xvYmFsLFxuICAgICAgc3VjY2VzcyA9IG9wdHMuc3VjY2VzcyxcbiAgICAgIF9vcHRzJGVycm9yID0gb3B0cy5lcnJvcixcbiAgICAgIGVycm9yID0gX29wdHMkZXJyb3IgPT09IHZvaWQgMCA/IGZ1bmN0aW9uICgpIHt9IDogX29wdHMkZXJyb3IsXG4gICAgICBfb3B0cyRiZWZvcmVFeGVjID0gb3B0cy5iZWZvcmVFeGVjLFxuICAgICAgYmVmb3JlRXhlYyA9IF9vcHRzJGJlZm9yZUV4ZWMgPT09IHZvaWQgMCA/IGZ1bmN0aW9uICgpIHt9IDogX29wdHMkYmVmb3JlRXhlYyxcbiAgICAgIF9vcHRzJGFmdGVyRXhlYyA9IG9wdHMuYWZ0ZXJFeGVjLFxuICAgICAgYWZ0ZXJFeGVjID0gX29wdHMkYWZ0ZXJFeGVjID09PSB2b2lkIDAgPyBmdW5jdGlvbiAoKSB7fSA6IF9vcHRzJGFmdGVyRXhlYztcbiAgcmV0dXJuIF9nZXRFeHRlcm5hbFNjcmlwdHMoc2NyaXB0cywgZmV0Y2gsIGVycm9yKS50aGVuKGZ1bmN0aW9uIChzY3JpcHRzVGV4dCkge1xuICAgIHZhciBnZXZhbCA9IGZ1bmN0aW9uIGdldmFsKHNjcmlwdFNyYywgaW5saW5lU2NyaXB0KSB7XG4gICAgICB2YXIgcmF3Q29kZSA9IGJlZm9yZUV4ZWMoaW5saW5lU2NyaXB0LCBzY3JpcHRTcmMpIHx8IGlubGluZVNjcmlwdDtcbiAgICAgIHZhciBjb2RlID0gZ2V0RXhlY3V0YWJsZVNjcmlwdChzY3JpcHRTcmMsIHJhd0NvZGUsIHByb3h5LCBzdHJpY3RHbG9iYWwpO1xuICAgICAgKDAsIGV2YWwpKGNvZGUpO1xuICAgICAgYWZ0ZXJFeGVjKGlubGluZVNjcmlwdCwgc2NyaXB0U3JjKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZXhlYyhzY3JpcHRTcmMsIGlubGluZVNjcmlwdCwgcmVzb2x2ZSkge1xuICAgICAgdmFyIG1hcmtOYW1lID0gXCJFdmFsdWF0aW5nIHNjcmlwdCBcIi5jb25jYXQoc2NyaXB0U3JjKTtcbiAgICAgIHZhciBtZWFzdXJlTmFtZSA9IFwiRXZhbHVhdGluZyBUaW1lIENvbnN1bWluZzogXCIuY29uY2F0KHNjcmlwdFNyYyk7XG5cbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyAmJiBzdXBwb3J0c1VzZXJUaW1pbmcpIHtcbiAgICAgICAgcGVyZm9ybWFuY2UubWFyayhtYXJrTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzY3JpcHRTcmMgPT09IGVudHJ5KSB7XG4gICAgICAgIG5vdGVHbG9iYWxQcm9wcyhzdHJpY3RHbG9iYWwgPyBwcm94eSA6IHdpbmRvdyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBiaW5kIHdpbmRvdy5wcm94eSB0byBjaGFuZ2UgYHRoaXNgIHJlZmVyZW5jZSBpbiBzY3JpcHRcbiAgICAgICAgICBnZXZhbChzY3JpcHRTcmMsIGlubGluZVNjcmlwdCk7XG4gICAgICAgICAgdmFyIGV4cG9ydHMgPSBwcm94eVtnZXRHbG9iYWxQcm9wKHN0cmljdEdsb2JhbCA/IHByb3h5IDogd2luZG93KV0gfHwge307XG4gICAgICAgICAgcmVzb2x2ZShleHBvcnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIGVudHJ5IGVycm9yIG11c3QgYmUgdGhyb3duIHRvIG1ha2UgdGhlIHByb21pc2Ugc2V0dGxlZFxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbaW1wb3J0LWh0bWwtZW50cnldOiBlcnJvciBvY2N1cnMgd2hpbGUgZXhlY3V0aW5nIGVudHJ5IHNjcmlwdCBcIi5jb25jYXQoc2NyaXB0U3JjKSk7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmxpbmVTY3JpcHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGJpbmQgd2luZG93LnByb3h5IHRvIGNoYW5nZSBgdGhpc2AgcmVmZXJlbmNlIGluIHNjcmlwdFxuICAgICAgICAgICAgZ2V2YWwoc2NyaXB0U3JjLCBpbmxpbmVTY3JpcHQpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNpc3RlbnQgd2l0aCBicm93c2VyIGJlaGF2aW9yLCBhbnkgaW5kZXBlbmRlbnQgc2NyaXB0IGV2YWx1YXRpb24gZXJyb3Igc2hvdWxkIG5vdCBibG9jayB0aGUgb3RoZXJzXG4gICAgICAgICAgICB0aHJvd05vbkJsb2NraW5nRXJyb3IoZSwgXCJbaW1wb3J0LWh0bWwtZW50cnldOiBlcnJvciBvY2N1cnMgd2hpbGUgZXhlY3V0aW5nIG5vcm1hbCBzY3JpcHQgXCIuY29uY2F0KHNjcmlwdFNyYykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBleHRlcm5hbCBzY3JpcHQgbWFya2VkIHdpdGggYXN5bmNcbiAgICAgICAgICBpbmxpbmVTY3JpcHQuYXN5bmMgJiYgKGlubGluZVNjcmlwdCA9PT0gbnVsbCB8fCBpbmxpbmVTY3JpcHQgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGlubGluZVNjcmlwdC5jb250ZW50LnRoZW4oZnVuY3Rpb24gKGRvd25sb2FkZWRTY3JpcHRUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V2YWwoaW5saW5lU2NyaXB0LnNyYywgZG93bmxvYWRlZFNjcmlwdFRleHQpO1xuICAgICAgICAgIH0pW1wiY2F0Y2hcIl0oZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHRocm93Tm9uQmxvY2tpbmdFcnJvcihlLCBcIltpbXBvcnQtaHRtbC1lbnRyeV06IGVycm9yIG9jY3VycyB3aGlsZSBleGVjdXRpbmcgYXN5bmMgc2NyaXB0IFwiLmNvbmNhdChpbmxpbmVTY3JpcHQuc3JjKSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyAmJiBzdXBwb3J0c1VzZXJUaW1pbmcpIHtcbiAgICAgICAgcGVyZm9ybWFuY2UubWVhc3VyZShtZWFzdXJlTmFtZSwgbWFya05hbWUpO1xuICAgICAgICBwZXJmb3JtYW5jZS5jbGVhck1hcmtzKG1hcmtOYW1lKTtcbiAgICAgICAgcGVyZm9ybWFuY2UuY2xlYXJNZWFzdXJlcyhtZWFzdXJlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NoZWR1bGUoaSwgcmVzb2x2ZVByb21pc2UpIHtcbiAgICAgIGlmIChpIDwgc2NyaXB0cy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNjcmlwdFNyYyA9IHNjcmlwdHNbaV07XG4gICAgICAgIHZhciBpbmxpbmVTY3JpcHQgPSBzY3JpcHRzVGV4dFtpXTtcbiAgICAgICAgZXhlYyhzY3JpcHRTcmMsIGlubGluZVNjcmlwdCwgcmVzb2x2ZVByb21pc2UpOyAvLyByZXNvbHZlIHRoZSBwcm9taXNlIHdoaWxlIHRoZSBsYXN0IHNjcmlwdCBleGVjdXRlZCBhbmQgZW50cnkgbm90IHByb3ZpZGVkXG5cbiAgICAgICAgaWYgKCFlbnRyeSAmJiBpID09PSBzY3JpcHRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICByZXNvbHZlUHJvbWlzZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNjaGVkdWxlKGkgKyAxLCByZXNvbHZlUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgIHJldHVybiBzY2hlZHVsZSgwLCBzdWNjZXNzIHx8IHJlc29sdmUpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IHsgX2V4ZWNTY3JpcHRzIGFzIGV4ZWNTY3JpcHRzIH07XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbXBvcnRIVE1MKHVybCkge1xuICB2YXIgb3B0cyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG4gIHZhciBmZXRjaCA9IGRlZmF1bHRGZXRjaDtcbiAgdmFyIGF1dG9EZWNvZGVSZXNwb25zZSA9IGZhbHNlO1xuICB2YXIgZ2V0UHVibGljUGF0aCA9IGRlZmF1bHRHZXRQdWJsaWNQYXRoO1xuICB2YXIgZ2V0VGVtcGxhdGUgPSBkZWZhdWx0R2V0VGVtcGxhdGU7IC8vIGNvbXBhdGlibGUgd2l0aCB0aGUgbGVnYWN5IGltcG9ydEhUTUwgYXBpXG5cbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZmV0Y2ggPSBvcHRzO1xuICB9IGVsc2Uge1xuICAgIC8vIGZldGNoIG9wdGlvbiBpcyBhdmFpbGJsZVxuICAgIGlmIChvcHRzLmZldGNoKSB7XG4gICAgICAvLyBmZXRjaCBpcyBhIGZ1bmNpdG9uXG4gICAgICBpZiAodHlwZW9mIG9wdHMuZmV0Y2ggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZmV0Y2ggPSBvcHRzLmZldGNoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uZmlndXJhdGlvblxuICAgICAgICBmZXRjaCA9IG9wdHMuZmV0Y2guZm4gfHwgZGVmYXVsdEZldGNoO1xuICAgICAgICBhdXRvRGVjb2RlUmVzcG9uc2UgPSAhIW9wdHMuZmV0Y2guYXV0b0RlY29kZVJlc3BvbnNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGdldFB1YmxpY1BhdGggPSBvcHRzLmdldFB1YmxpY1BhdGggfHwgb3B0cy5nZXREb21haW4gfHwgZGVmYXVsdEdldFB1YmxpY1BhdGg7XG4gICAgZ2V0VGVtcGxhdGUgPSBvcHRzLmdldFRlbXBsYXRlIHx8IGRlZmF1bHRHZXRUZW1wbGF0ZTtcbiAgfVxuXG4gIHJldHVybiBlbWJlZEhUTUxDYWNoZVt1cmxdIHx8IChlbWJlZEhUTUxDYWNoZVt1cmxdID0gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHJldHVybiByZWFkUmVzQXNTdHJpbmcocmVzcG9uc2UsIGF1dG9EZWNvZGVSZXNwb25zZSk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKGh0bWwpIHtcbiAgICB2YXIgYXNzZXRQdWJsaWNQYXRoID0gZ2V0UHVibGljUGF0aCh1cmwpO1xuXG4gICAgdmFyIF9wcm9jZXNzVHBsID0gcHJvY2Vzc1RwbChnZXRUZW1wbGF0ZShodG1sKSwgYXNzZXRQdWJsaWNQYXRoKSxcbiAgICAgICAgdGVtcGxhdGUgPSBfcHJvY2Vzc1RwbC50ZW1wbGF0ZSxcbiAgICAgICAgc2NyaXB0cyA9IF9wcm9jZXNzVHBsLnNjcmlwdHMsXG4gICAgICAgIGVudHJ5ID0gX3Byb2Nlc3NUcGwuZW50cnksXG4gICAgICAgIHN0eWxlcyA9IF9wcm9jZXNzVHBsLnN0eWxlcztcblxuICAgIHJldHVybiBnZXRFbWJlZEhUTUwodGVtcGxhdGUsIHN0eWxlcywge1xuICAgICAgZmV0Y2g6IGZldGNoXG4gICAgfSkudGhlbihmdW5jdGlvbiAoZW1iZWRIVE1MKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0ZW1wbGF0ZTogZW1iZWRIVE1MLFxuICAgICAgICBhc3NldFB1YmxpY1BhdGg6IGFzc2V0UHVibGljUGF0aCxcbiAgICAgICAgZ2V0RXh0ZXJuYWxTY3JpcHRzOiBmdW5jdGlvbiBnZXRFeHRlcm5hbFNjcmlwdHMoKSB7XG4gICAgICAgICAgcmV0dXJuIF9nZXRFeHRlcm5hbFNjcmlwdHMoc2NyaXB0cywgZmV0Y2gpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRFeHRlcm5hbFN0eWxlU2hlZXRzOiBmdW5jdGlvbiBnZXRFeHRlcm5hbFN0eWxlU2hlZXRzKCkge1xuICAgICAgICAgIHJldHVybiBfZ2V0RXh0ZXJuYWxTdHlsZVNoZWV0cyhzdHlsZXMsIGZldGNoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXhlY1NjcmlwdHM6IGZ1bmN0aW9uIGV4ZWNTY3JpcHRzKHByb3h5LCBzdHJpY3RHbG9iYWwpIHtcbiAgICAgICAgICB2YXIgZXhlY1NjcmlwdHNIb29rcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDoge307XG5cbiAgICAgICAgICBpZiAoIXNjcmlwdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIF9leGVjU2NyaXB0cyhlbnRyeSwgc2NyaXB0cywgcHJveHksIHtcbiAgICAgICAgICAgIGZldGNoOiBmZXRjaCxcbiAgICAgICAgICAgIHN0cmljdEdsb2JhbDogc3RyaWN0R2xvYmFsLFxuICAgICAgICAgICAgYmVmb3JlRXhlYzogZXhlY1NjcmlwdHNIb29rcy5iZWZvcmVFeGVjLFxuICAgICAgICAgICAgYWZ0ZXJFeGVjOiBleGVjU2NyaXB0c0hvb2tzLmFmdGVyRXhlY1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaW1wb3J0RW50cnkoZW50cnkpIHtcbiAgdmFyIG9wdHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9O1xuICB2YXIgX29wdHMkZmV0Y2gzID0gb3B0cy5mZXRjaCxcbiAgICAgIGZldGNoID0gX29wdHMkZmV0Y2gzID09PSB2b2lkIDAgPyBkZWZhdWx0RmV0Y2ggOiBfb3B0cyRmZXRjaDMsXG4gICAgICBfb3B0cyRnZXRUZW1wbGF0ZSA9IG9wdHMuZ2V0VGVtcGxhdGUsXG4gICAgICBnZXRUZW1wbGF0ZSA9IF9vcHRzJGdldFRlbXBsYXRlID09PSB2b2lkIDAgPyBkZWZhdWx0R2V0VGVtcGxhdGUgOiBfb3B0cyRnZXRUZW1wbGF0ZTtcbiAgdmFyIGdldFB1YmxpY1BhdGggPSBvcHRzLmdldFB1YmxpY1BhdGggfHwgb3B0cy5nZXREb21haW4gfHwgZGVmYXVsdEdldFB1YmxpY1BhdGg7XG5cbiAgaWYgKCFlbnRyeSkge1xuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignZW50cnkgc2hvdWxkIG5vdCBiZSBlbXB0eSEnKTtcbiAgfSAvLyBodG1sIGVudHJ5XG5cblxuICBpZiAodHlwZW9mIGVudHJ5ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBpbXBvcnRIVE1MKGVudHJ5LCB7XG4gICAgICBmZXRjaDogZmV0Y2gsXG4gICAgICBnZXRQdWJsaWNQYXRoOiBnZXRQdWJsaWNQYXRoLFxuICAgICAgZ2V0VGVtcGxhdGU6IGdldFRlbXBsYXRlXG4gICAgfSk7XG4gIH0gLy8gY29uZmlnIGVudHJ5XG5cblxuICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeS5zY3JpcHRzKSB8fCBBcnJheS5pc0FycmF5KGVudHJ5LnN0eWxlcykpIHtcbiAgICB2YXIgX2VudHJ5JHNjcmlwdHMgPSBlbnRyeS5zY3JpcHRzLFxuICAgICAgICBzY3JpcHRzID0gX2VudHJ5JHNjcmlwdHMgPT09IHZvaWQgMCA/IFtdIDogX2VudHJ5JHNjcmlwdHMsXG4gICAgICAgIF9lbnRyeSRzdHlsZXMgPSBlbnRyeS5zdHlsZXMsXG4gICAgICAgIHN0eWxlcyA9IF9lbnRyeSRzdHlsZXMgPT09IHZvaWQgMCA/IFtdIDogX2VudHJ5JHN0eWxlcyxcbiAgICAgICAgX2VudHJ5JGh0bWwgPSBlbnRyeS5odG1sLFxuICAgICAgICBodG1sID0gX2VudHJ5JGh0bWwgPT09IHZvaWQgMCA/ICcnIDogX2VudHJ5JGh0bWw7XG5cbiAgICB2YXIgc2V0U3R5bGVQbGFjZWhvbGRlcjJIVE1MID0gZnVuY3Rpb24gc2V0U3R5bGVQbGFjZWhvbGRlcjJIVE1MKHRwbCkge1xuICAgICAgcmV0dXJuIHN0eWxlcy5yZWR1Y2VSaWdodChmdW5jdGlvbiAoaHRtbCwgc3R5bGVTcmMpIHtcbiAgICAgICAgcmV0dXJuIFwiXCIuY29uY2F0KGdlbkxpbmtSZXBsYWNlU3ltYm9sKHN0eWxlU3JjKSkuY29uY2F0KGh0bWwpO1xuICAgICAgfSwgdHBsKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFNjcmlwdFBsYWNlaG9sZGVyMkhUTUwgPSBmdW5jdGlvbiBzZXRTY3JpcHRQbGFjZWhvbGRlcjJIVE1MKHRwbCkge1xuICAgICAgcmV0dXJuIHNjcmlwdHMucmVkdWNlKGZ1bmN0aW9uIChodG1sLCBzY3JpcHRTcmMpIHtcbiAgICAgICAgcmV0dXJuIFwiXCIuY29uY2F0KGh0bWwpLmNvbmNhdChnZW5TY3JpcHRSZXBsYWNlU3ltYm9sKHNjcmlwdFNyYykpO1xuICAgICAgfSwgdHBsKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGdldEVtYmVkSFRNTChnZXRUZW1wbGF0ZShzZXRTY3JpcHRQbGFjZWhvbGRlcjJIVE1MKHNldFN0eWxlUGxhY2Vob2xkZXIySFRNTChodG1sKSkpLCBzdHlsZXMsIHtcbiAgICAgIGZldGNoOiBmZXRjaFxuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGVtYmVkSFRNTCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdGVtcGxhdGU6IGVtYmVkSFRNTCxcbiAgICAgICAgYXNzZXRQdWJsaWNQYXRoOiBnZXRQdWJsaWNQYXRoKGVudHJ5KSxcbiAgICAgICAgZ2V0RXh0ZXJuYWxTY3JpcHRzOiBmdW5jdGlvbiBnZXRFeHRlcm5hbFNjcmlwdHMoKSB7XG4gICAgICAgICAgcmV0dXJuIF9nZXRFeHRlcm5hbFNjcmlwdHMoc2NyaXB0cywgZmV0Y2gpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRFeHRlcm5hbFN0eWxlU2hlZXRzOiBmdW5jdGlvbiBnZXRFeHRlcm5hbFN0eWxlU2hlZXRzKCkge1xuICAgICAgICAgIHJldHVybiBfZ2V0RXh0ZXJuYWxTdHlsZVNoZWV0cyhzdHlsZXMsIGZldGNoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXhlY1NjcmlwdHM6IGZ1bmN0aW9uIGV4ZWNTY3JpcHRzKHByb3h5LCBzdHJpY3RHbG9iYWwpIHtcbiAgICAgICAgICB2YXIgZXhlY1NjcmlwdHNIb29rcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDoge307XG5cbiAgICAgICAgICBpZiAoIXNjcmlwdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIF9leGVjU2NyaXB0cyhzY3JpcHRzW3NjcmlwdHMubGVuZ3RoIC0gMV0sIHNjcmlwdHMsIHByb3h5LCB7XG4gICAgICAgICAgICBmZXRjaDogZmV0Y2gsXG4gICAgICAgICAgICBzdHJpY3RHbG9iYWw6IHN0cmljdEdsb2JhbCxcbiAgICAgICAgICAgIGJlZm9yZUV4ZWM6IGV4ZWNTY3JpcHRzSG9va3MuYmVmb3JlRXhlYyxcbiAgICAgICAgICAgIGFmdGVyRXhlYzogZXhlY1NjcmlwdHNIb29rcy5hZnRlckV4ZWNcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2VudHJ5IHNjcmlwdHMgb3Igc3R5bGVzIHNob3VsZCBiZSBhcnJheSEnKTtcbiAgfVxufSIsImltcG9ydCBfcmVnZW5lcmF0b3JSdW50aW1lIGZyb20gXCJAYmFiZWwvcnVudGltZS9yZWdlbmVyYXRvclwiO1xuaW1wb3J0IHsgX19hd2FpdGVyIH0gZnJvbSBcInRzbGliXCI7XG52YXIgcmF3UHVibGljUGF0aCA9IHdpbmRvdy5fX0lOSkVDVEVEX1BVQkxJQ19QQVRIX0JZX1FJQU5LVU5fXztcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldEFkZE9uKGdsb2JhbCkge1xuICB2YXIgcHVibGljUGF0aCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogJy8nO1xuICB2YXIgaGFzTW91bnRlZE9uY2UgPSBmYWxzZTtcbiAgcmV0dXJuIHtcbiAgICBiZWZvcmVMb2FkOiBmdW5jdGlvbiBiZWZvcmVMb2FkKCkge1xuICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlKCkge1xuICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUkKF9jb250ZXh0KSB7XG4gICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQucHJldiA9IF9jb250ZXh0Lm5leHQpIHtcbiAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICAgICAgICAgIGdsb2JhbC5fX0lOSkVDVEVEX1BVQkxJQ19QQVRIX0JZX1FJQU5LVU5fXyA9IHB1YmxpY1BhdGg7XG5cbiAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0LnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgYmVmb3JlTW91bnQ6IGZ1bmN0aW9uIGJlZm9yZU1vdW50KCkge1xuICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMigpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMiQoX2NvbnRleHQyKSB7XG4gICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQyLnByZXYgPSBfY29udGV4dDIubmV4dCkge1xuICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgaWYgKGhhc01vdW50ZWRPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgICAgICAgICAgIGdsb2JhbC5fX0lOSkVDVEVEX1BVQkxJQ19QQVRIX0JZX1FJQU5LVU5fXyA9IHB1YmxpY1BhdGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgX2NhbGxlZTIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgYmVmb3JlVW5tb3VudDogZnVuY3Rpb24gYmVmb3JlVW5tb3VudCgpIHtcbiAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTMoKSB7XG4gICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTMkKF9jb250ZXh0Mykge1xuICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0My5wcmV2ID0gX2NvbnRleHQzLm5leHQpIHtcbiAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIGlmIChyYXdQdWJsaWNQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICAgICAgICAgICAgZGVsZXRlIGdsb2JhbC5fX0lOSkVDVEVEX1BVQkxJQ19QQVRIX0JZX1FJQU5LVU5fXztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgICAgICAgICAgICBnbG9iYWwuX19JTkpFQ1RFRF9QVUJMSUNfUEFUSF9CWV9RSUFOS1VOX18gPSByYXdQdWJsaWNQYXRoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhhc01vdW50ZWRPbmNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQzLnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUzKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH07XG59IiwiaW1wb3J0IF9yZWdlbmVyYXRvclJ1bnRpbWUgZnJvbSBcIkBiYWJlbC9ydW50aW1lL3JlZ2VuZXJhdG9yXCI7XG5cbi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDIwLTA1LTE1XG4gKi9cbmltcG9ydCB7IF9fYXdhaXRlciB9IGZyb20gXCJ0c2xpYlwiO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0QWRkT24oZ2xvYmFsKSB7XG4gIHJldHVybiB7XG4gICAgYmVmb3JlTG9hZDogZnVuY3Rpb24gYmVmb3JlTG9hZCgpIHtcbiAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZSgpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlJChfY29udGV4dCkge1xuICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0LnByZXYgPSBfY29udGV4dC5uZXh0KSB7XG4gICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgICAgICAgICBnbG9iYWwuX19QT1dFUkVEX0JZX1FJQU5LVU5fXyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0LnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgYmVmb3JlTW91bnQ6IGZ1bmN0aW9uIGJlZm9yZU1vdW50KCkge1xuICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMigpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMiQoX2NvbnRleHQyKSB7XG4gICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQyLnByZXYgPSBfY29udGV4dDIubmV4dCkge1xuICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgICAgICAgICAgZ2xvYmFsLl9fUE9XRVJFRF9CWV9RSUFOS1VOX18gPSB0cnVlO1xuXG4gICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgX2NhbGxlZTIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgYmVmb3JlVW5tb3VudDogZnVuY3Rpb24gYmVmb3JlVW5tb3VudCgpIHtcbiAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTMoKSB7XG4gICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTMkKF9jb250ZXh0Mykge1xuICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0My5wcmV2ID0gX2NvbnRleHQzLm5leHQpIHtcbiAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICAgICAgICAgIGRlbGV0ZSBnbG9iYWwuX19QT1dFUkVEX0JZX1FJQU5LVU5fXztcblxuICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQzLnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUzKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH07XG59IiwiaW1wb3J0IF9jb25jYXQgZnJvbSBcImxvZGFzaC9jb25jYXRcIjtcbmltcG9ydCBfbWVyZ2VXaXRoIGZyb20gXCJsb2Rhc2gvbWVyZ2VXaXRoXCI7XG5pbXBvcnQgZ2V0UnVudGltZVB1YmxpY1BhdGhBZGRPbiBmcm9tICcuL3J1bnRpbWVQdWJsaWNQYXRoJztcbmltcG9ydCBnZXRFbmdpbmVGbGFnQWRkb24gZnJvbSAnLi9lbmdpbmVGbGFnJztcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldEFkZE9ucyhnbG9iYWwsIHB1YmxpY1BhdGgpIHtcbiAgcmV0dXJuIF9tZXJnZVdpdGgoe30sIGdldEVuZ2luZUZsYWdBZGRvbihnbG9iYWwpLCBnZXRSdW50aW1lUHVibGljUGF0aEFkZE9uKGdsb2JhbCwgcHVibGljUGF0aCksIGZ1bmN0aW9uICh2MSwgdjIpIHtcbiAgICByZXR1cm4gX2NvbmNhdCh2MSAhPT0gbnVsbCAmJiB2MSAhPT0gdm9pZCAwID8gdjEgOiBbXSwgdjIgIT09IG51bGwgJiYgdjIgIT09IHZvaWQgMCA/IHYyIDogW10pO1xuICB9KTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7XG4gIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgfVxufSIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7XG4gIF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkge1xuICAgIG8uX19wcm90b19fID0gcDtcbiAgICByZXR1cm4gbztcbiAgfTtcblxuICByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApO1xufSIsImltcG9ydCBzZXRQcm90b3R5cGVPZiBmcm9tIFwiLi9zZXRQcm90b3R5cGVPZi5qc1wiO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7XG4gIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7XG4gIH1cblxuICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IHN1YkNsYXNzLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9XG4gIH0pO1xuICBpZiAoc3VwZXJDbGFzcykgc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpO1xufSIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7XG4gIF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7XG4gICAgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTtcbiAgfTtcbiAgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfaXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0KCkge1xuICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwidW5kZWZpbmVkXCIgfHwgIVJlZmxlY3QuY29uc3RydWN0KSByZXR1cm4gZmFsc2U7XG4gIGlmIChSZWZsZWN0LmNvbnN0cnVjdC5zaGFtKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgUHJveHkgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRydWU7XG5cbiAgdHJ5IHtcbiAgICBCb29sZWFuLnByb3RvdHlwZS52YWx1ZU9mLmNhbGwoUmVmbGVjdC5jb25zdHJ1Y3QoQm9vbGVhbiwgW10sIGZ1bmN0aW9uICgpIHt9KSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHtcbiAgaWYgKHNlbGYgPT09IHZvaWQgMCkge1xuICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmO1xufSIsImltcG9ydCBfdHlwZW9mIGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL3R5cGVvZlwiO1xuaW1wb3J0IGFzc2VydFRoaXNJbml0aWFsaXplZCBmcm9tIFwiLi9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQuanNcIjtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHtcbiAgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHtcbiAgICByZXR1cm4gY2FsbDtcbiAgfSBlbHNlIGlmIChjYWxsICE9PSB2b2lkIDApIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRGVyaXZlZCBjb25zdHJ1Y3RvcnMgbWF5IG9ubHkgcmV0dXJuIG9iamVjdCBvciB1bmRlZmluZWRcIik7XG4gIH1cblxuICByZXR1cm4gYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpO1xufSIsImltcG9ydCBnZXRQcm90b3R5cGVPZiBmcm9tIFwiLi9nZXRQcm90b3R5cGVPZi5qc1wiO1xuaW1wb3J0IGlzTmF0aXZlUmVmbGVjdENvbnN0cnVjdCBmcm9tIFwiLi9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QuanNcIjtcbmltcG9ydCBwb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuIGZyb20gXCIuL3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4uanNcIjtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9jcmVhdGVTdXBlcihEZXJpdmVkKSB7XG4gIHZhciBoYXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0ID0gaXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0KCk7XG4gIHJldHVybiBmdW5jdGlvbiBfY3JlYXRlU3VwZXJJbnRlcm5hbCgpIHtcbiAgICB2YXIgU3VwZXIgPSBnZXRQcm90b3R5cGVPZihEZXJpdmVkKSxcbiAgICAgICAgcmVzdWx0O1xuXG4gICAgaWYgKGhhc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QpIHtcbiAgICAgIHZhciBOZXdUYXJnZXQgPSBnZXRQcm90b3R5cGVPZih0aGlzKS5jb25zdHJ1Y3RvcjtcbiAgICAgIHJlc3VsdCA9IFJlZmxlY3QuY29uc3RydWN0KFN1cGVyLCBhcmd1bWVudHMsIE5ld1RhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IFN1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgcmVzdWx0KTtcbiAgfTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfaXNOYXRpdmVGdW5jdGlvbihmbikge1xuICByZXR1cm4gRnVuY3Rpb24udG9TdHJpbmcuY2FsbChmbikuaW5kZXhPZihcIltuYXRpdmUgY29kZV1cIikgIT09IC0xO1xufSIsImltcG9ydCBzZXRQcm90b3R5cGVPZiBmcm9tIFwiLi9zZXRQcm90b3R5cGVPZi5qc1wiO1xuaW1wb3J0IGlzTmF0aXZlUmVmbGVjdENvbnN0cnVjdCBmcm9tIFwiLi9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QuanNcIjtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIF9jb25zdHJ1Y3QoUGFyZW50LCBhcmdzLCBDbGFzcykge1xuICBpZiAoaXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0KCkpIHtcbiAgICBfY29uc3RydWN0ID0gUmVmbGVjdC5jb25zdHJ1Y3Q7XG4gIH0gZWxzZSB7XG4gICAgX2NvbnN0cnVjdCA9IGZ1bmN0aW9uIF9jb25zdHJ1Y3QoUGFyZW50LCBhcmdzLCBDbGFzcykge1xuICAgICAgdmFyIGEgPSBbbnVsbF07XG4gICAgICBhLnB1c2guYXBwbHkoYSwgYXJncyk7XG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSBGdW5jdGlvbi5iaW5kLmFwcGx5KFBhcmVudCwgYSk7XG4gICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgQ29uc3RydWN0b3IoKTtcbiAgICAgIGlmIChDbGFzcykgc2V0UHJvdG90eXBlT2YoaW5zdGFuY2UsIENsYXNzLnByb3RvdHlwZSk7XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBfY29uc3RydWN0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59IiwiaW1wb3J0IGdldFByb3RvdHlwZU9mIGZyb20gXCIuL2dldFByb3RvdHlwZU9mLmpzXCI7XG5pbXBvcnQgc2V0UHJvdG90eXBlT2YgZnJvbSBcIi4vc2V0UHJvdG90eXBlT2YuanNcIjtcbmltcG9ydCBpc05hdGl2ZUZ1bmN0aW9uIGZyb20gXCIuL2lzTmF0aXZlRnVuY3Rpb24uanNcIjtcbmltcG9ydCBjb25zdHJ1Y3QgZnJvbSBcIi4vY29uc3RydWN0LmpzXCI7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfd3JhcE5hdGl2ZVN1cGVyKENsYXNzKSB7XG4gIHZhciBfY2FjaGUgPSB0eXBlb2YgTWFwID09PSBcImZ1bmN0aW9uXCIgPyBuZXcgTWFwKCkgOiB1bmRlZmluZWQ7XG5cbiAgX3dyYXBOYXRpdmVTdXBlciA9IGZ1bmN0aW9uIF93cmFwTmF0aXZlU3VwZXIoQ2xhc3MpIHtcbiAgICBpZiAoQ2xhc3MgPT09IG51bGwgfHwgIWlzTmF0aXZlRnVuY3Rpb24oQ2xhc3MpKSByZXR1cm4gQ2xhc3M7XG5cbiAgICBpZiAodHlwZW9mIENsYXNzICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIF9jYWNoZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaWYgKF9jYWNoZS5oYXMoQ2xhc3MpKSByZXR1cm4gX2NhY2hlLmdldChDbGFzcyk7XG5cbiAgICAgIF9jYWNoZS5zZXQoQ2xhc3MsIFdyYXBwZXIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFdyYXBwZXIoKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0KENsYXNzLCBhcmd1bWVudHMsIGdldFByb3RvdHlwZU9mKHRoaXMpLmNvbnN0cnVjdG9yKTtcbiAgICB9XG5cbiAgICBXcmFwcGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ2xhc3MucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogV3JhcHBlcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc2V0UHJvdG90eXBlT2YoV3JhcHBlciwgQ2xhc3MpO1xuICB9O1xuXG4gIHJldHVybiBfd3JhcE5hdGl2ZVN1cGVyKENsYXNzKTtcbn0iLCJpbXBvcnQgX2NsYXNzQ2FsbENoZWNrIGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jbGFzc0NhbGxDaGVja1wiO1xuaW1wb3J0IF9pbmhlcml0cyBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vaW5oZXJpdHNcIjtcbmltcG9ydCBfY3JlYXRlU3VwZXIgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL2NyZWF0ZVN1cGVyXCI7XG5pbXBvcnQgX3dyYXBOYXRpdmVTdXBlciBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vd3JhcE5hdGl2ZVN1cGVyXCI7XG5leHBvcnQgdmFyIFFpYW5rdW5FcnJvciA9IC8qI19fUFVSRV9fKi9mdW5jdGlvbiAoX0Vycm9yKSB7XG4gIF9pbmhlcml0cyhRaWFua3VuRXJyb3IsIF9FcnJvcik7XG5cbiAgdmFyIF9zdXBlciA9IF9jcmVhdGVTdXBlcihRaWFua3VuRXJyb3IpO1xuXG4gIGZ1bmN0aW9uIFFpYW5rdW5FcnJvcihtZXNzYWdlKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFFpYW5rdW5FcnJvcik7XG5cbiAgICByZXR1cm4gX3N1cGVyLmNhbGwodGhpcywgXCJbcWlhbmt1bl06IFwiLmNvbmNhdChtZXNzYWdlKSk7XG4gIH1cblxuICByZXR1cm4gUWlhbmt1bkVycm9yO1xufSggLyojX19QVVJFX18qL193cmFwTmF0aXZlU3VwZXIoRXJyb3IpKTsiLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKSB7XG4gIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn0iLCJpbXBvcnQgX2RlZmluZVByb3BlcnR5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9kZWZpbmVQcm9wZXJ0eVwiO1xuaW1wb3J0IF9jbG9uZURlZXAgZnJvbSBcImxvZGFzaC9jbG9uZURlZXBcIjtcbnZhciBnbG9iYWxTdGF0ZSA9IHt9O1xudmFyIGRlcHMgPSB7fTsgLy8g6Kem5Y+R5YWo5bGA55uR5ZCsXG5cbmZ1bmN0aW9uIGVtaXRHbG9iYWwoc3RhdGUsIHByZXZTdGF0ZSkge1xuICBPYmplY3Qua2V5cyhkZXBzKS5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgIGlmIChkZXBzW2lkXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBkZXBzW2lkXShfY2xvbmVEZWVwKHN0YXRlKSwgX2Nsb25lRGVlcChwcmV2U3RhdGUpKTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEdsb2JhbFN0YXRlKCkge1xuICB2YXIgc3RhdGUgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHt9O1xuXG4gIGlmIChzdGF0ZSA9PT0gZ2xvYmFsU3RhdGUpIHtcbiAgICBjb25zb2xlLndhcm4oJ1txaWFua3VuXSBzdGF0ZSBoYXMgbm90IGNoYW5nZWTvvIEnKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcHJldkdsb2JhbFN0YXRlID0gX2Nsb25lRGVlcChnbG9iYWxTdGF0ZSk7XG5cbiAgICBnbG9iYWxTdGF0ZSA9IF9jbG9uZURlZXAoc3RhdGUpO1xuICAgIGVtaXRHbG9iYWwoZ2xvYmFsU3RhdGUsIHByZXZHbG9iYWxTdGF0ZSk7XG4gIH1cblxuICByZXR1cm4gZ2V0TWljcm9BcHBTdGF0ZUFjdGlvbnMoXCJnbG9iYWwtXCIuY29uY2F0KCtuZXcgRGF0ZSgpKSwgdHJ1ZSk7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0TWljcm9BcHBTdGF0ZUFjdGlvbnMoaWQsIGlzTWFzdGVyKSB7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogb25HbG9iYWxTdGF0ZUNoYW5nZSDlhajlsYDkvp3otZbnm5HlkKxcbiAgICAgKlxuICAgICAqIOaUtumbhiBzZXRTdGF0ZSDml7bmiYDpnIDopoHop6blj5HnmoTkvp3otZZcbiAgICAgKlxuICAgICAqIOmZkOWItuadoeS7tu+8muavj+S4quWtkOW6lOeUqOWPquacieS4gOS4qua/gOa0u+eKtuaAgeeahOWFqOWxgOebkeWQrO+8jOaWsOebkeWQrOimhuebluaXp+ebkeWQrO+8jOiLpeWPquaYr+ebkeWQrOmDqOWIhuWxnuaAp++8jOivt+S9v+eUqCBvbkdsb2JhbFN0YXRlQ2hhbmdlXG4gICAgICpcbiAgICAgKiDov5nkuYjorr7orqHmmK/kuLrkuoblh4/lsJHlhajlsYDnm5HlkKzmu6XnlKjlr7zoh7TnmoTlhoXlrZjniIbngrhcbiAgICAgKlxuICAgICAqIOS+nei1luaVsOaNrue7k+aehOS4uu+8mlxuICAgICAqIHtcbiAgICAgKiAgIHtpZH06IGNhbGxiYWNrXG4gICAgICogfVxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIGZpcmVJbW1lZGlhdGVseVxuICAgICAqL1xuICAgIG9uR2xvYmFsU3RhdGVDaGFuZ2U6IGZ1bmN0aW9uIG9uR2xvYmFsU3RhdGVDaGFuZ2UoY2FsbGJhY2ssIGZpcmVJbW1lZGlhdGVseSkge1xuICAgICAgaWYgKCEoY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW3FpYW5rdW5dIGNhbGxiYWNrIG11c3QgYmUgZnVuY3Rpb24hJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlcHNbaWRdKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIltxaWFua3VuXSAnXCIuY29uY2F0KGlkLCBcIicgZ2xvYmFsIGxpc3RlbmVyIGFscmVhZHkgZXhpc3RzIGJlZm9yZSB0aGlzLCBuZXcgbGlzdGVuZXIgd2lsbCBvdmVyd3JpdGUgaXQuXCIpKTtcbiAgICAgIH1cblxuICAgICAgZGVwc1tpZF0gPSBjYWxsYmFjaztcblxuICAgICAgaWYgKGZpcmVJbW1lZGlhdGVseSkge1xuICAgICAgICB2YXIgY2xvbmVTdGF0ZSA9IF9jbG9uZURlZXAoZ2xvYmFsU3RhdGUpO1xuXG4gICAgICAgIGNhbGxiYWNrKGNsb25lU3RhdGUsIGNsb25lU3RhdGUpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBzZXRHbG9iYWxTdGF0ZSDmm7TmlrAgc3RvcmUg5pWw5o2uXG4gICAgICpcbiAgICAgKiAxLiDlr7novpPlhaUgc3RhdGUg55qE56ys5LiA5bGC5bGe5oCn5YGa5qCh6aqM77yM5Y+q5pyJ5Yid5aeL5YyW5pe25aOw5piO6L+H55qE56ys5LiA5bGC77yIYnVja2V077yJ5bGe5oCn5omN5Lya6KKr5pu05pS5XG4gICAgICogMi4g5L+u5pS5IHN0b3JlIOW5tuinpuWPkeWFqOWxgOebkeWQrFxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICovXG4gICAgc2V0R2xvYmFsU3RhdGU6IGZ1bmN0aW9uIHNldEdsb2JhbFN0YXRlKCkge1xuICAgICAgdmFyIHN0YXRlID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcblxuICAgICAgaWYgKHN0YXRlID09PSBnbG9iYWxTdGF0ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1txaWFua3VuXSBzdGF0ZSBoYXMgbm90IGNoYW5nZWTvvIEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgY2hhbmdlS2V5cyA9IFtdO1xuXG4gICAgICB2YXIgcHJldkdsb2JhbFN0YXRlID0gX2Nsb25lRGVlcChnbG9iYWxTdGF0ZSk7XG5cbiAgICAgIGdsb2JhbFN0YXRlID0gX2Nsb25lRGVlcChPYmplY3Qua2V5cyhzdGF0ZSkucmVkdWNlKGZ1bmN0aW9uIChfZ2xvYmFsU3RhdGUsIGNoYW5nZUtleSkge1xuICAgICAgICBpZiAoaXNNYXN0ZXIgfHwgX2dsb2JhbFN0YXRlLmhhc093blByb3BlcnR5KGNoYW5nZUtleSkpIHtcbiAgICAgICAgICBjaGFuZ2VLZXlzLnB1c2goY2hhbmdlS2V5KTtcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihfZ2xvYmFsU3RhdGUsIF9kZWZpbmVQcm9wZXJ0eSh7fSwgY2hhbmdlS2V5LCBzdGF0ZVtjaGFuZ2VLZXldKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLndhcm4oXCJbcWlhbmt1bl0gJ1wiLmNvbmNhdChjaGFuZ2VLZXksIFwiJyBub3QgZGVjbGFyZWQgd2hlbiBpbml0IHN0YXRlXFx1RkYwMVwiKSk7XG4gICAgICAgIHJldHVybiBfZ2xvYmFsU3RhdGU7XG4gICAgICB9LCBnbG9iYWxTdGF0ZSkpO1xuXG4gICAgICBpZiAoY2hhbmdlS2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdbcWlhbmt1bl0gc3RhdGUgaGFzIG5vdCBjaGFuZ2Vk77yBJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZW1pdEdsb2JhbChnbG9iYWxTdGF0ZSwgcHJldkdsb2JhbFN0YXRlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgLy8g5rOo6ZSA6K+l5bqU55So5LiL55qE5L6d6LWWXG4gICAgb2ZmR2xvYmFsU3RhdGVDaGFuZ2U6IGZ1bmN0aW9uIG9mZkdsb2JhbFN0YXRlQ2hhbmdlKCkge1xuICAgICAgZGVsZXRlIGRlcHNbaWRdO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xufSIsImZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07XG4gICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xuICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gIGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gIHJldHVybiBDb25zdHJ1Y3Rvcjtcbn0iLCJleHBvcnQgdmFyIFNhbmRCb3hUeXBlO1xuXG4oZnVuY3Rpb24gKFNhbmRCb3hUeXBlKSB7XG4gIFNhbmRCb3hUeXBlW1wiUHJveHlcIl0gPSBcIlByb3h5XCI7XG4gIFNhbmRCb3hUeXBlW1wiU25hcHNob3RcIl0gPSBcIlNuYXBzaG90XCI7IC8vIGZvciBsZWdhY3kgc2FuZGJveFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vdW1panMvcWlhbmt1bi9ibG9iLzBkMWQzZjBjNWVkMTY0MmYwMTg1NGY5NmMzZmFiZjBhMjE0OGJkMjYvc3JjL3NhbmRib3gvbGVnYWN5L3NhbmRib3gudHMjTDIyLi4uTDI1XG5cbiAgU2FuZEJveFR5cGVbXCJMZWdhY3lQcm94eVwiXSA9IFwiTGVnYWN5UHJveHlcIjtcbn0pKFNhbmRCb3hUeXBlIHx8IChTYW5kQm94VHlwZSA9IHt9KSk7IiwiZXhwb3J0IHZhciB2ZXJzaW9uID0gJzIuNS4xJzsiLCJpbXBvcnQgX3R5cGVvZiBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vdHlwZW9mXCI7XG5pbXBvcnQgX2NsYXNzQ2FsbENoZWNrIGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jbGFzc0NhbGxDaGVja1wiO1xuaW1wb3J0IF9pc0Z1bmN0aW9uIGZyb20gXCJsb2Rhc2gvaXNGdW5jdGlvblwiO1xuaW1wb3J0IF9zbmFrZUNhc2UgZnJvbSBcImxvZGFzaC9zbmFrZUNhc2VcIjtcbmltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuL3ZlcnNpb24nO1xuZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXkoYXJyYXkpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXJyYXkpID8gYXJyYXkgOiBbYXJyYXldO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKG1zKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKTtcbiAgfSk7XG59IC8vIFByb21pc2UudGhlbiBtaWdodCBiZSBzeW5jaHJvbml6ZWQgaW4gWm9uZS5qcyBjb250ZXh0LCB3ZSBuZWVkIHRvIHVzZSBzZXRUaW1lb3V0IGluc3RlYWQgdG8gbW9jayBuZXh0IHRpY2suXG5cbnZhciBuZXh0VGljayA9IHR5cGVvZiB3aW5kb3cuWm9uZSA9PT0gJ2Z1bmN0aW9uJyA/IHNldFRpbWVvdXQgOiBmdW5jdGlvbiAoY2IpIHtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oY2IpO1xufTtcbnZhciBnbG9iYWxUYXNrUGVuZGluZyA9IGZhbHNlO1xuLyoqXG4gKiBSdW4gYSBjYWxsYmFjayBiZWZvcmUgbmV4dCB0YXNrIGV4ZWN1dGluZywgYW5kIHRoZSBpbnZvY2F0aW9uIGlzIGlkZW1wb3RlbnQgaW4gZXZlcnkgc2luZ3VsYXIgdGFza1xuICogVGhhdCBtZWFucyBldmVuIHdlIGNhbGxlZCBuZXh0VGFzayBtdWx0aSB0aW1lcyBpbiBvbmUgdGFzaywgb25seSB0aGUgZmlyc3QgY2FsbGJhY2sgd2lsbCBiZSBwdXNoZWQgdG8gbmV4dFRpY2sgdG8gYmUgaW52b2tlZC5cbiAqIEBwYXJhbSBjYlxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBuZXh0VGFzayhjYikge1xuICBpZiAoIWdsb2JhbFRhc2tQZW5kaW5nKSB7XG4gICAgZ2xvYmFsVGFza1BlbmRpbmcgPSB0cnVlO1xuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNiKCk7XG4gICAgICBnbG9iYWxUYXNrUGVuZGluZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG59XG52YXIgZm5SZWdleENoZWNrQ2FjaGVNYXAgPSBuZXcgV2Vha01hcCgpO1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ29uc3RydWN0YWJsZShmbikge1xuICAvLyBwcm90b3R5cGUgbWV0aG9kcyBtaWdodCBiZSBjaGFuZ2VkIHdoaWxlIGNvZGUgcnVubmluZywgc28gd2UgbmVlZCBjaGVjayBpdCBldmVyeSB0aW1lXG4gIHZhciBoYXNQcm90b3R5cGVNZXRob2RzID0gZm4ucHJvdG90eXBlICYmIGZuLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9PT0gZm4gJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZm4ucHJvdG90eXBlKS5sZW5ndGggPiAxO1xuICBpZiAoaGFzUHJvdG90eXBlTWV0aG9kcykgcmV0dXJuIHRydWU7XG5cbiAgaWYgKGZuUmVnZXhDaGVja0NhY2hlTWFwLmhhcyhmbikpIHtcbiAgICByZXR1cm4gZm5SZWdleENoZWNrQ2FjaGVNYXAuZ2V0KGZuKTtcbiAgfVxuICAvKlxuICAgIDEuIOaciSBwcm90b3R5cGUg5bm25LiUIHByb3RvdHlwZSDkuIrmnInlrprkuYnkuIDns7vliJfpnZ4gY29uc3RydWN0b3Ig5bGe5oCnXG4gICAgMi4g5Ye95pWw5ZCN5aSn5YaZ5byA5aS0XG4gICAgMy4gY2xhc3Mg5Ye95pWwXG4gICAg5ruh6Laz5YW25LiA5YiZ5Y+v6K6k5a6a5Li65p6E6YCg5Ye95pWwXG4gICAqL1xuXG5cbiAgdmFyIGNvbnN0cnVjdGFibGUgPSBoYXNQcm90b3R5cGVNZXRob2RzO1xuXG4gIGlmICghY29uc3RydWN0YWJsZSkge1xuICAgIC8vIGZuLnRvU3RyaW5nIGhhcyBhIHNpZ25pZmljYW50IHBlcmZvcm1hbmNlIG92ZXJoZWFkLCBpZiBoYXNQcm90b3R5cGVNZXRob2RzIGNoZWNrIG5vdCBwYXNzZWQsIHdlIHdpbGwgY2hlY2sgdGhlIGZ1bmN0aW9uIHN0cmluZyB3aXRoIHJlZ2V4XG4gICAgdmFyIGZuU3RyaW5nID0gZm4udG9TdHJpbmcoKTtcbiAgICB2YXIgY29uc3RydWN0YWJsZUZ1bmN0aW9uUmVnZXggPSAvXmZ1bmN0aW9uXFxiXFxzW0EtWl0uKi87XG4gICAgdmFyIGNsYXNzUmVnZXggPSAvXmNsYXNzXFxiLztcbiAgICBjb25zdHJ1Y3RhYmxlID0gY29uc3RydWN0YWJsZUZ1bmN0aW9uUmVnZXgudGVzdChmblN0cmluZykgfHwgY2xhc3NSZWdleC50ZXN0KGZuU3RyaW5nKTtcbiAgfVxuXG4gIGZuUmVnZXhDaGVja0NhY2hlTWFwLnNldChmbiwgY29uc3RydWN0YWJsZSk7XG4gIHJldHVybiBjb25zdHJ1Y3RhYmxlO1xufVxuLyoqXG4gKiBpbiBzYWZhcmlcbiAqIHR5cGVvZiBkb2N1bWVudC5hbGwgPT09ICd1bmRlZmluZWQnIC8vIHRydWVcbiAqIHR5cGVvZiBkb2N1bWVudC5hbGwgPT09ICdmdW5jdGlvbicgLy8gdHJ1ZVxuICogV2UgbmVlZCB0byBkaXNjcmltaW5hdGUgc2FmYXJpIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAqL1xuXG52YXIgbmF1Z2h0eVNhZmFyaSA9IHR5cGVvZiBkb2N1bWVudC5hbGwgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRvY3VtZW50LmFsbCA9PT0gJ3VuZGVmaW5lZCc7XG52YXIgY2FsbGFibGVGbkNhY2hlTWFwID0gbmV3IFdlYWtNYXAoKTtcbmV4cG9ydCB2YXIgaXNDYWxsYWJsZSA9IGZ1bmN0aW9uIGlzQ2FsbGFibGUoZm4pIHtcbiAgaWYgKGNhbGxhYmxlRm5DYWNoZU1hcC5oYXMoZm4pKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB2YXIgY2FsbGFibGUgPSBuYXVnaHR5U2FmYXJpID8gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBmbiAhPT0gJ3VuZGVmaW5lZCcgOiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbic7XG5cbiAgaWYgKGNhbGxhYmxlKSB7XG4gICAgY2FsbGFibGVGbkNhY2hlTWFwLnNldChmbiwgY2FsbGFibGUpO1xuICB9XG5cbiAgcmV0dXJuIGNhbGxhYmxlO1xufTtcbnZhciBib3VuZGVkTWFwID0gbmV3IFdlYWtNYXAoKTtcbmV4cG9ydCBmdW5jdGlvbiBpc0JvdW5kZWRGdW5jdGlvbihmbikge1xuICBpZiAoYm91bmRlZE1hcC5oYXMoZm4pKSB7XG4gICAgcmV0dXJuIGJvdW5kZWRNYXAuZ2V0KGZuKTtcbiAgfVxuICAvKlxuICAgaW5kZXhPZiBpcyBmYXN0ZXIgdGhhbiBzdGFydHNXaXRoXG4gICBzZWUgaHR0cHM6Ly9qc3BlcmYuY29tL3N0cmluZy1zdGFydHN3aXRoLzcyXG4gICAqL1xuXG5cbiAgdmFyIGJvdW5kZWQgPSBmbi5uYW1lLmluZGV4T2YoJ2JvdW5kICcpID09PSAwICYmICFmbi5oYXNPd25Qcm9wZXJ0eSgncHJvdG90eXBlJyk7XG4gIGJvdW5kZWRNYXAuc2V0KGZuLCBib3VuZGVkKTtcbiAgcmV0dXJuIGJvdW5kZWQ7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFRwbFdyYXBwZXIoaWQsIG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0cGwpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGlkPVxcXCJcIi5jb25jYXQoZ2V0V3JhcHBlcklkKGlkKSwgXCJcXFwiIGRhdGEtbmFtZT1cXFwiXCIpLmNvbmNhdChuYW1lLCBcIlxcXCIgZGF0YS12ZXJzaW9uPVxcXCJcIikuY29uY2F0KHZlcnNpb24sIFwiXFxcIj5cIikuY29uY2F0KHRwbCwgXCI8L2Rpdj5cIik7XG4gIH07XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0V3JhcHBlcklkKGlkKSB7XG4gIHJldHVybiBcIl9fcWlhbmt1bl9taWNyb2FwcF93cmFwcGVyX2Zvcl9cIi5jb25jYXQoX3NuYWtlQ2FzZShpZCksIFwiX19cIik7XG59XG5leHBvcnQgdmFyIG5hdGl2ZUdsb2JhbCA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuLyoqIOagoemqjOWtkOW6lOeUqOWvvOWHuueahCDnlJ/lkb3lkajmnJ8g5a+56LGh5piv5ZCm5q2j56GuICovXG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUV4cG9ydExpZmVjeWNsZShleHBvcnRzKSB7XG4gIHZhciBfcmVmID0gZXhwb3J0cyAhPT0gbnVsbCAmJiBleHBvcnRzICE9PSB2b2lkIDAgPyBleHBvcnRzIDoge30sXG4gICAgICBib290c3RyYXAgPSBfcmVmLmJvb3RzdHJhcCxcbiAgICAgIG1vdW50ID0gX3JlZi5tb3VudCxcbiAgICAgIHVubW91bnQgPSBfcmVmLnVubW91bnQ7XG5cbiAgcmV0dXJuIF9pc0Z1bmN0aW9uKGJvb3RzdHJhcCkgJiYgX2lzRnVuY3Rpb24obW91bnQpICYmIF9pc0Z1bmN0aW9uKHVubW91bnQpO1xufVxuXG52YXIgRGVmZXJyZWQgPSBmdW5jdGlvbiBEZWZlcnJlZCgpIHtcbiAgdmFyIF90aGlzID0gdGhpcztcblxuICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGVmZXJyZWQpO1xuXG4gIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBfdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICBfdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gIH0pO1xufTtcblxuZXhwb3J0IHsgRGVmZXJyZWQgfTtcbnZhciBzdXBwb3J0c1VzZXJUaW1pbmcgPSB0eXBlb2YgcGVyZm9ybWFuY2UgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5tYXJrID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5jbGVhck1hcmtzID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5tZWFzdXJlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lID09PSAnZnVuY3Rpb24nO1xuZXhwb3J0IGZ1bmN0aW9uIHBlcmZvcm1hbmNlR2V0RW50cmllc0J5TmFtZShtYXJrTmFtZSwgdHlwZSkge1xuICB2YXIgbWFya3MgPSBudWxsO1xuXG4gIGlmIChzdXBwb3J0c1VzZXJUaW1pbmcpIHtcbiAgICBtYXJrcyA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUobWFya05hbWUsIHR5cGUpO1xuICB9XG5cbiAgcmV0dXJuIG1hcmtzO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHBlcmZvcm1hbmNlTWFyayhtYXJrTmFtZSkge1xuICBpZiAoc3VwcG9ydHNVc2VyVGltaW5nKSB7XG4gICAgcGVyZm9ybWFuY2UubWFyayhtYXJrTmFtZSk7XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBwZXJmb3JtYW5jZU1lYXN1cmUobWVhc3VyZU5hbWUsIG1hcmtOYW1lKSB7XG4gIGlmIChzdXBwb3J0c1VzZXJUaW1pbmcgJiYgcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5TmFtZShtYXJrTmFtZSwgJ21hcmsnKS5sZW5ndGgpIHtcbiAgICBwZXJmb3JtYW5jZS5tZWFzdXJlKG1lYXN1cmVOYW1lLCBtYXJrTmFtZSk7XG4gICAgcGVyZm9ybWFuY2UuY2xlYXJNYXJrcyhtYXJrTmFtZSk7XG4gICAgcGVyZm9ybWFuY2UuY2xlYXJNZWFzdXJlcyhtZWFzdXJlTmFtZSk7XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBpc0VuYWJsZVNjb3BlZENTUyhzYW5kYm94KSB7XG4gIGlmIChfdHlwZW9mKHNhbmRib3gpICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChzYW5kYm94LnN0cmljdFN0eWxlSXNvbGF0aW9uKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuICEhc2FuZGJveC5leHBlcmltZW50YWxTdHlsZUlzb2xhdGlvbjtcbn1cbi8qKlxuICogY29weSBmcm9tIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL3poLUNOL2RvY3MvVXNpbmdfWFBhdGhcbiAqIEBwYXJhbSBlbFxuICogQHBhcmFtIGRvY3VtZW50XG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFhQYXRoRm9yRWxlbWVudChlbCwgZG9jdW1lbnQpIHtcbiAgLy8gbm90IHN1cHBvcnQgdGhhdCBpZiBlbCBub3QgZXhpc3RlZCBpbiBkb2N1bWVudCB5ZXQoc3VjaCBhcyBpdCBub3QgYXBwZW5kIHRvIGRvY3VtZW50IGJlZm9yZSBpdCBtb3VudGVkKVxuICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnMoZWwpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciB4cGF0aCA9ICcnO1xuICB2YXIgcG9zO1xuICB2YXIgdG1wRWxlO1xuICB2YXIgZWxlbWVudCA9IGVsO1xuXG4gIHdoaWxlIChlbGVtZW50ICE9PSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcbiAgICBwb3MgPSAwO1xuICAgIHRtcEVsZSA9IGVsZW1lbnQ7XG5cbiAgICB3aGlsZSAodG1wRWxlKSB7XG4gICAgICBpZiAodG1wRWxlLm5vZGVUeXBlID09PSAxICYmIHRtcEVsZS5ub2RlTmFtZSA9PT0gZWxlbWVudC5ub2RlTmFtZSkge1xuICAgICAgICAvLyBJZiBpdCBpcyBFTEVNRU5UX05PREUgb2YgdGhlIHNhbWUgbmFtZVxuICAgICAgICBwb3MgKz0gMTtcbiAgICAgIH1cblxuICAgICAgdG1wRWxlID0gdG1wRWxlLnByZXZpb3VzU2libGluZztcbiAgICB9XG5cbiAgICB4cGF0aCA9IFwiKltuYW1lKCk9J1wiLmNvbmNhdChlbGVtZW50Lm5vZGVOYW1lLCBcIiddW1wiKS5jb25jYXQocG9zLCBcIl0vXCIpLmNvbmNhdCh4cGF0aCk7XG4gICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgfVxuXG4gIHhwYXRoID0gXCIvKltuYW1lKCk9J1wiLmNvbmNhdChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubm9kZU5hbWUsIFwiJ10vXCIpLmNvbmNhdCh4cGF0aCk7XG4gIHhwYXRoID0geHBhdGgucmVwbGFjZSgvXFwvJC8sICcnKTtcbiAgcmV0dXJuIHhwYXRoO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRhaW5lcihjb250YWluZXIpIHtcbiAgcmV0dXJuIHR5cGVvZiBjb250YWluZXIgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihjb250YWluZXIpIDogY29udGFpbmVyO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRhaW5lclhQYXRoKGNvbnRhaW5lcikge1xuICBpZiAoY29udGFpbmVyKSB7XG4gICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSBnZXRDb250YWluZXIoY29udGFpbmVyKTtcblxuICAgIGlmIChjb250YWluZXJFbGVtZW50KSB7XG4gICAgICByZXR1cm4gZ2V0WFBhdGhGb3JFbGVtZW50KGNvbnRhaW5lckVsZW1lbnQsIGRvY3VtZW50KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufSIsIi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDIwLTA0LTEzXG4gKi9cbmltcG9ydCB7IGlzQm91bmRlZEZ1bmN0aW9uLCBpc0NhbGxhYmxlLCBpc0NvbnN0cnVjdGFibGUgfSBmcm9tICcuLi91dGlscyc7XG52YXIgY3VycmVudFJ1bm5pbmdBcHAgPSBudWxsO1xuLyoqXG4gKiBnZXQgdGhlIGFwcCB0aGF0IHJ1bm5pbmcgdGFza3MgYXQgY3VycmVudCB0aWNrXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnJlbnRSdW5uaW5nQXBwKCkge1xuICByZXR1cm4gY3VycmVudFJ1bm5pbmdBcHA7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0Q3VycmVudFJ1bm5pbmdBcHAoYXBwSW5zdGFuY2UpIHtcbiAgLy8gc2V0IGN1cnJlbnRSdW5uaW5nQXBwIGFuZCBpdCdzIHByb3h5U2FuZGJveCB0byBnbG9iYWwgd2luZG93LCBhcyBpdHMgb25seSB1c2UgY2FzZSBpcyBmb3IgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBmcm9tIG5vdyBvbiwgd2hpY2ggaGlqYWNrZWQgYnkgYSBnbG9iYWwgd2F5XG4gIGN1cnJlbnRSdW5uaW5nQXBwID0gYXBwSW5zdGFuY2U7XG59XG52YXIgZnVuY3Rpb25Cb3VuZGVkVmFsdWVNYXAgPSBuZXcgV2Vha01hcCgpO1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRhcmdldFZhbHVlKHRhcmdldCwgdmFsdWUpIHtcbiAgLypcbiAgICDku4Xnu5HlrpogaXNDYWxsYWJsZSAmJiAhaXNCb3VuZGVkRnVuY3Rpb24gJiYgIWlzQ29uc3RydWN0YWJsZSDnmoTlh73mlbDlr7nosaHvvIzlpoIgd2luZG93LmNvbnNvbGXjgIF3aW5kb3cuYXRvYiDov5nnsbvvvIzkuI3nhLblvq7lupTnlKjkuK3osIPnlKjml7bkvJrmipvlh7ogSWxsZWdhbCBpbnZvY2F0aW9uIOW8guW4uFxuICAgIOebruWJjeayoeacieWujOe+jueahOajgOa1i+aWueW8j++8jOi/memHjOmAmui/hyBwcm90b3R5cGUg5Lit5piv5ZCm6L+Y5pyJ5Y+v5p6a5Li+55qE5ouT5bGV5pa55rOV55qE5pa55byP5p2l5Yik5patXG4gICAgQHdhcm5pbmcg6L+Z6YeM5LiN6KaB6ZqP5oSP5pu/5o2i5oiQ5Yir55qE5Yik5pat5pa55byP77yM5Zug5Li65Y+v6IO96Kem5Y+R5LiA5LqbIGVkZ2UgY2FzZe+8iOavlOWmguWcqCBsb2Rhc2guaXNGdW5jdGlvbiDlnKggaWZyYW1lIOS4iuS4i+aWh+S4reWPr+iDveeUseS6juiwg+eUqOS6hiB0b3Agd2luZG93IOWvueixoeinpuWPkeeahOWuieWFqOW8guW4uO+8iVxuICAgKi9cbiAgaWYgKGlzQ2FsbGFibGUodmFsdWUpICYmICFpc0JvdW5kZWRGdW5jdGlvbih2YWx1ZSkgJiYgIWlzQ29uc3RydWN0YWJsZSh2YWx1ZSkpIHtcbiAgICB2YXIgY2FjaGVkQm91bmRGdW5jdGlvbiA9IGZ1bmN0aW9uQm91bmRlZFZhbHVlTWFwLmdldCh2YWx1ZSk7XG5cbiAgICBpZiAoY2FjaGVkQm91bmRGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIGNhY2hlZEJvdW5kRnVuY3Rpb247XG4gICAgfVxuXG4gICAgdmFyIGJvdW5kVmFsdWUgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKHZhbHVlLCB0YXJnZXQpOyAvLyBzb21lIGNhbGxhYmxlIGZ1bmN0aW9uIGhhcyBjdXN0b20gZmllbGRzLCB3ZSBuZWVkIHRvIGNvcHkgdGhlIGVudW1lcmFibGUgcHJvcHMgdG8gYm91bmRWYWx1ZS4gc3VjaCBhcyBtb21lbnQgZnVuY3Rpb24uXG4gICAgLy8gdXNlIGZvci4uaW4gcmF0aGVyIHRoYW4gT2JqZWN0LmtleXMuZm9yRWFjaCBmb3IgcGVyZm9ybWFuY2UgcmVhc29uXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pbixuby1yZXN0cmljdGVkLXN5bnRheFxuXG4gICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBib3VuZFZhbHVlW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH0gLy8gY29weSBwcm90b3R5cGUgaWYgYm91bmQgZnVuY3Rpb24gbm90IGhhdmUgYnV0IHRhcmdldCBvbmUgaGF2ZVxuICAgIC8vIGFzIHByb3RvdHlwZSBpcyBub24tZW51bWVyYWJsZSBtb3N0bHksIHdlIG5lZWQgdG8gY29weSBpdCBmcm9tIHRhcmdldCBmdW5jdGlvbiBtYW51YWxseVxuXG5cbiAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ3Byb3RvdHlwZScpICYmICFib3VuZFZhbHVlLmhhc093blByb3BlcnR5KCdwcm90b3R5cGUnKSkge1xuICAgICAgLy8gd2Ugc2hvdWxkIG5vdCB1c2UgYXNzaWdubWVudCBvcGVyYXRvciB0byBzZXQgYm91bmRWYWx1ZSBwcm90b3R5cGUgbGlrZSBgYm91bmRWYWx1ZS5wcm90b3R5cGUgPSB2YWx1ZS5wcm90b3R5cGVgXG4gICAgICAvLyBhcyB0aGUgYXNzaWdubWVudCB3aWxsIGFsc28gbG9vayB1cCBwcm90b3R5cGUgY2hhaW4gd2hpbGUgaXQgaGFzbid0IG93biBwcm90b3R5cGUgcHJvcGVydHksXG4gICAgICAvLyB3aGVuIHRoZSBsb29rdXAgc3VjY2VlZCwgdGhlIGFzc2lnbm1lbnQgd2lsbCB0aHJvdyBhbiBUeXBlRXJyb3IgbGlrZSBgQ2Fubm90IGFzc2lnbiB0byByZWFkIG9ubHkgcHJvcGVydHkgJ3Byb3RvdHlwZScgb2YgZnVuY3Rpb25gIGlmIGl0cyBkZXNjcmlwdG9yIGNvbmZpZ3VyZWQgd2l0aCB3cml0YWJsZSBmYWxzZSBvciBqdXN0IGhhdmUgYSBnZXR0ZXIgYWNjZXNzb3JcbiAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdW1panMvcWlhbmt1bi9pc3N1ZXMvMTEyMVxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGJvdW5kVmFsdWUsICdwcm90b3R5cGUnLCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZS5wcm90b3R5cGUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb25Cb3VuZGVkVmFsdWVNYXAuc2V0KHZhbHVlLCBib3VuZFZhbHVlKTtcbiAgICByZXR1cm4gYm91bmRWYWx1ZTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cbnZhciBnZXR0ZXJJbnZvY2F0aW9uUmVzdWx0TWFwID0gbmV3IFdlYWtNYXAoKTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm94eVByb3BlcnR5VmFsdWUoZ2V0dGVyKSB7XG4gIHZhciBnZXR0ZXJSZXN1bHQgPSBnZXR0ZXJJbnZvY2F0aW9uUmVzdWx0TWFwLmdldChnZXR0ZXIpO1xuXG4gIGlmICghZ2V0dGVyUmVzdWx0KSB7XG4gICAgdmFyIHJlc3VsdCA9IGdldHRlcigpO1xuICAgIGdldHRlckludm9jYXRpb25SZXN1bHRNYXAuc2V0KGdldHRlciwgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIGdldHRlclJlc3VsdDtcbn0iLCJpbXBvcnQgX3RvQ29uc3VtYWJsZUFycmF5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS90b0NvbnN1bWFibGVBcnJheVwiO1xuaW1wb3J0IF90eXBlb2YgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3R5cGVvZlwiO1xuaW1wb3J0IF9jbGFzc0NhbGxDaGVjayBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vY2xhc3NDYWxsQ2hlY2tcIjtcbmltcG9ydCBfY3JlYXRlQ2xhc3MgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL2NyZWF0ZUNsYXNzXCI7XG5pbXBvcnQgeyBTYW5kQm94VHlwZSB9IGZyb20gJy4uLy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZ2V0VGFyZ2V0VmFsdWUgfSBmcm9tICcuLi9jb21tb24nO1xuXG5mdW5jdGlvbiBpc1Byb3BDb25maWd1cmFibGUodGFyZ2V0LCBwcm9wKSB7XG4gIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIHByb3ApO1xuICByZXR1cm4gZGVzY3JpcHRvciA/IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlIDogdHJ1ZTtcbn1cbi8qKlxuICog5Z+65LqOIFByb3h5IOWunueOsOeahOaymeeusVxuICogVE9ETzog5Li65LqG5YW85a655oCnIHNpbmd1bGFyIOaooeW8j+S4i+S+neaXp+S9v+eUqOivpeaymeeuse+8jOetieaWsOaymeeuseeos+WumuS5i+WQjuWGjeWIh+aNolxuICovXG5cblxudmFyIExlZ2FjeVNhbmRib3ggPSAvKiNfX1BVUkVfXyovZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBMZWdhY3lTYW5kYm94KG5hbWUpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIGdsb2JhbENvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHdpbmRvdztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBMZWdhY3lTYW5kYm94KTtcblxuICAgIC8qKiDmspnnrrHmnJ/pl7TmlrDlop7nmoTlhajlsYDlj5jph48gKi9cbiAgICB0aGlzLmFkZGVkUHJvcHNNYXBJblNhbmRib3ggPSBuZXcgTWFwKCk7XG4gICAgLyoqIOaymeeuseacn+mXtOabtOaWsOeahOWFqOWxgOWPmOmHjyAqL1xuXG4gICAgdGhpcy5tb2RpZmllZFByb3BzT3JpZ2luYWxWYWx1ZU1hcEluU2FuZGJveCA9IG5ldyBNYXAoKTtcbiAgICAvKiog5oyB57ut6K6w5b2V5pu05paw55qEKOaWsOWinuWSjOS/ruaUueeahCnlhajlsYDlj5jph4/nmoQgbWFw77yM55So5LqO5Zyo5Lu75oSP5pe25Yi75YGaIHNuYXBzaG90ICovXG5cbiAgICB0aGlzLmN1cnJlbnRVcGRhdGVkUHJvcHNWYWx1ZU1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLnNhbmRib3hSdW5uaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmxhdGVzdFNldFByb3AgPSBudWxsO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5nbG9iYWxDb250ZXh0ID0gZ2xvYmFsQ29udGV4dDtcbiAgICB0aGlzLnR5cGUgPSBTYW5kQm94VHlwZS5MZWdhY3lQcm94eTtcbiAgICB2YXIgYWRkZWRQcm9wc01hcEluU2FuZGJveCA9IHRoaXMuYWRkZWRQcm9wc01hcEluU2FuZGJveCxcbiAgICAgICAgbW9kaWZpZWRQcm9wc09yaWdpbmFsVmFsdWVNYXBJblNhbmRib3ggPSB0aGlzLm1vZGlmaWVkUHJvcHNPcmlnaW5hbFZhbHVlTWFwSW5TYW5kYm94LFxuICAgICAgICBjdXJyZW50VXBkYXRlZFByb3BzVmFsdWVNYXAgPSB0aGlzLmN1cnJlbnRVcGRhdGVkUHJvcHNWYWx1ZU1hcDtcbiAgICB2YXIgcmF3V2luZG93ID0gZ2xvYmFsQ29udGV4dDtcbiAgICB2YXIgZmFrZVdpbmRvdyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICB2YXIgc2V0VHJhcCA9IGZ1bmN0aW9uIHNldFRyYXAocCwgdmFsdWUsIG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgIHZhciBzeW5jMldpbmRvdyA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogdHJ1ZTtcblxuICAgICAgaWYgKF90aGlzLnNhbmRib3hSdW5uaW5nKSB7XG4gICAgICAgIGlmICghcmF3V2luZG93Lmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgYWRkZWRQcm9wc01hcEluU2FuZGJveC5zZXQocCwgdmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKCFtb2RpZmllZFByb3BzT3JpZ2luYWxWYWx1ZU1hcEluU2FuZGJveC5oYXMocCkpIHtcbiAgICAgICAgICAvLyDlpoLmnpzlvZPliY0gd2luZG93IOWvueixoeWtmOWcqOivpeWxnuaAp++8jOS4lCByZWNvcmQgbWFwIOS4reacquiusOW9lei/h++8jOWImeiusOW9leivpeWxnuaAp+WIneWni+WAvFxuICAgICAgICAgIG1vZGlmaWVkUHJvcHNPcmlnaW5hbFZhbHVlTWFwSW5TYW5kYm94LnNldChwLCBvcmlnaW5hbFZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRVcGRhdGVkUHJvcHNWYWx1ZU1hcC5zZXQocCwgdmFsdWUpO1xuXG4gICAgICAgIGlmIChzeW5jMldpbmRvdykge1xuICAgICAgICAgIC8vIOW/hemhu+mHjeaWsOiuvue9riB3aW5kb3cg5a+56LGh5L+d6K+B5LiL5qyhIGdldCDml7bog73mi7/liLDlt7Lmm7TmlrDnmoTmlbDmja5cbiAgICAgICAgICByYXdXaW5kb3dbcF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzLmxhdGVzdFNldFByb3AgPSBwO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIltxaWFua3VuXSBTZXQgd2luZG93LlwiLmNvbmNhdChwLnRvU3RyaW5nKCksIFwiIHdoaWxlIHNhbmRib3ggZGVzdHJveWVkIG9yIGluYWN0aXZlIGluIFwiKS5jb25jYXQobmFtZSwgXCIhXCIpKTtcbiAgICAgIH0gLy8g5ZyoIHN0cmljdC1tb2RlIOS4i++8jFByb3h5IOeahCBoYW5kbGVyLnNldCDov5Tlm54gZmFsc2Ug5Lya5oqb5Ye6IFR5cGVFcnJvcu+8jOWcqOaymeeuseWNuOi9veeahOaDheWGteS4i+W6lOivpeW/veeVpemUmeivr1xuXG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgcHJveHkgPSBuZXcgUHJveHkoZmFrZVdpbmRvdywge1xuICAgICAgc2V0OiBmdW5jdGlvbiBzZXQoXywgcCwgdmFsdWUpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsVmFsdWUgPSByYXdXaW5kb3dbcF07XG4gICAgICAgIHJldHVybiBzZXRUcmFwKHAsIHZhbHVlLCBvcmlnaW5hbFZhbHVlLCB0cnVlKTtcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldChfLCBwKSB7XG4gICAgICAgIC8vIGF2b2lkIHdobyB1c2luZyB3aW5kb3cud2luZG93IG9yIHdpbmRvdy5zZWxmIHRvIGVzY2FwZSB0aGUgc2FuZGJveCBlbnZpcm9ubWVudCB0byB0b3VjaCB0aGUgcmVhbGx5IHdpbmRvd1xuICAgICAgICAvLyBvciB1c2Ugd2luZG93LnRvcCB0byBjaGVjayBpZiBhbiBpZnJhbWUgY29udGV4dFxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL3NyYy9GaWxlU2F2ZXIuanMjTDEzXG4gICAgICAgIGlmIChwID09PSAndG9wJyB8fCBwID09PSAncGFyZW50JyB8fCBwID09PSAnd2luZG93JyB8fCBwID09PSAnc2VsZicpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmFsdWUgPSByYXdXaW5kb3dbcF07XG4gICAgICAgIHJldHVybiBnZXRUYXJnZXRWYWx1ZShyYXdXaW5kb3csIHZhbHVlKTtcbiAgICAgIH0sXG4gICAgICAvLyB0cmFwIGluIG9wZXJhdG9yXG4gICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3N0eWxlZC1jb21wb25lbnRzL3N0eWxlZC1jb21wb25lbnRzL2Jsb2IvbWFzdGVyL3BhY2thZ2VzL3N0eWxlZC1jb21wb25lbnRzL3NyYy9jb25zdGFudHMuanMjTDEyXG4gICAgICBoYXM6IGZ1bmN0aW9uIGhhcyhfLCBwKSB7XG4gICAgICAgIHJldHVybiBwIGluIHJhd1dpbmRvdztcbiAgICAgIH0sXG4gICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihfLCBwKSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihyYXdXaW5kb3csIHApOyAvLyBBIHByb3BlcnR5IGNhbm5vdCBiZSByZXBvcnRlZCBhcyBub24tY29uZmlndXJhYmxlLCBpZiBpdCBkb2VzIG5vdCBleGlzdHMgYXMgYW4gb3duIHByb3BlcnR5IG9mIHRoZSB0YXJnZXQgb2JqZWN0XG5cbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3I7XG4gICAgICB9LFxuICAgICAgZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KF8sIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsVmFsdWUgPSByYXdXaW5kb3dbcF07XG4gICAgICAgIHZhciBkb25lID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShyYXdXaW5kb3csIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB2YXIgdmFsdWUgPSByYXdXaW5kb3dbcF07XG4gICAgICAgIHNldFRyYXAocCwgdmFsdWUsIG9yaWdpbmFsVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGRvbmU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm94eSA9IHByb3h5O1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKExlZ2FjeVNhbmRib3gsIFt7XG4gICAga2V5OiBcInNldFdpbmRvd1Byb3BcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0V2luZG93UHJvcChwcm9wLCB2YWx1ZSwgdG9EZWxldGUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIHRvRGVsZXRlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICBkZWxldGUgdGhpcy5nbG9iYWxDb250ZXh0W3Byb3BdO1xuICAgICAgfSBlbHNlIGlmIChpc1Byb3BDb25maWd1cmFibGUodGhpcy5nbG9iYWxDb250ZXh0LCBwcm9wKSAmJiBfdHlwZW9mKHByb3ApICE9PSAnc3ltYm9sJykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5nbG9iYWxDb250ZXh0LCBwcm9wLCB7XG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pOyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cblxuICAgICAgICB0aGlzLmdsb2JhbENvbnRleHRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiYWN0aXZlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGFjdGl2ZSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICBpZiAoIXRoaXMuc2FuZGJveFJ1bm5pbmcpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VXBkYXRlZFByb3BzVmFsdWVNYXAuZm9yRWFjaChmdW5jdGlvbiAodiwgcCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0V2luZG93UHJvcChwLCB2KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2FuZGJveFJ1bm5pbmcgPSB0cnVlO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbmFjdGl2ZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbmFjdGl2ZSgpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKFwiW3FpYW5rdW46c2FuZGJveF0gXCIuY29uY2F0KHRoaXMubmFtZSwgXCIgbW9kaWZpZWQgZ2xvYmFsIHByb3BlcnRpZXMgcmVzdG9yZS4uLlwiKSwgW10uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheSh0aGlzLmFkZGVkUHJvcHNNYXBJblNhbmRib3gua2V5cygpKSwgX3RvQ29uc3VtYWJsZUFycmF5KHRoaXMubW9kaWZpZWRQcm9wc09yaWdpbmFsVmFsdWVNYXBJblNhbmRib3gua2V5cygpKSkpO1xuICAgICAgfSAvLyByZW5kZXJTYW5kYm94U25hcHNob3QgPSBzbmFwc2hvdChjdXJyZW50VXBkYXRlZFByb3BzVmFsdWVNYXBGb3JTbmFwc2hvdCk7XG4gICAgICAvLyByZXN0b3JlIGdsb2JhbCBwcm9wcyB0byBpbml0aWFsIHNuYXBzaG90XG5cblxuICAgICAgdGhpcy5tb2RpZmllZFByb3BzT3JpZ2luYWxWYWx1ZU1hcEluU2FuZGJveC5mb3JFYWNoKGZ1bmN0aW9uICh2LCBwKSB7XG4gICAgICAgIHJldHVybiBfdGhpczMuc2V0V2luZG93UHJvcChwLCB2KTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hZGRlZFByb3BzTWFwSW5TYW5kYm94LmZvckVhY2goZnVuY3Rpb24gKF8sIHApIHtcbiAgICAgICAgcmV0dXJuIF90aGlzMy5zZXRXaW5kb3dQcm9wKHAsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuc2FuZGJveFJ1bm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gTGVnYWN5U2FuZGJveDtcbn0oKTtcblxuZXhwb3J0IHsgTGVnYWN5U2FuZGJveCBhcyBkZWZhdWx0IH07IiwiaW1wb3J0IF9jbGFzc0NhbGxDaGVjayBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vY2xhc3NDYWxsQ2hlY2tcIjtcbmltcG9ydCBfY3JlYXRlQ2xhc3MgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL2NyZWF0ZUNsYXNzXCI7XG5cbi8qKlxuICogQGF1dGhvciBTYXZpaW9cbiAqIEBzaW5jZSAyMDIwLTQtMTlcbiAqL1xuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0NTU1J1bGVcbnZhciBSdWxlVHlwZTtcblxuKGZ1bmN0aW9uIChSdWxlVHlwZSkge1xuICAvLyB0eXBlOiBydWxlIHdpbGwgYmUgcmV3cm90ZVxuICBSdWxlVHlwZVtSdWxlVHlwZVtcIlNUWUxFXCJdID0gMV0gPSBcIlNUWUxFXCI7XG4gIFJ1bGVUeXBlW1J1bGVUeXBlW1wiTUVESUFcIl0gPSA0XSA9IFwiTUVESUFcIjtcbiAgUnVsZVR5cGVbUnVsZVR5cGVbXCJTVVBQT1JUU1wiXSA9IDEyXSA9IFwiU1VQUE9SVFNcIjsgLy8gdHlwZTogdmFsdWUgd2lsbCBiZSBrZXB0XG5cbiAgUnVsZVR5cGVbUnVsZVR5cGVbXCJJTVBPUlRcIl0gPSAzXSA9IFwiSU1QT1JUXCI7XG4gIFJ1bGVUeXBlW1J1bGVUeXBlW1wiRk9OVF9GQUNFXCJdID0gNV0gPSBcIkZPTlRfRkFDRVwiO1xuICBSdWxlVHlwZVtSdWxlVHlwZVtcIlBBR0VcIl0gPSA2XSA9IFwiUEFHRVwiO1xuICBSdWxlVHlwZVtSdWxlVHlwZVtcIktFWUZSQU1FU1wiXSA9IDddID0gXCJLRVlGUkFNRVNcIjtcbiAgUnVsZVR5cGVbUnVsZVR5cGVbXCJLRVlGUkFNRVwiXSA9IDhdID0gXCJLRVlGUkFNRVwiO1xufSkoUnVsZVR5cGUgfHwgKFJ1bGVUeXBlID0ge30pKTtcblxudmFyIGFycmF5aWZ5ID0gZnVuY3Rpb24gYXJyYXlpZnkobGlzdCkge1xuICByZXR1cm4gW10uc2xpY2UuY2FsbChsaXN0LCAwKTtcbn07XG5cbnZhciByYXdEb2N1bWVudEJvZHlBcHBlbmQgPSBIVE1MQm9keUVsZW1lbnQucHJvdG90eXBlLmFwcGVuZENoaWxkO1xuZXhwb3J0IHZhciBTY29wZWRDU1MgPSAvKiNfX1BVUkVfXyovZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBTY29wZWRDU1MoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNjb3BlZENTUyk7XG5cbiAgICB2YXIgc3R5bGVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICByYXdEb2N1bWVudEJvZHlBcHBlbmQuY2FsbChkb2N1bWVudC5ib2R5LCBzdHlsZU5vZGUpO1xuICAgIHRoaXMuc3dhcE5vZGUgPSBzdHlsZU5vZGU7XG4gICAgdGhpcy5zaGVldCA9IHN0eWxlTm9kZS5zaGVldDtcbiAgICB0aGlzLnNoZWV0LmRpc2FibGVkID0gdHJ1ZTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhTY29wZWRDU1MsIFt7XG4gICAga2V5OiBcInByb2Nlc3NcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcHJvY2VzcyhzdHlsZU5vZGUpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6ICcnO1xuXG4gICAgICB2YXIgX2E7XG5cbiAgICAgIGlmIChzdHlsZU5vZGUudGV4dENvbnRlbnQgIT09ICcnKSB7XG4gICAgICAgIHZhciB0ZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0eWxlTm9kZS50ZXh0Q29udGVudCB8fCAnJyk7XG4gICAgICAgIHRoaXMuc3dhcE5vZGUuYXBwZW5kQ2hpbGQodGV4dE5vZGUpO1xuICAgICAgICB2YXIgc2hlZXQgPSB0aGlzLnN3YXBOb2RlLnNoZWV0OyAvLyB0eXBlIGlzIG1pc3NpbmdcblxuICAgICAgICB2YXIgcnVsZXMgPSBhcnJheWlmeSgoX2EgPSBzaGVldCA9PT0gbnVsbCB8fCBzaGVldCA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2hlZXQuY3NzUnVsZXMpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IFtdKTtcbiAgICAgICAgdmFyIGNzcyA9IHRoaXMucmV3cml0ZShydWxlcywgcHJlZml4KTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG5cbiAgICAgICAgc3R5bGVOb2RlLnRleHRDb250ZW50ID0gY3NzOyAvLyBjbGVhbnVwXG5cbiAgICAgICAgdGhpcy5zd2FwTm9kZS5yZW1vdmVDaGlsZCh0ZXh0Tm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIG11dGF0b3IgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgICAgIHZhciBfYTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG11dGF0aW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgIHZhciBtdXRhdGlvbiA9IG11dGF0aW9uc1tpXTtcblxuICAgICAgICAgIGlmIChTY29wZWRDU1MuTW9kaWZpZWRUYWcgaW4gc3R5bGVOb2RlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG11dGF0aW9uLnR5cGUgPT09ICdjaGlsZExpc3QnKSB7XG4gICAgICAgICAgICB2YXIgX3NoZWV0ID0gc3R5bGVOb2RlLnNoZWV0O1xuXG4gICAgICAgICAgICB2YXIgX3J1bGVzID0gYXJyYXlpZnkoKF9hID0gX3NoZWV0ID09PSBudWxsIHx8IF9zaGVldCA9PT0gdm9pZCAwID8gdm9pZCAwIDogX3NoZWV0LmNzc1J1bGVzKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiBbXSk7XG5cbiAgICAgICAgICAgIHZhciBfY3NzID0gX3RoaXMucmV3cml0ZShfcnVsZXMsIHByZWZpeCk7IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXG5cbiAgICAgICAgICAgIHN0eWxlTm9kZS50ZXh0Q29udGVudCA9IF9jc3M7IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXG4gICAgICAgICAgICBzdHlsZU5vZGVbU2NvcGVkQ1NTLk1vZGlmaWVkVGFnXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTsgLy8gc2luY2Ugb2JzZXJ2ZXIgd2lsbCBiZSBkZWxldGVkIHdoZW4gbm9kZSBiZSByZW1vdmVkXG4gICAgICAvLyB3ZSBkb250IG5lZWQgY3JlYXRlIGEgY2xlYW51cCBmdW5jdGlvbiBtYW51YWxseVxuICAgICAgLy8gc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9NdXRhdGlvbk9ic2VydmVyL2Rpc2Nvbm5lY3RcblxuICAgICAgbXV0YXRvci5vYnNlcnZlKHN0eWxlTm9kZSwge1xuICAgICAgICBjaGlsZExpc3Q6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZXdyaXRlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJld3JpdGUocnVsZXMpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgcHJlZml4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAnJztcbiAgICAgIHZhciBjc3MgPSAnJztcbiAgICAgIHJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgc3dpdGNoIChydWxlLnR5cGUpIHtcbiAgICAgICAgICBjYXNlIFJ1bGVUeXBlLlNUWUxFOlxuICAgICAgICAgICAgY3NzICs9IF90aGlzMi5ydWxlU3R5bGUocnVsZSwgcHJlZml4KTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBSdWxlVHlwZS5NRURJQTpcbiAgICAgICAgICAgIGNzcyArPSBfdGhpczIucnVsZU1lZGlhKHJ1bGUsIHByZWZpeCk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgUnVsZVR5cGUuU1VQUE9SVFM6XG4gICAgICAgICAgICBjc3MgKz0gX3RoaXMyLnJ1bGVTdXBwb3J0KHJ1bGUsIHByZWZpeCk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjc3MgKz0gXCJcIi5jb25jYXQocnVsZS5jc3NUZXh0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjc3M7XG4gICAgfSAvLyBoYW5kbGUgY2FzZTpcbiAgICAvLyAuYXBwLW1haW4ge31cbiAgICAvLyBodG1sLCBib2R5IHt9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNsYXNzLW1ldGhvZHMtdXNlLXRoaXNcblxuICB9LCB7XG4gICAga2V5OiBcInJ1bGVTdHlsZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBydWxlU3R5bGUocnVsZSwgcHJlZml4KSB7XG4gICAgICB2YXIgcm9vdFNlbGVjdG9yUkUgPSAvKCg/OlteXFx3XFwtLiNdfF4pKGJvZHl8aHRtbHw6cm9vdCkpL2dtO1xuICAgICAgdmFyIHJvb3RDb21iaW5hdGlvblJFID0gLyhodG1sW15cXHd7W10rKS9nbTtcbiAgICAgIHZhciBzZWxlY3RvciA9IHJ1bGUuc2VsZWN0b3JUZXh0LnRyaW0oKTtcbiAgICAgIHZhciBjc3NUZXh0ID0gcnVsZS5jc3NUZXh0OyAvLyBoYW5kbGUgaHRtbCB7IC4uLiB9XG4gICAgICAvLyBoYW5kbGUgYm9keSB7IC4uLiB9XG4gICAgICAvLyBoYW5kbGUgOnJvb3QgeyAuLi4gfVxuXG4gICAgICBpZiAoc2VsZWN0b3IgPT09ICdodG1sJyB8fCBzZWxlY3RvciA9PT0gJ2JvZHknIHx8IHNlbGVjdG9yID09PSAnOnJvb3QnKSB7XG4gICAgICAgIHJldHVybiBjc3NUZXh0LnJlcGxhY2Uocm9vdFNlbGVjdG9yUkUsIHByZWZpeCk7XG4gICAgICB9IC8vIGhhbmRsZSBodG1sIGJvZHkgeyAuLi4gfVxuICAgICAgLy8gaGFuZGxlIGh0bWwgPiBib2R5IHsgLi4uIH1cblxuXG4gICAgICBpZiAocm9vdENvbWJpbmF0aW9uUkUudGVzdChydWxlLnNlbGVjdG9yVGV4dCkpIHtcbiAgICAgICAgdmFyIHNpYmxpbmdTZWxlY3RvclJFID0gLyhodG1sW15cXHd7XSspKFxcK3x+KS9nbTsgLy8gc2luY2UgaHRtbCArIGJvZHkgaXMgYSBub24tc3RhbmRhcmQgcnVsZSBmb3IgaHRtbFxuICAgICAgICAvLyB0cmFuc2Zvcm1lciB3aWxsIGlnbm9yZSBpdFxuXG4gICAgICAgIGlmICghc2libGluZ1NlbGVjdG9yUkUudGVzdChydWxlLnNlbGVjdG9yVGV4dCkpIHtcbiAgICAgICAgICBjc3NUZXh0ID0gY3NzVGV4dC5yZXBsYWNlKHJvb3RDb21iaW5hdGlvblJFLCAnJyk7XG4gICAgICAgIH1cbiAgICAgIH0gLy8gaGFuZGxlIGdyb3VwaW5nIHNlbGVjdG9yLCBhLHNwYW4scCxkaXYgeyAuLi4gfVxuXG5cbiAgICAgIGNzc1RleHQgPSBjc3NUZXh0LnJlcGxhY2UoL15bXFxzXFxTXSt7LywgZnVuY3Rpb24gKHNlbGVjdG9ycykge1xuICAgICAgICByZXR1cm4gc2VsZWN0b3JzLnJlcGxhY2UoLyhefCxcXG4/KShbXixdKykvZywgZnVuY3Rpb24gKGl0ZW0sIHAsIHMpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgZGl2LGJvZHksc3BhbiB7IC4uLiB9XG4gICAgICAgICAgaWYgKHJvb3RTZWxlY3RvclJFLnRlc3QoaXRlbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnJlcGxhY2Uocm9vdFNlbGVjdG9yUkUsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgIC8vIGRvIG5vdCBkaXNjYXJkIHZhbGlkIHByZXZpb3VzIGNoYXJhY3Rlciwgc3VjaCBhcyBib2R5LGh0bWwgb3IgKjpub3QoOnJvb3QpXG4gICAgICAgICAgICAgIHZhciB3aGl0ZVByZXZDaGFycyA9IFsnLCcsICcoJ107XG5cbiAgICAgICAgICAgICAgaWYgKG0gJiYgd2hpdGVQcmV2Q2hhcnMuaW5jbHVkZXMobVswXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIi5jb25jYXQobVswXSkuY29uY2F0KHByZWZpeCk7XG4gICAgICAgICAgICAgIH0gLy8gcmVwbGFjZSByb290IHNlbGVjdG9yIHdpdGggcHJlZml4XG5cblxuICAgICAgICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIFwiXCIuY29uY2F0KHApLmNvbmNhdChwcmVmaXgsIFwiIFwiKS5jb25jYXQocy5yZXBsYWNlKC9eICovLCAnJykpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGNzc1RleHQ7XG4gICAgfSAvLyBoYW5kbGUgY2FzZTpcbiAgICAvLyBAbWVkaWEgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAzMDBweCkge31cblxuICB9LCB7XG4gICAga2V5OiBcInJ1bGVNZWRpYVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBydWxlTWVkaWEocnVsZSwgcHJlZml4KSB7XG4gICAgICB2YXIgY3NzID0gdGhpcy5yZXdyaXRlKGFycmF5aWZ5KHJ1bGUuY3NzUnVsZXMpLCBwcmVmaXgpO1xuICAgICAgcmV0dXJuIFwiQG1lZGlhIFwiLmNvbmNhdChydWxlLmNvbmRpdGlvblRleHQsIFwiIHtcIikuY29uY2F0KGNzcywgXCJ9XCIpO1xuICAgIH0gLy8gaGFuZGxlIGNhc2U6XG4gICAgLy8gQHN1cHBvcnRzIChkaXNwbGF5OiBncmlkKSB7fVxuXG4gIH0sIHtcbiAgICBrZXk6IFwicnVsZVN1cHBvcnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcnVsZVN1cHBvcnQocnVsZSwgcHJlZml4KSB7XG4gICAgICB2YXIgY3NzID0gdGhpcy5yZXdyaXRlKGFycmF5aWZ5KHJ1bGUuY3NzUnVsZXMpLCBwcmVmaXgpO1xuICAgICAgcmV0dXJuIFwiQHN1cHBvcnRzIFwiLmNvbmNhdChydWxlLmNvbmRpdGlvblRleHQsIFwiIHtcIikuY29uY2F0KGNzcywgXCJ9XCIpO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBTY29wZWRDU1M7XG59KCk7XG5TY29wZWRDU1MuTW9kaWZpZWRUYWcgPSAnU3ltYm9sKHN0eWxlLW1vZGlmaWVkLXFpYW5rdW4pJztcbnZhciBwcm9jZXNzb3I7XG5leHBvcnQgdmFyIFFpYW5rdW5DU1NSZXdyaXRlQXR0ciA9ICdkYXRhLXFpYW5rdW4nO1xuZXhwb3J0IHZhciBwcm9jZXNzID0gZnVuY3Rpb24gcHJvY2VzcyhhcHBXcmFwcGVyLCBzdHlsZXNoZWV0RWxlbWVudCwgYXBwTmFtZSkge1xuICAvLyBsYXp5IHNpbmdsZXRvbiBwYXR0ZXJuXG4gIGlmICghcHJvY2Vzc29yKSB7XG4gICAgcHJvY2Vzc29yID0gbmV3IFNjb3BlZENTUygpO1xuICB9XG5cbiAgaWYgKHN0eWxlc2hlZXRFbGVtZW50LnRhZ05hbWUgPT09ICdMSU5LJykge1xuICAgIGNvbnNvbGUud2FybignRmVhdHVyZTogc2FuZGJveC5leHBlcmltZW50YWxTdHlsZUlzb2xhdGlvbiBpcyBub3Qgc3VwcG9ydCBmb3IgbGluayBlbGVtZW50IHlldC4nKTtcbiAgfVxuXG4gIHZhciBtb3VudERPTSA9IGFwcFdyYXBwZXI7XG5cbiAgaWYgKCFtb3VudERPTSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciB0YWcgPSAobW91bnRET00udGFnTmFtZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcblxuICBpZiAodGFnICYmIHN0eWxlc2hlZXRFbGVtZW50LnRhZ05hbWUgPT09ICdTVFlMRScpIHtcbiAgICB2YXIgcHJlZml4ID0gXCJcIi5jb25jYXQodGFnLCBcIltcIikuY29uY2F0KFFpYW5rdW5DU1NSZXdyaXRlQXR0ciwgXCI9XFxcIlwiKS5jb25jYXQoYXBwTmFtZSwgXCJcXFwiXVwiKTtcbiAgICBwcm9jZXNzb3IucHJvY2VzcyhzdHlsZXNoZWV0RWxlbWVudCwgcHJlZml4KTtcbiAgfVxufTsiLCJpbXBvcnQgX2lzRnVuY3Rpb24gZnJvbSBcImxvZGFzaC9pc0Z1bmN0aW9uXCI7XG5cbi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDE5LTEwLTIxXG4gKi9cbmltcG9ydCB7IGV4ZWNTY3JpcHRzIH0gZnJvbSAnaW1wb3J0LWh0bWwtZW50cnknO1xuaW1wb3J0IHsgZnJhbWV3b3JrQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uLy4uLy4uL2FwaXMnO1xuaW1wb3J0ICogYXMgY3NzIGZyb20gJy4uL2Nzcyc7XG5leHBvcnQgdmFyIHJhd0hlYWRBcHBlbmRDaGlsZCA9IEhUTUxIZWFkRWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQ7XG52YXIgcmF3SGVhZFJlbW92ZUNoaWxkID0gSFRNTEhlYWRFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDaGlsZDtcbnZhciByYXdCb2R5QXBwZW5kQ2hpbGQgPSBIVE1MQm9keUVsZW1lbnQucHJvdG90eXBlLmFwcGVuZENoaWxkO1xudmFyIHJhd0JvZHlSZW1vdmVDaGlsZCA9IEhUTUxCb2R5RWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQ2hpbGQ7XG52YXIgcmF3SGVhZEluc2VydEJlZm9yZSA9IEhUTUxIZWFkRWxlbWVudC5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlO1xudmFyIHJhd1JlbW92ZUNoaWxkID0gSFRNTEVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUNoaWxkO1xudmFyIFNDUklQVF9UQUdfTkFNRSA9ICdTQ1JJUFQnO1xudmFyIExJTktfVEFHX05BTUUgPSAnTElOSyc7XG52YXIgU1RZTEVfVEFHX05BTUUgPSAnU1RZTEUnO1xuZXhwb3J0IGZ1bmN0aW9uIGlzSGlqYWNraW5nVGFnKHRhZ05hbWUpIHtcbiAgcmV0dXJuICh0YWdOYW1lID09PSBudWxsIHx8IHRhZ05hbWUgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHRhZ05hbWUudG9VcHBlckNhc2UoKSkgPT09IExJTktfVEFHX05BTUUgfHwgKHRhZ05hbWUgPT09IG51bGwgfHwgdGFnTmFtZSA9PT0gdm9pZCAwID8gdm9pZCAwIDogdGFnTmFtZS50b1VwcGVyQ2FzZSgpKSA9PT0gU1RZTEVfVEFHX05BTUUgfHwgKHRhZ05hbWUgPT09IG51bGwgfHwgdGFnTmFtZSA9PT0gdm9pZCAwID8gdm9pZCAwIDogdGFnTmFtZS50b1VwcGVyQ2FzZSgpKSA9PT0gU0NSSVBUX1RBR19OQU1FO1xufVxuLyoqXG4gKiBDaGVjayBpZiBhIHN0eWxlIGVsZW1lbnQgaXMgYSBzdHlsZWQtY29tcG9uZW50IGxpa2VkLlxuICogQSBzdHlsZWQtY29tcG9uZW50cyBsaWtlZCBlbGVtZW50IGlzIHdoaWNoIG5vdCBoYXZlIHRleHRDb250ZXh0IGJ1dCBrZWVwIHRoZSBydWxlcyBpbiBpdHMgc3R5bGVTaGVldC5jc3NSdWxlcy5cbiAqIFN1Y2ggYXMgdGhlIHN0eWxlIGVsZW1lbnQgZ2VuZXJhdGVkIGJ5IHN0eWxlZC1jb21wb25lbnRzIGFuZCBlbW90aW9uLlxuICogQHBhcmFtIGVsZW1lbnRcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTdHlsZWRDb21wb25lbnRzTGlrZShlbGVtZW50KSB7XG4gIHZhciBfYSwgX2I7XG5cbiAgcmV0dXJuICFlbGVtZW50LnRleHRDb250ZW50ICYmICgoKF9hID0gZWxlbWVudC5zaGVldCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmNzc1J1bGVzLmxlbmd0aCkgfHwgKChfYiA9IGdldFN0eWxlZEVsZW1lbnRDU1NSdWxlcyhlbGVtZW50KSkgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmxlbmd0aCkpO1xufVxuXG5mdW5jdGlvbiBwYXRjaEN1c3RvbUV2ZW50KGUsIGVsZW1lbnRHZXR0ZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZSwge1xuICAgIHNyY0VsZW1lbnQ6IHtcbiAgICAgIGdldDogZWxlbWVudEdldHRlclxuICAgIH0sXG4gICAgdGFyZ2V0OiB7XG4gICAgICBnZXQ6IGVsZW1lbnRHZXR0ZXJcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZTtcbn1cblxuZnVuY3Rpb24gbWFudWFsSW52b2tlRWxlbWVudE9uTG9hZChlbGVtZW50KSB7XG4gIC8vIHdlIG5lZWQgdG8gaW52b2tlIHRoZSBvbmxvYWQgZXZlbnQgbWFudWFsbHkgdG8gbm90aWZ5IHRoZSBldmVudCBsaXN0ZW5lciB0aGF0IHRoZSBzY3JpcHQgd2FzIGNvbXBsZXRlZFxuICAvLyBoZXJlIGFyZSB0aGUgdHdvIHR5cGljYWwgd2F5cyBvZiBkeW5hbWljIHNjcmlwdCBsb2FkaW5nXG4gIC8vIDEuIGVsZW1lbnQub25sb2FkIGNhbGxiYWNrIHdheSwgd2hpY2ggd2VicGFjayBhbmQgbG9hZGpzIHVzZWQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbXVpY3NzL2xvYWRqcy9ibG9iL21hc3Rlci9zcmMvbG9hZGpzLmpzI0wxMzhcbiAgLy8gMi4gYWRkRXZlbnRMaXN0ZW5lciB3YXksIHdoaWNoIHRvYXN0LWxvYWRlciB1c2VkLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3B5cnNtay90b2FzdC9ibG9iL21hc3Rlci9zcmMvVG9hc3QudHMjTDY0XG4gIHZhciBsb2FkRXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2xvYWQnKTtcbiAgdmFyIHBhdGNoZWRFdmVudCA9IHBhdGNoQ3VzdG9tRXZlbnQobG9hZEV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0pO1xuXG4gIGlmIChfaXNGdW5jdGlvbihlbGVtZW50Lm9ubG9hZCkpIHtcbiAgICBlbGVtZW50Lm9ubG9hZChwYXRjaGVkRXZlbnQpO1xuICB9IGVsc2Uge1xuICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChwYXRjaGVkRXZlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hbnVhbEludm9rZUVsZW1lbnRPbkVycm9yKGVsZW1lbnQpIHtcbiAgdmFyIGVycm9yRXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2Vycm9yJyk7XG4gIHZhciBwYXRjaGVkRXZlbnQgPSBwYXRjaEN1c3RvbUV2ZW50KGVycm9yRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfSk7XG5cbiAgaWYgKF9pc0Z1bmN0aW9uKGVsZW1lbnQub25lcnJvcikpIHtcbiAgICBlbGVtZW50Lm9uZXJyb3IocGF0Y2hlZEV2ZW50KTtcbiAgfSBlbHNlIHtcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQocGF0Y2hlZEV2ZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0TGlua0FzU3R5bGUoZWxlbWVudCwgcG9zdFByb2Nlc3MpIHtcbiAgdmFyIGZldGNoRm4gPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IGZldGNoO1xuICB2YXIgc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgdmFyIGhyZWYgPSBlbGVtZW50LmhyZWY7IC8vIGFkZCBzb3VyY2UgbGluayBlbGVtZW50IGhyZWZcblxuICBzdHlsZUVsZW1lbnQuZGF0YXNldC5xaWFua3VuSHJlZiA9IGhyZWY7XG4gIGZldGNoRm4oaHJlZikudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHJlcy50ZXh0KCk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHN0eWxlQ29udGV4dCkge1xuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHlsZUNvbnRleHQpKTtcbiAgICBwb3N0UHJvY2VzcyhzdHlsZUVsZW1lbnQpO1xuICAgIG1hbnVhbEludm9rZUVsZW1lbnRPbkxvYWQoZWxlbWVudCk7XG4gIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbWFudWFsSW52b2tlRWxlbWVudE9uRXJyb3IoZWxlbWVudCk7XG4gIH0pO1xuICByZXR1cm4gc3R5bGVFbGVtZW50O1xufVxuXG52YXIgc3R5bGVkQ29tcG9uZW50Q1NTUnVsZXNNYXAgPSBuZXcgV2Vha01hcCgpO1xudmFyIGR5bmFtaWNTY3JpcHRBdHRhY2hlZENvbW1lbnRNYXAgPSBuZXcgV2Vha01hcCgpO1xudmFyIGR5bmFtaWNMaW5rQXR0YWNoZWRJbmxpbmVTdHlsZU1hcCA9IG5ldyBXZWFrTWFwKCk7XG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkU3R5bGVkQ29tcG9uZW50c0NTU1J1bGVzKHN0eWxlRWxlbWVudHMpIHtcbiAgc3R5bGVFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChzdHlsZUVsZW1lbnQpIHtcbiAgICAvKlxuICAgICBXaXRoIGEgc3R5bGVkLWNvbXBvbmVudHMgZ2VuZXJhdGVkIHN0eWxlIGVsZW1lbnQsIHdlIG5lZWQgdG8gcmVjb3JkIGl0cyBjc3NSdWxlcyBmb3IgcmVzdG9yZSBuZXh0IHJlLW1vdW50aW5nIHRpbWUuXG4gICAgIFdlJ3JlIGRvaW5nIHRoaXMgYmVjYXVzZSB0aGUgc2hlZXQgb2Ygc3R5bGUgZWxlbWVudCBpcyBnb2luZyB0byBiZSBjbGVhbmVkIGF1dG9tYXRpY2FsbHkgYnkgYnJvd3NlciBhZnRlciB0aGUgc3R5bGUgZWxlbWVudCBkb20gcmVtb3ZlZCBmcm9tIGRvY3VtZW50LlxuICAgICBzZWUgaHR0cHM6Ly93d3cudzMub3JnL1RSL2Nzc29tLTEvI2Fzc29jaWF0ZWQtY3NzLXN0eWxlLXNoZWV0XG4gICAgICovXG4gICAgaWYgKHN0eWxlRWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTdHlsZUVsZW1lbnQgJiYgaXNTdHlsZWRDb21wb25lbnRzTGlrZShzdHlsZUVsZW1lbnQpKSB7XG4gICAgICBpZiAoc3R5bGVFbGVtZW50LnNoZWV0KSB7XG4gICAgICAgIC8vIHJlY29yZCB0aGUgb3JpZ2luYWwgY3NzIHJ1bGVzIG9mIHRoZSBzdHlsZSBlbGVtZW50IGZvciByZXN0b3JlXG4gICAgICAgIHN0eWxlZENvbXBvbmVudENTU1J1bGVzTWFwLnNldChzdHlsZUVsZW1lbnQsIHN0eWxlRWxlbWVudC5zaGVldC5jc3NSdWxlcyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHlsZWRFbGVtZW50Q1NTUnVsZXMoc3R5bGVkRWxlbWVudCkge1xuICByZXR1cm4gc3R5bGVkQ29tcG9uZW50Q1NTUnVsZXNNYXAuZ2V0KHN0eWxlZEVsZW1lbnQpO1xufVxuXG5mdW5jdGlvbiBnZXRPdmVyd3JpdHRlbkFwcGVuZENoaWxkT3JJbnNlcnRCZWZvcmUob3B0cykge1xuICByZXR1cm4gZnVuY3Rpb24gYXBwZW5kQ2hpbGRPckluc2VydEJlZm9yZShuZXdDaGlsZCwgcmVmQ2hpbGQpIHtcbiAgICB2YXIgX2EsIF9iO1xuXG4gICAgdmFyIGVsZW1lbnQgPSBuZXdDaGlsZDtcbiAgICB2YXIgcmF3RE9NQXBwZW5kT3JJbnNlcnRCZWZvcmUgPSBvcHRzLnJhd0RPTUFwcGVuZE9ySW5zZXJ0QmVmb3JlLFxuICAgICAgICBpc0ludm9rZWRCeU1pY3JvQXBwID0gb3B0cy5pc0ludm9rZWRCeU1pY3JvQXBwLFxuICAgICAgICBjb250YWluZXJDb25maWdHZXR0ZXIgPSBvcHRzLmNvbnRhaW5lckNvbmZpZ0dldHRlcjtcblxuICAgIGlmICghaXNIaWphY2tpbmdUYWcoZWxlbWVudC50YWdOYW1lKSB8fCAhaXNJbnZva2VkQnlNaWNyb0FwcChlbGVtZW50KSkge1xuICAgICAgcmV0dXJuIHJhd0RPTUFwcGVuZE9ySW5zZXJ0QmVmb3JlLmNhbGwodGhpcywgZWxlbWVudCwgcmVmQ2hpbGQpO1xuICAgIH1cblxuICAgIGlmIChlbGVtZW50LnRhZ05hbWUpIHtcbiAgICAgIHZhciBjb250YWluZXJDb25maWcgPSBjb250YWluZXJDb25maWdHZXR0ZXIoZWxlbWVudCk7XG4gICAgICB2YXIgYXBwTmFtZSA9IGNvbnRhaW5lckNvbmZpZy5hcHBOYW1lLFxuICAgICAgICAgIGFwcFdyYXBwZXJHZXR0ZXIgPSBjb250YWluZXJDb25maWcuYXBwV3JhcHBlckdldHRlcixcbiAgICAgICAgICBwcm94eSA9IGNvbnRhaW5lckNvbmZpZy5wcm94eSxcbiAgICAgICAgICBzdHJpY3RHbG9iYWwgPSBjb250YWluZXJDb25maWcuc3RyaWN0R2xvYmFsLFxuICAgICAgICAgIGR5bmFtaWNTdHlsZVNoZWV0RWxlbWVudHMgPSBjb250YWluZXJDb25maWcuZHluYW1pY1N0eWxlU2hlZXRFbGVtZW50cyxcbiAgICAgICAgICBzY29wZWRDU1MgPSBjb250YWluZXJDb25maWcuc2NvcGVkQ1NTLFxuICAgICAgICAgIGV4Y2x1ZGVBc3NldEZpbHRlciA9IGNvbnRhaW5lckNvbmZpZy5leGNsdWRlQXNzZXRGaWx0ZXI7XG5cbiAgICAgIHN3aXRjaCAoZWxlbWVudC50YWdOYW1lKSB7XG4gICAgICAgIGNhc2UgTElOS19UQUdfTkFNRTpcbiAgICAgICAgY2FzZSBTVFlMRV9UQUdfTkFNRTpcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgc3R5bGVzaGVldEVsZW1lbnQgPSBuZXdDaGlsZDtcbiAgICAgICAgICAgIHZhciBfc3R5bGVzaGVldEVsZW1lbnQgPSBzdHlsZXNoZWV0RWxlbWVudCxcbiAgICAgICAgICAgICAgICBocmVmID0gX3N0eWxlc2hlZXRFbGVtZW50LmhyZWY7XG5cbiAgICAgICAgICAgIGlmIChleGNsdWRlQXNzZXRGaWx0ZXIgJiYgaHJlZiAmJiBleGNsdWRlQXNzZXRGaWx0ZXIoaHJlZikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJhd0RPTUFwcGVuZE9ySW5zZXJ0QmVmb3JlLmNhbGwodGhpcywgZWxlbWVudCwgcmVmQ2hpbGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbW91bnRET00gPSBhcHBXcmFwcGVyR2V0dGVyKCk7XG5cbiAgICAgICAgICAgIGlmIChzY29wZWRDU1MpIHtcbiAgICAgICAgICAgICAgLy8gZXhjbHVkZSBsaW5rIGVsZW1lbnRzIGxpa2UgPGxpbmsgcmVsPVwiaWNvblwiIGhyZWY9XCJmYXZpY29uLmljb1wiPlxuICAgICAgICAgICAgICB2YXIgbGlua0VsZW1lbnRVc2luZ1N0eWxlc2hlZXQgPSAoKF9hID0gZWxlbWVudC50YWdOYW1lKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EudG9VcHBlckNhc2UoKSkgPT09IExJTktfVEFHX05BTUUgJiYgZWxlbWVudC5yZWwgPT09ICdzdHlsZXNoZWV0JyAmJiBlbGVtZW50LmhyZWY7XG5cbiAgICAgICAgICAgICAgaWYgKGxpbmtFbGVtZW50VXNpbmdTdHlsZXNoZWV0KSB7XG4gICAgICAgICAgICAgICAgdmFyIF9mZXRjaCA9IHR5cGVvZiBmcmFtZXdvcmtDb25maWd1cmF0aW9uLmZldGNoID09PSAnZnVuY3Rpb24nID8gZnJhbWV3b3JrQ29uZmlndXJhdGlvbi5mZXRjaCA6IChfYiA9IGZyYW1ld29ya0NvbmZpZ3VyYXRpb24uZmV0Y2gpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5mbjtcblxuICAgICAgICAgICAgICAgIHN0eWxlc2hlZXRFbGVtZW50ID0gY29udmVydExpbmtBc1N0eWxlKGVsZW1lbnQsIGZ1bmN0aW9uIChzdHlsZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBjc3MucHJvY2Vzcyhtb3VudERPTSwgc3R5bGVFbGVtZW50LCBhcHBOYW1lKTtcbiAgICAgICAgICAgICAgICB9LCBfZmV0Y2gpO1xuICAgICAgICAgICAgICAgIGR5bmFtaWNMaW5rQXR0YWNoZWRJbmxpbmVTdHlsZU1hcC5zZXQoZWxlbWVudCwgc3R5bGVzaGVldEVsZW1lbnQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNzcy5wcm9jZXNzKG1vdW50RE9NLCBzdHlsZXNoZWV0RWxlbWVudCwgYXBwTmFtZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNoYWRvd1xuXG5cbiAgICAgICAgICAgIGR5bmFtaWNTdHlsZVNoZWV0RWxlbWVudHMucHVzaChzdHlsZXNoZWV0RWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgcmVmZXJlbmNlTm9kZSA9IG1vdW50RE9NLmNvbnRhaW5zKHJlZkNoaWxkKSA/IHJlZkNoaWxkIDogbnVsbDtcbiAgICAgICAgICAgIHJldHVybiByYXdET01BcHBlbmRPckluc2VydEJlZm9yZS5jYWxsKG1vdW50RE9NLCBzdHlsZXNoZWV0RWxlbWVudCwgcmVmZXJlbmNlTm9kZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgU0NSSVBUX1RBR19OQU1FOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciBfZWxlbWVudCA9IGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgc3JjID0gX2VsZW1lbnQuc3JjLFxuICAgICAgICAgICAgICAgIHRleHQgPSBfZWxlbWVudC50ZXh0OyAvLyBzb21lIHNjcmlwdCBsaWtlIGpzb25wIG1heWJlIG5vdCBzdXBwb3J0IGNvcnMgd2hpY2ggc2hvdWxkJ3QgdXNlIGV4ZWNTY3JpcHRzXG5cbiAgICAgICAgICAgIGlmIChleGNsdWRlQXNzZXRGaWx0ZXIgJiYgc3JjICYmIGV4Y2x1ZGVBc3NldEZpbHRlcihzcmMpKSB7XG4gICAgICAgICAgICAgIHJldHVybiByYXdET01BcHBlbmRPckluc2VydEJlZm9yZS5jYWxsKHRoaXMsIGVsZW1lbnQsIHJlZkNoaWxkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIF9tb3VudERPTSA9IGFwcFdyYXBwZXJHZXR0ZXIoKTtcblxuICAgICAgICAgICAgdmFyIF9mZXRjaDIgPSBmcmFtZXdvcmtDb25maWd1cmF0aW9uLmZldGNoO1xuXG4gICAgICAgICAgICB2YXIgX3JlZmVyZW5jZU5vZGUgPSBfbW91bnRET00uY29udGFpbnMocmVmQ2hpbGQpID8gcmVmQ2hpbGQgOiBudWxsO1xuXG4gICAgICAgICAgICBpZiAoc3JjKSB7XG4gICAgICAgICAgICAgIGV4ZWNTY3JpcHRzKG51bGwsIFtzcmNdLCBwcm94eSwge1xuICAgICAgICAgICAgICAgIGZldGNoOiBfZmV0Y2gyLFxuICAgICAgICAgICAgICAgIHN0cmljdEdsb2JhbDogc3RyaWN0R2xvYmFsLFxuICAgICAgICAgICAgICAgIGJlZm9yZUV4ZWM6IGZ1bmN0aW9uIGJlZm9yZUV4ZWMoKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaXNDdXJyZW50U2NyaXB0Q29uZmlndXJhYmxlID0gZnVuY3Rpb24gaXNDdXJyZW50U2NyaXB0Q29uZmlndXJhYmxlKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZG9jdW1lbnQsICdjdXJyZW50U2NyaXB0Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhZGVzY3JpcHRvciB8fCBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZTtcbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbnRTY3JpcHRDb25maWd1cmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZG9jdW1lbnQsICdjdXJyZW50U2NyaXB0Jywge1xuICAgICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgbWFudWFsSW52b2tlRWxlbWVudE9uTG9hZChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIGVycm9yKCkge1xuICAgICAgICAgICAgICAgICAgbWFudWFsSW52b2tlRWxlbWVudE9uRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB2YXIgZHluYW1pY1NjcmlwdENvbW1lbnRFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChcImR5bmFtaWMgc2NyaXB0IFwiLmNvbmNhdChzcmMsIFwiIHJlcGxhY2VkIGJ5IHFpYW5rdW5cIikpO1xuICAgICAgICAgICAgICBkeW5hbWljU2NyaXB0QXR0YWNoZWRDb21tZW50TWFwLnNldChlbGVtZW50LCBkeW5hbWljU2NyaXB0Q29tbWVudEVsZW1lbnQpO1xuICAgICAgICAgICAgICByZXR1cm4gcmF3RE9NQXBwZW5kT3JJbnNlcnRCZWZvcmUuY2FsbChfbW91bnRET00sIGR5bmFtaWNTY3JpcHRDb21tZW50RWxlbWVudCwgX3JlZmVyZW5jZU5vZGUpO1xuICAgICAgICAgICAgfSAvLyBpbmxpbmUgc2NyaXB0IG5ldmVyIHRyaWdnZXIgdGhlIG9ubG9hZCBhbmQgb25lcnJvciBldmVudFxuXG5cbiAgICAgICAgICAgIGV4ZWNTY3JpcHRzKG51bGwsIFtcIjxzY3JpcHQ+XCIuY29uY2F0KHRleHQsIFwiPC9zY3JpcHQ+XCIpXSwgcHJveHksIHtcbiAgICAgICAgICAgICAgc3RyaWN0R2xvYmFsOiBzdHJpY3RHbG9iYWxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGR5bmFtaWNJbmxpbmVTY3JpcHRDb21tZW50RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ2R5bmFtaWMgaW5saW5lIHNjcmlwdCByZXBsYWNlZCBieSBxaWFua3VuJyk7XG4gICAgICAgICAgICBkeW5hbWljU2NyaXB0QXR0YWNoZWRDb21tZW50TWFwLnNldChlbGVtZW50LCBkeW5hbWljSW5saW5lU2NyaXB0Q29tbWVudEVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHJhd0RPTUFwcGVuZE9ySW5zZXJ0QmVmb3JlLmNhbGwoX21vdW50RE9NLCBkeW5hbWljSW5saW5lU2NyaXB0Q29tbWVudEVsZW1lbnQsIF9yZWZlcmVuY2VOb2RlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmF3RE9NQXBwZW5kT3JJbnNlcnRCZWZvcmUuY2FsbCh0aGlzLCBlbGVtZW50LCByZWZDaGlsZCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE5ld1JlbW92ZUNoaWxkKGhlYWRPckJvZHlSZW1vdmVDaGlsZCwgYXBwV3JhcHBlckdldHRlckdldHRlcikge1xuICByZXR1cm4gZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgICB2YXIgdGFnTmFtZSA9IGNoaWxkLnRhZ05hbWU7XG4gICAgaWYgKCFpc0hpamFja2luZ1RhZyh0YWdOYW1lKSkgcmV0dXJuIGhlYWRPckJvZHlSZW1vdmVDaGlsZC5jYWxsKHRoaXMsIGNoaWxkKTtcblxuICAgIHRyeSB7XG4gICAgICB2YXIgYXR0YWNoZWRFbGVtZW50O1xuXG4gICAgICBzd2l0Y2ggKHRhZ05hbWUpIHtcbiAgICAgICAgY2FzZSBMSU5LX1RBR19OQU1FOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dGFjaGVkRWxlbWVudCA9IGR5bmFtaWNMaW5rQXR0YWNoZWRJbmxpbmVTdHlsZU1hcC5nZXQoY2hpbGQpIHx8IGNoaWxkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgU0NSSVBUX1RBR19OQU1FOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dGFjaGVkRWxlbWVudCA9IGR5bmFtaWNTY3JpcHRBdHRhY2hlZENvbW1lbnRNYXAuZ2V0KGNoaWxkKSB8fCBjaGlsZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dGFjaGVkRWxlbWVudCA9IGNoaWxkO1xuICAgICAgICAgIH1cbiAgICAgIH0gLy8gY29udGFpbmVyIG1heSBoYWQgYmVlbiByZW1vdmVkIHdoaWxlIGFwcCB1bm1vdW50aW5nIGlmIHRoZSByZW1vdmVDaGlsZCBhY3Rpb24gd2FzIGFzeW5jXG5cblxuICAgICAgdmFyIGFwcFdyYXBwZXJHZXR0ZXIgPSBhcHBXcmFwcGVyR2V0dGVyR2V0dGVyKGNoaWxkKTtcbiAgICAgIHZhciBjb250YWluZXIgPSBhcHBXcmFwcGVyR2V0dGVyKCk7XG5cbiAgICAgIGlmIChjb250YWluZXIuY29udGFpbnMoYXR0YWNoZWRFbGVtZW50KSkge1xuICAgICAgICByZXR1cm4gcmF3UmVtb3ZlQ2hpbGQuY2FsbChjb250YWluZXIsIGF0dGFjaGVkRWxlbWVudCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkT3JCb2R5UmVtb3ZlQ2hpbGQuY2FsbCh0aGlzLCBjaGlsZCk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaEhUTUxEeW5hbWljQXBwZW5kUHJvdG90eXBlRnVuY3Rpb25zKGlzSW52b2tlZEJ5TWljcm9BcHAsIGNvbnRhaW5lckNvbmZpZ0dldHRlcikge1xuICAvLyBKdXN0IG92ZXJ3cml0ZSBpdCB3aGlsZSBpdCBoYXZlIG5vdCBiZWVuIG92ZXJ3cml0ZVxuICBpZiAoSFRNTEhlYWRFbGVtZW50LnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9PT0gcmF3SGVhZEFwcGVuZENoaWxkICYmIEhUTUxCb2R5RWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPT09IHJhd0JvZHlBcHBlbmRDaGlsZCAmJiBIVE1MSGVhZEVsZW1lbnQucHJvdG90eXBlLmluc2VydEJlZm9yZSA9PT0gcmF3SGVhZEluc2VydEJlZm9yZSkge1xuICAgIEhUTUxIZWFkRWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSBnZXRPdmVyd3JpdHRlbkFwcGVuZENoaWxkT3JJbnNlcnRCZWZvcmUoe1xuICAgICAgcmF3RE9NQXBwZW5kT3JJbnNlcnRCZWZvcmU6IHJhd0hlYWRBcHBlbmRDaGlsZCxcbiAgICAgIGNvbnRhaW5lckNvbmZpZ0dldHRlcjogY29udGFpbmVyQ29uZmlnR2V0dGVyLFxuICAgICAgaXNJbnZva2VkQnlNaWNyb0FwcDogaXNJbnZva2VkQnlNaWNyb0FwcFxuICAgIH0pO1xuICAgIEhUTUxCb2R5RWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSBnZXRPdmVyd3JpdHRlbkFwcGVuZENoaWxkT3JJbnNlcnRCZWZvcmUoe1xuICAgICAgcmF3RE9NQXBwZW5kT3JJbnNlcnRCZWZvcmU6IHJhd0JvZHlBcHBlbmRDaGlsZCxcbiAgICAgIGNvbnRhaW5lckNvbmZpZ0dldHRlcjogY29udGFpbmVyQ29uZmlnR2V0dGVyLFxuICAgICAgaXNJbnZva2VkQnlNaWNyb0FwcDogaXNJbnZva2VkQnlNaWNyb0FwcFxuICAgIH0pO1xuICAgIEhUTUxIZWFkRWxlbWVudC5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlID0gZ2V0T3ZlcndyaXR0ZW5BcHBlbmRDaGlsZE9ySW5zZXJ0QmVmb3JlKHtcbiAgICAgIHJhd0RPTUFwcGVuZE9ySW5zZXJ0QmVmb3JlOiByYXdIZWFkSW5zZXJ0QmVmb3JlLFxuICAgICAgY29udGFpbmVyQ29uZmlnR2V0dGVyOiBjb250YWluZXJDb25maWdHZXR0ZXIsXG4gICAgICBpc0ludm9rZWRCeU1pY3JvQXBwOiBpc0ludm9rZWRCeU1pY3JvQXBwXG4gICAgfSk7XG4gIH0gLy8gSnVzdCBvdmVyd3JpdGUgaXQgd2hpbGUgaXQgaGF2ZSBub3QgYmVlbiBvdmVyd3JpdGVcblxuXG4gIGlmIChIVE1MSGVhZEVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUNoaWxkID09PSByYXdIZWFkUmVtb3ZlQ2hpbGQgJiYgSFRNTEJvZHlFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDaGlsZCA9PT0gcmF3Qm9keVJlbW92ZUNoaWxkKSB7XG4gICAgSFRNTEhlYWRFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDaGlsZCA9IGdldE5ld1JlbW92ZUNoaWxkKHJhd0hlYWRSZW1vdmVDaGlsZCwgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBjb250YWluZXJDb25maWdHZXR0ZXIoZWxlbWVudCkuYXBwV3JhcHBlckdldHRlcjtcbiAgICB9KTtcbiAgICBIVE1MQm9keUVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUNoaWxkID0gZ2V0TmV3UmVtb3ZlQ2hpbGQocmF3Qm9keVJlbW92ZUNoaWxkLCBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5lckNvbmZpZ0dldHRlcihlbGVtZW50KS5hcHBXcmFwcGVyR2V0dGVyO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHVucGF0Y2goKSB7XG4gICAgSFRNTEhlYWRFbGVtZW50LnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IHJhd0hlYWRBcHBlbmRDaGlsZDtcbiAgICBIVE1MSGVhZEVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUNoaWxkID0gcmF3SGVhZFJlbW92ZUNoaWxkO1xuICAgIEhUTUxCb2R5RWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSByYXdCb2R5QXBwZW5kQ2hpbGQ7XG4gICAgSFRNTEJvZHlFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDaGlsZCA9IHJhd0JvZHlSZW1vdmVDaGlsZDtcbiAgICBIVE1MSGVhZEVsZW1lbnQucHJvdG90eXBlLmluc2VydEJlZm9yZSA9IHJhd0hlYWRJbnNlcnRCZWZvcmU7XG4gIH07XG59XG5leHBvcnQgZnVuY3Rpb24gcmVidWlsZENTU1J1bGVzKHN0eWxlU2hlZXRFbGVtZW50cywgcmVBcHBlbmRFbGVtZW50KSB7XG4gIHN0eWxlU2hlZXRFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChzdHlsZXNoZWV0RWxlbWVudCkge1xuICAgIC8vIHJlLWFwcGVuZCB0aGUgZHluYW1pYyBzdHlsZXNoZWV0IHRvIHN1Yi1hcHAgY29udGFpbmVyXG4gICAgdmFyIGFwcGVuZFN1Y2Nlc3MgPSByZUFwcGVuZEVsZW1lbnQoc3R5bGVzaGVldEVsZW1lbnQpO1xuXG4gICAgaWYgKGFwcGVuZFN1Y2Nlc3MpIHtcbiAgICAgIC8qXG4gICAgICBnZXQgdGhlIHN0b3JlZCBjc3MgcnVsZXMgZnJvbSBzdHlsZWQtY29tcG9uZW50cyBnZW5lcmF0ZWQgZWxlbWVudCwgYW5kIHRoZSByZS1pbnNlcnQgcnVsZXMgZm9yIHRoZW0uXG4gICAgICBub3RlIHRoYXQgd2UgbXVzdCBkbyB0aGlzIGFmdGVyIHN0eWxlIGVsZW1lbnQgaGFkIGJlZW4gYWRkZWQgdG8gZG9jdW1lbnQsIHdoaWNoIHN0eWxlc2hlZXQgd291bGQgYmUgYXNzb2NpYXRlZCB0byB0aGUgZG9jdW1lbnQgYXV0b21hdGljYWxseS5cbiAgICAgIGNoZWNrIHRoZSBzcGVjIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9jc3NvbS0xLyNhc3NvY2lhdGVkLWNzcy1zdHlsZS1zaGVldFxuICAgICAgICovXG4gICAgICBpZiAoc3R5bGVzaGVldEVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MU3R5bGVFbGVtZW50ICYmIGlzU3R5bGVkQ29tcG9uZW50c0xpa2Uoc3R5bGVzaGVldEVsZW1lbnQpKSB7XG4gICAgICAgIHZhciBjc3NSdWxlcyA9IGdldFN0eWxlZEVsZW1lbnRDU1NSdWxlcyhzdHlsZXNoZWV0RWxlbWVudCk7XG5cbiAgICAgICAgaWYgKGNzc1J1bGVzKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBsdXNwbHVzXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NSdWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNzc1J1bGUgPSBjc3NSdWxlc1tpXTtcbiAgICAgICAgICAgIHZhciBjc3NTdHlsZVNoZWV0RWxlbWVudCA9IHN0eWxlc2hlZXRFbGVtZW50LnNoZWV0O1xuICAgICAgICAgICAgY3NzU3R5bGVTaGVldEVsZW1lbnQuaW5zZXJ0UnVsZShjc3NSdWxlLmNzc1RleHQsIGNzc1N0eWxlU2hlZXRFbGVtZW50LmNzc1J1bGVzLmxlbmd0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn0iLCIvKipcbiAqIEBhdXRob3IgS3VpdG9zXG4gKiBAc2luY2UgMjAyMC0xMC0xM1xuICovXG5pbXBvcnQgeyBjaGVja0FjdGl2aXR5RnVuY3Rpb25zIH0gZnJvbSAnc2luZ2xlLXNwYSc7XG5pbXBvcnQgeyBwYXRjaEhUTUxEeW5hbWljQXBwZW5kUHJvdG90eXBlRnVuY3Rpb25zLCByZWJ1aWxkQ1NTUnVsZXMsIHJlY29yZFN0eWxlZENvbXBvbmVudHNDU1NSdWxlcyB9IGZyb20gJy4vY29tbW9uJztcbnZhciBib290c3RyYXBwaW5nUGF0Y2hDb3VudCA9IDA7XG52YXIgbW91bnRpbmdQYXRjaENvdW50ID0gMDtcbi8qKlxuICogSnVzdCBoaWphY2sgZHluYW1pYyBoZWFkIGFwcGVuZCwgdGhhdCBjb3VsZCBhdm9pZCBhY2NpZGVudGFsbHkgaGlqYWNraW5nIHRoZSBpbnNlcnRpb24gb2YgZWxlbWVudHMgZXhjZXB0IGluIGhlYWQuXG4gKiBTdWNoIGEgY2FzZTogUmVhY3RET00uY3JlYXRlUG9ydGFsKDxzdHlsZT4udGVzdHtjb2xvcjpibHVlfTwvc3R5bGU+LCBjb250YWluZXIpLFxuICogdGhpcyBjb3VsZCBtYWRlIHdlIGFwcGVuZCB0aGUgc3R5bGUgZWxlbWVudCBpbnRvIGFwcCB3cmFwcGVyIGJ1dCBpdCB3aWxsIGNhdXNlIGFuIGVycm9yIHdoaWxlIHRoZSByZWFjdCBwb3J0YWwgdW5tb3VudGluZywgYXMgUmVhY3RET00gY291bGQgbm90IGZpbmQgdGhlIHN0eWxlIGluIGJvZHkgY2hpbGRyZW4gbGlzdC5cbiAqIEBwYXJhbSBhcHBOYW1lXG4gKiBAcGFyYW0gYXBwV3JhcHBlckdldHRlclxuICogQHBhcmFtIHByb3h5XG4gKiBAcGFyYW0gbW91bnRpbmdcbiAqIEBwYXJhbSBzY29wZWRDU1NcbiAqIEBwYXJhbSBleGNsdWRlQXNzZXRGaWx0ZXJcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hMb29zZVNhbmRib3goYXBwTmFtZSwgYXBwV3JhcHBlckdldHRlciwgcHJveHkpIHtcbiAgdmFyIG1vdW50aW5nID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiB0cnVlO1xuICB2YXIgc2NvcGVkQ1NTID0gYXJndW1lbnRzLmxlbmd0aCA+IDQgJiYgYXJndW1lbnRzWzRdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNF0gOiBmYWxzZTtcbiAgdmFyIGV4Y2x1ZGVBc3NldEZpbHRlciA9IGFyZ3VtZW50cy5sZW5ndGggPiA1ID8gYXJndW1lbnRzWzVdIDogdW5kZWZpbmVkO1xuICB2YXIgZHluYW1pY1N0eWxlU2hlZXRFbGVtZW50cyA9IFtdO1xuICB2YXIgdW5wYXRjaER5bmFtaWNBcHBlbmRQcm90b3R5cGVGdW5jdGlvbnMgPSBwYXRjaEhUTUxEeW5hbWljQXBwZW5kUHJvdG90eXBlRnVuY3Rpb25zKFxuICAvKlxuICAgIGNoZWNrIGlmIHRoZSBjdXJyZW50bHkgc3BlY2lmaWVkIGFwcGxpY2F0aW9uIGlzIGFjdGl2ZVxuICAgIFdoaWxlIHdlIHN3aXRjaCBwYWdlIGZyb20gcWlhbmt1biBhcHAgdG8gYSBub3JtYWwgcmVhY3Qgcm91dGluZyBwYWdlLCB0aGUgbm9ybWFsIG9uZSBtYXkgbG9hZCBzdHlsZXNoZWV0IGR5bmFtaWNhbGx5IHdoaWxlIHBhZ2UgcmVuZGVyaW5nLFxuICAgIGJ1dCB0aGUgdXJsIGNoYW5nZSBsaXN0ZW5lciBtdXN0IHRvIHdhaXQgdW50aWwgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBpcyBmbHVzaGVkLlxuICAgIFRoaXMgc2NlbmFyaW8gbWF5IGNhdXNlIHdlIHJlY29yZCB0aGUgc3R5bGVzaGVldCBmcm9tIHJlYWN0IHJvdXRpbmcgcGFnZSBkeW5hbWljIGluamVjdGlvbixcbiAgICBhbmQgcmVtb3ZlIHRoZW0gYWZ0ZXIgdGhlIHVybCBjaGFuZ2UgdHJpZ2dlcmVkIGFuZCBxaWFua3VuIGFwcCBpcyB1bm1vdXRpbmdcbiAgICBzZWUgaHR0cHM6Ly9naXRodWIuY29tL1JlYWN0VHJhaW5pbmcvaGlzdG9yeS9ibG9iL21hc3Rlci9tb2R1bGVzL2NyZWF0ZUhhc2hIaXN0b3J5LmpzI0wyMjItTDIzMFxuICAgKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjaGVja0FjdGl2aXR5RnVuY3Rpb25zKHdpbmRvdy5sb2NhdGlvbikuc29tZShmdW5jdGlvbiAobmFtZSkge1xuICAgICAgcmV0dXJuIG5hbWUgPT09IGFwcE5hbWU7XG4gICAgfSk7XG4gIH0sIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYXBwTmFtZTogYXBwTmFtZSxcbiAgICAgIGFwcFdyYXBwZXJHZXR0ZXI6IGFwcFdyYXBwZXJHZXR0ZXIsXG4gICAgICBwcm94eTogcHJveHksXG4gICAgICBzdHJpY3RHbG9iYWw6IGZhbHNlLFxuICAgICAgc2NvcGVkQ1NTOiBzY29wZWRDU1MsXG4gICAgICBkeW5hbWljU3R5bGVTaGVldEVsZW1lbnRzOiBkeW5hbWljU3R5bGVTaGVldEVsZW1lbnRzLFxuICAgICAgZXhjbHVkZUFzc2V0RmlsdGVyOiBleGNsdWRlQXNzZXRGaWx0ZXJcbiAgICB9O1xuICB9KTtcbiAgaWYgKCFtb3VudGluZykgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQrKztcbiAgaWYgKG1vdW50aW5nKSBtb3VudGluZ1BhdGNoQ291bnQrKztcbiAgcmV0dXJuIGZ1bmN0aW9uIGZyZWUoKSB7XG4gICAgLy8gYm9vdHN0cmFwIHBhdGNoIGp1c3QgY2FsbGVkIG9uY2UgYnV0IGl0cyBmcmVlciB3aWxsIGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lc1xuICAgIGlmICghbW91bnRpbmcgJiYgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQgIT09IDApIGJvb3RzdHJhcHBpbmdQYXRjaENvdW50LS07XG4gICAgaWYgKG1vdW50aW5nKSBtb3VudGluZ1BhdGNoQ291bnQtLTtcbiAgICB2YXIgYWxsTWljcm9BcHBVbm1vdW50ZWQgPSBtb3VudGluZ1BhdGNoQ291bnQgPT09IDAgJiYgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQgPT09IDA7IC8vIHJlbGVhc2UgdGhlIG92ZXJ3cml0ZSBwcm90b3R5cGUgYWZ0ZXIgYWxsIHRoZSBtaWNybyBhcHBzIHVubW91bnRlZFxuXG4gICAgaWYgKGFsbE1pY3JvQXBwVW5tb3VudGVkKSB1bnBhdGNoRHluYW1pY0FwcGVuZFByb3RvdHlwZUZ1bmN0aW9ucygpO1xuICAgIHJlY29yZFN0eWxlZENvbXBvbmVudHNDU1NSdWxlcyhkeW5hbWljU3R5bGVTaGVldEVsZW1lbnRzKTsgLy8gQXMgbm93IHRoZSBzdWIgYXBwIGNvbnRlbnQgYWxsIHdyYXBwZWQgd2l0aCBhIHNwZWNpYWwgaWQgY29udGFpbmVyLFxuICAgIC8vIHRoZSBkeW5hbWljIHN0eWxlIHNoZWV0IHdvdWxkIGJlIHJlbW92ZWQgYXV0b21hdGljYWxseSB3aGlsZSB1bm1vdXR0aW5nXG5cbiAgICByZXR1cm4gZnVuY3Rpb24gcmVidWlsZCgpIHtcbiAgICAgIHJlYnVpbGRDU1NSdWxlcyhkeW5hbWljU3R5bGVTaGVldEVsZW1lbnRzLCBmdW5jdGlvbiAoc3R5bGVzaGVldEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGFwcFdyYXBwZXIgPSBhcHBXcmFwcGVyR2V0dGVyKCk7XG5cbiAgICAgICAgaWYgKCFhcHBXcmFwcGVyLmNvbnRhaW5zKHN0eWxlc2hlZXRFbGVtZW50KSkge1xuICAgICAgICAgIC8vIFVzaW5nIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgZW5zdXJlcyB0aGF0IGFwcGVuZENoaWxkIGludm9jYXRpb24gY2FuIGFsc28gZGlyZWN0bHkgdXNlIHRoZSBIVE1MSGVhZEVsZW1lbnQucHJvdG90eXBlLmFwcGVuZENoaWxkIG1ldGhvZCB3aGljaCBpcyBvdmVyd3JpdHRlbiBhdCBtb3VudGluZyBwaGFzZVxuICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQuY2FsbChhcHBXcmFwcGVyLCBzdHlsZXNoZWV0RWxlbWVudCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTsgLy8gQXMgdGhlIHBhdGNoZXIgd2lsbCBiZSBpbnZva2VkIGV2ZXJ5IG1vdW50aW5nIHBoYXNlLCB3ZSBjb3VsZCByZWxlYXNlIHRoZSBjYWNoZSBmb3IgZ2MgYWZ0ZXIgcmVidWlsZGluZ1xuXG4gICAgICBpZiAobW91bnRpbmcpIHtcbiAgICAgICAgZHluYW1pY1N0eWxlU2hlZXRFbGVtZW50cyA9IFtdO1xuICAgICAgfVxuICAgIH07XG4gIH07XG59IiwiLyoqXG4gKiBAYXV0aG9yIEt1aXRvc1xuICogQHNpbmNlIDIwMjAtMTAtMTNcbiAqL1xuaW1wb3J0IHsgbmF0aXZlR2xvYmFsIH0gZnJvbSAnLi4vLi4vLi4vdXRpbHMnO1xuaW1wb3J0IHsgZ2V0Q3VycmVudFJ1bm5pbmdBcHAgfSBmcm9tICcuLi8uLi9jb21tb24nO1xuaW1wb3J0IHsgaXNIaWphY2tpbmdUYWcsIHBhdGNoSFRNTER5bmFtaWNBcHBlbmRQcm90b3R5cGVGdW5jdGlvbnMsIHJhd0hlYWRBcHBlbmRDaGlsZCwgcmVidWlsZENTU1J1bGVzLCByZWNvcmRTdHlsZWRDb21wb25lbnRzQ1NTUnVsZXMgfSBmcm9tICcuL2NvbW1vbic7IC8vIEdldCBuYXRpdmUgZ2xvYmFsIHdpbmRvdyB3aXRoIGEgc2FuZGJveCBkaXNndXN0ZWQgd2F5LCB0aHVzIHdlIGNvdWxkIHNoYXJlIGl0IGJldHdlZW4gcWlhbmt1biBpbnN0YW5jZXPwn6SqXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShuYXRpdmVHbG9iYWwsICdfX3Byb3h5QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwX18nLCB7XG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZVxufSk7IC8vIFNoYXJlIHByb3h5QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwIGJldHdlZW4gbXVsdGlwbGUgcWlhbmt1biBpbnN0YW5jZSwgdGh1cyB0aGV5IGNvdWxkIGFjY2VzcyB0aGUgc2FtZSByZWNvcmRcblxubmF0aXZlR2xvYmFsLl9fcHJveHlBdHRhY2hDb250YWluZXJDb25maWdNYXBfXyA9IG5hdGl2ZUdsb2JhbC5fX3Byb3h5QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwX18gfHwgbmV3IFdlYWtNYXAoKTtcbnZhciBwcm94eUF0dGFjaENvbnRhaW5lckNvbmZpZ01hcCA9IG5hdGl2ZUdsb2JhbC5fX3Byb3h5QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwX187XG52YXIgZWxlbWVudEF0dGFjaENvbnRhaW5lckNvbmZpZ01hcCA9IG5ldyBXZWFrTWFwKCk7XG52YXIgZG9jQ3JlYXRlUGF0Y2hlZE1hcCA9IG5ldyBXZWFrTWFwKCk7XG5cbmZ1bmN0aW9uIHBhdGNoRG9jdW1lbnRDcmVhdGVFbGVtZW50KCkge1xuICB2YXIgZG9jQ3JlYXRlRWxlbWVudEZuQmVmb3JlT3ZlcndyaXRlID0gZG9jQ3JlYXRlUGF0Y2hlZE1hcC5nZXQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCk7XG5cbiAgaWYgKCFkb2NDcmVhdGVFbGVtZW50Rm5CZWZvcmVPdmVyd3JpdGUpIHtcbiAgICB2YXIgcmF3RG9jdW1lbnRDcmVhdGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudDtcblxuICAgIERvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBvcHRpb25zKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHJhd0RvY3VtZW50Q3JlYXRlRWxlbWVudC5jYWxsKHRoaXMsIHRhZ05hbWUsIG9wdGlvbnMpO1xuXG4gICAgICBpZiAoaXNIaWphY2tpbmdUYWcodGFnTmFtZSkpIHtcbiAgICAgICAgdmFyIF9yZWYgPSBnZXRDdXJyZW50UnVubmluZ0FwcCgpIHx8IHt9LFxuICAgICAgICAgICAgY3VycmVudFJ1bm5pbmdTYW5kYm94UHJveHkgPSBfcmVmLndpbmRvdztcblxuICAgICAgICBpZiAoY3VycmVudFJ1bm5pbmdTYW5kYm94UHJveHkpIHtcbiAgICAgICAgICB2YXIgcHJveHlDb250YWluZXJDb25maWcgPSBwcm94eUF0dGFjaENvbnRhaW5lckNvbmZpZ01hcC5nZXQoY3VycmVudFJ1bm5pbmdTYW5kYm94UHJveHkpO1xuXG4gICAgICAgICAgaWYgKHByb3h5Q29udGFpbmVyQ29uZmlnKSB7XG4gICAgICAgICAgICBlbGVtZW50QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwLnNldChlbGVtZW50LCBwcm94eUNvbnRhaW5lckNvbmZpZyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH07IC8vIEl0IG1lYW5zIGl0IGhhdmUgYmVlbiBvdmVyd3JpdHRlbiB3aGlsZSBjcmVhdGVFbGVtZW50IGlzIGFuIG93biBwcm9wZXJ0eSBvZiBkb2N1bWVudFxuXG5cbiAgICBpZiAoZG9jdW1lbnQuaGFzT3duUHJvcGVydHkoJ2NyZWF0ZUVsZW1lbnQnKSkge1xuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCA9IERvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50O1xuICAgIH1cblxuICAgIGRvY0NyZWF0ZVBhdGNoZWRNYXAuc2V0KERvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50LCByYXdEb2N1bWVudENyZWF0ZUVsZW1lbnQpO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHVucGF0Y2goKSB7XG4gICAgaWYgKGRvY0NyZWF0ZUVsZW1lbnRGbkJlZm9yZU92ZXJ3cml0ZSkge1xuICAgICAgRG9jdW1lbnQucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnQgPSBkb2NDcmVhdGVFbGVtZW50Rm5CZWZvcmVPdmVyd3JpdGU7XG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50ID0gZG9jQ3JlYXRlRWxlbWVudEZuQmVmb3JlT3ZlcndyaXRlO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIGJvb3RzdHJhcHBpbmdQYXRjaENvdW50ID0gMDtcbnZhciBtb3VudGluZ1BhdGNoQ291bnQgPSAwO1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoU3RyaWN0U2FuZGJveChhcHBOYW1lLCBhcHBXcmFwcGVyR2V0dGVyLCBwcm94eSkge1xuICB2YXIgbW91bnRpbmcgPSBhcmd1bWVudHMubGVuZ3RoID4gMyAmJiBhcmd1bWVudHNbM10gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1szXSA6IHRydWU7XG4gIHZhciBzY29wZWRDU1MgPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IGZhbHNlO1xuICB2YXIgZXhjbHVkZUFzc2V0RmlsdGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDUgPyBhcmd1bWVudHNbNV0gOiB1bmRlZmluZWQ7XG4gIHZhciBjb250YWluZXJDb25maWcgPSBwcm94eUF0dGFjaENvbnRhaW5lckNvbmZpZ01hcC5nZXQocHJveHkpO1xuXG4gIGlmICghY29udGFpbmVyQ29uZmlnKSB7XG4gICAgY29udGFpbmVyQ29uZmlnID0ge1xuICAgICAgYXBwTmFtZTogYXBwTmFtZSxcbiAgICAgIHByb3h5OiBwcm94eSxcbiAgICAgIGFwcFdyYXBwZXJHZXR0ZXI6IGFwcFdyYXBwZXJHZXR0ZXIsXG4gICAgICBkeW5hbWljU3R5bGVTaGVldEVsZW1lbnRzOiBbXSxcbiAgICAgIHN0cmljdEdsb2JhbDogdHJ1ZSxcbiAgICAgIGV4Y2x1ZGVBc3NldEZpbHRlcjogZXhjbHVkZUFzc2V0RmlsdGVyLFxuICAgICAgc2NvcGVkQ1NTOiBzY29wZWRDU1NcbiAgICB9O1xuICAgIHByb3h5QXR0YWNoQ29udGFpbmVyQ29uZmlnTWFwLnNldChwcm94eSwgY29udGFpbmVyQ29uZmlnKTtcbiAgfSAvLyBhbGwgZHluYW1pYyBzdHlsZSBzaGVldHMgYXJlIHN0b3JlZCBpbiBwcm94eSBjb250YWluZXJcblxuXG4gIHZhciBfY29udGFpbmVyQ29uZmlnID0gY29udGFpbmVyQ29uZmlnLFxuICAgICAgZHluYW1pY1N0eWxlU2hlZXRFbGVtZW50cyA9IF9jb250YWluZXJDb25maWcuZHluYW1pY1N0eWxlU2hlZXRFbGVtZW50cztcbiAgdmFyIHVucGF0Y2hEb2N1bWVudENyZWF0ZSA9IHBhdGNoRG9jdW1lbnRDcmVhdGVFbGVtZW50KCk7XG4gIHZhciB1bnBhdGNoRHluYW1pY0FwcGVuZFByb3RvdHlwZUZ1bmN0aW9ucyA9IHBhdGNoSFRNTER5bmFtaWNBcHBlbmRQcm90b3R5cGVGdW5jdGlvbnMoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudEF0dGFjaENvbnRhaW5lckNvbmZpZ01hcC5oYXMoZWxlbWVudCk7XG4gIH0sIGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnRBdHRhY2hDb250YWluZXJDb25maWdNYXAuZ2V0KGVsZW1lbnQpO1xuICB9KTtcbiAgaWYgKCFtb3VudGluZykgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQrKztcbiAgaWYgKG1vdW50aW5nKSBtb3VudGluZ1BhdGNoQ291bnQrKztcbiAgcmV0dXJuIGZ1bmN0aW9uIGZyZWUoKSB7XG4gICAgLy8gYm9vdHN0cmFwIHBhdGNoIGp1c3QgY2FsbGVkIG9uY2UgYnV0IGl0cyBmcmVlciB3aWxsIGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lc1xuICAgIGlmICghbW91bnRpbmcgJiYgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQgIT09IDApIGJvb3RzdHJhcHBpbmdQYXRjaENvdW50LS07XG4gICAgaWYgKG1vdW50aW5nKSBtb3VudGluZ1BhdGNoQ291bnQtLTtcbiAgICB2YXIgYWxsTWljcm9BcHBVbm1vdW50ZWQgPSBtb3VudGluZ1BhdGNoQ291bnQgPT09IDAgJiYgYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQgPT09IDA7IC8vIHJlbGVhc2UgdGhlIG92ZXJ3cml0ZSBwcm90b3R5cGUgYWZ0ZXIgYWxsIHRoZSBtaWNybyBhcHBzIHVubW91bnRlZFxuXG4gICAgaWYgKGFsbE1pY3JvQXBwVW5tb3VudGVkKSB7XG4gICAgICB1bnBhdGNoRHluYW1pY0FwcGVuZFByb3RvdHlwZUZ1bmN0aW9ucygpO1xuICAgICAgdW5wYXRjaERvY3VtZW50Q3JlYXRlKCk7XG4gICAgfVxuXG4gICAgcmVjb3JkU3R5bGVkQ29tcG9uZW50c0NTU1J1bGVzKGR5bmFtaWNTdHlsZVNoZWV0RWxlbWVudHMpOyAvLyBBcyBub3cgdGhlIHN1YiBhcHAgY29udGVudCBhbGwgd3JhcHBlZCB3aXRoIGEgc3BlY2lhbCBpZCBjb250YWluZXIsXG4gICAgLy8gdGhlIGR5bmFtaWMgc3R5bGUgc2hlZXQgd291bGQgYmUgcmVtb3ZlZCBhdXRvbWF0aWNhbGx5IHdoaWxlIHVubW91dHRpbmdcblxuICAgIHJldHVybiBmdW5jdGlvbiByZWJ1aWxkKCkge1xuICAgICAgcmVidWlsZENTU1J1bGVzKGR5bmFtaWNTdHlsZVNoZWV0RWxlbWVudHMsIGZ1bmN0aW9uIChzdHlsZXNoZWV0RWxlbWVudCkge1xuICAgICAgICB2YXIgYXBwV3JhcHBlciA9IGFwcFdyYXBwZXJHZXR0ZXIoKTtcblxuICAgICAgICBpZiAoIWFwcFdyYXBwZXIuY29udGFpbnMoc3R5bGVzaGVldEVsZW1lbnQpKSB7XG4gICAgICAgICAgcmF3SGVhZEFwcGVuZENoaWxkLmNhbGwoYXBwV3JhcHBlciwgc3R5bGVzaGVldEVsZW1lbnQpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfTtcbn0iLCJpbXBvcnQgX2lzRnVuY3Rpb24gZnJvbSBcImxvZGFzaC9pc0Z1bmN0aW9uXCI7XG5pbXBvcnQgX25vb3AgZnJvbSBcImxvZGFzaC9ub29wXCI7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRjaCgpIHtcbiAgLy8gRklYTUUgdW1pIHVubW91bnQgZmVhdHVyZSByZXF1ZXN0XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgdmFyIHJhd0hpc3RvcnlMaXN0ZW4gPSBmdW5jdGlvbiByYXdIaXN0b3J5TGlzdGVuKF8pIHtcbiAgICByZXR1cm4gX25vb3A7XG4gIH07XG5cbiAgdmFyIGhpc3RvcnlMaXN0ZW5lcnMgPSBbXTtcbiAgdmFyIGhpc3RvcnlVbkxpc3RlbnMgPSBbXTtcblxuICBpZiAod2luZG93LmdfaGlzdG9yeSAmJiBfaXNGdW5jdGlvbih3aW5kb3cuZ19oaXN0b3J5Lmxpc3RlbikpIHtcbiAgICByYXdIaXN0b3J5TGlzdGVuID0gd2luZG93LmdfaGlzdG9yeS5saXN0ZW4uYmluZCh3aW5kb3cuZ19oaXN0b3J5KTtcblxuICAgIHdpbmRvdy5nX2hpc3RvcnkubGlzdGVuID0gZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICBoaXN0b3J5TGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgICAgdmFyIHVuTGlzdGVuID0gcmF3SGlzdG9yeUxpc3RlbihsaXN0ZW5lcik7XG4gICAgICBoaXN0b3J5VW5MaXN0ZW5zLnB1c2godW5MaXN0ZW4pO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdW5MaXN0ZW4oKTtcbiAgICAgICAgaGlzdG9yeVVuTGlzdGVucy5zcGxpY2UoaGlzdG9yeVVuTGlzdGVucy5pbmRleE9mKHVuTGlzdGVuKSwgMSk7XG4gICAgICAgIGhpc3RvcnlMaXN0ZW5lcnMuc3BsaWNlKGhpc3RvcnlMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lciksIDEpO1xuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGZyZWUoKSB7XG4gICAgdmFyIHJlYnVpbGQgPSBfbm9vcDtcbiAgICAvKlxuICAgICDov5jlrZjlnKjkvZnph48gbGlzdGVuZXIg6KGo5piO5pyq6KKr5Y246L2977yM5a2Y5Zyo5Lik56eN5oOF5Ya1XG4gICAgIDEuIOW6lOeUqOWcqCB1bm1vdXQg5pe25pyq5q2j56Gu5Y246L29IGxpc3RlbmVyXG4gICAgIDIuIGxpc3RlbmVyIOaYr+W6lOeUqCBtb3VudCDkuYvliY3nu5HlrprnmoTvvIxcbiAgICAg56ys5LqM56eN5oOF5Ya15LiL5bqU55So5Zyo5LiL5qyhIG1vdW50IOS5i+WJjemcgOmHjeaWsOe7keWumuivpSBsaXN0ZW5lclxuICAgICAqL1xuXG4gICAgaWYgKGhpc3RvcnlMaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICByZWJ1aWxkID0gZnVuY3Rpb24gcmVidWlsZCgpIHtcbiAgICAgICAgLy8g5b+F6aG75L2/55SoIHdpbmRvdy5nX2hpc3RvcnkubGlzdGVuIOeahOaWueW8j+mHjeaWsOe7keWumiBsaXN0ZW5lcu+8jOS7juiAjOiDveS/neivgSByZWJ1aWxkIOi/memDqOWIhuS5n+iDveiiq+aNleiOt+WIsO+8jOWQpuWImeWcqOW6lOeUqOWNuOi9veWQjuaXoOazleato+ehrueahOenu+mZpOi/memDqOWIhuWJr+S9nOeUqFxuICAgICAgICBoaXN0b3J5TGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgcmV0dXJuIHdpbmRvdy5nX2hpc3RvcnkubGlzdGVuKGxpc3RlbmVyKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH0gLy8g5Y246L295L2Z5LiL55qEIGxpc3RlbmVyXG5cblxuICAgIGhpc3RvcnlVbkxpc3RlbnMuZm9yRWFjaChmdW5jdGlvbiAodW5MaXN0ZW4pIHtcbiAgICAgIHJldHVybiB1bkxpc3RlbigpO1xuICAgIH0pOyAvLyByZXN0b3JlXG5cbiAgICBpZiAod2luZG93LmdfaGlzdG9yeSAmJiBfaXNGdW5jdGlvbih3aW5kb3cuZ19oaXN0b3J5Lmxpc3RlbikpIHtcbiAgICAgIHdpbmRvdy5nX2hpc3RvcnkubGlzdGVuID0gcmF3SGlzdG9yeUxpc3RlbjtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVidWlsZDtcbiAgfTtcbn0iLCJpbXBvcnQgX25vb3AgZnJvbSBcImxvZGFzaC9ub29wXCI7XG5pbXBvcnQgX3RvQ29uc3VtYWJsZUFycmF5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS90b0NvbnN1bWFibGVBcnJheVwiO1xudmFyIHJhd1dpbmRvd0ludGVydmFsID0gd2luZG93LnNldEludGVydmFsO1xudmFyIHJhd1dpbmRvd0NsZWFySW50ZXJ2YWwgPSB3aW5kb3cuY2xlYXJJbnRlcnZhbDtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBhdGNoKGdsb2JhbCkge1xuICB2YXIgaW50ZXJ2YWxzID0gW107XG5cbiAgZ2xvYmFsLmNsZWFySW50ZXJ2YWwgPSBmdW5jdGlvbiAoaW50ZXJ2YWxJZCkge1xuICAgIGludGVydmFscyA9IGludGVydmFscy5maWx0ZXIoZnVuY3Rpb24gKGlkKSB7XG4gICAgICByZXR1cm4gaWQgIT09IGludGVydmFsSWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJhd1dpbmRvd0NsZWFySW50ZXJ2YWwuY2FsbCh3aW5kb3csIGludGVydmFsSWQpO1xuICB9O1xuXG4gIGdsb2JhbC5zZXRJbnRlcnZhbCA9IGZ1bmN0aW9uIChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBuZXcgQXJyYXkoX2xlbiA+IDIgPyBfbGVuIC0gMiA6IDApLCBfa2V5ID0gMjsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5IC0gMl0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgdmFyIGludGVydmFsSWQgPSByYXdXaW5kb3dJbnRlcnZhbC5hcHBseSh2b2lkIDAsIFtoYW5kbGVyLCB0aW1lb3V0XS5jb25jYXQoYXJncykpO1xuICAgIGludGVydmFscyA9IFtdLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkoaW50ZXJ2YWxzKSwgW2ludGVydmFsSWRdKTtcbiAgICByZXR1cm4gaW50ZXJ2YWxJZDtcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24gZnJlZSgpIHtcbiAgICBpbnRlcnZhbHMuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiBnbG9iYWwuY2xlYXJJbnRlcnZhbChpZCk7XG4gICAgfSk7XG4gICAgZ2xvYmFsLnNldEludGVydmFsID0gcmF3V2luZG93SW50ZXJ2YWw7XG4gICAgZ2xvYmFsLmNsZWFySW50ZXJ2YWwgPSByYXdXaW5kb3dDbGVhckludGVydmFsO1xuICAgIHJldHVybiBfbm9vcDtcbiAgfTtcbn0iLCJpbXBvcnQgX25vb3AgZnJvbSBcImxvZGFzaC9ub29wXCI7XG5pbXBvcnQgX3RvQ29uc3VtYWJsZUFycmF5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS90b0NvbnN1bWFibGVBcnJheVwiO1xudmFyIHJhd0FkZEV2ZW50TGlzdGVuZXIgPSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcjtcbnZhciByYXdSZW1vdmVFdmVudExpc3RlbmVyID0gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXI7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRjaChnbG9iYWwpIHtcbiAgdmFyIGxpc3RlbmVyTWFwID0gbmV3IE1hcCgpO1xuXG4gIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IGxpc3RlbmVyTWFwLmdldCh0eXBlKSB8fCBbXTtcbiAgICBsaXN0ZW5lck1hcC5zZXQodHlwZSwgW10uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheShsaXN0ZW5lcnMpLCBbbGlzdGVuZXJdKSk7XG4gICAgcmV0dXJuIHJhd0FkZEV2ZW50TGlzdGVuZXIuY2FsbCh3aW5kb3csIHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgfTtcblxuICBnbG9iYWwucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucykge1xuICAgIHZhciBzdG9yZWRUeXBlTGlzdGVuZXJzID0gbGlzdGVuZXJNYXAuZ2V0KHR5cGUpO1xuXG4gICAgaWYgKHN0b3JlZFR5cGVMaXN0ZW5lcnMgJiYgc3RvcmVkVHlwZUxpc3RlbmVycy5sZW5ndGggJiYgc3RvcmVkVHlwZUxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSAhPT0gLTEpIHtcbiAgICAgIHN0b3JlZFR5cGVMaXN0ZW5lcnMuc3BsaWNlKHN0b3JlZFR5cGVMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lciksIDEpO1xuICAgIH1cblxuICAgIHJldHVybiByYXdSZW1vdmVFdmVudExpc3RlbmVyLmNhbGwod2luZG93LCB0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGZyZWUoKSB7XG4gICAgbGlzdGVuZXJNYXAuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXJzLCB0eXBlKSB7XG4gICAgICByZXR1cm4gX3RvQ29uc3VtYWJsZUFycmF5KGxpc3RlbmVycykuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIGdsb2JhbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyID0gcmF3QWRkRXZlbnRMaXN0ZW5lcjtcbiAgICBnbG9iYWwucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IHJhd1JlbW92ZUV2ZW50TGlzdGVuZXI7XG4gICAgcmV0dXJuIF9ub29wO1xuICB9O1xufSIsImltcG9ydCBfZGVmaW5lUHJvcGVydHkgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL2RlZmluZVByb3BlcnR5XCI7XG5cbi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDE5LTA0LTExXG4gKi9cbmltcG9ydCB7IFNhbmRCb3hUeXBlIH0gZnJvbSAnLi4vLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgKiBhcyBjc3MgZnJvbSAnLi9jc3MnO1xuaW1wb3J0IHsgcGF0Y2hMb29zZVNhbmRib3gsIHBhdGNoU3RyaWN0U2FuZGJveCB9IGZyb20gJy4vZHluYW1pY0FwcGVuZCc7XG5pbXBvcnQgcGF0Y2hIaXN0b3J5TGlzdGVuZXIgZnJvbSAnLi9oaXN0b3J5TGlzdGVuZXInO1xuaW1wb3J0IHBhdGNoSW50ZXJ2YWwgZnJvbSAnLi9pbnRlcnZhbCc7XG5pbXBvcnQgcGF0Y2hXaW5kb3dMaXN0ZW5lciBmcm9tICcuL3dpbmRvd0xpc3RlbmVyJztcbmV4cG9ydCBmdW5jdGlvbiBwYXRjaEF0TW91bnRpbmcoYXBwTmFtZSwgZWxlbWVudEdldHRlciwgc2FuZGJveCwgc2NvcGVkQ1NTLCBleGNsdWRlQXNzZXRGaWx0ZXIpIHtcbiAgdmFyIF9wYXRjaGVyc0luU2FuZGJveDtcblxuICB2YXIgX2E7XG5cbiAgdmFyIGJhc2VQYXRjaGVycyA9IFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHBhdGNoSW50ZXJ2YWwoc2FuZGJveC5wcm94eSk7XG4gIH0sIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcGF0Y2hXaW5kb3dMaXN0ZW5lcihzYW5kYm94LnByb3h5KTtcbiAgfSwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwYXRjaEhpc3RvcnlMaXN0ZW5lcigpO1xuICB9XTtcbiAgdmFyIHBhdGNoZXJzSW5TYW5kYm94ID0gKF9wYXRjaGVyc0luU2FuZGJveCA9IHt9LCBfZGVmaW5lUHJvcGVydHkoX3BhdGNoZXJzSW5TYW5kYm94LCBTYW5kQm94VHlwZS5MZWdhY3lQcm94eSwgW10uY29uY2F0KGJhc2VQYXRjaGVycywgW2Z1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcGF0Y2hMb29zZVNhbmRib3goYXBwTmFtZSwgZWxlbWVudEdldHRlciwgc2FuZGJveC5wcm94eSwgdHJ1ZSwgc2NvcGVkQ1NTLCBleGNsdWRlQXNzZXRGaWx0ZXIpO1xuICB9XSkpLCBfZGVmaW5lUHJvcGVydHkoX3BhdGNoZXJzSW5TYW5kYm94LCBTYW5kQm94VHlwZS5Qcm94eSwgW10uY29uY2F0KGJhc2VQYXRjaGVycywgW2Z1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcGF0Y2hTdHJpY3RTYW5kYm94KGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gucHJveHksIHRydWUsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKTtcbiAgfV0pKSwgX2RlZmluZVByb3BlcnR5KF9wYXRjaGVyc0luU2FuZGJveCwgU2FuZEJveFR5cGUuU25hcHNob3QsIFtdLmNvbmNhdChiYXNlUGF0Y2hlcnMsIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHBhdGNoTG9vc2VTYW5kYm94KGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gucHJveHksIHRydWUsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKTtcbiAgfV0pKSwgX3BhdGNoZXJzSW5TYW5kYm94KTtcbiAgcmV0dXJuIChfYSA9IHBhdGNoZXJzSW5TYW5kYm94W3NhbmRib3gudHlwZV0pID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5tYXAoZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgcmV0dXJuIHBhdGNoKCk7XG4gIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoQXRCb290c3RyYXBwaW5nKGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKSB7XG4gIHZhciBfcGF0Y2hlcnNJblNhbmRib3gyO1xuXG4gIHZhciBfYTtcblxuICB2YXIgcGF0Y2hlcnNJblNhbmRib3ggPSAoX3BhdGNoZXJzSW5TYW5kYm94MiA9IHt9LCBfZGVmaW5lUHJvcGVydHkoX3BhdGNoZXJzSW5TYW5kYm94MiwgU2FuZEJveFR5cGUuTGVnYWN5UHJveHksIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHBhdGNoTG9vc2VTYW5kYm94KGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gucHJveHksIGZhbHNlLCBzY29wZWRDU1MsIGV4Y2x1ZGVBc3NldEZpbHRlcik7XG4gIH1dKSwgX2RlZmluZVByb3BlcnR5KF9wYXRjaGVyc0luU2FuZGJveDIsIFNhbmRCb3hUeXBlLlByb3h5LCBbZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwYXRjaFN0cmljdFNhbmRib3goYXBwTmFtZSwgZWxlbWVudEdldHRlciwgc2FuZGJveC5wcm94eSwgZmFsc2UsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKTtcbiAgfV0pLCBfZGVmaW5lUHJvcGVydHkoX3BhdGNoZXJzSW5TYW5kYm94MiwgU2FuZEJveFR5cGUuU25hcHNob3QsIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHBhdGNoTG9vc2VTYW5kYm94KGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gucHJveHksIGZhbHNlLCBzY29wZWRDU1MsIGV4Y2x1ZGVBc3NldEZpbHRlcik7XG4gIH1dKSwgX3BhdGNoZXJzSW5TYW5kYm94Mik7XG4gIHJldHVybiAoX2EgPSBwYXRjaGVyc0luU2FuZGJveFtzYW5kYm94LnR5cGVdKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubWFwKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgIHJldHVybiBwYXRjaCgpO1xuICB9KTtcbn1cbmV4cG9ydCB7IGNzcyB9OyIsImltcG9ydCBfdG9Db25zdW1hYmxlQXJyYXkgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3RvQ29uc3VtYWJsZUFycmF5XCI7XG5pbXBvcnQgX2NsYXNzQ2FsbENoZWNrIGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jbGFzc0NhbGxDaGVja1wiO1xuaW1wb3J0IF9jcmVhdGVDbGFzcyBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vY3JlYXRlQ2xhc3NcIjtcbmltcG9ydCB7IFNhbmRCb3hUeXBlIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBuYXRpdmVHbG9iYWwsIG5leHRUYXNrIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgZ2V0VGFyZ2V0VmFsdWUsIHNldEN1cnJlbnRSdW5uaW5nQXBwIH0gZnJvbSAnLi9jb21tb24nO1xuLyoqXG4gKiBmYXN0ZXN0KGF0IG1vc3QgdGltZSkgdW5pcXVlIGFycmF5IG1ldGhvZFxuICogQHNlZSBodHRwczovL2pzcGVyZi5jb20vYXJyYXktZmlsdGVyLXVuaXF1ZS8zMFxuICovXG5cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgcmV0dXJuIGFycmF5LmZpbHRlcihmdW5jdGlvbiBmaWx0ZXIoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50IGluIHRoaXMgPyBmYWxzZSA6IHRoaXNbZWxlbWVudF0gPSB0cnVlO1xuICB9LCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbn0gLy8gem9uZS5qcyB3aWxsIG92ZXJ3cml0ZSBPYmplY3QuZGVmaW5lUHJvcGVydHlcblxuXG52YXIgcmF3T2JqZWN0RGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG52YXIgdmFyaWFibGVXaGl0ZUxpc3RJbkRldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8IHdpbmRvdy5fX1FJQU5LVU5fREVWRUxPUE1FTlRfXyA/IFsvLyBmb3IgcmVhY3QgaG90IHJlbG9hZFxuLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9jcmVhdGUtcmVhY3QtYXBwL2Jsb2IvNjZiZjdkZmM0MzM1MDI0OWUyZjA5ZDEzOGEyMDg0MGRhZThhMGE0YS9wYWNrYWdlcy9yZWFjdC1lcnJvci1vdmVybGF5L3NyYy9pbmRleC5qcyNMMTgwXG4nX19SRUFDVF9FUlJPUl9PVkVSTEFZX0dMT0JBTF9IT09LX18nXSA6IFtdOyAvLyB3aG8gY291bGQgZXNjYXBlIHRoZSBzYW5kYm94XG5cbnZhciB2YXJpYWJsZVdoaXRlTGlzdCA9IFsvLyBGSVhNRSBTeXN0ZW0uanMgdXNlZCBhIGluZGlyZWN0IGNhbGwgd2l0aCBldmFsLCB3aGljaCB3b3VsZCBtYWtlIGl0IHNjb3BlIGVzY2FwZSB0byBnbG9iYWxcbi8vIFRvIG1ha2UgU3lzdGVtLmpzIHdvcmtzIHdlbGwsIHdlIHdyaXRlIGl0IGJhY2sgdG8gZ2xvYmFsIHdpbmRvdyB0ZW1wb3Jhcnlcbi8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vc3lzdGVtanMvc3lzdGVtanMvYmxvYi80NTdmNWI3ZThhZjZiZDEyMGEyNzk1NDA0Nzc1NTJhMDdkNWRlMDg2L3NyYy9ldmFsdWF0ZS5qcyNMMTA2XG4nU3lzdGVtJywgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zeXN0ZW1qcy9zeXN0ZW1qcy9ibG9iLzQ1N2Y1YjdlOGFmNmJkMTIwYTI3OTU0MDQ3NzU1MmEwN2Q1ZGUwODYvc3JjL2luc3RhbnRpYXRlLmpzI0wzNTdcbidfX2Nqc1dyYXBwZXInXS5jb25jYXQodmFyaWFibGVXaGl0ZUxpc3RJbkRldik7XG4vKlxuIHZhcmlhYmxlcyB3aG8gYXJlIGltcG9zc2libGUgdG8gYmUgb3ZlcndyaXRlIG5lZWQgdG8gYmUgZXNjYXBlZCBmcm9tIHByb3h5IHNhbmRib3ggZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnNcbiAqL1xuXG52YXIgdW5zY29wYWJsZXMgPSB7XG4gIHVuZGVmaW5lZDogdHJ1ZSxcbiAgQXJyYXk6IHRydWUsXG4gIE9iamVjdDogdHJ1ZSxcbiAgU3RyaW5nOiB0cnVlLFxuICBCb29sZWFuOiB0cnVlLFxuICBNYXRoOiB0cnVlLFxuICBOdW1iZXI6IHRydWUsXG4gIFN5bWJvbDogdHJ1ZSxcbiAgcGFyc2VGbG9hdDogdHJ1ZSxcbiAgRmxvYXQzMkFycmF5OiB0cnVlXG59O1xudmFyIHVzZU5hdGl2ZVdpbmRvd0ZvckJpbmRpbmdzUHJvcHMgPSBuZXcgTWFwKFtbJ2ZldGNoJywgdHJ1ZV0sIFsnbW9ja0RvbUFQSUluQmxhY2tMaXN0JywgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICd0ZXN0J11dKTtcblxuZnVuY3Rpb24gY3JlYXRlRmFrZVdpbmRvdyhnbG9iYWxDb250ZXh0KSB7XG4gIC8vIG1hcCBhbHdheXMgaGFzIHRoZSBmYXN0ZXN0IHBlcmZvcm1hbmNlIGluIGhhcyBjaGVjayBzY2VuYXJpb1xuICAvLyBzZWUgaHR0cHM6Ly9qc3BlcmYuY29tL2FycmF5LWluZGV4b2YtdnMtc2V0LWhhcy8yM1xuICB2YXIgcHJvcGVydGllc1dpdGhHZXR0ZXIgPSBuZXcgTWFwKCk7XG4gIHZhciBmYWtlV2luZG93ID0ge307XG4gIC8qXG4gICBjb3B5IHRoZSBub24tY29uZmlndXJhYmxlIHByb3BlcnR5IG9mIGdsb2JhbCB0byBmYWtlV2luZG93XG4gICBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvUHJveHkvaGFuZGxlci9nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JcbiAgID4gQSBwcm9wZXJ0eSBjYW5ub3QgYmUgcmVwb3J0ZWQgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgaWYgaXQgZG9lcyBub3QgZXhpc3RzIGFzIGFuIG93biBwcm9wZXJ0eSBvZiB0aGUgdGFyZ2V0IG9iamVjdCBvciBpZiBpdCBleGlzdHMgYXMgYSBjb25maWd1cmFibGUgb3duIHByb3BlcnR5IG9mIHRoZSB0YXJnZXQgb2JqZWN0LlxuICAgKi9cblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhnbG9iYWxDb250ZXh0KS5maWx0ZXIoZnVuY3Rpb24gKHApIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZ2xvYmFsQ29udGV4dCwgcCk7XG4gICAgcmV0dXJuICEoZGVzY3JpcHRvciA9PT0gbnVsbCB8fCBkZXNjcmlwdG9yID09PSB2b2lkIDAgPyB2b2lkIDAgOiBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSk7XG4gIH0pLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZ2xvYmFsQ29udGV4dCwgcCk7XG5cbiAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgdmFyIGhhc0dldHRlciA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkZXNjcmlwdG9yLCAnZ2V0Jyk7XG4gICAgICAvKlxuICAgICAgIG1ha2UgdG9wL3NlbGYvd2luZG93IHByb3BlcnR5IGNvbmZpZ3VyYWJsZSBhbmQgd3JpdGFibGUsIG90aGVyd2lzZSBpdCB3aWxsIGNhdXNlIFR5cGVFcnJvciB3aGlsZSBnZXQgdHJhcCByZXR1cm4uXG4gICAgICAgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1Byb3h5L2hhbmRsZXIvZ2V0XG4gICAgICAgPiBUaGUgdmFsdWUgcmVwb3J0ZWQgZm9yIGEgcHJvcGVydHkgbXVzdCBiZSB0aGUgc2FtZSBhcyB0aGUgdmFsdWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgdGFyZ2V0IG9iamVjdCBwcm9wZXJ0eSBpZiB0aGUgdGFyZ2V0IG9iamVjdCBwcm9wZXJ0eSBpcyBhIG5vbi13cml0YWJsZSwgbm9uLWNvbmZpZ3VyYWJsZSBkYXRhIHByb3BlcnR5LlxuICAgICAgICovXG5cbiAgICAgIGlmIChwID09PSAndG9wJyB8fCBwID09PSAncGFyZW50JyB8fCBwID09PSAnc2VsZicgfHwgcCA9PT0gJ3dpbmRvdycgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICd0ZXN0JyAmJiAocCA9PT0gJ21vY2tUb3AnIHx8IHAgPT09ICdtb2NrU2FmYXJpVG9wJykpIHtcbiAgICAgICAgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgICAvKlxuICAgICAgICAgVGhlIGRlc2NyaXB0b3Igb2Ygd2luZG93LndpbmRvdy93aW5kb3cudG9wL3dpbmRvdy5zZWxmIGluIFNhZmFyaS9GRiBhcmUgYWNjZXNzb3IgZGVzY3JpcHRvcnMsIHdlIG5lZWQgdG8gYXZvaWQgYWRkaW5nIGEgZGF0YSBkZXNjcmlwdG9yIHdoaWxlIGl0IHdhc1xuICAgICAgICAgRXhhbXBsZTpcbiAgICAgICAgICBTYWZhcmkvRkY6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LCAndG9wJykgLT4ge2dldDogZnVuY3Rpb24sIHNldDogdW5kZWZpbmVkLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IGZhbHNlfVxuICAgICAgICAgIENocm9tZTogT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih3aW5kb3csICd0b3AnKSAtPiB7dmFsdWU6IFdpbmRvdywgd3JpdGFibGU6IGZhbHNlLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IGZhbHNlfVxuICAgICAgICAgKi9cblxuICAgICAgICBpZiAoIWhhc0dldHRlcikge1xuICAgICAgICAgIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNHZXR0ZXIpIHByb3BlcnRpZXNXaXRoR2V0dGVyLnNldChwLCB0cnVlKTsgLy8gZnJlZXplIHRoZSBkZXNjcmlwdG9yIHRvIGF2b2lkIGJlaW5nIG1vZGlmaWVkIGJ5IHpvbmUuanNcbiAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci96b25lLmpzL2Jsb2IvYTVmZTA5YjBmYWMyN2FjNWRmMWZhNzQ2MDQyZjk2ZjA1Y2NiNmEwMC9saWIvYnJvd3Nlci9kZWZpbmUtcHJvcGVydHkudHMjTDcxXG5cbiAgICAgIHJhd09iamVjdERlZmluZVByb3BlcnR5KGZha2VXaW5kb3csIHAsIE9iamVjdC5mcmVlemUoZGVzY3JpcHRvcikpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7XG4gICAgZmFrZVdpbmRvdzogZmFrZVdpbmRvdyxcbiAgICBwcm9wZXJ0aWVzV2l0aEdldHRlcjogcHJvcGVydGllc1dpdGhHZXR0ZXJcbiAgfTtcbn1cblxudmFyIGFjdGl2ZVNhbmRib3hDb3VudCA9IDA7XG4vKipcbiAqIOWfuuS6jiBQcm94eSDlrp7njrDnmoTmspnnrrFcbiAqL1xuXG52YXIgUHJveHlTYW5kYm94ID0gLyojX19QVVJFX18qL2Z1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gUHJveHlTYW5kYm94KG5hbWUpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIGdsb2JhbENvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHdpbmRvdztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBQcm94eVNhbmRib3gpO1xuXG4gICAgLyoqIHdpbmRvdyDlgLzlj5jmm7TorrDlvZUgKi9cbiAgICB0aGlzLnVwZGF0ZWRWYWx1ZVNldCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLnNhbmRib3hSdW5uaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmxhdGVzdFNldFByb3AgPSBudWxsO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5nbG9iYWxDb250ZXh0ID0gZ2xvYmFsQ29udGV4dDtcbiAgICB0aGlzLnR5cGUgPSBTYW5kQm94VHlwZS5Qcm94eTtcbiAgICB2YXIgdXBkYXRlZFZhbHVlU2V0ID0gdGhpcy51cGRhdGVkVmFsdWVTZXQ7XG5cbiAgICB2YXIgX2NyZWF0ZUZha2VXaW5kb3cgPSBjcmVhdGVGYWtlV2luZG93KGdsb2JhbENvbnRleHQpLFxuICAgICAgICBmYWtlV2luZG93ID0gX2NyZWF0ZUZha2VXaW5kb3cuZmFrZVdpbmRvdyxcbiAgICAgICAgcHJvcGVydGllc1dpdGhHZXR0ZXIgPSBfY3JlYXRlRmFrZVdpbmRvdy5wcm9wZXJ0aWVzV2l0aEdldHRlcjtcblxuICAgIHZhciBkZXNjcmlwdG9yVGFyZ2V0TWFwID0gbmV3IE1hcCgpO1xuXG4gICAgdmFyIGhhc093blByb3BlcnR5ID0gZnVuY3Rpb24gaGFzT3duUHJvcGVydHkoa2V5KSB7XG4gICAgICByZXR1cm4gZmFrZVdpbmRvdy5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8IGdsb2JhbENvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KTtcbiAgICB9O1xuXG4gICAgdmFyIHByb3h5ID0gbmV3IFByb3h5KGZha2VXaW5kb3csIHtcbiAgICAgIHNldDogZnVuY3Rpb24gc2V0KHRhcmdldCwgcCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKF90aGlzLnNhbmRib3hSdW5uaW5nKSB7XG4gICAgICAgICAgX3RoaXMucmVnaXN0ZXJSdW5uaW5nQXBwKG5hbWUsIHByb3h5KTsgLy8gV2UgbXVzdCBrZXB0IGl0cyBkZXNjcmlwdGlvbiB3aGlsZSB0aGUgcHJvcGVydHkgZXhpc3RlZCBpbiBnbG9iYWxDb250ZXh0IGJlZm9yZVxuXG5cbiAgICAgICAgICBpZiAoIXRhcmdldC5oYXNPd25Qcm9wZXJ0eShwKSAmJiBnbG9iYWxDb250ZXh0Lmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZ2xvYmFsQ29udGV4dCwgcCk7XG4gICAgICAgICAgICB2YXIgd3JpdGFibGUgPSBkZXNjcmlwdG9yLndyaXRhYmxlLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA9IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGU7XG5cbiAgICAgICAgICAgIGlmICh3cml0YWJsZSkge1xuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBjb25maWd1cmFibGUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZW51bWVyYWJsZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogd3JpdGFibGUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICB0YXJnZXRbcF0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodmFyaWFibGVXaGl0ZUxpc3QuaW5kZXhPZihwKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGdsb2JhbENvbnRleHRbcF0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB1cGRhdGVkVmFsdWVTZXQuYWRkKHApO1xuICAgICAgICAgIF90aGlzLmxhdGVzdFNldFByb3AgPSBwO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiW3FpYW5rdW5dIFNldCB3aW5kb3cuXCIuY29uY2F0KHAudG9TdHJpbmcoKSwgXCIgd2hpbGUgc2FuZGJveCBkZXN0cm95ZWQgb3IgaW5hY3RpdmUgaW4gXCIpLmNvbmNhdChuYW1lLCBcIiFcIikpO1xuICAgICAgICB9IC8vIOWcqCBzdHJpY3QtbW9kZSDkuIvvvIxQcm94eSDnmoQgaGFuZGxlci5zZXQg6L+U5ZueIGZhbHNlIOS8muaKm+WHuiBUeXBlRXJyb3LvvIzlnKjmspnnrrHljbjovb3nmoTmg4XlhrXkuIvlupTor6Xlv73nlaXplJnor69cblxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KHRhcmdldCwgcCkge1xuICAgICAgICBfdGhpcy5yZWdpc3RlclJ1bm5pbmdBcHAobmFtZSwgcHJveHkpO1xuXG4gICAgICAgIGlmIChwID09PSBTeW1ib2wudW5zY29wYWJsZXMpIHJldHVybiB1bnNjb3BhYmxlczsgLy8gYXZvaWQgd2hvIHVzaW5nIHdpbmRvdy53aW5kb3cgb3Igd2luZG93LnNlbGYgdG8gZXNjYXBlIHRoZSBzYW5kYm94IGVudmlyb25tZW50IHRvIHRvdWNoIHRoZSByZWFsbHkgd2luZG93XG4gICAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvc3JjL0ZpbGVTYXZlci5qcyNMMTNcblxuICAgICAgICBpZiAocCA9PT0gJ3dpbmRvdycgfHwgcCA9PT0gJ3NlbGYnKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgICB9IC8vIGhpamFjayBnbG9iYWxXaW5kb3cgYWNjZXNzaW5nIHdpdGggZ2xvYmFsVGhpcyBrZXl3b3JkXG5cblxuICAgICAgICBpZiAocCA9PT0gJ2dsb2JhbFRoaXMnKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHAgPT09ICd0b3AnIHx8IHAgPT09ICdwYXJlbnQnIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCcgJiYgKHAgPT09ICdtb2NrVG9wJyB8fCBwID09PSAnbW9ja1NhZmFyaVRvcCcpKSB7XG4gICAgICAgICAgLy8gaWYgeW91ciBtYXN0ZXIgYXBwIGluIGFuIGlmcmFtZSBjb250ZXh0LCBhbGxvdyB0aGVzZSBwcm9wcyBlc2NhcGUgdGhlIHNhbmRib3hcbiAgICAgICAgICBpZiAoZ2xvYmFsQ29udGV4dCA9PT0gZ2xvYmFsQ29udGV4dC5wYXJlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZ2xvYmFsQ29udGV4dFtwXTtcbiAgICAgICAgfSAvLyBwcm94eS5oYXNPd25Qcm9wZXJ0eSB3b3VsZCBpbnZva2UgZ2V0dGVyIGZpcnN0bHksIHRoZW4gaXRzIHZhbHVlIHJlcHJlc2VudGVkIGFzIGdsb2JhbENvbnRleHQuaGFzT3duUHJvcGVydHlcblxuXG4gICAgICAgIGlmIChwID09PSAnaGFzT3duUHJvcGVydHknKSB7XG4gICAgICAgICAgcmV0dXJuIGhhc093blByb3BlcnR5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHAgPT09ICdkb2N1bWVudCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocCA9PT0gJ2V2YWwnKSB7XG4gICAgICAgICAgcmV0dXJuIGV2YWw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0aWVzV2l0aEdldHRlci5oYXMocCkgPyBnbG9iYWxDb250ZXh0W3BdIDogcCBpbiB0YXJnZXQgPyB0YXJnZXRbcF0gOiBnbG9iYWxDb250ZXh0W3BdO1xuICAgICAgICAvKiBTb21lIGRvbSBhcGkgbXVzdCBiZSBib3VuZCB0byBuYXRpdmUgd2luZG93LCBvdGhlcndpc2UgaXQgd291bGQgY2F1c2UgZXhjZXB0aW9uIGxpa2UgJ1R5cGVFcnJvcjogRmFpbGVkIHRvIGV4ZWN1dGUgJ2ZldGNoJyBvbiAnV2luZG93JzogSWxsZWdhbCBpbnZvY2F0aW9uJ1xuICAgICAgICAgICBTZWUgdGhpcyBjb2RlOlxuICAgICAgICAgICAgIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KHdpbmRvdywge30pO1xuICAgICAgICAgICAgIGNvbnN0IHByb3h5RmV0Y2ggPSBmZXRjaC5iaW5kKHByb3h5KTtcbiAgICAgICAgICAgICBwcm94eUZldGNoKCdodHRwczovL3FpYW5rdW4uY29tJyk7XG4gICAgICAgICovXG5cbiAgICAgICAgdmFyIGJvdW5kVGFyZ2V0ID0gdXNlTmF0aXZlV2luZG93Rm9yQmluZGluZ3NQcm9wcy5nZXQocCkgPyBuYXRpdmVHbG9iYWwgOiBnbG9iYWxDb250ZXh0O1xuICAgICAgICByZXR1cm4gZ2V0VGFyZ2V0VmFsdWUoYm91bmRUYXJnZXQsIHZhbHVlKTtcbiAgICAgIH0sXG4gICAgICAvLyB0cmFwIGluIG9wZXJhdG9yXG4gICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3N0eWxlZC1jb21wb25lbnRzL3N0eWxlZC1jb21wb25lbnRzL2Jsb2IvbWFzdGVyL3BhY2thZ2VzL3N0eWxlZC1jb21wb25lbnRzL3NyYy9jb25zdGFudHMuanMjTDEyXG4gICAgICBoYXM6IGZ1bmN0aW9uIGhhcyh0YXJnZXQsIHApIHtcbiAgICAgICAgcmV0dXJuIHAgaW4gdW5zY29wYWJsZXMgfHwgcCBpbiB0YXJnZXQgfHwgcCBpbiBnbG9iYWxDb250ZXh0O1xuICAgICAgfSxcbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgcCkge1xuICAgICAgICAvKlxuICAgICAgICAgYXMgdGhlIGRlc2NyaXB0b3Igb2YgdG9wL3NlbGYvd2luZG93L21vY2tUb3AgaW4gcmF3IHdpbmRvdyBhcmUgY29uZmlndXJhYmxlIGJ1dCBub3QgaW4gcHJveHkgdGFyZ2V0LCB3ZSBuZWVkIHRvIGdldCBpdCBmcm9tIHRhcmdldCB0byBhdm9pZCBUeXBlRXJyb3JcbiAgICAgICAgIHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9Qcm94eS9oYW5kbGVyL2dldE93blByb3BlcnR5RGVzY3JpcHRvclxuICAgICAgICAgPiBBIHByb3BlcnR5IGNhbm5vdCBiZSByZXBvcnRlZCBhcyBub24tY29uZmlndXJhYmxlLCBpZiBpdCBkb2VzIG5vdCBleGlzdHMgYXMgYW4gb3duIHByb3BlcnR5IG9mIHRoZSB0YXJnZXQgb2JqZWN0IG9yIGlmIGl0IGV4aXN0cyBhcyBhIGNvbmZpZ3VyYWJsZSBvd24gcHJvcGVydHkgb2YgdGhlIHRhcmdldCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICBpZiAodGFyZ2V0Lmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgcCk7XG4gICAgICAgICAgZGVzY3JpcHRvclRhcmdldE1hcC5zZXQocCwgJ3RhcmdldCcpO1xuICAgICAgICAgIHJldHVybiBkZXNjcmlwdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGdsb2JhbENvbnRleHQuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICB2YXIgX2Rlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGdsb2JhbENvbnRleHQsIHApO1xuXG4gICAgICAgICAgZGVzY3JpcHRvclRhcmdldE1hcC5zZXQocCwgJ2dsb2JhbENvbnRleHQnKTsgLy8gQSBwcm9wZXJ0eSBjYW5ub3QgYmUgcmVwb3J0ZWQgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgaWYgaXQgZG9lcyBub3QgZXhpc3RzIGFzIGFuIG93biBwcm9wZXJ0eSBvZiB0aGUgdGFyZ2V0IG9iamVjdFxuXG4gICAgICAgICAgaWYgKF9kZXNjcmlwdG9yICYmICFfZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICAgIF9kZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIF9kZXNjcmlwdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICAvLyB0cmFwIHRvIHN1cHBvcnQgaXRlcmF0b3Igd2l0aCBzYW5kYm94XG4gICAgICBvd25LZXlzOiBmdW5jdGlvbiBvd25LZXlzKHRhcmdldCkge1xuICAgICAgICByZXR1cm4gdW5pcShSZWZsZWN0Lm93bktleXMoZ2xvYmFsQ29udGV4dCkuY29uY2F0KFJlZmxlY3Qub3duS2V5cyh0YXJnZXQpKSk7XG4gICAgICB9LFxuICAgICAgZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgZnJvbSA9IGRlc2NyaXB0b3JUYXJnZXRNYXAuZ2V0KHApO1xuICAgICAgICAvKlxuICAgICAgICAgRGVzY3JpcHRvciBtdXN0IGJlIGRlZmluZWQgdG8gbmF0aXZlIHdpbmRvdyB3aGlsZSBpdCBjb21lcyBmcm9tIG5hdGl2ZSB3aW5kb3cgdmlhIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LCBwKSxcbiAgICAgICAgIG90aGVyd2lzZSBpdCB3b3VsZCBjYXVzZSBhIFR5cGVFcnJvciB3aXRoIGlsbGVnYWwgaW52b2NhdGlvbi5cbiAgICAgICAgICovXG5cbiAgICAgICAgc3dpdGNoIChmcm9tKSB7XG4gICAgICAgICAgY2FzZSAnZ2xvYmFsQ29udGV4dCc6XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxDb250ZXh0LCBwLCBhdHRyaWJ1dGVzKTtcblxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZGVsZXRlUHJvcGVydHk6IGZ1bmN0aW9uIGRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCkge1xuICAgICAgICBfdGhpcy5yZWdpc3RlclJ1bm5pbmdBcHAobmFtZSwgcHJveHkpO1xuXG4gICAgICAgIGlmICh0YXJnZXQuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgZGVsZXRlIHRhcmdldFtwXTtcbiAgICAgICAgICB1cGRhdGVkVmFsdWVTZXQuZGVsZXRlKHApO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgLy8gbWFrZXMgc3VyZSBgd2luZG93IGluc3RhbmNlb2YgV2luZG93YCByZXR1cm5zIHRydXRoeSBpbiBtaWNybyBhcHBcbiAgICAgIGdldFByb3RvdHlwZU9mOiBmdW5jdGlvbiBnZXRQcm90b3R5cGVPZigpIHtcbiAgICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsQ29udGV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm94eSA9IHByb3h5O1xuICAgIGFjdGl2ZVNhbmRib3hDb3VudCsrO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFByb3h5U2FuZGJveCwgW3tcbiAgICBrZXk6IFwicmVnaXN0ZXJSdW5uaW5nQXBwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlZ2lzdGVyUnVubmluZ0FwcChuYW1lLCBwcm94eSkge1xuICAgICAgaWYgKHRoaXMuc2FuZGJveFJ1bm5pbmcpIHtcbiAgICAgICAgc2V0Q3VycmVudFJ1bm5pbmdBcHAoe1xuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgd2luZG93OiBwcm94eVxuICAgICAgICB9KTsgLy8gRklYTUUgaWYgeW91IGhhdmUgYW55IG90aGVyIGdvb2QgaWRlYXNcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBtYXJrIGluIG5leHQgdGljaywgdGh1cyB3ZSBjYW4gaWRlbnRpZnkgd2hldGhlciBpdCBpbiBtaWNybyBhcHAgb3Igbm90XG4gICAgICAgIC8vIHRoaXMgYXBwcm9hY2ggaXMganVzdCBhIHdvcmthcm91bmQsIGl0IGNvdWxkIG5vdCBjb3ZlciBhbGwgY29tcGxleCBjYXNlcywgc3VjaCBhcyB0aGUgbWljcm8gYXBwIHJ1bnMgaW4gdGhlIHNhbWUgdGFzayBjb250ZXh0IHdpdGggbWFzdGVyIGluIHNvbWUgY2FzZVxuXG4gICAgICAgIG5leHRUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZXRDdXJyZW50UnVubmluZ0FwcChudWxsKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImFjdGl2ZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBhY3RpdmUoKSB7XG4gICAgICBpZiAoIXRoaXMuc2FuZGJveFJ1bm5pbmcpIGFjdGl2ZVNhbmRib3hDb3VudCsrO1xuICAgICAgdGhpcy5zYW5kYm94UnVubmluZyA9IHRydWU7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImluYWN0aXZlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluYWN0aXZlKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJbcWlhbmt1bjpzYW5kYm94XSBcIi5jb25jYXQodGhpcy5uYW1lLCBcIiBtb2RpZmllZCBnbG9iYWwgcHJvcGVydGllcyByZXN0b3JlLi4uXCIpLCBfdG9Db25zdW1hYmxlQXJyYXkodGhpcy51cGRhdGVkVmFsdWVTZXQua2V5cygpKSk7XG4gICAgICB9XG5cbiAgICAgIGlmICgtLWFjdGl2ZVNhbmRib3hDb3VudCA9PT0gMCkge1xuICAgICAgICB2YXJpYWJsZVdoaXRlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgaWYgKF90aGlzMi5wcm94eS5oYXNPd25Qcm9wZXJ0eShwKSkge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgZGVsZXRlIF90aGlzMi5nbG9iYWxDb250ZXh0W3BdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2FuZGJveFJ1bm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gUHJveHlTYW5kYm94O1xufSgpO1xuXG5leHBvcnQgeyBQcm94eVNhbmRib3ggYXMgZGVmYXVsdCB9OyIsImltcG9ydCBfY2xhc3NDYWxsQ2hlY2sgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL2NsYXNzQ2FsbENoZWNrXCI7XG5pbXBvcnQgX2NyZWF0ZUNsYXNzIGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS9jcmVhdGVDbGFzc1wiO1xuaW1wb3J0IHsgU2FuZEJveFR5cGUgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuZnVuY3Rpb24gaXRlcihvYmosIGNhbGxiYWNrRm4pIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pbiwgbm8tcmVzdHJpY3RlZC1zeW50YXhcbiAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAvLyBwYXRjaCBmb3IgY2xlYXJJbnRlcnZhbCBmb3IgY29tcGF0aWJsZSByZWFzb24sIHNlZSAjMTQ5MFxuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkgfHwgcHJvcCA9PT0gJ2NsZWFySW50ZXJ2YWwnKSB7XG4gICAgICBjYWxsYmFja0ZuKHByb3ApO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiDln7rkuo4gZGlmZiDmlrnlvI/lrp7njrDnmoTmspnnrrHvvIznlKjkuo7kuI3mlK/mjIEgUHJveHkg55qE5L2O54mI5pys5rWP6KeI5ZmoXG4gKi9cblxuXG52YXIgU25hcHNob3RTYW5kYm94ID0gLyojX19QVVJFX18qL2Z1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gU25hcHNob3RTYW5kYm94KG5hbWUpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU25hcHNob3RTYW5kYm94KTtcblxuICAgIHRoaXMuc2FuZGJveFJ1bm5pbmcgPSB0cnVlO1xuICAgIHRoaXMubW9kaWZ5UHJvcHNNYXAgPSB7fTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucHJveHkgPSB3aW5kb3c7XG4gICAgdGhpcy50eXBlID0gU2FuZEJveFR5cGUuU25hcHNob3Q7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU25hcHNob3RTYW5kYm94LCBbe1xuICAgIGtleTogXCJhY3RpdmVcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gYWN0aXZlKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgLy8g6K6w5b2V5b2T5YmN5b+r54WnXG4gICAgICB0aGlzLndpbmRvd1NuYXBzaG90ID0ge307XG4gICAgICBpdGVyKHdpbmRvdywgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgX3RoaXMud2luZG93U25hcHNob3RbcHJvcF0gPSB3aW5kb3dbcHJvcF07XG4gICAgICB9KTsgLy8g5oGi5aSN5LmL5YmN55qE5Y+Y5pu0XG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMubW9kaWZ5UHJvcHNNYXApLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgICAgd2luZG93W3BdID0gX3RoaXMubW9kaWZ5UHJvcHNNYXBbcF07XG4gICAgICB9KTtcbiAgICAgIHRoaXMuc2FuZGJveFJ1bm5pbmcgPSB0cnVlO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbmFjdGl2ZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbmFjdGl2ZSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB0aGlzLm1vZGlmeVByb3BzTWFwID0ge307XG4gICAgICBpdGVyKHdpbmRvdywgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgaWYgKHdpbmRvd1twcm9wXSAhPT0gX3RoaXMyLndpbmRvd1NuYXBzaG90W3Byb3BdKSB7XG4gICAgICAgICAgLy8g6K6w5b2V5Y+Y5pu077yM5oGi5aSN546v5aKDXG4gICAgICAgICAgX3RoaXMyLm1vZGlmeVByb3BzTWFwW3Byb3BdID0gd2luZG93W3Byb3BdO1xuICAgICAgICAgIHdpbmRvd1twcm9wXSA9IF90aGlzMi53aW5kb3dTbmFwc2hvdFtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJbcWlhbmt1bjpzYW5kYm94XSBcIi5jb25jYXQodGhpcy5uYW1lLCBcIiBvcmlnaW4gd2luZG93IHJlc3RvcmUuLi5cIiksIE9iamVjdC5rZXlzKHRoaXMubW9kaWZ5UHJvcHNNYXApKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zYW5kYm94UnVubmluZyA9IGZhbHNlO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBTbmFwc2hvdFNhbmRib3g7XG59KCk7XG5cbmV4cG9ydCB7IFNuYXBzaG90U2FuZGJveCBhcyBkZWZhdWx0IH07IiwiaW1wb3J0IF90b0NvbnN1bWFibGVBcnJheSBmcm9tIFwiQGJhYmVsL3J1bnRpbWUvaGVscGVycy9lc20vdG9Db25zdW1hYmxlQXJyYXlcIjtcbmltcG9ydCBfcmVnZW5lcmF0b3JSdW50aW1lIGZyb20gXCJAYmFiZWwvcnVudGltZS9yZWdlbmVyYXRvclwiO1xuaW1wb3J0IHsgX19hd2FpdGVyIH0gZnJvbSBcInRzbGliXCI7XG5pbXBvcnQgTGVnYWN5U2FuZGJveCBmcm9tICcuL2xlZ2FjeS9zYW5kYm94JztcbmltcG9ydCB7IHBhdGNoQXRCb290c3RyYXBwaW5nLCBwYXRjaEF0TW91bnRpbmcgfSBmcm9tICcuL3BhdGNoZXJzJztcbmltcG9ydCBQcm94eVNhbmRib3ggZnJvbSAnLi9wcm94eVNhbmRib3gnO1xuaW1wb3J0IFNuYXBzaG90U2FuZGJveCBmcm9tICcuL3NuYXBzaG90U2FuZGJveCc7XG5leHBvcnQgeyBjc3MgfSBmcm9tICcuL3BhdGNoZXJzJztcbmV4cG9ydCB7IGdldEN1cnJlbnRSdW5uaW5nQXBwIH0gZnJvbSAnLi9jb21tb24nO1xuLyoqXG4gKiDnlJ/miJDlupTnlKjov5DooYzml7bmspnnrrFcbiAqXG4gKiDmspnnrrHliIbkuKTkuKrnsbvlnovvvJpcbiAqIDEuIGFwcCDnjq/looPmspnnrrFcbiAqICBhcHAg546v5aKD5rKZ566x5piv5oyH5bqU55So5Yid5aeL5YyW6L+H5LmL5ZCO77yM5bqU55So5Lya5Zyo5LuA5LmI5qC355qE5LiK5LiL5paH546v5aKD6L+Q6KGM44CC5q+P5Liq5bqU55So55qE546v5aKD5rKZ566x5Y+q5Lya5Yid5aeL5YyW5LiA5qyh77yM5Zug5Li65a2Q5bqU55So5Y+q5Lya6Kem5Y+R5LiA5qyhIGJvb3RzdHJhcCDjgIJcbiAqICDlrZDlupTnlKjlnKjliIfmjaLml7bvvIzlrp7pmYXkuIrliIfmjaLnmoTmmK8gYXBwIOeOr+Wig+aymeeuseOAglxuICogMi4gcmVuZGVyIOaymeeusVxuICogIOWtkOW6lOeUqOWcqCBhcHAgbW91bnQg5byA5aeL5YmN55Sf5oiQ5aW955qE55qE5rKZ566x44CC5q+P5qyh5a2Q5bqU55So5YiH5o2i6L+H5ZCO77yMcmVuZGVyIOaymeeusemDveS8mumHjeeOsOWIneWni+WMluOAglxuICpcbiAqIOi/meS5iOiuvuiuoeeahOebrueahOaYr+S4uuS6huS/neivgeavj+S4quWtkOW6lOeUqOWIh+aNouWbnuadpeS5i+WQju+8jOi/mOiDvei/kOihjOWcqOW6lOeUqCBib290c3RyYXAg5LmL5ZCO55qE546v5aKD5LiL44CCXG4gKlxuICogQHBhcmFtIGFwcE5hbWVcbiAqIEBwYXJhbSBlbGVtZW50R2V0dGVyXG4gKiBAcGFyYW0gc2NvcGVkQ1NTXG4gKiBAcGFyYW0gdXNlTG9vc2VTYW5kYm94XG4gKiBAcGFyYW0gZXhjbHVkZUFzc2V0RmlsdGVyXG4gKiBAcGFyYW0gZ2xvYmFsQ29udGV4dFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYW5kYm94Q29udGFpbmVyKGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNjb3BlZENTUywgdXNlTG9vc2VTYW5kYm94LCBleGNsdWRlQXNzZXRGaWx0ZXIsIGdsb2JhbENvbnRleHQpIHtcbiAgdmFyIHNhbmRib3g7XG5cbiAgaWYgKHdpbmRvdy5Qcm94eSkge1xuICAgIHNhbmRib3ggPSB1c2VMb29zZVNhbmRib3ggPyBuZXcgTGVnYWN5U2FuZGJveChhcHBOYW1lLCBnbG9iYWxDb250ZXh0KSA6IG5ldyBQcm94eVNhbmRib3goYXBwTmFtZSwgZ2xvYmFsQ29udGV4dCk7XG4gIH0gZWxzZSB7XG4gICAgc2FuZGJveCA9IG5ldyBTbmFwc2hvdFNhbmRib3goYXBwTmFtZSk7XG4gIH0gLy8gc29tZSBzaWRlIGVmZmVjdCBjb3VsZCBiZSBiZSBpbnZva2VkIHdoaWxlIGJvb3RzdHJhcHBpbmcsIHN1Y2ggYXMgZHluYW1pYyBzdHlsZXNoZWV0IGluamVjdGlvbiB3aXRoIHN0eWxlLWxvYWRlciwgZXNwZWNpYWxseSBkdXJpbmcgdGhlIGRldmVsb3BtZW50IHBoYXNlXG5cblxuICB2YXIgYm9vdHN0cmFwcGluZ0ZyZWVycyA9IHBhdGNoQXRCb290c3RyYXBwaW5nKGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKTsgLy8gbW91bnRpbmcgZnJlZXJzIGFyZSBvbmUtb2ZmIGFuZCBzaG91bGQgYmUgcmUtaW5pdCBhdCBldmVyeSBtb3VudGluZyB0aW1lXG5cbiAgdmFyIG1vdW50aW5nRnJlZXJzID0gW107XG4gIHZhciBzaWRlRWZmZWN0c1JlYnVpbGRlcnMgPSBbXTtcbiAgcmV0dXJuIHtcbiAgICBpbnN0YW5jZTogc2FuZGJveCxcblxuICAgIC8qKlxuICAgICAqIOaymeeuseiiqyBtb3VudFxuICAgICAqIOWPr+iDveaYr+S7jiBib290c3RyYXAg54q25oCB6L+b5YWl55qEIG1vdW50XG4gICAgICog5Lmf5Y+v6IO95piv5LuOIHVubW91bnQg5LmL5ZCO5YaN5qyh5ZSk6YaS6L+b5YWlIG1vdW50XG4gICAgICovXG4gICAgbW91bnQ6IGZ1bmN0aW9uIG1vdW50KCkge1xuICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlKCkge1xuICAgICAgICB2YXIgc2lkZUVmZmVjdHNSZWJ1aWxkZXJzQXRCb290c3RyYXBwaW5nLCBzaWRlRWZmZWN0c1JlYnVpbGRlcnNBdE1vdW50aW5nO1xuICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUkKF9jb250ZXh0KSB7XG4gICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQucHJldiA9IF9jb250ZXh0Lm5leHQpIHtcbiAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSDlm6DkuLrmnInkuIrkuIvmlofkvp3otZbvvIh3aW5kb3fvvInvvIzku6XkuIvku6PnoIHmiafooYzpobrluo/kuI3og73lj5ggLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbiAgICAgICAgICAgICAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gMS4g5ZCv5YqoL+aBouWkjSDmspnnrrEtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICAgICAgICAgICAgICBzYW5kYm94LmFjdGl2ZSgpO1xuICAgICAgICAgICAgICAgIHNpZGVFZmZlY3RzUmVidWlsZGVyc0F0Qm9vdHN0cmFwcGluZyA9IHNpZGVFZmZlY3RzUmVidWlsZGVycy5zbGljZSgwLCBib290c3RyYXBwaW5nRnJlZXJzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgc2lkZUVmZmVjdHNSZWJ1aWxkZXJzQXRNb3VudGluZyA9IHNpZGVFZmZlY3RzUmVidWlsZGVycy5zbGljZShib290c3RyYXBwaW5nRnJlZXJzLmxlbmd0aCk7IC8vIG11c3QgcmVidWlsZCB0aGUgc2lkZSBlZmZlY3RzIHdoaWNoIGFkZGVkIGF0IGJvb3RzdHJhcHBpbmcgZmlyc3RseSB0byByZWNvdmVyeSB0byBuYXR1cmUgc3RhdGVcblxuICAgICAgICAgICAgICAgIGlmIChzaWRlRWZmZWN0c1JlYnVpbGRlcnNBdEJvb3RzdHJhcHBpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICBzaWRlRWZmZWN0c1JlYnVpbGRlcnNBdEJvb3RzdHJhcHBpbmcuZm9yRWFjaChmdW5jdGlvbiAocmVidWlsZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVidWlsZCgpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAyLiDlvIDlkK/lhajlsYDlj5jph4/ooaXkuIEgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbiAgICAgICAgICAgICAgICAvLyByZW5kZXIg5rKZ566x5ZCv5Yqo5pe25byA5aeL5Yqr5oyB5ZCE57G75YWo5bGA55uR5ZCs77yM5bC96YeP5LiN6KaB5Zyo5bqU55So5Yid5aeL5YyW6Zi25q615pyJIOS6i+S7tuebkeWQrC/lrprml7blmagg562J5Ymv5L2c55SoXG5cblxuICAgICAgICAgICAgICAgIG1vdW50aW5nRnJlZXJzID0gcGF0Y2hBdE1vdW50aW5nKGFwcE5hbWUsIGVsZW1lbnRHZXR0ZXIsIHNhbmRib3gsIHNjb3BlZENTUywgZXhjbHVkZUFzc2V0RmlsdGVyKTtcbiAgICAgICAgICAgICAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gMy4g6YeN572u5LiA5Lqb5Yid5aeL5YyW5pe255qE5Ymv5L2c55SoIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4gICAgICAgICAgICAgICAgLy8g5a2Y5ZyoIHJlYnVpbGRlciDliJnooajmmI7mnInkupvlia/kvZznlKjpnIDopoHph43lu7pcblxuICAgICAgICAgICAgICAgIGlmIChzaWRlRWZmZWN0c1JlYnVpbGRlcnNBdE1vdW50aW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgc2lkZUVmZmVjdHNSZWJ1aWxkZXJzQXRNb3VudGluZy5mb3JFYWNoKGZ1bmN0aW9uIChyZWJ1aWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWJ1aWxkKCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IC8vIGNsZWFuIHVwIHJlYnVpbGRlcnNcblxuXG4gICAgICAgICAgICAgICAgc2lkZUVmZmVjdHNSZWJ1aWxkZXJzID0gW107XG5cbiAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0LnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUpO1xuICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDmgaLlpI0gZ2xvYmFsIOeKtuaAge+8jOS9v+WFtuiDveWbnuWIsOW6lOeUqOWKoOi9veS5i+WJjeeahOeKtuaAgVxuICAgICAqL1xuICAgIHVubW91bnQ6IGZ1bmN0aW9uIHVubW91bnQoKSB7XG4gICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWUyKCkge1xuICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUyJChfY29udGV4dDIpIHtcbiAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDIucHJldiA9IF9jb250ZXh0Mi5uZXh0KSB7XG4gICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAvLyByZWNvcmQgdGhlIHJlYnVpbGRlcnMgb2Ygd2luZG93IHNpZGUgZWZmZWN0cyAoZXZlbnQgbGlzdGVuZXJzIG9yIHRpbWVycylcbiAgICAgICAgICAgICAgICAvLyBub3RlIHRoYXQgdGhlIGZyZWVzIG9mIG1vdW50aW5nIHBoYXNlIGFyZSBvbmUtb2ZmIGFzIGl0IHdpbGwgYmUgcmUtaW5pdCBhdCBuZXh0IG1vdW50aW5nXG4gICAgICAgICAgICAgICAgc2lkZUVmZmVjdHNSZWJ1aWxkZXJzID0gW10uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheShib290c3RyYXBwaW5nRnJlZXJzKSwgX3RvQ29uc3VtYWJsZUFycmF5KG1vdW50aW5nRnJlZXJzKSkubWFwKGZ1bmN0aW9uIChmcmVlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZnJlZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNhbmRib3guaW5hY3RpdmUoKTtcblxuICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQyLnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9jYWxsZWUyKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH07XG59IiwiaW1wb3J0IF9jb25jYXQgZnJvbSBcImxvZGFzaC9jb25jYXRcIjtcbmltcG9ydCBfbWVyZ2VXaXRoMiBmcm9tIFwibG9kYXNoL21lcmdlV2l0aFwiO1xuaW1wb3J0IF90eXBlb2YgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3R5cGVvZlwiO1xuaW1wb3J0IF9mb3JFYWNoIGZyb20gXCJsb2Rhc2gvZm9yRWFjaFwiO1xuaW1wb3J0IF9yZWdlbmVyYXRvclJ1bnRpbWUgZnJvbSBcIkBiYWJlbC9ydW50aW1lL3JlZ2VuZXJhdG9yXCI7XG5cbi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDIwLTA0LTAxXG4gKi9cbmltcG9ydCB7IF9fYXdhaXRlciwgX19yZXN0IH0gZnJvbSBcInRzbGliXCI7XG5pbXBvcnQgeyBpbXBvcnRFbnRyeSB9IGZyb20gJ2ltcG9ydC1odG1sLWVudHJ5JztcbmltcG9ydCBnZXRBZGRPbnMgZnJvbSAnLi9hZGRvbnMnO1xuaW1wb3J0IHsgUWlhbmt1bkVycm9yIH0gZnJvbSAnLi9lcnJvcic7XG5pbXBvcnQgeyBnZXRNaWNyb0FwcFN0YXRlQWN0aW9ucyB9IGZyb20gJy4vZ2xvYmFsU3RhdGUnO1xuaW1wb3J0IHsgY3JlYXRlU2FuZGJveENvbnRhaW5lciwgY3NzIH0gZnJvbSAnLi9zYW5kYm94JztcbmltcG9ydCB7IERlZmVycmVkLCBnZXRDb250YWluZXIsIGdldERlZmF1bHRUcGxXcmFwcGVyLCBnZXRXcmFwcGVySWQsIGlzRW5hYmxlU2NvcGVkQ1NTLCBwZXJmb3JtYW5jZU1hcmssIHBlcmZvcm1hbmNlTWVhc3VyZSwgcGVyZm9ybWFuY2VHZXRFbnRyaWVzQnlOYW1lLCB0b0FycmF5LCB2YWxpZGF0ZUV4cG9ydExpZmVjeWNsZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5mdW5jdGlvbiBhc3NlcnRFbGVtZW50RXhpc3QoZWxlbWVudCwgbXNnKSB7XG4gIGlmICghZWxlbWVudCkge1xuICAgIGlmIChtc2cpIHtcbiAgICAgIHRocm93IG5ldyBRaWFua3VuRXJyb3IobXNnKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgUWlhbmt1bkVycm9yKCdlbGVtZW50IG5vdCBleGlzdGVkIScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV4ZWNIb29rc0NoYWluKGhvb2tzLCBhcHApIHtcbiAgdmFyIGdsb2JhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogd2luZG93O1xuXG4gIGlmIChob29rcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gaG9va3MucmVkdWNlKGZ1bmN0aW9uIChjaGFpbiwgaG9vaykge1xuICAgICAgcmV0dXJuIGNoYWluLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gaG9vayhhcHAsIGdsb2JhbCk7XG4gICAgICB9KTtcbiAgICB9LCBQcm9taXNlLnJlc29sdmUoKSk7XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU2luZ3VsYXJNb2RlKHZhbGlkYXRlLCBhcHApIHtcbiAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlKCkge1xuICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZSQoX2NvbnRleHQpIHtcbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIHN3aXRjaCAoX2NvbnRleHQucHJldiA9IF9jb250ZXh0Lm5leHQpIHtcbiAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICByZXR1cm4gX2NvbnRleHQuYWJydXB0KFwicmV0dXJuXCIsIHR5cGVvZiB2YWxpZGF0ZSA9PT0gJ2Z1bmN0aW9uJyA/IHZhbGlkYXRlKGFwcCkgOiAhIXZhbGlkYXRlKTtcblxuICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICByZXR1cm4gX2NvbnRleHQuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSwgX2NhbGxlZSk7XG4gIH0pKTtcbn0gLy8gQHRzLWlnbm9yZVxuXG5cbnZhciBzdXBwb3J0U2hhZG93RE9NID0gZG9jdW1lbnQuaGVhZC5hdHRhY2hTaGFkb3cgfHwgZG9jdW1lbnQuaGVhZC5jcmVhdGVTaGFkb3dSb290O1xuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KGFwcENvbnRlbnQsIHN0cmljdFN0eWxlSXNvbGF0aW9uLCBzY29wZWRDU1MsIGFwcE5hbWUpIHtcbiAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgY29udGFpbmVyRWxlbWVudC5pbm5lckhUTUwgPSBhcHBDb250ZW50OyAvLyBhcHBDb250ZW50IGFsd2F5cyB3cmFwcGVkIHdpdGggYSBzaW5ndWxhciBkaXZcblxuICB2YXIgYXBwRWxlbWVudCA9IGNvbnRhaW5lckVsZW1lbnQuZmlyc3RDaGlsZDtcblxuICBpZiAoc3RyaWN0U3R5bGVJc29sYXRpb24pIHtcbiAgICBpZiAoIXN1cHBvcnRTaGFkb3dET00pIHtcbiAgICAgIGNvbnNvbGUud2FybignW3FpYW5rdW5dOiBBcyBjdXJyZW50IGJyb3dzZXIgbm90IHN1cHBvcnQgc2hhZG93IGRvbSwgeW91ciBzdHJpY3RTdHlsZUlzb2xhdGlvbiBjb25maWd1cmF0aW9uIHdpbGwgYmUgaWdub3JlZCEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGlubmVySFRNTCA9IGFwcEVsZW1lbnQuaW5uZXJIVE1MO1xuICAgICAgYXBwRWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICAgIHZhciBzaGFkb3c7XG5cbiAgICAgIGlmIChhcHBFbGVtZW50LmF0dGFjaFNoYWRvdykge1xuICAgICAgICBzaGFkb3cgPSBhcHBFbGVtZW50LmF0dGFjaFNoYWRvdyh7XG4gICAgICAgICAgbW9kZTogJ29wZW4nXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY3JlYXRlU2hhZG93Um9vdCB3YXMgcHJvcG9zZWQgaW4gaW5pdGlhbCBzcGVjLCB3aGljaCBoYXMgdGhlbiBiZWVuIGRlcHJlY2F0ZWRcbiAgICAgICAgc2hhZG93ID0gYXBwRWxlbWVudC5jcmVhdGVTaGFkb3dSb290KCk7XG4gICAgICB9XG5cbiAgICAgIHNoYWRvdy5pbm5lckhUTUwgPSBpbm5lckhUTUw7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNjb3BlZENTUykge1xuICAgIHZhciBhdHRyID0gYXBwRWxlbWVudC5nZXRBdHRyaWJ1dGUoY3NzLlFpYW5rdW5DU1NSZXdyaXRlQXR0cik7XG5cbiAgICBpZiAoIWF0dHIpIHtcbiAgICAgIGFwcEVsZW1lbnQuc2V0QXR0cmlidXRlKGNzcy5RaWFua3VuQ1NTUmV3cml0ZUF0dHIsIGFwcE5hbWUpO1xuICAgIH1cblxuICAgIHZhciBzdHlsZU5vZGVzID0gYXBwRWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzdHlsZScpIHx8IFtdO1xuXG4gICAgX2ZvckVhY2goc3R5bGVOb2RlcywgZnVuY3Rpb24gKHN0eWxlc2hlZXRFbGVtZW50KSB7XG4gICAgICBjc3MucHJvY2VzcyhhcHBFbGVtZW50LCBzdHlsZXNoZWV0RWxlbWVudCwgYXBwTmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gYXBwRWxlbWVudDtcbn1cbi8qKiBnZW5lcmF0ZSBhcHAgd3JhcHBlciBkb20gZ2V0dGVyICovXG5cblxuZnVuY3Rpb24gZ2V0QXBwV3JhcHBlckdldHRlcihhcHBOYW1lLCBhcHBJbnN0YW5jZUlkLCB1c2VMZWdhY3lSZW5kZXIsIHN0cmljdFN0eWxlSXNvbGF0aW9uLCBzY29wZWRDU1MsIGVsZW1lbnRHZXR0ZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodXNlTGVnYWN5UmVuZGVyKSB7XG4gICAgICBpZiAoc3RyaWN0U3R5bGVJc29sYXRpb24pIHRocm93IG5ldyBRaWFua3VuRXJyb3IoJ3N0cmljdFN0eWxlSXNvbGF0aW9uIGNhbiBub3QgYmUgdXNlZCB3aXRoIGxlZ2FjeSByZW5kZXIhJyk7XG4gICAgICBpZiAoc2NvcGVkQ1NTKSB0aHJvdyBuZXcgUWlhbmt1bkVycm9yKCdleHBlcmltZW50YWxTdHlsZUlzb2xhdGlvbiBjYW4gbm90IGJlIHVzZWQgd2l0aCBsZWdhY3kgcmVuZGVyIScpO1xuICAgICAgdmFyIGFwcFdyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChnZXRXcmFwcGVySWQoYXBwSW5zdGFuY2VJZCkpO1xuICAgICAgYXNzZXJ0RWxlbWVudEV4aXN0KGFwcFdyYXBwZXIsIFwiV3JhcHBlciBlbGVtZW50IGZvciBcIi5jb25jYXQoYXBwTmFtZSwgXCIgd2l0aCBpbnN0YW5jZSBcIikuY29uY2F0KGFwcEluc3RhbmNlSWQsIFwiIGlzIG5vdCBleGlzdGVkIVwiKSk7XG4gICAgICByZXR1cm4gYXBwV3JhcHBlcjtcbiAgICB9XG5cbiAgICB2YXIgZWxlbWVudCA9IGVsZW1lbnRHZXR0ZXIoKTtcbiAgICBhc3NlcnRFbGVtZW50RXhpc3QoZWxlbWVudCwgXCJXcmFwcGVyIGVsZW1lbnQgZm9yIFwiLmNvbmNhdChhcHBOYW1lLCBcIiB3aXRoIGluc3RhbmNlIFwiKS5jb25jYXQoYXBwSW5zdGFuY2VJZCwgXCIgaXMgbm90IGV4aXN0ZWQhXCIpKTtcblxuICAgIGlmIChzdHJpY3RTdHlsZUlzb2xhdGlvbiAmJiBzdXBwb3J0U2hhZG93RE9NKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zaGFkb3dSb290O1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9O1xufVxuXG52YXIgcmF3QXBwZW5kQ2hpbGQgPSBIVE1MRWxlbWVudC5wcm90b3R5cGUuYXBwZW5kQ2hpbGQ7XG52YXIgcmF3UmVtb3ZlQ2hpbGQgPSBIVE1MRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQ2hpbGQ7XG4vKipcbiAqIEdldCB0aGUgcmVuZGVyIGZ1bmN0aW9uXG4gKiBJZiB0aGUgbGVnYWN5IHJlbmRlciBmdW5jdGlvbiBpcyBwcm92aWRlLCB1c2VkIGFzIGl0LCBvdGhlcndpc2Ugd2Ugd2lsbCBpbnNlcnQgdGhlIGFwcCBlbGVtZW50IHRvIHRhcmdldCBjb250YWluZXIgYnkgcWlhbmt1blxuICogQHBhcmFtIGFwcE5hbWVcbiAqIEBwYXJhbSBhcHBDb250ZW50XG4gKiBAcGFyYW0gbGVnYWN5UmVuZGVyXG4gKi9cblxuZnVuY3Rpb24gZ2V0UmVuZGVyKGFwcE5hbWUsIGFwcENvbnRlbnQsIGxlZ2FjeVJlbmRlcikge1xuICB2YXIgcmVuZGVyID0gZnVuY3Rpb24gcmVuZGVyKF9yZWYsIHBoYXNlKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBfcmVmLmVsZW1lbnQsXG4gICAgICAgIGxvYWRpbmcgPSBfcmVmLmxvYWRpbmcsXG4gICAgICAgIGNvbnRhaW5lciA9IF9yZWYuY29udGFpbmVyO1xuXG4gICAgaWYgKGxlZ2FjeVJlbmRlcikge1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignW3FpYW5rdW5dIEN1c3RvbSByZW5kZXJpbmcgZnVuY3Rpb24gaXMgZGVwcmVjYXRlZCwgeW91IGNhbiB1c2UgdGhlIGNvbnRhaW5lciBlbGVtZW50IHNldHRpbmcgaW5zdGVhZCEnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGxlZ2FjeVJlbmRlcih7XG4gICAgICAgIGxvYWRpbmc6IGxvYWRpbmcsXG4gICAgICAgIGFwcENvbnRlbnQ6IGVsZW1lbnQgPyBhcHBDb250ZW50IDogJydcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gZ2V0Q29udGFpbmVyKGNvbnRhaW5lcik7IC8vIFRoZSBjb250YWluZXIgbWlnaHQgaGF2ZSBiZSByZW1vdmVkIGFmdGVyIG1pY3JvIGFwcCB1bm1vdW50ZWQuXG4gICAgLy8gU3VjaCBhcyB0aGUgbWljcm8gYXBwIHVubW91bnQgbGlmZWN5Y2xlIGNhbGxlZCBieSBhIHJlYWN0IGNvbXBvbmVudFdpbGxVbm1vdW50IGxpZmVjeWNsZSwgYWZ0ZXIgbWljcm8gYXBwIHVubW91bnRlZCwgdGhlIHJlYWN0IGNvbXBvbmVudCBtaWdodCBhbHNvIGJlIHJlbW92ZWRcblxuICAgIGlmIChwaGFzZSAhPT0gJ3VubW91bnRlZCcpIHtcbiAgICAgIHZhciBlcnJvck1zZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3dpdGNoIChwaGFzZSkge1xuICAgICAgICAgIGNhc2UgJ2xvYWRpbmcnOlxuICAgICAgICAgIGNhc2UgJ21vdW50aW5nJzpcbiAgICAgICAgICAgIHJldHVybiBcIlRhcmdldCBjb250YWluZXIgd2l0aCBcIi5jb25jYXQoY29udGFpbmVyLCBcIiBub3QgZXhpc3RlZCB3aGlsZSBcIikuY29uY2F0KGFwcE5hbWUsIFwiIFwiKS5jb25jYXQocGhhc2UsIFwiIVwiKTtcblxuICAgICAgICAgIGNhc2UgJ21vdW50ZWQnOlxuICAgICAgICAgICAgcmV0dXJuIFwiVGFyZ2V0IGNvbnRhaW5lciB3aXRoIFwiLmNvbmNhdChjb250YWluZXIsIFwiIG5vdCBleGlzdGVkIGFmdGVyIFwiKS5jb25jYXQoYXBwTmFtZSwgXCIgXCIpLmNvbmNhdChwaGFzZSwgXCIhXCIpO1xuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBcIlRhcmdldCBjb250YWluZXIgd2l0aCBcIi5jb25jYXQoY29udGFpbmVyLCBcIiBub3QgZXhpc3RlZCB3aGlsZSBcIikuY29uY2F0KGFwcE5hbWUsIFwiIHJlbmRlcmluZyFcIik7XG4gICAgICAgIH1cbiAgICAgIH0oKTtcblxuICAgICAgYXNzZXJ0RWxlbWVudEV4aXN0KGNvbnRhaW5lckVsZW1lbnQsIGVycm9yTXNnKTtcbiAgICB9XG5cbiAgICBpZiAoY29udGFpbmVyRWxlbWVudCAmJiAhY29udGFpbmVyRWxlbWVudC5jb250YWlucyhlbGVtZW50KSkge1xuICAgICAgLy8gY2xlYXIgdGhlIGNvbnRhaW5lclxuICAgICAgd2hpbGUgKGNvbnRhaW5lckVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICByYXdSZW1vdmVDaGlsZC5jYWxsKGNvbnRhaW5lckVsZW1lbnQsIGNvbnRhaW5lckVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICB9IC8vIGFwcGVuZCB0aGUgZWxlbWVudCB0byBjb250YWluZXIgaWYgaXQgZXhpc3RcblxuXG4gICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICByYXdBcHBlbmRDaGlsZC5jYWxsKGNvbnRhaW5lckVsZW1lbnQsIGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG5cbiAgcmV0dXJuIHJlbmRlcjtcbn1cblxuZnVuY3Rpb24gZ2V0TGlmZWN5Y2xlc0Zyb21FeHBvcnRzKHNjcmlwdEV4cG9ydHMsIGFwcE5hbWUsIGdsb2JhbCwgZ2xvYmFsTGF0ZXN0U2V0UHJvcCkge1xuICBpZiAodmFsaWRhdGVFeHBvcnRMaWZlY3ljbGUoc2NyaXB0RXhwb3J0cykpIHtcbiAgICByZXR1cm4gc2NyaXB0RXhwb3J0cztcbiAgfSAvLyBmYWxsYmFjayB0byBzYW5kYm94IGxhdGVzdCBzZXQgcHJvcGVydHkgaWYgaXQgaGFkXG5cblxuICBpZiAoZ2xvYmFsTGF0ZXN0U2V0UHJvcCkge1xuICAgIHZhciBsaWZlY3ljbGVzID0gZ2xvYmFsW2dsb2JhbExhdGVzdFNldFByb3BdO1xuXG4gICAgaWYgKHZhbGlkYXRlRXhwb3J0TGlmZWN5Y2xlKGxpZmVjeWNsZXMpKSB7XG4gICAgICByZXR1cm4gbGlmZWN5Y2xlcztcbiAgICB9XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICBjb25zb2xlLndhcm4oXCJbcWlhbmt1bl0gbGlmZWN5Y2xlIG5vdCBmb3VuZCBmcm9tIFwiLmNvbmNhdChhcHBOYW1lLCBcIiBlbnRyeSBleHBvcnRzLCBmYWxsYmFjayB0byBnZXQgZnJvbSB3aW5kb3dbJ1wiKS5jb25jYXQoYXBwTmFtZSwgXCInXVwiKSk7XG4gIH0gLy8gZmFsbGJhY2sgdG8gZ2xvYmFsIHZhcmlhYmxlIHdobyBuYW1lZCB3aXRoICR7YXBwTmFtZX0gd2hpbGUgbW9kdWxlIGV4cG9ydHMgbm90IGZvdW5kXG5cblxuICB2YXIgZ2xvYmFsVmFyaWFibGVFeHBvcnRzID0gZ2xvYmFsW2FwcE5hbWVdO1xuXG4gIGlmICh2YWxpZGF0ZUV4cG9ydExpZmVjeWNsZShnbG9iYWxWYXJpYWJsZUV4cG9ydHMpKSB7XG4gICAgcmV0dXJuIGdsb2JhbFZhcmlhYmxlRXhwb3J0cztcbiAgfVxuXG4gIHRocm93IG5ldyBRaWFua3VuRXJyb3IoXCJZb3UgbmVlZCB0byBleHBvcnQgbGlmZWN5Y2xlIGZ1bmN0aW9ucyBpbiBcIi5jb25jYXQoYXBwTmFtZSwgXCIgZW50cnlcIikpO1xufVxuXG52YXIgcHJldkFwcFVubW91bnRlZERlZmVycmVkO1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWRBcHAoYXBwKSB7XG4gIHZhciBjb25maWd1cmF0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB7fTtcbiAgdmFyIGxpZmVDeWNsZXMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IHVuZGVmaW5lZDtcblxuICB2YXIgX2E7XG5cbiAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMTcoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBlbnRyeSwgYXBwTmFtZSwgYXBwSW5zdGFuY2VJZCwgbWFya05hbWUsIF9jb25maWd1cmF0aW9uJHNpbmd1bCwgc2luZ3VsYXIsIF9jb25maWd1cmF0aW9uJHNhbmRibywgc2FuZGJveCwgZXhjbHVkZUFzc2V0RmlsdGVyLCBfY29uZmlndXJhdGlvbiRnbG9iYWwsIGdsb2JhbENvbnRleHQsIGltcG9ydEVudHJ5T3B0cywgX3lpZWxkJGltcG9ydEVudHJ5LCB0ZW1wbGF0ZSwgZXhlY1NjcmlwdHMsIGFzc2V0UHVibGljUGF0aCwgYXBwQ29udGVudCwgc3RyaWN0U3R5bGVJc29sYXRpb24sIHNjb3BlZENTUywgaW5pdGlhbEFwcFdyYXBwZXJFbGVtZW50LCBpbml0aWFsQ29udGFpbmVyLCBsZWdhY3lSZW5kZXIsIHJlbmRlciwgaW5pdGlhbEFwcFdyYXBwZXJHZXR0ZXIsIGdsb2JhbCwgbW91bnRTYW5kYm94LCB1bm1vdW50U2FuZGJveCwgdXNlTG9vc2VTYW5kYm94LCBzYW5kYm94Q29udGFpbmVyLCBfbWVyZ2VXaXRoLCBfbWVyZ2VXaXRoJGJlZm9yZVVubW8sIGJlZm9yZVVubW91bnQsIF9tZXJnZVdpdGgkYWZ0ZXJVbm1vdSwgYWZ0ZXJVbm1vdW50LCBfbWVyZ2VXaXRoJGFmdGVyTW91bnQsIGFmdGVyTW91bnQsIF9tZXJnZVdpdGgkYmVmb3JlTW91biwgYmVmb3JlTW91bnQsIF9tZXJnZVdpdGgkYmVmb3JlTG9hZCwgYmVmb3JlTG9hZCwgc2NyaXB0RXhwb3J0cywgX2dldExpZmVjeWNsZXNGcm9tRXhwLCBib290c3RyYXAsIG1vdW50LCB1bm1vdW50LCB1cGRhdGUsIF9nZXRNaWNyb0FwcFN0YXRlQWN0aSwgb25HbG9iYWxTdGF0ZUNoYW5nZSwgc2V0R2xvYmFsU3RhdGUsIG9mZkdsb2JhbFN0YXRlQ2hhbmdlLCBzeW5jQXBwV3JhcHBlckVsZW1lbnQyU2FuZGJveCwgcGFyY2VsQ29uZmlnR2V0dGVyO1xuXG4gICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMTckKF9jb250ZXh0MTcpIHtcbiAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgIHN3aXRjaCAoX2NvbnRleHQxNy5wcmV2ID0gX2NvbnRleHQxNy5uZXh0KSB7XG4gICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgZW50cnkgPSBhcHAuZW50cnksIGFwcE5hbWUgPSBhcHAubmFtZTtcbiAgICAgICAgICAgIGFwcEluc3RhbmNlSWQgPSBcIlwiLmNvbmNhdChhcHBOYW1lLCBcIl9cIikuY29uY2F0KCtuZXcgRGF0ZSgpLCBcIl9cIikuY29uY2F0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApKTtcbiAgICAgICAgICAgIG1hcmtOYW1lID0gXCJbcWlhbmt1bl0gQXBwIFwiLmNvbmNhdChhcHBJbnN0YW5jZUlkLCBcIiBMb2FkaW5nXCIpO1xuXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgICAgICAgICAgcGVyZm9ybWFuY2VNYXJrKG1hcmtOYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2NvbmZpZ3VyYXRpb24kc2luZ3VsID0gY29uZmlndXJhdGlvbi5zaW5ndWxhciwgc2luZ3VsYXIgPSBfY29uZmlndXJhdGlvbiRzaW5ndWwgPT09IHZvaWQgMCA/IGZhbHNlIDogX2NvbmZpZ3VyYXRpb24kc2luZ3VsLCBfY29uZmlndXJhdGlvbiRzYW5kYm8gPSBjb25maWd1cmF0aW9uLnNhbmRib3gsIHNhbmRib3ggPSBfY29uZmlndXJhdGlvbiRzYW5kYm8gPT09IHZvaWQgMCA/IHRydWUgOiBfY29uZmlndXJhdGlvbiRzYW5kYm8sIGV4Y2x1ZGVBc3NldEZpbHRlciA9IGNvbmZpZ3VyYXRpb24uZXhjbHVkZUFzc2V0RmlsdGVyLCBfY29uZmlndXJhdGlvbiRnbG9iYWwgPSBjb25maWd1cmF0aW9uLmdsb2JhbENvbnRleHQsIGdsb2JhbENvbnRleHQgPSBfY29uZmlndXJhdGlvbiRnbG9iYWwgPT09IHZvaWQgMCA/IHdpbmRvdyA6IF9jb25maWd1cmF0aW9uJGdsb2JhbCwgaW1wb3J0RW50cnlPcHRzID0gX19yZXN0KGNvbmZpZ3VyYXRpb24sIFtcInNpbmd1bGFyXCIsIFwic2FuZGJveFwiLCBcImV4Y2x1ZGVBc3NldEZpbHRlclwiLCBcImdsb2JhbENvbnRleHRcIl0pOyAvLyBnZXQgdGhlIGVudHJ5IGh0bWwgY29udGVudCBhbmQgc2NyaXB0IGV4ZWN1dG9yXG5cbiAgICAgICAgICAgIF9jb250ZXh0MTcubmV4dCA9IDc7XG4gICAgICAgICAgICByZXR1cm4gaW1wb3J0RW50cnkoZW50cnksIGltcG9ydEVudHJ5T3B0cyk7XG5cbiAgICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICBfeWllbGQkaW1wb3J0RW50cnkgPSBfY29udGV4dDE3LnNlbnQ7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IF95aWVsZCRpbXBvcnRFbnRyeS50ZW1wbGF0ZTtcbiAgICAgICAgICAgIGV4ZWNTY3JpcHRzID0gX3lpZWxkJGltcG9ydEVudHJ5LmV4ZWNTY3JpcHRzO1xuICAgICAgICAgICAgYXNzZXRQdWJsaWNQYXRoID0gX3lpZWxkJGltcG9ydEVudHJ5LmFzc2V0UHVibGljUGF0aDtcbiAgICAgICAgICAgIF9jb250ZXh0MTcubmV4dCA9IDEzO1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkYXRlU2luZ3VsYXJNb2RlKHNpbmd1bGFyLCBhcHApO1xuXG4gICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgIGlmICghX2NvbnRleHQxNy5zZW50KSB7XG4gICAgICAgICAgICAgIF9jb250ZXh0MTcubmV4dCA9IDE2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2NvbnRleHQxNy5uZXh0ID0gMTY7XG4gICAgICAgICAgICByZXR1cm4gcHJldkFwcFVubW91bnRlZERlZmVycmVkICYmIHByZXZBcHBVbm1vdW50ZWREZWZlcnJlZC5wcm9taXNlO1xuXG4gICAgICAgICAgY2FzZSAxNjpcbiAgICAgICAgICAgIGFwcENvbnRlbnQgPSBnZXREZWZhdWx0VHBsV3JhcHBlcihhcHBJbnN0YW5jZUlkLCBhcHBOYW1lKSh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICBzdHJpY3RTdHlsZUlzb2xhdGlvbiA9IF90eXBlb2Yoc2FuZGJveCkgPT09ICdvYmplY3QnICYmICEhc2FuZGJveC5zdHJpY3RTdHlsZUlzb2xhdGlvbjtcbiAgICAgICAgICAgIHNjb3BlZENTUyA9IGlzRW5hYmxlU2NvcGVkQ1NTKHNhbmRib3gpO1xuICAgICAgICAgICAgaW5pdGlhbEFwcFdyYXBwZXJFbGVtZW50ID0gY3JlYXRlRWxlbWVudChhcHBDb250ZW50LCBzdHJpY3RTdHlsZUlzb2xhdGlvbiwgc2NvcGVkQ1NTLCBhcHBOYW1lKTtcbiAgICAgICAgICAgIGluaXRpYWxDb250YWluZXIgPSAnY29udGFpbmVyJyBpbiBhcHAgPyBhcHAuY29udGFpbmVyIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgbGVnYWN5UmVuZGVyID0gJ3JlbmRlcicgaW4gYXBwID8gYXBwLnJlbmRlciA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJlbmRlciA9IGdldFJlbmRlcihhcHBOYW1lLCBhcHBDb250ZW50LCBsZWdhY3lSZW5kZXIpOyAvLyDnrKzkuIDmrKHliqDovb3orr7nva7lupTnlKjlj6/op4HljLrln58gZG9tIOe7k+aehFxuICAgICAgICAgICAgLy8g56Gu5L+d5q+P5qyh5bqU55So5Yqg6L295YmN5a655ZmoIGRvbSDnu5PmnoTlt7Lnu4/orr7nva7lrozmr5VcblxuICAgICAgICAgICAgcmVuZGVyKHtcbiAgICAgICAgICAgICAgZWxlbWVudDogaW5pdGlhbEFwcFdyYXBwZXJFbGVtZW50LFxuICAgICAgICAgICAgICBsb2FkaW5nOiB0cnVlLFxuICAgICAgICAgICAgICBjb250YWluZXI6IGluaXRpYWxDb250YWluZXJcbiAgICAgICAgICAgIH0sICdsb2FkaW5nJyk7XG4gICAgICAgICAgICBpbml0aWFsQXBwV3JhcHBlckdldHRlciA9IGdldEFwcFdyYXBwZXJHZXR0ZXIoYXBwTmFtZSwgYXBwSW5zdGFuY2VJZCwgISFsZWdhY3lSZW5kZXIsIHN0cmljdFN0eWxlSXNvbGF0aW9uLCBzY29wZWRDU1MsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGluaXRpYWxBcHBXcmFwcGVyRWxlbWVudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZ2xvYmFsID0gZ2xvYmFsQ29udGV4dDtcblxuICAgICAgICAgICAgbW91bnRTYW5kYm94ID0gZnVuY3Rpb24gbW91bnRTYW5kYm94KCkge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB1bm1vdW50U2FuZGJveCA9IGZ1bmN0aW9uIHVubW91bnRTYW5kYm94KCkge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB1c2VMb29zZVNhbmRib3ggPSBfdHlwZW9mKHNhbmRib3gpID09PSAnb2JqZWN0JyAmJiAhIXNhbmRib3gubG9vc2U7XG5cbiAgICAgICAgICAgIGlmIChzYW5kYm94KSB7XG4gICAgICAgICAgICAgIHNhbmRib3hDb250YWluZXIgPSBjcmVhdGVTYW5kYm94Q29udGFpbmVyKGFwcE5hbWUsIC8vIEZJWE1FIHNob3VsZCB1c2UgYSBzdHJpY3Qgc2FuZGJveCBsb2dpYyB3aGlsZSByZW1vdW50LCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3VtaWpzL3FpYW5rdW4vaXNzdWVzLzUxOFxuICAgICAgICAgICAgICBpbml0aWFsQXBwV3JhcHBlckdldHRlciwgc2NvcGVkQ1NTLCB1c2VMb29zZVNhbmRib3gsIGV4Y2x1ZGVBc3NldEZpbHRlciwgZ2xvYmFsKTsgLy8g55So5rKZ566x55qE5Luj55CG5a+56LGh5L2c5Li65o6l5LiL5p2l5L2/55So55qE5YWo5bGA5a+56LGhXG5cbiAgICAgICAgICAgICAgZ2xvYmFsID0gc2FuZGJveENvbnRhaW5lci5pbnN0YW5jZS5wcm94eTtcbiAgICAgICAgICAgICAgbW91bnRTYW5kYm94ID0gc2FuZGJveENvbnRhaW5lci5tb3VudDtcbiAgICAgICAgICAgICAgdW5tb3VudFNhbmRib3ggPSBzYW5kYm94Q29udGFpbmVyLnVubW91bnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9tZXJnZVdpdGggPSBfbWVyZ2VXaXRoMih7fSwgZ2V0QWRkT25zKGdsb2JhbCwgYXNzZXRQdWJsaWNQYXRoKSwgbGlmZUN5Y2xlcywgZnVuY3Rpb24gKHYxLCB2Mikge1xuICAgICAgICAgICAgICByZXR1cm4gX2NvbmNhdCh2MSAhPT0gbnVsbCAmJiB2MSAhPT0gdm9pZCAwID8gdjEgOiBbXSwgdjIgIT09IG51bGwgJiYgdjIgIT09IHZvaWQgMCA/IHYyIDogW10pO1xuICAgICAgICAgICAgfSksIF9tZXJnZVdpdGgkYmVmb3JlVW5tbyA9IF9tZXJnZVdpdGguYmVmb3JlVW5tb3VudCwgYmVmb3JlVW5tb3VudCA9IF9tZXJnZVdpdGgkYmVmb3JlVW5tbyA9PT0gdm9pZCAwID8gW10gOiBfbWVyZ2VXaXRoJGJlZm9yZVVubW8sIF9tZXJnZVdpdGgkYWZ0ZXJVbm1vdSA9IF9tZXJnZVdpdGguYWZ0ZXJVbm1vdW50LCBhZnRlclVubW91bnQgPSBfbWVyZ2VXaXRoJGFmdGVyVW5tb3UgPT09IHZvaWQgMCA/IFtdIDogX21lcmdlV2l0aCRhZnRlclVubW91LCBfbWVyZ2VXaXRoJGFmdGVyTW91bnQgPSBfbWVyZ2VXaXRoLmFmdGVyTW91bnQsIGFmdGVyTW91bnQgPSBfbWVyZ2VXaXRoJGFmdGVyTW91bnQgPT09IHZvaWQgMCA/IFtdIDogX21lcmdlV2l0aCRhZnRlck1vdW50LCBfbWVyZ2VXaXRoJGJlZm9yZU1vdW4gPSBfbWVyZ2VXaXRoLmJlZm9yZU1vdW50LCBiZWZvcmVNb3VudCA9IF9tZXJnZVdpdGgkYmVmb3JlTW91biA9PT0gdm9pZCAwID8gW10gOiBfbWVyZ2VXaXRoJGJlZm9yZU1vdW4sIF9tZXJnZVdpdGgkYmVmb3JlTG9hZCA9IF9tZXJnZVdpdGguYmVmb3JlTG9hZCwgYmVmb3JlTG9hZCA9IF9tZXJnZVdpdGgkYmVmb3JlTG9hZCA9PT0gdm9pZCAwID8gW10gOiBfbWVyZ2VXaXRoJGJlZm9yZUxvYWQ7XG4gICAgICAgICAgICBfY29udGV4dDE3Lm5leHQgPSAzMztcbiAgICAgICAgICAgIHJldHVybiBleGVjSG9va3NDaGFpbih0b0FycmF5KGJlZm9yZUxvYWQpLCBhcHAsIGdsb2JhbCk7XG5cbiAgICAgICAgICBjYXNlIDMzOlxuICAgICAgICAgICAgX2NvbnRleHQxNy5uZXh0ID0gMzU7XG4gICAgICAgICAgICByZXR1cm4gZXhlY1NjcmlwdHMoZ2xvYmFsLCBzYW5kYm94ICYmICF1c2VMb29zZVNhbmRib3gpO1xuXG4gICAgICAgICAgY2FzZSAzNTpcbiAgICAgICAgICAgIHNjcmlwdEV4cG9ydHMgPSBfY29udGV4dDE3LnNlbnQ7XG4gICAgICAgICAgICBfZ2V0TGlmZWN5Y2xlc0Zyb21FeHAgPSBnZXRMaWZlY3ljbGVzRnJvbUV4cG9ydHMoc2NyaXB0RXhwb3J0cywgYXBwTmFtZSwgZ2xvYmFsLCAoX2EgPSBzYW5kYm94Q29udGFpbmVyID09PSBudWxsIHx8IHNhbmRib3hDb250YWluZXIgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHNhbmRib3hDb250YWluZXIuaW5zdGFuY2UpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sYXRlc3RTZXRQcm9wKSwgYm9vdHN0cmFwID0gX2dldExpZmVjeWNsZXNGcm9tRXhwLmJvb3RzdHJhcCwgbW91bnQgPSBfZ2V0TGlmZWN5Y2xlc0Zyb21FeHAubW91bnQsIHVubW91bnQgPSBfZ2V0TGlmZWN5Y2xlc0Zyb21FeHAudW5tb3VudCwgdXBkYXRlID0gX2dldExpZmVjeWNsZXNGcm9tRXhwLnVwZGF0ZTtcbiAgICAgICAgICAgIF9nZXRNaWNyb0FwcFN0YXRlQWN0aSA9IGdldE1pY3JvQXBwU3RhdGVBY3Rpb25zKGFwcEluc3RhbmNlSWQpLCBvbkdsb2JhbFN0YXRlQ2hhbmdlID0gX2dldE1pY3JvQXBwU3RhdGVBY3RpLm9uR2xvYmFsU3RhdGVDaGFuZ2UsIHNldEdsb2JhbFN0YXRlID0gX2dldE1pY3JvQXBwU3RhdGVBY3RpLnNldEdsb2JhbFN0YXRlLCBvZmZHbG9iYWxTdGF0ZUNoYW5nZSA9IF9nZXRNaWNyb0FwcFN0YXRlQWN0aS5vZmZHbG9iYWxTdGF0ZUNoYW5nZTsgLy8gRklYTUUgdGVtcG9yYXJ5IHdheVxuXG4gICAgICAgICAgICBzeW5jQXBwV3JhcHBlckVsZW1lbnQyU2FuZGJveCA9IGZ1bmN0aW9uIHN5bmNBcHBXcmFwcGVyRWxlbWVudDJTYW5kYm94KGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGluaXRpYWxBcHBXcmFwcGVyRWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBwYXJjZWxDb25maWdHZXR0ZXIgPSBmdW5jdGlvbiBwYXJjZWxDb25maWdHZXR0ZXIoKSB7XG4gICAgICAgICAgICAgIHZhciByZW1vdW50Q29udGFpbmVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBpbml0aWFsQ29udGFpbmVyO1xuICAgICAgICAgICAgICB2YXIgYXBwV3JhcHBlckVsZW1lbnQ7XG4gICAgICAgICAgICAgIHZhciBhcHBXcmFwcGVyR2V0dGVyO1xuICAgICAgICAgICAgICB2YXIgcGFyY2VsQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGFwcEluc3RhbmNlSWQsXG4gICAgICAgICAgICAgICAgYm9vdHN0cmFwOiBib290c3RyYXAsXG4gICAgICAgICAgICAgICAgbW91bnQ6IFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcmtzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUyJChfY29udGV4dDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDIucHJldiA9IF9jb250ZXh0Mi5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtzID0gcGVyZm9ybWFuY2VHZXRFbnRyaWVzQnlOYW1lKG1hcmtOYW1lLCAnbWFyaycpOyAvLyBtYXJrIGxlbmd0aCBpcyB6ZXJvIG1lYW5zIHRoZSBhcHAgaXMgcmVtb3VudGluZ1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWFya3MgJiYgIW1hcmtzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZXJmb3JtYW5jZU1hcmsobWFya05hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIF9jYWxsZWUyKTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMygpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMyQoX2NvbnRleHQzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQzLnByZXYgPSBfY29udGV4dDMubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLm5leHQgPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxpZGF0ZVNpbmd1bGFyTW9kZShzaW5ndWxhciwgYXBwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLnQwID0gX2NvbnRleHQzLnNlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9jb250ZXh0My50MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLm5leHQgPSA1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLnQwID0gcHJldkFwcFVubW91bnRlZERlZmVycmVkO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9jb250ZXh0My50MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLm5leHQgPSA3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0My5hYnJ1cHQoXCJyZXR1cm5cIiwgcHJldkFwcFVubW91bnRlZERlZmVycmVkLnByb21pc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQzLmFicnVwdChcInJldHVyblwiLCB1bmRlZmluZWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDMuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTMpO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0sIC8vIGluaXRpYWwgd3JhcHBlciBlbGVtZW50IGJlZm9yZSBhcHAgbW91bnQvcmVtb3VudFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWU0KCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWU0JChfY29udGV4dDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDQucHJldiA9IF9jb250ZXh0NC5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBXcmFwcGVyRWxlbWVudCA9IGluaXRpYWxBcHBXcmFwcGVyRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBXcmFwcGVyR2V0dGVyID0gZ2V0QXBwV3JhcHBlckdldHRlcihhcHBOYW1lLCBhcHBJbnN0YW5jZUlkLCAhIWxlZ2FjeVJlbmRlciwgc3RyaWN0U3R5bGVJc29sYXRpb24sIHNjb3BlZENTUywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwcFdyYXBwZXJFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDQuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTQpO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0sIC8vIOa3u+WKoCBtb3VudCBob29rLCDnoa7kv53mr4/mrKHlupTnlKjliqDovb3liY3lrrnlmaggZG9tIOe7k+aehOW3sue7j+iuvue9ruWujOavlVxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWU1KCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXNlTmV3Q29udGFpbmVyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWU1JChfY29udGV4dDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDUucHJldiA9IF9jb250ZXh0NS5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VOZXdDb250YWluZXIgPSByZW1vdW50Q29udGFpbmVyICE9PSBpbml0aWFsQ29udGFpbmVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZU5ld0NvbnRhaW5lciB8fCAhYXBwV3JhcHBlckVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgd2lsbCBiZSBkZXN0cm95ZWQgYWZ0ZXIgdW5tb3VudGVkLCB3ZSBuZWVkIHRvIHJlY3JlYXRlIGl0IGlmIGl0IG5vdCBleGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3Igd2UgdHJ5IHRvIHJlbW91bnQgaW50byBhIG5ldyBjb250YWluZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcFdyYXBwZXJFbGVtZW50ID0gY3JlYXRlRWxlbWVudChhcHBDb250ZW50LCBzdHJpY3RTdHlsZUlzb2xhdGlvbiwgc2NvcGVkQ1NTLCBhcHBOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5bmNBcHBXcmFwcGVyRWxlbWVudDJTYW5kYm94KGFwcFdyYXBwZXJFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogYXBwV3JhcHBlckVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiByZW1vdW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgJ21vdW50aW5nJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0NS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBfY2FsbGVlNSk7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSwgbW91bnRTYW5kYm94LCAvLyBleGVjIHRoZSBjaGFpbiBhZnRlciByZW5kZXJpbmcgdG8ga2VlcCB0aGUgYmVoYXZpb3Igd2l0aCBiZWZvcmVMb2FkXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTYoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTYkKF9jb250ZXh0Nikge1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0Ni5wcmV2ID0gX2NvbnRleHQ2Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDYuYWJydXB0KFwicmV0dXJuXCIsIGV4ZWNIb29rc0NoYWluKHRvQXJyYXkoYmVmb3JlTW91bnQpLCBhcHAsIGdsb2JhbCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDYuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTYpO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChwcm9wcykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTcoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTckKF9jb250ZXh0Nykge1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0Ny5wcmV2ID0gX2NvbnRleHQ3Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDcuYWJydXB0KFwicmV0dXJuXCIsIG1vdW50KE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgcHJvcHMpLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6IGFwcFdyYXBwZXJHZXR0ZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEdsb2JhbFN0YXRlOiBzZXRHbG9iYWxTdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uR2xvYmFsU3RhdGVDaGFuZ2U6IG9uR2xvYmFsU3RhdGVDaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDcuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTcpO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0sIC8vIGZpbmlzaCBsb2FkaW5nIGFmdGVyIGFwcCBtb3VudGVkXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTgoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTgkKF9jb250ZXh0OCkge1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0OC5wcmV2ID0gX2NvbnRleHQ4Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDguYWJydXB0KFwicmV0dXJuXCIsIHJlbmRlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBhcHBXcmFwcGVyRWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiByZW1vdW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgJ21vdW50ZWQnKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0OC5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBfY2FsbGVlOCk7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTkoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTkkKF9jb250ZXh0OSkge1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0OS5wcmV2ID0gX2NvbnRleHQ5Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDkuYWJydXB0KFwicmV0dXJuXCIsIGV4ZWNIb29rc0NoYWluKHRvQXJyYXkoYWZ0ZXJNb3VudCksIGFwcCwgZ2xvYmFsKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0OS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBfY2FsbGVlOSk7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSwgLy8gaW5pdGlhbGl6ZSB0aGUgdW5tb3VudCBkZWZlciBhZnRlciBhcHAgbW91bnRlZCBhbmQgcmVzb2x2ZSB0aGUgZGVmZXIgYWZ0ZXIgaXQgdW5tb3VudGVkXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTEwKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUxMCQoX2NvbnRleHQxMCkge1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0MTAucHJldiA9IF9jb250ZXh0MTAubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQxMC5uZXh0ID0gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsaWRhdGVTaW5ndWxhck1vZGUoc2luZ3VsYXIsIGFwcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2NvbnRleHQxMC5zZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29udGV4dDEwLm5leHQgPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldkFwcFVubW91bnRlZERlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0MTAuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTEwKTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMTEoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtZWFzdXJlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMTEkKF9jb250ZXh0MTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDExLnByZXYgPSBfY29udGV4dDExLm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVhc3VyZU5hbWUgPSBcIltxaWFua3VuXSBBcHAgXCIuY29uY2F0KGFwcEluc3RhbmNlSWQsIFwiIExvYWRpbmcgQ29uc3VtaW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVyZm9ybWFuY2VNZWFzdXJlKG1lYXN1cmVOYW1lLCBtYXJrTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDExLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIF9jYWxsZWUxMSk7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgdW5tb3VudDogW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWUxMigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMTIkKF9jb250ZXh0MTIpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDEyLnByZXYgPSBfY29udGV4dDEyLm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDEyLmFicnVwdChcInJldHVyblwiLCBleGVjSG9va3NDaGFpbih0b0FycmF5KGJlZm9yZVVubW91bnQpLCBhcHAsIGdsb2JhbCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDEyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIF9jYWxsZWUxMik7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMTMoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTEzJChfY29udGV4dDEzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQxMy5wcmV2ID0gX2NvbnRleHQxMy5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQxMy5hYnJ1cHQoXCJyZXR1cm5cIiwgdW5tb3VudChPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHByb3BzKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiBhcHBXcmFwcGVyR2V0dGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDEzLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIF9jYWxsZWUxMyk7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSwgdW5tb3VudFNhbmRib3gsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWUxNCgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlMTQkKF9jb250ZXh0MTQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDE0LnByZXYgPSBfY29udGV4dDE0Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDE0LmFicnVwdChcInJldHVyblwiLCBleGVjSG9va3NDaGFpbih0b0FycmF5KGFmdGVyVW5tb3VudCksIGFwcCwgZ2xvYmFsKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0MTQuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTE0KTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMTUoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTE1JChfY29udGV4dDE1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQxNS5wcmV2ID0gX2NvbnRleHQxNS5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiByZW1vdW50Q29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgJ3VubW91bnRlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZkdsb2JhbFN0YXRlQ2hhbmdlKGFwcEluc3RhbmNlSWQpOyAvLyBmb3IgZ2NcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcFdyYXBwZXJFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeW5jQXBwV3JhcHBlckVsZW1lbnQyU2FuZGJveChhcHBXcmFwcGVyRWxlbWVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0MTUuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTE1KTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKF90aGlzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMTYoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTE2JChfY29udGV4dDE2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQxNi5wcmV2ID0gX2NvbnRleHQxNi5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29udGV4dDE2Lm5leHQgPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxpZGF0ZVNpbmd1bGFyTW9kZShzaW5ndWxhciwgYXBwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQxNi50MCA9IF9jb250ZXh0MTYuc2VudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2NvbnRleHQxNi50MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQxNi5uZXh0ID0gNTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb250ZXh0MTYudDAgPSBwcmV2QXBwVW5tb3VudGVkRGVmZXJyZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2NvbnRleHQxNi50MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnRleHQxNi5uZXh0ID0gNztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZBcHBVbm1vdW50ZWREZWZlcnJlZC5yZXNvbHZlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0MTYuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgX2NhbGxlZTE2KTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcGFyY2VsQ29uZmlnLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiBwYXJjZWxDb25maWc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gX2NvbnRleHQxNy5hYnJ1cHQoXCJyZXR1cm5cIiwgcGFyY2VsQ29uZmlnR2V0dGVyKTtcblxuICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0MTcuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSwgX2NhbGxlZTE3KTtcbiAgfSkpO1xufSIsImltcG9ydCBfaXNGdW5jdGlvbiBmcm9tIFwibG9kYXNoL2lzRnVuY3Rpb25cIjtcbmltcG9ydCBfcmVnZW5lcmF0b3JSdW50aW1lIGZyb20gXCJAYmFiZWwvcnVudGltZS9yZWdlbmVyYXRvclwiO1xuXG4vKipcbiAqIEBhdXRob3IgS3VpdG9zXG4gKiBAc2luY2UgMjAxOS0wMi0yNlxuICovXG5pbXBvcnQgeyBfX2F3YWl0ZXIgfSBmcm9tIFwidHNsaWJcIjtcbmltcG9ydCB7IGltcG9ydEVudHJ5IH0gZnJvbSAnaW1wb3J0LWh0bWwtZW50cnknO1xuaW1wb3J0IHsgZ2V0QXBwU3RhdHVzLCBnZXRNb3VudGVkQXBwcywgTk9UX0xPQURFRCB9IGZyb20gJ3NpbmdsZS1zcGEnOyAvLyBSSUMgYW5kIHNoaW0gZm9yIGJyb3dzZXJzIHNldFRpbWVvdXQoKSB3aXRob3V0IGl0XG5cbnZhciByZXF1ZXN0SWRsZUNhbGxiYWNrID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgZnVuY3Rpb24gcmVxdWVzdElkbGVDYWxsYmFjayhjYikge1xuICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpO1xuICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgY2Ioe1xuICAgICAgZGlkVGltZW91dDogZmFsc2UsXG4gICAgICB0aW1lUmVtYWluaW5nOiBmdW5jdGlvbiB0aW1lUmVtYWluaW5nKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgNTAgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sIDEpO1xufTtcblxudmFyIGlzU2xvd05ldHdvcmsgPSBuYXZpZ2F0b3IuY29ubmVjdGlvbiA/IG5hdmlnYXRvci5jb25uZWN0aW9uLnNhdmVEYXRhIHx8IG5hdmlnYXRvci5jb25uZWN0aW9uLnR5cGUgIT09ICd3aWZpJyAmJiBuYXZpZ2F0b3IuY29ubmVjdGlvbi50eXBlICE9PSAnZXRoZXJuZXQnICYmIC8oWzIzXSlnLy50ZXN0KG5hdmlnYXRvci5jb25uZWN0aW9uLmVmZmVjdGl2ZVR5cGUpIDogZmFsc2U7XG4vKipcbiAqIHByZWZldGNoIGFzc2V0cywgZG8gbm90aGluZyB3aGlsZSBpbiBtb2JpbGUgbmV0d29ya1xuICogQHBhcmFtIGVudHJ5XG4gKiBAcGFyYW0gb3B0c1xuICovXG5cbmZ1bmN0aW9uIHByZWZldGNoKGVudHJ5LCBvcHRzKSB7XG4gIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgaWYgKCFuYXZpZ2F0b3Iub25MaW5lIHx8IGlzU2xvd05ldHdvcmspIHtcbiAgICAvLyBEb24ndCBwcmVmZXRjaCBpZiBpbiBhIHNsb3cgbmV0d29yayBvciBvZmZsaW5lXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZSgpIHtcbiAgICAgIHZhciBfeWllbGQkaW1wb3J0RW50cnksIGdldEV4dGVybmFsU2NyaXB0cywgZ2V0RXh0ZXJuYWxTdHlsZVNoZWV0cztcblxuICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlJChfY29udGV4dCkge1xuICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQucHJldiA9IF9jb250ZXh0Lm5leHQpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgX2NvbnRleHQubmV4dCA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiBpbXBvcnRFbnRyeShlbnRyeSwgb3B0cyk7XG5cbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgX3lpZWxkJGltcG9ydEVudHJ5ID0gX2NvbnRleHQuc2VudDtcbiAgICAgICAgICAgICAgZ2V0RXh0ZXJuYWxTY3JpcHRzID0gX3lpZWxkJGltcG9ydEVudHJ5LmdldEV4dGVybmFsU2NyaXB0cztcbiAgICAgICAgICAgICAgZ2V0RXh0ZXJuYWxTdHlsZVNoZWV0cyA9IF95aWVsZCRpbXBvcnRFbnRyeS5nZXRFeHRlcm5hbFN0eWxlU2hlZXRzO1xuICAgICAgICAgICAgICByZXF1ZXN0SWRsZUNhbGxiYWNrKGdldEV4dGVybmFsU3R5bGVTaGVldHMpO1xuICAgICAgICAgICAgICByZXF1ZXN0SWRsZUNhbGxiYWNrKGdldEV4dGVybmFsU2NyaXB0cyk7XG5cbiAgICAgICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0LnN0b3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIF9jYWxsZWUpO1xuICAgIH0pKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHByZWZldGNoQWZ0ZXJGaXJzdE1vdW50ZWQoYXBwcywgb3B0cykge1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2luZ2xlLXNwYTpmaXJzdC1tb3VudCcsIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgIHZhciBub3RMb2FkZWRBcHBzID0gYXBwcy5maWx0ZXIoZnVuY3Rpb24gKGFwcCkge1xuICAgICAgcmV0dXJuIGdldEFwcFN0YXR1cyhhcHAubmFtZSkgPT09IE5PVF9MT0FERUQ7XG4gICAgfSk7XG5cbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAgIHZhciBtb3VudGVkQXBwcyA9IGdldE1vdW50ZWRBcHBzKCk7XG4gICAgICBjb25zb2xlLmxvZyhcIltxaWFua3VuXSBwcmVmZXRjaCBzdGFydGluZyBhZnRlciBcIi5jb25jYXQobW91bnRlZEFwcHMsIFwiIG1vdW50ZWQuLi5cIiksIG5vdExvYWRlZEFwcHMpO1xuICAgIH1cblxuICAgIG5vdExvYWRlZEFwcHMuZm9yRWFjaChmdW5jdGlvbiAoX3JlZikge1xuICAgICAgdmFyIGVudHJ5ID0gX3JlZi5lbnRyeTtcbiAgICAgIHJldHVybiBwcmVmZXRjaChlbnRyeSwgb3B0cyk7XG4gICAgfSk7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3NpbmdsZS1zcGE6Zmlyc3QtbW91bnQnLCBsaXN0ZW5lcik7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlZmV0Y2hJbW1lZGlhdGVseShhcHBzLCBvcHRzKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgIGNvbnNvbGUubG9nKCdbcWlhbmt1bl0gcHJlZmV0Y2ggc3RhcnRpbmcgZm9yIGFwcHMuLi4nLCBhcHBzKTtcbiAgfVxuXG4gIGFwcHMuZm9yRWFjaChmdW5jdGlvbiAoX3JlZjIpIHtcbiAgICB2YXIgZW50cnkgPSBfcmVmMi5lbnRyeTtcbiAgICByZXR1cm4gcHJlZmV0Y2goZW50cnksIG9wdHMpO1xuICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBkb1ByZWZldGNoU3RyYXRlZ3koYXBwcywgcHJlZmV0Y2hTdHJhdGVneSwgaW1wb3J0RW50cnlPcHRzKSB7XG4gIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gIHZhciBhcHBzTmFtZTJBcHBzID0gZnVuY3Rpb24gYXBwc05hbWUyQXBwcyhuYW1lcykge1xuICAgIHJldHVybiBhcHBzLmZpbHRlcihmdW5jdGlvbiAoYXBwKSB7XG4gICAgICByZXR1cm4gbmFtZXMuaW5jbHVkZXMoYXBwLm5hbWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHByZWZldGNoU3RyYXRlZ3kpKSB7XG4gICAgcHJlZmV0Y2hBZnRlckZpcnN0TW91bnRlZChhcHBzTmFtZTJBcHBzKHByZWZldGNoU3RyYXRlZ3kpLCBpbXBvcnRFbnRyeU9wdHMpO1xuICB9IGVsc2UgaWYgKF9pc0Z1bmN0aW9uKHByZWZldGNoU3RyYXRlZ3kpKSB7XG4gICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMyLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMigpIHtcbiAgICAgICAgdmFyIF95aWVsZCRwcmVmZXRjaFN0cmF0ZSwgX3lpZWxkJHByZWZldGNoU3RyYXRlMiwgY3JpdGljYWxBcHBOYW1lcywgX3lpZWxkJHByZWZldGNoU3RyYXRlMywgbWlub3JBcHBzTmFtZTtcblxuICAgICAgICByZXR1cm4gX3JlZ2VuZXJhdG9yUnVudGltZS53cmFwKGZ1bmN0aW9uIF9jYWxsZWUyJChfY29udGV4dDIpIHtcbiAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDIucHJldiA9IF9jb250ZXh0Mi5uZXh0KSB7XG4gICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBfY29udGV4dDIubmV4dCA9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWZldGNoU3RyYXRlZ3koYXBwcyk7XG5cbiAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIF95aWVsZCRwcmVmZXRjaFN0cmF0ZSA9IF9jb250ZXh0Mi5zZW50O1xuICAgICAgICAgICAgICAgIF95aWVsZCRwcmVmZXRjaFN0cmF0ZTIgPSBfeWllbGQkcHJlZmV0Y2hTdHJhdGUuY3JpdGljYWxBcHBOYW1lcztcbiAgICAgICAgICAgICAgICBjcml0aWNhbEFwcE5hbWVzID0gX3lpZWxkJHByZWZldGNoU3RyYXRlMiA9PT0gdm9pZCAwID8gW10gOiBfeWllbGQkcHJlZmV0Y2hTdHJhdGUyO1xuICAgICAgICAgICAgICAgIF95aWVsZCRwcmVmZXRjaFN0cmF0ZTMgPSBfeWllbGQkcHJlZmV0Y2hTdHJhdGUubWlub3JBcHBzTmFtZTtcbiAgICAgICAgICAgICAgICBtaW5vckFwcHNOYW1lID0gX3lpZWxkJHByZWZldGNoU3RyYXRlMyA9PT0gdm9pZCAwID8gW10gOiBfeWllbGQkcHJlZmV0Y2hTdHJhdGUzO1xuICAgICAgICAgICAgICAgIHByZWZldGNoSW1tZWRpYXRlbHkoYXBwc05hbWUyQXBwcyhjcml0aWNhbEFwcE5hbWVzKSwgaW1wb3J0RW50cnlPcHRzKTtcbiAgICAgICAgICAgICAgICBwcmVmZXRjaEFmdGVyRmlyc3RNb3VudGVkKGFwcHNOYW1lMkFwcHMobWlub3JBcHBzTmFtZSksIGltcG9ydEVudHJ5T3B0cyk7XG5cbiAgICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0Mi5zdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LCBfY2FsbGVlMik7XG4gICAgICB9KSk7XG4gICAgfSkoKTtcbiAgfSBlbHNlIHtcbiAgICBzd2l0Y2ggKHByZWZldGNoU3RyYXRlZ3kpIHtcbiAgICAgIGNhc2UgdHJ1ZTpcbiAgICAgICAgcHJlZmV0Y2hBZnRlckZpcnN0TW91bnRlZChhcHBzLCBpbXBvcnRFbnRyeU9wdHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgcHJlZmV0Y2hJbW1lZGlhdGVseShhcHBzLCBpbXBvcnRFbnRyeU9wdHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59IiwiaW1wb3J0IF9yZWdlbmVyYXRvclJ1bnRpbWUgZnJvbSBcIkBiYWJlbC9ydW50aW1lL3JlZ2VuZXJhdG9yXCI7XG5pbXBvcnQgX25vb3AgZnJvbSBcImxvZGFzaC9ub29wXCI7XG5pbXBvcnQgX3RvQ29uc3VtYWJsZUFycmF5IGZyb20gXCJAYmFiZWwvcnVudGltZS9oZWxwZXJzL2VzbS90b0NvbnN1bWFibGVBcnJheVwiO1xuaW1wb3J0IF90eXBlb2YgZnJvbSBcIkBiYWJlbC9ydW50aW1lL2hlbHBlcnMvZXNtL3R5cGVvZlwiO1xuaW1wb3J0IHsgX19hd2FpdGVyLCBfX3Jlc3QgfSBmcm9tIFwidHNsaWJcIjtcbmltcG9ydCB7IG1vdW50Um9vdFBhcmNlbCwgcmVnaXN0ZXJBcHBsaWNhdGlvbiwgc3RhcnQgYXMgc3RhcnRTaW5nbGVTcGEgfSBmcm9tICdzaW5nbGUtc3BhJztcbmltcG9ydCB7IGxvYWRBcHAgfSBmcm9tICcuL2xvYWRlcic7XG5pbXBvcnQgeyBkb1ByZWZldGNoU3RyYXRlZ3kgfSBmcm9tICcuL3ByZWZldGNoJztcbmltcG9ydCB7IERlZmVycmVkLCBnZXRDb250YWluZXJYUGF0aCwgdG9BcnJheSB9IGZyb20gJy4vdXRpbHMnO1xudmFyIG1pY3JvQXBwcyA9IFtdO1xuZXhwb3J0IHZhciBmcmFtZXdvcmtDb25maWd1cmF0aW9uID0ge307XG52YXIgc3RhcnRlZCA9IGZhbHNlO1xudmFyIGRlZmF1bHRVcmxSZXJvdXRlT25seSA9IHRydWU7XG52YXIgZnJhbWV3b3JrU3RhcnRlZERlZmVyID0gbmV3IERlZmVycmVkKCk7XG5cbnZhciBhdXRvRG93bmdyYWRlRm9yTG93VmVyc2lvbkJyb3dzZXIgPSBmdW5jdGlvbiBhdXRvRG93bmdyYWRlRm9yTG93VmVyc2lvbkJyb3dzZXIoY29uZmlndXJhdGlvbikge1xuICB2YXIgc2FuZGJveCA9IGNvbmZpZ3VyYXRpb24uc2FuZGJveCxcbiAgICAgIHNpbmd1bGFyID0gY29uZmlndXJhdGlvbi5zaW5ndWxhcjtcblxuICBpZiAoc2FuZGJveCkge1xuICAgIGlmICghd2luZG93LlByb3h5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1txaWFua3VuXSBNaXNzIHdpbmRvdy5Qcm94eSwgcHJveHlTYW5kYm94IHdpbGwgZGVnZW5lcmF0ZSBpbnRvIHNuYXBzaG90U2FuZGJveCcpO1xuXG4gICAgICBpZiAoc2luZ3VsYXIgPT09IGZhbHNlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignW3FpYW5rdW5dIFNldHRpbmcgc2luZ3VsYXIgYXMgZmFsc2UgbWF5IGNhdXNlIHVuZXhwZWN0ZWQgYmVoYXZpb3Igd2hpbGUgeW91ciBicm93c2VyIG5vdCBzdXBwb3J0IHdpbmRvdy5Qcm94eScpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBjb25maWd1cmF0aW9uKSwge1xuICAgICAgICBzYW5kYm94OiBfdHlwZW9mKHNhbmRib3gpID09PSAnb2JqZWN0JyA/IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgc2FuZGJveCksIHtcbiAgICAgICAgICBsb29zZTogdHJ1ZVxuICAgICAgICB9KSA6IHtcbiAgICAgICAgICBsb29zZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlndXJhdGlvbjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1pY3JvQXBwcyhhcHBzLCBsaWZlQ3ljbGVzKSB7XG4gIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgLy8gRWFjaCBhcHAgb25seSBuZWVkcyB0byBiZSByZWdpc3RlcmVkIG9uY2VcbiAgdmFyIHVucmVnaXN0ZXJlZEFwcHMgPSBhcHBzLmZpbHRlcihmdW5jdGlvbiAoYXBwKSB7XG4gICAgcmV0dXJuICFtaWNyb0FwcHMuc29tZShmdW5jdGlvbiAocmVnaXN0ZXJlZEFwcCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyZWRBcHAubmFtZSA9PT0gYXBwLm5hbWU7XG4gICAgfSk7XG4gIH0pO1xuICBtaWNyb0FwcHMgPSBbXS5jb25jYXQoX3RvQ29uc3VtYWJsZUFycmF5KG1pY3JvQXBwcyksIF90b0NvbnN1bWFibGVBcnJheSh1bnJlZ2lzdGVyZWRBcHBzKSk7XG4gIHVucmVnaXN0ZXJlZEFwcHMuZm9yRWFjaChmdW5jdGlvbiAoYXBwKSB7XG4gICAgdmFyIG5hbWUgPSBhcHAubmFtZSxcbiAgICAgICAgYWN0aXZlUnVsZSA9IGFwcC5hY3RpdmVSdWxlLFxuICAgICAgICBfYXBwJGxvYWRlciA9IGFwcC5sb2FkZXIsXG4gICAgICAgIGxvYWRlciA9IF9hcHAkbG9hZGVyID09PSB2b2lkIDAgPyBfbm9vcCA6IF9hcHAkbG9hZGVyLFxuICAgICAgICBwcm9wcyA9IGFwcC5wcm9wcyxcbiAgICAgICAgYXBwQ29uZmlnID0gX19yZXN0KGFwcCwgW1wibmFtZVwiLCBcImFjdGl2ZVJ1bGVcIiwgXCJsb2FkZXJcIiwgXCJwcm9wc1wiXSk7XG5cbiAgICByZWdpc3RlckFwcGxpY2F0aW9uKHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBhcHA6IGZ1bmN0aW9uIGFwcCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpcywgdm9pZCAwLCB2b2lkIDAsIC8qI19fUFVSRV9fKi9fcmVnZW5lcmF0b3JSdW50aW1lLm1hcmsoZnVuY3Rpb24gX2NhbGxlZTMoKSB7XG4gICAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgICB2YXIgX2EsIG1vdW50LCBvdGhlck1pY3JvQXBwQ29uZmlncztcblxuICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTMkKF9jb250ZXh0Mykge1xuICAgICAgICAgICAgd2hpbGUgKDEpIHtcbiAgICAgICAgICAgICAgc3dpdGNoIChfY29udGV4dDMucHJldiA9IF9jb250ZXh0My5uZXh0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgbG9hZGVyKHRydWUpO1xuICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLm5leHQgPSAzO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZyYW1ld29ya1N0YXJ0ZWREZWZlci5wcm9taXNlO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgX2NvbnRleHQzLm5leHQgPSA1O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRBcHAoT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHByb3BzOiBwcm9wc1xuICAgICAgICAgICAgICAgICAgfSwgYXBwQ29uZmlnKSwgZnJhbWV3b3JrQ29uZmlndXJhdGlvbiwgbGlmZUN5Y2xlcyk7XG5cbiAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICBfY29udGV4dDMudDAgPSBfY29udGV4dDMuc2VudDtcbiAgICAgICAgICAgICAgICAgIF9hID0gKDAsIF9jb250ZXh0My50MCkoKTtcbiAgICAgICAgICAgICAgICAgIG1vdW50ID0gX2EubW91bnQ7XG4gICAgICAgICAgICAgICAgICBvdGhlck1pY3JvQXBwQ29uZmlncyA9IF9fcmVzdChfYSwgW1wibW91bnRcIl0pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0My5hYnJ1cHQoXCJyZXR1cm5cIiwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAgICAgICAgIG1vdW50OiBbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMyLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9yZWdlbmVyYXRvclJ1bnRpbWUud3JhcChmdW5jdGlvbiBfY2FsbGVlJChfY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQucHJldiA9IF9jb250ZXh0Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0LmFicnVwdChcInJldHVyblwiLCBsb2FkZXIodHJ1ZSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfY29udGV4dC5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBfY2FsbGVlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1dLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkodG9BcnJheShtb3VudCkpLCBbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMyLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlMigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTIkKF9jb250ZXh0Mikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQyLnByZXYgPSBfY29udGV4dDIubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQyLmFicnVwdChcInJldHVyblwiLCBsb2FkZXIoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHQyLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIF9jYWxsZWUyKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1dKVxuICAgICAgICAgICAgICAgICAgfSwgb3RoZXJNaWNyb0FwcENvbmZpZ3MpKTtcblxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0My5zdG9wKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBfY2FsbGVlMyk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0sXG4gICAgICBhY3RpdmVXaGVuOiBhY3RpdmVSdWxlLFxuICAgICAgY3VzdG9tUHJvcHM6IHByb3BzXG4gICAgfSk7XG4gIH0pO1xufVxudmFyIGFwcENvbmZpZ1Byb21pc2VHZXR0ZXJNYXAgPSBuZXcgTWFwKCk7XG52YXIgY29udGFpbmVyTWljcm9BcHBzTWFwID0gbmV3IE1hcCgpO1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNaWNyb0FwcChhcHAsIGNvbmZpZ3VyYXRpb24sIGxpZmVDeWNsZXMpIHtcbiAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgdmFyIF9hO1xuXG4gIHZhciBwcm9wcyA9IGFwcC5wcm9wcyxcbiAgICAgIG5hbWUgPSBhcHAubmFtZTtcbiAgdmFyIGNvbnRhaW5lciA9ICdjb250YWluZXInIGluIGFwcCA/IGFwcC5jb250YWluZXIgOiB1bmRlZmluZWQ7IC8vIE11c3QgY29tcHV0ZSB0aGUgY29udGFpbmVyIHhwYXRoIGF0IGJlZ2lubmluZyB0byBrZWVwIGl0IGNvbnNpc3QgYXJvdW5kIGFwcCBydW5uaW5nXG4gIC8vIElmIHdlIGNvbXB1dGUgaXQgZXZlcnkgdGltZSwgdGhlIGNvbnRhaW5lciBkb20gc3RydWN0dXJlIG1vc3QgcHJvYmFibHkgYmVlbiBjaGFuZ2VkIGFuZCByZXN1bHQgaW4gYSBkaWZmZXJlbnQgeHBhdGggdmFsdWVcblxuICB2YXIgY29udGFpbmVyWFBhdGggPSBnZXRDb250YWluZXJYUGF0aChjb250YWluZXIpO1xuICB2YXIgYXBwQ29udGFpbmVyWFBhdGhLZXkgPSBcIlwiLmNvbmNhdChuYW1lLCBcIi1cIikuY29uY2F0KGNvbnRhaW5lclhQYXRoKTtcbiAgdmFyIG1pY3JvQXBwO1xuXG4gIHZhciB3cmFwUGFyY2VsQ29uZmlnRm9yUmVtb3VudCA9IGZ1bmN0aW9uIHdyYXBQYXJjZWxDb25maWdGb3JSZW1vdW50KGNvbmZpZykge1xuICAgIHZhciBtaWNyb0FwcENvbmZpZyA9IGNvbmZpZztcblxuICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgIGlmIChjb250YWluZXJYUGF0aCkge1xuICAgICAgICB2YXIgY29udGFpbmVyTWljcm9BcHBzID0gY29udGFpbmVyTWljcm9BcHBzTWFwLmdldChhcHBDb250YWluZXJYUGF0aEtleSk7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lck1pY3JvQXBwcyA9PT0gbnVsbCB8fCBjb250YWluZXJNaWNyb0FwcHMgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGNvbnRhaW5lck1pY3JvQXBwcy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgbW91bnQgPSBbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9fYXdhaXRlcihfdGhpczMsIHZvaWQgMCwgdm9pZCAwLCAvKiNfX1BVUkVfXyovX3JlZ2VuZXJhdG9yUnVudGltZS5tYXJrKGZ1bmN0aW9uIF9jYWxsZWU0KCkge1xuICAgICAgICAgICAgICB2YXIgcHJldkxvYWRNaWNyb0FwcHMsIHByZXZMb2FkTWljcm9BcHBzV2hpY2hOb3RCcm9rZW47XG4gICAgICAgICAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTQkKF9jb250ZXh0NCkge1xuICAgICAgICAgICAgICAgIHdoaWxlICgxKSB7XG4gICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jb250ZXh0NC5wcmV2ID0gX2NvbnRleHQ0Lm5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgIC8vIFdoaWxlIHRoZXJlIGFyZSBtdWx0aXBsZSBtaWNybyBhcHBzIG1vdW50ZWQgb24gdGhlIHNhbWUgY29udGFpbmVyLCB3ZSBtdXN0IHdhaXQgdW50aWwgdGhlIHByZXYgaW5zdGFuY2VzIGFsbCBoYWQgdW5tb3VudGVkXG4gICAgICAgICAgICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGl0IHdpbGwgbGVhZCBzb21lIGNvbmN1cnJlbnQgaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgICAgcHJldkxvYWRNaWNyb0FwcHMgPSBjb250YWluZXJNaWNyb0FwcHMuc2xpY2UoMCwgY29udGFpbmVyTWljcm9BcHBzLmluZGV4T2YobWljcm9BcHApKTtcbiAgICAgICAgICAgICAgICAgICAgICBwcmV2TG9hZE1pY3JvQXBwc1doaWNoTm90QnJva2VuID0gcHJldkxvYWRNaWNyb0FwcHMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdi5nZXRTdGF0dXMoKSAhPT0gJ0xPQURfRVJST1InICYmIHYuZ2V0U3RhdHVzKCkgIT09ICdTS0lQX0JFQ0FVU0VfQlJPS0VOJztcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICBfY29udGV4dDQubmV4dCA9IDQ7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByZXZMb2FkTWljcm9BcHBzV2hpY2hOb3RCcm9rZW4ubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdi51bm1vdW50UHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0NC5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LCBfY2FsbGVlNCk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfV0uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheSh0b0FycmF5KG1pY3JvQXBwQ29uZmlnLm1vdW50KSkpO1xuICAgICAgICAgIG1pY3JvQXBwQ29uZmlnID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBjb25maWcpLCB7XG4gICAgICAgICAgICBtb3VudDogbW91bnRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIG1pY3JvQXBwQ29uZmlnKSwge1xuICAgICAgLy8gZW1wdHkgYm9vdHN0cmFwIGhvb2sgd2hpY2ggc2hvdWxkIG5vdCBydW4gdHdpY2Ugd2hpbGUgaXQgY2FsbGluZyBmcm9tIGNhY2hlZCBtaWNybyBhcHBcbiAgICAgIGJvb3RzdHJhcDogZnVuY3Rpb24gYm9vdHN0cmFwKCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIC8qKlxuICAgKiB1c2luZyBuYW1lICsgY29udGFpbmVyIHhwYXRoIGFzIHRoZSBtaWNybyBhcHAgaW5zdGFuY2UgaWQsXG4gICAqIGl0IG1lYW5zIGlmIHlvdSByZW5kZXJpbmcgYSBtaWNybyBhcHAgdG8gYSBkb20gd2hpY2ggaGF2ZSBiZWVuIHJlbmRlcmVkIGJlZm9yZSxcbiAgICogdGhlIG1pY3JvIGFwcCB3b3VsZCBub3QgbG9hZCBhbmQgZXZhbHVhdGUgaXRzIGxpZmVjeWNsZXMgYWdhaW5cbiAgICovXG5cblxuICB2YXIgbWVtb3JpemVkTG9hZGluZ0ZuID0gZnVuY3Rpb24gbWVtb3JpemVkTG9hZGluZ0ZuKCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIoX3RoaXMzLCB2b2lkIDAsIHZvaWQgMCwgLyojX19QVVJFX18qL19yZWdlbmVyYXRvclJ1bnRpbWUubWFyayhmdW5jdGlvbiBfY2FsbGVlNSgpIHtcbiAgICAgIHZhciB1c2VyQ29uZmlndXJhdGlvbiwgJCRjYWNoZUxpZmVjeWNsZUJ5QXBwTmFtZSwgcGFyY2VsQ29uZmlnR2V0dGVyUHJvbWlzZSwgX3BhcmNlbENvbmZpZ0dldHRlclByb21pc2UsIHBhcmNlbENvbmZpZ09iamVjdEdldHRlclByb21pc2U7XG5cbiAgICAgIHJldHVybiBfcmVnZW5lcmF0b3JSdW50aW1lLndyYXAoZnVuY3Rpb24gX2NhbGxlZTUkKF9jb250ZXh0NSkge1xuICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgIHN3aXRjaCAoX2NvbnRleHQ1LnByZXYgPSBfY29udGV4dDUubmV4dCkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICB1c2VyQ29uZmlndXJhdGlvbiA9IGF1dG9Eb3duZ3JhZGVGb3JMb3dWZXJzaW9uQnJvd3Nlcihjb25maWd1cmF0aW9uICE9PSBudWxsICYmIGNvbmZpZ3VyYXRpb24gIT09IHZvaWQgMCA/IGNvbmZpZ3VyYXRpb24gOiBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIGZyYW1ld29ya0NvbmZpZ3VyYXRpb24pLCB7XG4gICAgICAgICAgICAgICAgc2luZ3VsYXI6IGZhbHNlXG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgJCRjYWNoZUxpZmVjeWNsZUJ5QXBwTmFtZSA9IHVzZXJDb25maWd1cmF0aW9uLiQkY2FjaGVMaWZlY3ljbGVCeUFwcE5hbWU7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBfY29udGV4dDUubmV4dCA9IDIxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKCEkJGNhY2hlTGlmZWN5Y2xlQnlBcHBOYW1lKSB7XG4gICAgICAgICAgICAgICAgX2NvbnRleHQ1Lm5leHQgPSAxMjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHBhcmNlbENvbmZpZ0dldHRlclByb21pc2UgPSBhcHBDb25maWdQcm9taXNlR2V0dGVyTWFwLmdldChuYW1lKTtcblxuICAgICAgICAgICAgICBpZiAoIXBhcmNlbENvbmZpZ0dldHRlclByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBfY29udGV4dDUubmV4dCA9IDEyO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgX2NvbnRleHQ1LnQwID0gd3JhcFBhcmNlbENvbmZpZ0ZvclJlbW91bnQ7XG4gICAgICAgICAgICAgIF9jb250ZXh0NS5uZXh0ID0gOTtcbiAgICAgICAgICAgICAgcmV0dXJuIHBhcmNlbENvbmZpZ0dldHRlclByb21pc2U7XG5cbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgX2NvbnRleHQ1LnQxID0gX2NvbnRleHQ1LnNlbnQ7XG4gICAgICAgICAgICAgIF9jb250ZXh0NS50MiA9ICgwLCBfY29udGV4dDUudDEpKGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDUuYWJydXB0KFwicmV0dXJuXCIsICgwLCBfY29udGV4dDUudDApKF9jb250ZXh0NS50MikpO1xuXG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICBpZiAoIWNvbnRhaW5lclhQYXRoKSB7XG4gICAgICAgICAgICAgICAgX2NvbnRleHQ1Lm5leHQgPSAyMTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIF9wYXJjZWxDb25maWdHZXR0ZXJQcm9taXNlID0gYXBwQ29uZmlnUHJvbWlzZUdldHRlck1hcC5nZXQoYXBwQ29udGFpbmVyWFBhdGhLZXkpO1xuXG4gICAgICAgICAgICAgIGlmICghX3BhcmNlbENvbmZpZ0dldHRlclByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBfY29udGV4dDUubmV4dCA9IDIxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgX2NvbnRleHQ1LnQzID0gd3JhcFBhcmNlbENvbmZpZ0ZvclJlbW91bnQ7XG4gICAgICAgICAgICAgIF9jb250ZXh0NS5uZXh0ID0gMTg7XG4gICAgICAgICAgICAgIHJldHVybiBfcGFyY2VsQ29uZmlnR2V0dGVyUHJvbWlzZTtcblxuICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgX2NvbnRleHQ1LnQ0ID0gX2NvbnRleHQ1LnNlbnQ7XG4gICAgICAgICAgICAgIF9jb250ZXh0NS50NSA9ICgwLCBfY29udGV4dDUudDQpKGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDUuYWJydXB0KFwicmV0dXJuXCIsICgwLCBfY29udGV4dDUudDMpKF9jb250ZXh0NS50NSkpO1xuXG4gICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICBwYXJjZWxDb25maWdPYmplY3RHZXR0ZXJQcm9taXNlID0gbG9hZEFwcChhcHAsIHVzZXJDb25maWd1cmF0aW9uLCBsaWZlQ3ljbGVzKTtcblxuICAgICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQkY2FjaGVMaWZlY3ljbGVCeUFwcE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgIGFwcENvbmZpZ1Byb21pc2VHZXR0ZXJNYXAuc2V0KG5hbWUsIHBhcmNlbENvbmZpZ09iamVjdEdldHRlclByb21pc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyWFBhdGgpIGFwcENvbmZpZ1Byb21pc2VHZXR0ZXJNYXAuc2V0KGFwcENvbnRhaW5lclhQYXRoS2V5LCBwYXJjZWxDb25maWdPYmplY3RHZXR0ZXJQcm9taXNlKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIF9jb250ZXh0NS5uZXh0ID0gMjU7XG4gICAgICAgICAgICAgIHJldHVybiBwYXJjZWxDb25maWdPYmplY3RHZXR0ZXJQcm9taXNlO1xuXG4gICAgICAgICAgICBjYXNlIDI1OlxuICAgICAgICAgICAgICBfY29udGV4dDUudDYgPSBfY29udGV4dDUuc2VudDtcbiAgICAgICAgICAgICAgcmV0dXJuIF9jb250ZXh0NS5hYnJ1cHQoXCJyZXR1cm5cIiwgKDAsIF9jb250ZXh0NS50NikoY29udGFpbmVyKSk7XG5cbiAgICAgICAgICAgIGNhc2UgMjc6XG4gICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgIHJldHVybiBfY29udGV4dDUuc3RvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgX2NhbGxlZTUpO1xuICAgIH0pKTtcbiAgfTtcblxuICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAvLyBXZSBuZWVkIHRvIGludm9rZSBzdGFydCBtZXRob2Qgb2Ygc2luZ2xlLXNwYSBhcyB0aGUgcG9wc3RhdGUgZXZlbnQgc2hvdWxkIGJlIGRpc3BhdGNoZWQgd2hpbGUgdGhlIG1haW4gYXBwIGNhbGxpbmcgcHVzaFN0YXRlL3JlcGxhY2VTdGF0ZSBhdXRvbWF0aWNhbGx5LFxuICAgIC8vIGJ1dCBpbiBzaW5nbGUtc3BhIGl0IHdpbGwgY2hlY2sgdGhlIHN0YXJ0IHN0YXR1cyBiZWZvcmUgaXQgZGlzcGF0Y2ggcG9wc3RhdGVcbiAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3NpbmdsZS1zcGEvc2luZ2xlLXNwYS9ibG9iL2YyOGI1OTYzYmUxNDg0NTgzYTA3MmM4MTQ1YWMwYjVhMjhkOTEyMzUvc3JjL25hdmlnYXRpb24vbmF2aWdhdGlvbi1ldmVudHMuanMjTDEwMVxuICAgIC8vIHJlZiBodHRwczovL2dpdGh1Yi5jb20vdW1panMvcWlhbmt1bi9wdWxsLzEwNzFcbiAgICBzdGFydFNpbmdsZVNwYSh7XG4gICAgICB1cmxSZXJvdXRlT25seTogKF9hID0gZnJhbWV3b3JrQ29uZmlndXJhdGlvbi51cmxSZXJvdXRlT25seSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogZGVmYXVsdFVybFJlcm91dGVPbmx5XG4gICAgfSk7XG4gIH1cblxuICBtaWNyb0FwcCA9IG1vdW50Um9vdFBhcmNlbChtZW1vcml6ZWRMb2FkaW5nRm4sIE9iamVjdC5hc3NpZ24oe1xuICAgIGRvbUVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIH0sIHByb3BzKSk7XG5cbiAgaWYgKGNvbnRhaW5lcikge1xuICAgIGlmIChjb250YWluZXJYUGF0aCkge1xuICAgICAgLy8gU3RvcmUgdGhlIG1pY3JvQXBwcyB3aGljaCB0aGV5IG1vdW50ZWQgb24gdGhlIHNhbWUgY29udGFpbmVyXG4gICAgICB2YXIgbWljcm9BcHBzUmVmID0gY29udGFpbmVyTWljcm9BcHBzTWFwLmdldChhcHBDb250YWluZXJYUGF0aEtleSkgfHwgW107XG4gICAgICBtaWNyb0FwcHNSZWYucHVzaChtaWNyb0FwcCk7XG4gICAgICBjb250YWluZXJNaWNyb0FwcHNNYXAuc2V0KGFwcENvbnRhaW5lclhQYXRoS2V5LCBtaWNyb0FwcHNSZWYpO1xuXG4gICAgICB2YXIgY2xlYW51cCA9IGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgICAgIHZhciBpbmRleCA9IG1pY3JvQXBwc1JlZi5pbmRleE9mKG1pY3JvQXBwKTtcbiAgICAgICAgbWljcm9BcHBzUmVmLnNwbGljZShpbmRleCwgMSk7IC8vIEB0cy1pZ25vcmVcblxuICAgICAgICBtaWNyb0FwcCA9IG51bGw7XG4gICAgICB9OyAvLyBnYyBhZnRlciB1bm1vdW50XG5cblxuICAgICAgbWljcm9BcHAudW5tb3VudFByb21pc2UudGhlbihjbGVhbnVwKS5jYXRjaChjbGVhbnVwKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWljcm9BcHA7XG59XG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKSB7XG4gIHZhciBvcHRzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcbiAgZnJhbWV3b3JrQ29uZmlndXJhdGlvbiA9IE9iamVjdC5hc3NpZ24oe1xuICAgIHByZWZldGNoOiB0cnVlLFxuICAgIHNpbmd1bGFyOiB0cnVlLFxuICAgIHNhbmRib3g6IHRydWVcbiAgfSwgb3B0cyk7XG5cbiAgdmFyIF9mcmFtZXdvcmtDb25maWd1cmF0aSA9IGZyYW1ld29ya0NvbmZpZ3VyYXRpb24sXG4gICAgICBwcmVmZXRjaCA9IF9mcmFtZXdvcmtDb25maWd1cmF0aS5wcmVmZXRjaCxcbiAgICAgIHNhbmRib3ggPSBfZnJhbWV3b3JrQ29uZmlndXJhdGkuc2FuZGJveCxcbiAgICAgIHNpbmd1bGFyID0gX2ZyYW1ld29ya0NvbmZpZ3VyYXRpLnNpbmd1bGFyLFxuICAgICAgX2ZyYW1ld29ya0NvbmZpZ3VyYXRpMiA9IF9mcmFtZXdvcmtDb25maWd1cmF0aS51cmxSZXJvdXRlT25seSxcbiAgICAgIHVybFJlcm91dGVPbmx5ID0gX2ZyYW1ld29ya0NvbmZpZ3VyYXRpMiA9PT0gdm9pZCAwID8gZGVmYXVsdFVybFJlcm91dGVPbmx5IDogX2ZyYW1ld29ya0NvbmZpZ3VyYXRpMixcbiAgICAgIGltcG9ydEVudHJ5T3B0cyA9IF9fcmVzdChmcmFtZXdvcmtDb25maWd1cmF0aW9uLCBbXCJwcmVmZXRjaFwiLCBcInNhbmRib3hcIiwgXCJzaW5ndWxhclwiLCBcInVybFJlcm91dGVPbmx5XCJdKTtcblxuICBpZiAocHJlZmV0Y2gpIHtcbiAgICBkb1ByZWZldGNoU3RyYXRlZ3kobWljcm9BcHBzLCBwcmVmZXRjaCwgaW1wb3J0RW50cnlPcHRzKTtcbiAgfVxuXG4gIGZyYW1ld29ya0NvbmZpZ3VyYXRpb24gPSBhdXRvRG93bmdyYWRlRm9yTG93VmVyc2lvbkJyb3dzZXIoZnJhbWV3b3JrQ29uZmlndXJhdGlvbik7XG4gIHN0YXJ0U2luZ2xlU3BhKHtcbiAgICB1cmxSZXJvdXRlT25seTogdXJsUmVyb3V0ZU9ubHlcbiAgfSk7XG4gIHN0YXJ0ZWQgPSB0cnVlO1xuICBmcmFtZXdvcmtTdGFydGVkRGVmZXIucmVzb2x2ZSgpO1xufSIsIi8qKlxuICogQGF1dGhvciBLdWl0b3NcbiAqIEBzaW5jZSAyMDIwLTAyLTIxXG4gKi9cbmV4cG9ydCB7IGFkZEVycm9ySGFuZGxlciwgcmVtb3ZlRXJyb3JIYW5kbGVyIH0gZnJvbSAnc2luZ2xlLXNwYSc7XG5leHBvcnQgZnVuY3Rpb24gYWRkR2xvYmFsVW5jYXVnaHRFcnJvckhhbmRsZXIoZXJyb3JIYW5kbGVyKSB7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlcik7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCBlcnJvckhhbmRsZXIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUdsb2JhbFVuY2F1Z2h0RXJyb3JIYW5kbGVyKGVycm9ySGFuZGxlcikge1xuICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIpO1xuICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndW5oYW5kbGVkcmVqZWN0aW9uJywgZXJyb3JIYW5kbGVyKTtcbn0iLCIvKipcbiAqIEBhdXRob3IgS3VpdG9zXG4gKiBAc2luY2UgMjAxOS0wMi0xOVxuICovXG5pbXBvcnQgeyBnZXRNb3VudGVkQXBwcywgbmF2aWdhdGVUb1VybCB9IGZyb20gJ3NpbmdsZS1zcGEnO1xudmFyIGZpcnN0TW91bnRMb2dMYWJlbCA9ICdbcWlhbmt1bl0gZmlyc3QgYXBwIG1vdW50ZWQnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgY29uc29sZS50aW1lKGZpcnN0TW91bnRMb2dMYWJlbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXREZWZhdWx0TW91bnRBcHAoZGVmYXVsdEFwcExpbmspIHtcbiAgLy8gY2FuIG5vdCB1c2UgYWRkRXZlbnRMaXN0ZW5lciBvbmNlIG9wdGlvbiBmb3IgaWUgc3VwcG9ydFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2luZ2xlLXNwYTpuby1hcHAtY2hhbmdlJywgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgdmFyIG1vdW50ZWRBcHBzID0gZ2V0TW91bnRlZEFwcHMoKTtcblxuICAgIGlmICghbW91bnRlZEFwcHMubGVuZ3RoKSB7XG4gICAgICBuYXZpZ2F0ZVRvVXJsKGRlZmF1bHRBcHBMaW5rKTtcbiAgICB9XG5cbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2luZ2xlLXNwYTpuby1hcHAtY2hhbmdlJywgbGlzdGVuZXIpO1xuICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBydW5EZWZhdWx0TW91bnRFZmZlY3RzKGRlZmF1bHRBcHBMaW5rKSB7XG4gIGNvbnNvbGUud2FybignW3FpYW5rdW5dIHJ1bkRlZmF1bHRNb3VudEVmZmVjdHMgd2lsbCBiZSByZW1vdmVkIGluIG5leHQgdmVyc2lvbiwgcGxlYXNlIHVzZSBzZXREZWZhdWx0TW91bnRBcHAgaW5zdGVhZCcpO1xuICBzZXREZWZhdWx0TW91bnRBcHAoZGVmYXVsdEFwcExpbmspO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJ1bkFmdGVyRmlyc3RNb3VudGVkKGVmZmVjdCkge1xuICAvLyBjYW4gbm90IHVzZSBhZGRFdmVudExpc3RlbmVyIG9uY2Ugb3B0aW9uIGZvciBpZSBzdXBwb3J0XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzaW5nbGUtc3BhOmZpcnN0LW1vdW50JywgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG4gICAgICBjb25zb2xlLnRpbWVFbmQoZmlyc3RNb3VudExvZ0xhYmVsKTtcbiAgICB9XG5cbiAgICBlZmZlY3QoKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2luZ2xlLXNwYTpmaXJzdC1tb3VudCcsIGxpc3RlbmVyKTtcbiAgfSk7XG59IiwiLyoqXG4gKiBAYXV0aG9yIEt1aXRvc1xuICogQHNpbmNlIDIwMTktMDQtMjVcbiAqL1xuZXhwb3J0IHsgbG9hZE1pY3JvQXBwLCByZWdpc3Rlck1pY3JvQXBwcywgc3RhcnQgfSBmcm9tICcuL2FwaXMnO1xuZXhwb3J0IHsgaW5pdEdsb2JhbFN0YXRlIH0gZnJvbSAnLi9nbG9iYWxTdGF0ZSc7XG5leHBvcnQgeyBnZXRDdXJyZW50UnVubmluZ0FwcCBhcyBfX2ludGVybmFsR2V0Q3VycmVudFJ1bm5pbmdBcHAgfSBmcm9tICcuL3NhbmRib3gnO1xuZXhwb3J0ICogZnJvbSAnLi9lcnJvckhhbmRsZXInO1xuZXhwb3J0ICogZnJvbSAnLi9lZmZlY3RzJztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBwcmVmZXRjaEltbWVkaWF0ZWx5IGFzIHByZWZldGNoQXBwcyB9IGZyb20gJy4vcHJlZmV0Y2gnOyIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsXSwibmFtZXMiOlsidW5kZWZpbmVkIiwicmVxdWlyZSQkMCIsImFycmF5TGlrZVRvQXJyYXkiLCJhcnJheVdpdGhvdXRIb2xlcyIsIml0ZXJhYmxlVG9BcnJheSIsInVuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5Iiwibm9uSXRlcmFibGVTcHJlYWQiLCJhcnJheVdpdGhIb2xlcyIsIml0ZXJhYmxlVG9BcnJheUxpbWl0Iiwibm9uSXRlcmFibGVSZXN0IiwicmVxdWVzdElkbGVDYWxsYmFjayIsInN1cHBvcnRzVXNlclRpbWluZyIsImdldEFkZE9uIiwiX3JlZ2VuZXJhdG9yUnVudGltZSIsImdldEVuZ2luZUZsYWdBZGRvbiIsImdldFJ1bnRpbWVQdWJsaWNQYXRoQWRkT24iLCJzZXRQcm90b3R5cGVPZiIsImFzc2VydFRoaXNJbml0aWFsaXplZCIsImlzTmF0aXZlUmVmbGVjdENvbnN0cnVjdCIsImdldFByb3RvdHlwZU9mIiwicG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsImlzTmF0aXZlRnVuY3Rpb24iLCJjb25zdHJ1Y3QiLCJwcm9jZXNzIiwicmF3UmVtb3ZlQ2hpbGQiLCJjc3MucHJvY2VzcyIsImV4ZWNTY3JpcHRzIiwiYm9vdHN0cmFwcGluZ1BhdGNoQ291bnQiLCJtb3VudGluZ1BhdGNoQ291bnQiLCJjaGVja0FjdGl2aXR5RnVuY3Rpb25zIiwicGF0Y2giLCJwYXRjaEludGVydmFsIiwicGF0Y2hXaW5kb3dMaXN0ZW5lciIsInBhdGNoSGlzdG9yeUxpc3RlbmVyIiwiY3NzLlFpYW5rdW5DU1NSZXdyaXRlQXR0ciIsIl9tZXJnZVdpdGgiLCJfbWVyZ2VXaXRoMiIsImdldEFwcFN0YXR1cyIsIk5PVF9MT0FERUQiLCJnZXRNb3VudGVkQXBwcyIsInJlZ2lzdGVyQXBwbGljYXRpb24iLCJzdGFydFNpbmdsZVNwYSIsIm1vdW50Um9vdFBhcmNlbCIsIm5hdmlnYXRlVG9VcmwiLCJnZXRBY3RpdmVSdWxlIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImFjdGl2ZVJ1bGVDaGVjayIsIm1vZGUiLCJuYW1lIiwic3BsaXQiLCJyZWdpc3Rlck1pY3JvQXBwc0NvbmZpZyIsIm1pY3JvQXBwcyIsIm9wdGlvbiIsImNvbnRhaW5lciIsImVudiIsImRldlBhcmFtIiwia2V5IiwidXJsIiwiZm9yRWFjaCIsImFwcHMiLCJhY3RpdmVSdWxlIiwiZW50cnkiLCJiZWZvcmVMb2FkIiwiYXBwIiwiY29uc29sZSIsImxvZyIsImJlZm9yZU1vdW50IiwiVXNlQXBwIiwic3RhcnQiLCJjb25zdHJ1Y3RvciIsImlzTWljcm8iLCJyb3V0ZXMiLCJjb25maWciLCJhY3Rpb24iLCJ1c2VBcHBBY3Rpb24iLCIkcm91dGVzIiwiJGNvbmZpZyIsIiRhY3Rpb24iLCJsZW5ndGgiLCJFcnJvciIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsImFzc2lnbiIsInJlZ2lzdGVyTWljcm9BcHBzIiwicmVnaXN0ZXJSb3V0ZUNvbmZpZyIsImNvbXBvbmVudCIsImxvY2FsIiwiYmFzZSIsIndpbmRvdyIsIl9fUE9XRVJFRF9CWV9RSUFOS1VOX18iLCJyb3V0ZSIsInBhdGgiLCJjaGlsZHJlbiIsIlVzZU1pY3JvQXBwIiwiJGluc3RhbmNlIiwiVnVlIiwiVnVlUm91dGVyIiwicmVuZGVyIiwic3RvcmUiLCIkbG9nIiwiJG5hbWUiLCIkY29tcG9uZW50IiwiJGFjdGl2ZVJ1bGUiLCIkbG9jYWwiLCIkc3RvcmUiLCIkVnVlUm91dGVyIiwiJFZ1ZSIsIiRyZW5kZXIiLCJwcm9wcyIsInJvdXRlT3B0aW9uIiwiJHJvdXRlciIsInJvdXRlciIsImgiLCIkbW91bnQiLCJxdWVyeVNlbGVjdG9yIiwiYm9vdHN0cmFwIiwiUHJvbWlzZSIsInJlc29sdmUiLCJtb3VudCIsInVubW91bnQiLCIkZGVzdHJveSIsIiRlbCIsImlubmVySFRNTCIsInVwZGF0ZSIsIl9fd2VicGFja19wdWJsaWNfcGF0aF9fIiwiX19JTkpFQ1RFRF9QVUJMSUNfUEFUSF9CWV9RSUFOS1VOX18iLCJRS1JlZ2lzdGVyQXBwIiwiUUtSZWdpc3Rlck1pY3JvQXBwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFPQSxJQUFJLE9BQU8sSUFBSSxVQUFVLE9BQU8sRUFBRTtBQUVsQztBQUNBLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUM1QixFQUFFLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUM7QUFDakMsRUFBRSxJQUFJQSxXQUFTLENBQUM7QUFDaEIsRUFBRSxJQUFJLE9BQU8sR0FBRyxPQUFPLE1BQU0sS0FBSyxVQUFVLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUMzRCxFQUFFLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxRQUFRLElBQUksWUFBWSxDQUFDO0FBQ3hELEVBQUUsSUFBSSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsYUFBYSxJQUFJLGlCQUFpQixDQUFDO0FBQ3ZFLEVBQUUsSUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLGVBQWUsQ0FBQztBQUNqRTtBQUNBLEVBQUUsU0FBUyxNQUFNLENBQUMsR0FB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QUMsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sTUFBTSxFQUFFLENBQUMsQ0FBQyxXQUFXLEdBQUcsTUFBTSxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE9BQU8sVUFBVSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE9BQU8sUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSwrQkFBK0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsNENBQTRDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFBRSxHQUFFLENBQUMsR0FBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMs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
