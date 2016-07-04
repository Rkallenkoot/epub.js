import RSVP from 'rsvp';

//-- Hooks allow for injecting functions that must all complete in order before finishing
//   They will execute in parallel but all must finish before continuing
//   Functions may return a promise if they are asycn.

// this.content = new EPUBJS.Hook();
// this.content.register(function(){});
// this.content.trigger(args).then(function(){});

class Hook {
  constructor(context) {
    this.context = context || this;
    this.hooks = [];
  }

  // Adds a function to be run before a hook completes
  register() {
    for(let i = 0; i < arguments.length; ++i) {
      if (typeof arguments[i]  === "function") {
        this.hooks.push(arguments[i]);
      } else {
        // unpack array
        for(let j = 0; j < arguments[i].length; ++j) {
          this.hooks.push(arguments[i][j]);
        }
      }
    }
  }

  // Triggers a hook to run all functions
  trigger() {
    const args = arguments;
    const context = this.context;
    const promises = [];

    this.hooks.forEach((task, i) => {
      const executing = task.apply(context, args);

      if(executing && typeof executing["then"] === "function") {
        // Task is a function that returns a promise
        promises.push(executing);
      }
      // Otherwise Task resolves immediately, continue
    });


    return RSVP.all(promises);
  }

  // Adds a function to be run before a hook completes
  list() {
    return this.hooks;
  }

  clear() {
    return this.hooks = [];
  }
}

export default Hook;
