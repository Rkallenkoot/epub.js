import RSVP from 'rsvp';
import core from '../core';
import SingleViewManager from './single';

class ContinuousViewManager {
  constructor(options) {

      SingleViewManager.apply(this, arguments); // call super constructor.

      this.settings = core.extend(this.settings || {}, {
          infinite: true,
          overflow: "auto",
          axis: "vertical",
          offset: 500,
          offsetDelta: 250
      });

      core.defaults(this.settings, options.settings || {});
      // core.extend(this.settings, options.settings || {});
  }

  moveTo(offset) {
    // var bounds = this.stage.bounds();
    // var dist = Math.floor(offset.top / bounds.height) * bounds.height;
    return this.check(
          offset.left+this.settings.offset,
          offset.top+this.settings.offset)
          .then(() => {

          if(this.settings.axis === "vertical") {
            this.scrollBy(0, offset.top);
          } else {
            this.scrollBy(offset.left, 0);
          }

        });
  }

  /*
  ContinuousViewManager.prototype.afterDisplayed = function(currView){
      var next = currView.section.next();
      var prev = currView.section.prev();
      var index = this.views.indexOf(currView);
      var prevView, nextView;

      if(index + 1 === this.views.length && next) {
          nextView = this.createView(next);
          this.q.enqueue(this.append.bind(this), nextView);
      }

      if(index === 0 && prev) {
          prevView = this.createView(prev, this.viewSettings);
          this.q.enqueue(this.prepend.bind(this), prevView);
      }

      // this.removeShownListeners(currView);
      // currView.onShown = this.afterDisplayed.bind(this);
      this.trigger("added", currView.section);

  };
  */
  afterResized(view) {
      this.trigger("resize", view.section);
  }

  // Remove Previous Listeners if present
  removeShownListeners(view) {

      // view.off("shown", this.afterDisplayed);
      // view.off("shown", this.afterDisplayedAbove);
      view.onDisplayed = () => {};

  }

  append(section) {
      const view = this.createView(section);

      return this.q.enqueue(() => {

          this.views.append(view);

          // return this.update();

      });
  }

  prepend(section) {
      const view = this.createView(section);

      view.on("resized", this.counter.bind(this));

      return this.q.enqueue(() => {

          this.views.prepend(view);

          // return this.update();

      });

  }

  counter(bounds) {

      if(this.settings.axis === "vertical") {
          this.scrollBy(0, bounds.heightDelta, true);
      } else {
          this.scrollBy(bounds.widthDelta, 0, true);
      }

  }

  /*
  ContinuousViewManager.prototype.check = function(_offset){
      var checking = new RSVP.defer();
      var container = this.stage.bounds();
    var promises = [];
    var offset = _offset || this.settings.offset;

      this.views.each(function(view){
          var visible = this.isVisible(view, offset, offset, container);

          if(visible) {

              if(!view.displayed && !view.rendering) {
            // console.log("render",view.section.index)
                      promises.push(this.render(view));
              }

          } else {

              if(view.displayed) {
          // console.log("destroy", view.section.index)
          this.q.enqueue(view.destroy.bind(view));
          // view.destroy();
          // this.q.enqueue(this.trim);
          clearTimeout(this.trimTimeout);
          this.trimTimeout = setTimeout(function(){
            this.q.enqueue(this.trim.bind(this));
          }.bind(this), 250);
              }

          }

      }.bind(this));


    if(promises.length){

      return RSVP.all(promises)
        .then(function(posts) {
          // Check to see if anything new is on screen after rendering
          this.q.enqueue(this.check.bind(this));

        }.bind(this));

    } else {
      checking.resolve();

      return checking.promise;
    }

  };
  */

  update(_offset) {
      const container = this.bounds();
      const views = this.views.all();
      const viewsLength = views.length;
      const visible = [];
      const offset = _offset || this.settings.offset || 0;
      let isVisible;
      let view;

      const updating = new RSVP.defer();
      const promises = [];

      for (let i = 0; i < viewsLength; i++) {
      view = views[i];

      isVisible = this.isVisible(view, offset, offset, container);

      if(isVisible === true) {
              promises.push(view.display(this.request));
        visible.push(view);
      } else {
              this.q.enqueue(view.destroy.bind(view));

              clearTimeout(this.trimTimeout);
              this.trimTimeout = setTimeout(() => {
                  this.q.enqueue(this.trim.bind(this));
              }, 250);
      }

    }

      if(promises.length){
      return RSVP.all(promises);
    } else {
      updating.resolve();
      return updating.promise;
    }

  }

  check(_offsetLeft, _offsetTop) {
      let next, prev;
      const horizontal = (this.settings.axis === "horizontal");
      let delta = this.settings.offset || 0;

      if (_offsetLeft && horizontal) {
          delta = _offsetLeft;
      }

      if (_offsetTop && !horizontal) {
          delta = _offsetTop;
      }

      const bounds = this._bounds; //this.bounds(); // bounds saved this until resize

      const offset = horizontal ? this.scrollLeft : this.scrollTop;
      const visibleLength = horizontal ? bounds.width : bounds.height;
      const contentLength = horizontal ? this.container.scrollWidth : this.container.scrollHeight;

      const checking = new RSVP.defer();
      const promises = [];

      if (offset + visibleLength + delta >= contentLength) {
      next = this.views.last().section.next();
      if(next) {
        promises.push(this.append(next));
      }
    }

    if (offset - delta < 0 ) {
      prev = this.views.first().section.prev();
      if(prev) {
        promises.push(this.prepend(prev));
      }
    }

    if(promises.length){
      return RSVP.all(promises)
        .then(posts => {
          // Check to see if anything new is on screen after rendering
          this.q.enqueue(this.update.bind(this));
                  // this.update(offset);
        });

    } else {
      checking.resolve();

      return checking.promise;
    }

  }

