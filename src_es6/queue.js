import RSVP from 'rsvp';
import core from './core';

class Queue {
  constructor(_context) {
    this._q = [];
    this.context = _context;
    this.tick = core.requestAnimationFrame;
    this.running = false;
    this.paused = false;
  }

  // Add an item to the queue
  enqueue() {
    let deferred, promise;
    let queued;
    const task = [].shift.call(arguments);
    const args = arguments;

    // Handle single args without context
    // if(args && !Array.isArray(args)) {
    //   args = [args];
    // }
    if(!task) {
      return console.error("No Task Provided");
    }

    if(typeof task === "function"){

      deferred = new RSVP.defer();
      promise = deferred.promise;

      queued = {
        "task" : task,
        "args"     : args,
        //"context"  : context,
        "deferred" : deferred,
        "promise" : promise
      };

    } else {
      // Task is a promise
      queued = {
        "promise" : task
      };

    }

    this._q.push(queued);

    // Wait to start queue flush
    if (this.paused == false && !this.running) {
      // setTimeout(this.flush.bind(this), 0);
      // this.tick.call(window, this.run.bind(this));
      this.run();
    }

    return queued.promise;
  }

  // Run one item
  dequeue() {
    let inwait, task, result;

    if(this._q.length) {
      inwait = this._q.shift();
      task = inwait.task;
      if(task){
        // console.log(task)

        result = task.apply(this.context, inwait.args);

        if(result && typeof result["then"] === "function") {
          // Task is a function that returns a promise
          return result.then(function(){
            inwait.deferred.resolve.apply(this.context, arguments);
          }.bind(this));
        } else {
          // Task resolves immediately
          inwait.deferred.resolve.apply(this.context, result);
          return inwait.promise;
        }



      } else if(inwait.promise) {
        // Task is a promise
        return inwait.promise;
      }

    } else {
      inwait = new RSVP.defer();
      inwait.deferred.resolve();
      return inwait.promise;
    }

  }

  // Run All Immediately
  dump() {
    while(this._q.length) {
      this.dequeue();
    }
  }

  // Run all sequentially, at convince

  run() {

    if(!this.running){
      this.running = true;
      this.defered = new RSVP.defer();
    }

    this.tick.call(window, () => {

      if(this._q.length) {

        this.dequeue()
          .then(() => {
            this.run();
          });

      } else {
        this.defered.resolve();
        this.running = undefined;
      }

    });

    // Unpause
    if(this.paused == true) {
      this.paused = false;
    }

    return this.defered.promise;
  }

  // Flush all, as quickly as possible
  flush() {

    if(this.running){
      return this.running;
    }

    if(this._q.length) {
      this.running = this.dequeue()
        .then(() => {
          this.running = undefined;
          return this.flush();
        });

      return this.running;
    }

  }

  // Clear all items in wait
  clear() {
    this._q = [];
    this.running = false;
  }

  length() {
    return this._q.length;
  }

  pause() {
    this.paused = true;
  }
}

// Create a new task from a callback
function Task(task, args, context){

  return function(){
    const toApply = arguments || [];

    return new RSVP.Promise((resolve, reject) => {
      const callback = value => {
        resolve(value);
      };
      // Add the callback to the arguments list
      toApply.push(callback);

      // Apply all arguments to the functions
      task.apply(this, toApply);

  });

  };

}
export default Queue;
