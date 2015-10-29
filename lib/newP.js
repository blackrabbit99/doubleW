import 'babel/polyfill';
import MakeQuerablePromise from './queuarablePromise';

class Point {
  constructor(data, options) {

    const defaults = {
      evalPath: null,
      maxWorkers: (navigator.hardwareConcurrency || 4),
      synchronous: true,
      env: {},
      envNamespace: 'env',
    };
    this.operation = new Promise((resolve, reject)=>resolve());
    this.data = data;
    this.options =  Object.assign(defaults, options);
    this.requiredScripts = [];
    this.requiredFunctions = [];
  }

  static isSupported() {
    return true;
  }

  _spawnWorker(cb, env) {

    const src = 'self.onmessage = function(e) {self.postMessage((' + cb.toString() + ')(e.data))}';
    const blob = new Blob([src], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    return worker;
  }

  startWorker(worker, data, index) {
    data = data || this.data;
    return new Promise((resolve, reject) => {

      worker.onmessage = (data) => {
        worker.terminate();
        resolve((typeof index === 'number') ? {data: data.data, index} : data.data);
      };

      worker.onerror = (e) => {
        worker.terminate();
        reject(e);
      };

      worker.postMessage(data);
    });
  }

  spawn(cb, env) {
    var worker = this._spawnWorker(cb, env);
    return this.startWorker(worker);
  }

  _spawnMap(cb, env, value, index) {
    console.count('_spawnMap');
    var worker = this._spawnWorker(cb, env);
    return this.startWorker(worker, value, index);
  }

  _spawnReduce(cb, env, value) {
    var worker = this._spawnWorker(cb, env);
    return this.startWorker(worker, value);
  }

  reduce(cb, env) {
    var data = this.data;
    var startStack = data.splice(0, 2);

    return data.reduce((promise, value) => {
      return promise.then((result) => {
        return this._spawnReduce(cb, env, [result, value])
      });
    }, this._spawnReduce(cb, env, startStack));
  }

  map(cb, env) {



    this.operation = this.operation.then(() => {
      var data = this.data.copyWithin(0, 0);
      var startStack = data.splice(0, 2).map((value, index) => MakeQuerablePromise(this._spawnMap(cb, env, value, index)));
      console.log('data', data);
      console.log('startStack', startStack);

      return data.reduce((promise, value, index) => {
        return promise.then((result) => {
          this.data[result.index] = result.data;
          startStack = startStack.filter((i) => !i.isFulfilled());
          startStack.push(MakeQuerablePromise(this._spawnMap(cb, env, value, index + 2)));
          return (data.length - 1 !== index) ? Promise.race(startStack) : Promise.all(startStack);
        });
      }, Promise.race(startStack))
      .then((arr) => {
        console.log('arr', arr);
        return arr.forEach(result => {this.data[result.index] = result.data;});
      });
    });

    return this;
  }

  require() {
    var args = Array.prototype.slice.call(arguments, 0);
    var func;

    for (var i = 0; i < args.length; i++) {
      func = args[i];

      if (typeof func === 'string') {
        this.requiredScripts.push(func);
      } else if (typeof func === 'function') {
        this.requiredFunctions.push({fn: func});
      } else if (typeof func === 'object') {
        this.requiredFunctions.push(func);
      }
    }

    return this;
  }

  then(cb, errCb) {
    this.operation
    .then((result) => {
      console.log('then.data', this.data);
      cb(this.data);
    })
    .catch((e) => {
      errCb(e);
    });

    return this;
  }
}
export default Point;
