import RSVP from 'rsvp';
import core from '../core';
import Stage from '../stage';
import Views from '../views';
import EpubCFI from '../epubcfi';
import Layout from '../layout';
import Mapping from '../map';

class SingleViewManager {
    constructor(options) {

        this.View = options.view;
        this.request = options.request;
        this.q = options.queue;

        this.settings = core.extend(this.settings || {}, {
            infinite: true,
            hidden: false,
            width: false,
            height: null,
            globalLayoutProperties : { layout: 'reflowable', spread: 'auto', orientation: 'auto'},
            // layout: null,
            axis: "vertical",
            ignoreClass: ''
        });

        core.defaults(this.settings, options.settings || {});

        this.viewSettings = {
            ignoreClass: this.settings.ignoreClass,
            globalLayoutProperties: this.settings.globalLayoutProperties,
            axis: this.settings.axis,
            layout: this.layout,
            width: 0,
            height: 0
        };

    }

    render(element, size) {

        // Save the stage
        this.stage = new Stage({
            width: size.width,
            height: size.height,
            overflow: this.settings.overflow,
            hidden: this.settings.hidden,
            axis: this.settings.axis
        });

        this.stage.attachTo(element);

        // Get this stage container div
        this.container = this.stage.getContainer();

        // Views array methods
        this.views = new Views(this.container);

        // Calculate Stage Size
        this._bounds = this.bounds();
        this._stageSize = this.stage.size();

        // Set the dimensions for views
        this.viewSettings.width = this._stageSize.width;
        this.viewSettings.height = this._stageSize.height;

        // Function to handle a resize event.
        // Will only attach if width and height are both fixed.
        this.stage.onResize(this.onResized.bind(this));

        // Add Event Listeners
        this.addEventListeners();

        // Add Layout method
        this.applyLayoutMethod();
    }

    addEventListeners() {

    }

    onResized(e) {
        this.resize();
    }

    resize(width, height) {

        this._stageSize = this.stage.size(width, height);
        this._bounds = this.bounds();

        // Update for new views
        this.viewSettings.width = this._stageSize.width;
        this.viewSettings.height = this._stageSize.height;

        // Update for existing views
        this.views.each(view => {
            view.size(this._stageSize.width, this._stageSize.height);
        });

        this.trigger("resized", {
            width: this._stageSize.width,
            height: this._stageSize.height
        });

    }

    setLayout(layout) {

        this.viewSettings.layout = layout;

        this.views.each(view => {
            view.setLayout(layout);
        });

    }

    createView(section) {
        return new this.View(section, this.viewSettings);
    }

    display(section, target) {

        const displaying = new RSVP.defer();
        const displayed = displaying.promise;

        const isCfi = EpubCFI().isCfiString(target);

        // Check to make sure the section we want isn't already shown
        const visible = this.views.find(section);

        // View is already shown, just move to correct location
        if(visible && target) {
            offset = visible.locationOf(target);
            this.moveTo(offset);
            displaying.resolve();
            return displayed;
        }

        // Hide all current views
        this.views.hide();

        this.views.clear();

        // Create a new view
        view = this.createView(section);

        return this.add(view)
            .then(() => {

                // Move to correct place within the section, if needed
                if(target) {
                    offset = view.locationOf(target);
                    this.moveTo(offset);
                }

            })
            // .then(function(){
            // 	return this.hooks.display.trigger(view);
            // }.bind(this))
            .then(() => {
                this.views.show();
            });

    }

    afterDisplayed(view) {
        this.trigger("added", view);
    }

    afterResized(view) {
        this.trigger("resize", view.section);
    }

    moveTo(offset) {
        this.scrollTo(offset.left, offset.top);
    }

    add(view) {

        this.views.append(view);

        // view.on("shown", this.afterDisplayed.bind(this));
        view.onDisplayed = this.afterDisplayed.bind(this);
        view.onResize = this.afterResized.bind(this);

        return view.display(this.request);
        // return this.renderer(view, this.views.hidden);
    }

