var MakeQuerablePromise = function(promise) {
  if (promise.isResolved) return promise;

  var isResolved = false;
  var isRejected = false;

  var result = promise.then(
    function(v) {
      isResolved = true;
      return v;
    },
    function(e) {
      isRejected = true;
      throw e;
    });
  result.isFulfilled = function() {
    return isResolved || isRejected;
  };

  result.isResolved = function() {
    return isResolved;
  };

  result.isRejected = function() {
    return isRejected;
  };

  return result;
};

export default MakeQuerablePromise;
