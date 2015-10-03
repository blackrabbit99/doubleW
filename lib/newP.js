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

      if (worker) {
        worker.onmessage = (data) => {
          worker.terminate();
          resolve((typeof index === 'number') ? {data: data.data, index} : data.data);
        };

        worker.onerror = (e) => {
          worker.terminate();
          reject(e);
        };
      } else {
        var b = 5;

        //sync flow
      }

      worker.postMessage(data);
    });
  }

  spawn(cb, env) {
    var worker = this._spawnWorker(cb, env);
    return this.startWorker(worker);
  }

  _spawnMap(cb, env, value, index) {
    var worker = this._spawnWorker(cb, env);
    return this.startWorker(worker, value, index);
  }

  // map(cb, env) {
  //   let promiseList = [];
  //
  //   this.data.forEach((value) => {
  //     const promise = this._spawnMap(cb, env, value);
  //     promiseList.push(promise);
  //   });
  //
  //   return Promise.all(promiseList);
  // }

  map(cb, env) {
    var data = this.data.copyWithin(0, 0);
    var startStack = data.splice(0, 2).map((value, index) => MakeQuerablePromise(this._spawnMap(cb, env, value, index)));
    var res = [];

    data.reduce((promise, value, index) => {
      return promise.then((result) => {
        res[result.index] = result.data;
        startStack = startStack.filter((i) => !i.isFulfilled());
        startStack.push(MakeQuerablePromise(this._spawnMap(cb, env, value, index + 2)));
        return (data.length - 1 !== index) ? Promise.race(startStack) : Promise.all(startStack);
      });
    }, Promise.race(startStack))
    .then(function(arr) {
      arr.forEach(result => {res[result.index] = result.data;});
      return res;
    });
  }
}
export default Point;