  trim() {
    const task = new RSVP.defer();
    const displayed = this.views.displayed();
    const first = displayed[0];
    const last = displayed[displayed.length-1];
    const firstIndex = this.views.indexOf(first);
    const lastIndex = this.views.indexOf(last);
    const above = this.views.slice(0, firstIndex);
    const below = this.views.slice(lastIndex+1);

    // Erase all but last above
    for (let i = 0; i < above.length-1; i++) {
      this.erase(above[i], above);
    }

    // Erase all except first below
    for (let j = 1; j < below.length; j++) {
      this.erase(below[j]);
    }

    task.resolve();
    return task.promise;
  }

  erase(view, above) { //Trim

      let prevTop;
      let prevLeft;

      if(this.settings.height) {
      prevTop = this.container.scrollTop;
          prevLeft = this.container.scrollLeft;
    } else {
      prevTop = window.scrollY;
          prevLeft = window.scrollX;
    }

      const bounds = view.bounds();

      this.views.remove(view);

      if(above) {

          if(this.settings.axis === "vertical") {
              this.scrollTo(0, prevTop - bounds.height, true);
          } else {
              this.scrollTo(prevLeft - bounds.width, 0, true);
          }
      }

  }

  addEventListeners(stage) {
      this.addScrollListeners();
  }

  addScrollListeners() {
    let scroller;

    this.tick = core.requestAnimationFrame;

    if(this.settings.height) {
      this.prevScrollTop = this.container.scrollTop;
      this.prevScrollLeft = this.container.scrollLeft;
    } else {
      this.prevScrollTop = window.scrollY;
          this.prevScrollLeft = window.scrollX;
    }

    this.scrollDeltaVert = 0;
    this.scrollDeltaHorz = 0;

    if(this.settings.height) {
      scroller = this.container;
          this.scrollTop = this.container.scrollTop;
          this.scrollLeft = this.container.scrollLeft;
    } else {
      scroller = window;
          this.scrollTop = window.scrollY;
          this.scrollLeft = window.scrollX;
    }

    scroller.addEventListener("scroll", this.onScroll.bind(this));

    window.addEventListener('unload', e => {
      this.ignore = true;
      this.destroy();
    });

    // this.tick.call(window, this.onScroll.bind(this));

    this.scrolled = false;

  }

  onScroll() {

    // if(!this.ignore) {

      if(this.settings.height) {
          scrollTop = this.container.scrollTop;
          scrollLeft = this.container.scrollLeft;
        } else {
          scrollTop = window.scrollY;
              scrollLeft = window.scrollX;
        }

          this.scrollTop = scrollTop;
          this.scrollLeft = scrollLeft;

      if(!this.ignore) {

          if((this.scrollDeltaVert === 0 &&
               this.scrollDeltaHorz === 0) ||
               this.scrollDeltaVert > this.settings.offsetDelta ||
               this.scrollDeltaHorz > this.settings.offsetDelta) {

                  // this.q.enqueue(this.check.bind(this));
                  this.check();

                  this.scrollDeltaVert = 0;
              this.scrollDeltaHorz = 0;

                  this.trigger("scroll", {
                top: scrollTop,
                left: scrollLeft
              });

              }

          } else {
          this.ignore = false;
          }

      this.scrollDeltaVert += Math.abs(scrollTop-this.prevScrollTop);
      this.scrollDeltaHorz += Math.abs(scrollLeft-this.prevScrollLeft);

          this.prevScrollTop = scrollTop;
          this.prevScrollLeft = scrollLeft;

      clearTimeout(this.scrollTimeout);
          this.scrollTimeout = setTimeout(() => {
              this.scrollDeltaVert = 0;
          this.scrollDeltaHorz = 0;
          }, 150);


      this.scrolled = false;
    // }

    // this.tick.call(window, this.onScroll.bind(this));

  }

  //  ContinuousViewManager.prototype.resizeView = function(view) {
  //
  // 	if(this.settings.axis === "horizontal") {
  // 		view.lock("height", this.stage.width, this.stage.height);
  // 	} else {
  // 		view.lock("width", this.stage.width, this.stage.height);
  // 	}
  //
  // };

  currentLocation() {

    const visible = this.visible();
    let startPage, endPage;

    const container = this.container.getBoundingClientRect();

    if(visible.length === 1) {
      return this.mapping.page(visible[0]);
    }

    if(visible.length > 1) {

      startPage = this.mapping.page(visible[0]);
      endPage = this.mapping.page(visible[visible.length-1]);

      return {
        start: startPage.start,
        end: endPage.end
      };
    }

  }
}

// subclass extends superclass
ContinuousViewManager.prototype = Object.create(SingleViewManager.prototype);
ContinuousViewManager.prototype.constructor = ContinuousViewManager;


export default ContinuousViewManager;