    // SingleViewManager.prototype.resizeView = function(view) {
    //
    // 	if(this.settings.globalLayoutProperties.layout === "pre-paginated") {
    // 		view.lock("both", this.bounds.width, this.bounds.height);
    // 	} else {
    // 		view.lock("width", this.bounds.width, this.bounds.height);
    // 	}
    //
    // };

    next() {
        let next;
        let view;

        if(!this.views.length) return;

        next = this.views.last().section.next();

        if(next) {
            this.views.clear();

            view = this.createView(next);
            return this.add(view)
            .then(() => {
                this.views.show();
            });
        }
    }

    prev() {
        let prev;
        let view;

        if(!this.views.length) return;

        prev = this.views.first().section.prev();
        if(prev) {
            this.views.clear();

            view = this.createView(prev);
            return this.add(view)
            .then(() => {
                this.views.show();
            });
        }
    }

    current() {
        const visible = this.visible();
        if(visible.length){
            // Current is the last visible view
            return visible[visible.length-1];
        }
      return null;
    }

    currentLocation() {
      let view;
      let start, end;

      if(this.views.length) {
        view = this.views.first();
        start = container.left - view.position().left;
        end = start + this.layout.spread;

        return this.mapping.page(view);
      }

    }

    isVisible(view, offsetPrev, offsetNext, _container) {
        const position = view.position();
        const container = _container || this.bounds();

        if(this.settings.axis === "horizontal" &&
            position.right > container.left - offsetPrev &&
            position.left < container.right + offsetNext) {

            return true;

      } else if(this.settings.axis === "vertical" &&
        position.bottom > container.top - offsetPrev &&
            position.top < container.bottom + offsetNext) {

            return true;
      }

        return false;

    }

    visible() {
        return this.views.displayed();
        /*
        var container = this.stage.bounds();
        var views = this.views;
        var viewsLength = views.length;
      var visible = [];
      var isVisible;
      var view;

      for (var i = 0; i < viewsLength; i++) {
        view = views[i];
        isVisible = this.isVisible(view, 0, 0, container);

        if(isVisible === true) {
          visible.push(view);
        }

      }
      return visible;
        */
    }

    scrollBy(x, y, silent) {
      if(silent) {
        this.ignore = true;
      }

      if(this.settings.height) {

        if(x) this.container.scrollLeft += x;
        if(y) this.container.scrollTop += y;

      } else {
        window.scrollBy(x,y);
      }
      // console.log("scrollBy", x, y);
      this.scrolled = true;
        this.onScroll();
    }

    scrollTo(x, y, silent) {
      if(silent) {
        this.ignore = true;
      }

      if(this.settings.height) {
        this.container.scrollLeft = x;
        this.container.scrollTop = y;
      } else {
        window.scrollTo(x,y);
      }
      // console.log("scrollTo", x, y);
      this.scrolled = true;
        this.onScroll();
      // if(this.container.scrollLeft != x){
      //   setTimeout(function() {
      //     this.scrollTo(x, y, silent);
      //   }.bind(this), 10);
      //   return;
      // };
     }

    onScroll() {

   }

    bounds() {
      let bounds;

      if(!this.settings.height || !this.container) {
        bounds = core.windowBounds();
      } else {
        bounds = this.stage.bounds();
      }

      return bounds;
    }

    applyLayoutMethod() {

       this.layout = new Layout.Scroll();
       this.calculateLayout();

       this.setLayout(this.layout);

       this.mapping = new Mapping(this.layout);
       // this.manager.layout(this.layout.format);
    }

    calculateLayout() {
       const bounds = this.stage.bounds();
       this.layout.calculate(bounds.width, bounds.height);
    }

    updateLayout() {
       this.calculateLayout();

       this.setLayout(this.layout);
    }
}

//-- Enable binding events to Manager
RSVP.EventTarget.mixin(SingleViewManager.prototype);

export default SingleViewManager;
