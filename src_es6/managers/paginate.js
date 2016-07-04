import RSVP from 'rsvp';
import core from '../core';
import ContinuousViewManager from './continuous';
import Map from '../map';
import Layout from '../layout';

class PaginatedViewManager {
  constructor(options) {

    ContinuousViewManager.apply(this, arguments); // call super constructor.

    this.settings = core.extend(this.settings || {}, {
      width: 600,
      height: 400,
      axis: "horizontal",
      forceSingle: false,
      minSpreadWidth: 800, //-- overridden by spread: none (never) / both (always)
      gap: "auto", //-- "auto" or int
      overflow: "hidden",
      infinite: false
    });

    core.defaults(this.settings, options.settings || {});

    this.isForcedSingle = this.settings.forceSingle;

    this.viewSettings.axis = this.settings.axis;

    // this.start();
  }

  determineSpreads(cutoff) {
    if(this.isForcedSingle || !cutoff || this.stage.bounds().width < cutoff) {
      return 1; //-- Single Page
    }else{
      return 2; //-- Double Page
    }
  }

  forceSingle(bool) {
    if(bool === false) {
      this.isForcedSingle = false;
      // this.spreads = false;
    } else {
      this.isForcedSingle = true;
      // this.spreads = this.determineSpreads(this.minSpreadWidth);
    }
    this.applyLayoutMethod();
  }

  addEventListeners() {
    // On display
    // this.layoutSettings = this.reconcileLayoutSettings(globalLayout, chapter.properties);
    // this.layoutMethod = this.determineLayout(this.layoutSettings);
    // this.layout = new EPUBJS.Layout[this.layoutMethod]();
    //this.hooks.display.register(this.registerLayoutMethod.bind(this));
    // this.hooks.display.register(this.reportLocation);
    // this.on('displayed', this.reportLocation.bind(this));

    // this.hooks.content.register(this.adjustImages.bind(this));

    this.currentPage = 0;

    window.addEventListener('unload', e => {
      this.ignore = true;
      this.destroy();
    });

  }

  applyLayoutMethod() {
    //var task = new RSVP.defer();

    // this.spreads = this.determineSpreads(this.settings.minSpreadWidth);

    this.layout = new Layout.Reflowable();

    this.updateLayout();

    this.setLayout(this.layout);

    this.stage.addStyleRules("iframe", [{"margin-right" : `${this.layout.gap}px`}]);

    // Set the look ahead offset for what is visible
    this.settings.offeset = this.layout.delta;

    this.mapping = new Map(this.layout);

    // this.hooks.layout.register(this.layout.format.bind(this));

    //task.resolve();
    //return task.promise;
    // return layout;
  }

  updateLayout() {

    this.spreads = this.determineSpreads(this.settings.minSpreadWidth);

    this.layout.calculate(
      this._stageSize.width,
      this._stageSize.height,
      this.settings.gap,
      this.spreads
    );

    this.settings.offset = this.layout.delta;
  }

  moveTo(offset) {
    const dist = Math.floor(offset.left / this.layout.delta) * this.layout.delta;
    return this.check(0, dist+this.settings.offset).then(() => {
      this.scrollBy(dist, 0);
    });
  }

  page(pg) {

    // this.currentPage = pg;
    // this.renderer.infinite.scrollTo(this.currentPage * this.formated.pageWidth, 0);
    //-- Return false if page is greater than the total
    // return false;
  }

  next() {
      this.scrollLeft = this.container.scrollLeft;

      if(this.container.scrollLeft +
         this.container.offsetWidth +
         this.layout.delta < this.container.scrollWidth) {
        this.scrollBy(this.layout.delta, 0);
      } else {
        // this.scrollTo(this.container.scrollWidth, 0);
        this.scrollTo(this.container.scrollWidth - this.layout.delta, 0);
      }
      // this.reportLocation();
      this.check();

  }

  prev() {

      this.scrollBy(-this.layout.delta, 0);
      // this.reportLocation();
      this.check();

  }

  // Paginate.prototype.reportLocation = function(){
  //   return this.q.enqueue(function(){
  //     this.location = this.currentLocation();
  //     this.trigger("locationChanged", this.location);
  //   }.bind(this));
  // };

  currentLocation() {
    const visible = this.visible();
    let startA, startB, endA, endB;
    let pageLeft, pageRight;
    const container = this.container.getBoundingClientRect();

    if(visible.length === 1) {
      startA = container.left - visible[0].position().left;
      endA = startA + this.layout.spread;

      return this.mapping.page(visible[0], startA, endA);
    }

    if(visible.length > 1) {

      // Left Col
      startA = container.left - visible[0].position().left;
      endA = startA + this.layout.column;

      // Right Col
      startB = container.left + this.layout.spread - visible[visible.length-1].position().left;
      endB = startB + this.layout.column;

      pageLeft = this.mapping.page(visible[0], startA, endA);
      pageRight = this.mapping.page(visible[visible.length-1], startB, endB);

      return {
        start: pageLeft.start,
        end: pageRight.end
      };
    }
  }

  resize(width, height) {
    // Clear the queue
    this.q.clear();

    this.bounds = this.stage.bounds(width, height);

    // this.updateLayout();

    // if(this.location) {
    //   this.display(this.location.start);
    // }

    this.trigger("resized", {
      width: this.stage.width,
      height: this.stage.height
    });

  }

  onResized(e) {

    this.views.clear();

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.resize();
    }, 150);
  }
}

PaginatedViewManager.prototype = Object.create(ContinuousViewManager.prototype);
PaginatedViewManager.prototype.constructor = PaginatedViewManager;


export default PaginatedViewManager;
