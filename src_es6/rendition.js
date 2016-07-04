import RSVP from 'rsvp';
import URI from 'urijs';
import core from './core';
import replace from './replacements';
import Hook from './hook';
import EpubCFI from './epubcfi';
import Queue from './queue';
import Views from './views';
import Layout from './layout';
import Map from './map';

class Rendition {
    constructor(book, options) {

        this.settings = core.extend(this.settings || {}, {
            // infinite: true,
            // hidden: false,
            width: null,
            height: null,
            // layoutOveride : null, // Default: { spread: 'reflowable', layout: 'auto', orientation: 'auto', flow: 'auto', viewport: ''},
            // axis: "vertical",
            ignoreClass: '',
            manager: "single",
            view: "iframe"
        });

        core.extend(this.settings, options);

        this.viewSettings = {
            ignoreClass: this.settings.ignoreClass
        };

        this.book = book;

        this.views = null;

        //-- Adds Hook methods to the Rendition prototype
        this.hooks = {};
        this.hooks.display = new Hook(this);
        this.hooks.serialize = new Hook(this);
        this.hooks.content = new Hook(this);
        this.hooks.layout = new Hook(this);
        this.hooks.render = new Hook(this);
        this.hooks.show = new Hook(this);

        this.hooks.content.register(replace.links.bind(this));
        this.hooks.content.register(this.passViewEvents.bind(this));

        // this.hooks.display.register(this.afterDisplay.bind(this));

      this.epubcfi = new EpubCFI();

        this.q = new Queue(this);

        this.q.enqueue(this.book.opened);

        this.q.enqueue(this.parseLayoutProperties);

        // Block the queue until rendering is started
        this.starting = new RSVP.defer();
        this.started = this.starting.promise;
        this.q.enqueue(this.started);

        // TODO: move this somewhere else
        if(this.book.archive) {
            this.replacements();
        }

        this.ViewManager = this.requireManager(this.settings.manager);
        this.View = this.requireView(this.settings.view);

        this.manager = new this.ViewManager({
            view: this.View,
            queue: this.q,
            request: this.book.request,
            settings: this.settings
        });

    }

    setManager(manager) {
        this.manager = manager;
    }

    requireManager(manager) {
        let viewManager;

        // If manager is a string, try to load from register managers,
        // or require included managers directly
        if (typeof manager === "string") {
            // Use global or require
            viewManager =  typeof ePub != "undefined" ? ePub.ViewManagers[manager] : require(`./managers/${manager}`);
        } else {
            // otherwise, assume we were passed a function
            viewManager = manager
        }

      return viewManager;
    }

    requireView(view) {
        let View;

        // If view is a string, try to load from register managers,
        // or require included managers directly
        if (typeof view == "string") {
            View = typeof ePub != "undefined" ? ePub.Views[view] : require(`./views/${view}`);
        } else {
            // otherwise, assume we were passed a function
            View = view
        }

      return View;
    }

    start() {

        // Listen for displayed views
        this.manager.on("added", this.afterDisplayed.bind(this))

        // Add Layout method
        // this.applyLayoutMethod();

        this.on('displayed', this.reportLocation.bind(this));

        // Trigger that rendering has started
        this.trigger("started");

        // Start processing queue
        this.starting.resolve();
    }

    // Call to attach the container to an element in the dom
    // Container must be attached before rendering can begin
    attachTo(element) {

        // Start rendering
        this.manager.render(element, {
            "width"  : this.settings.width,
            "height" : this.settings.height
        });

        this.start();

        // Trigger Attached
        this.trigger("attached");

    }

    display(target) {

        // if (!this.book.spine.spineItems.length > 0) {
            // Book isn't open yet
            // return this.q.enqueue(this.display, target);
        // }

        return this.q.enqueue(this._display, target);

    }

    _display(target) {
        const isCfiString = this.epubcfi.isCfiString(target);
        const displaying = new RSVP.defer();
        const displayed = displaying.promise;
        let section;
        let moveTo;

        section = this.book.spine.get(target);

        if(!section){
            displaying.reject(new Error("No Section Found"));
            return displayed;
        }

        // Trim the target fragment
        // removing the chapter
        if(!isCfiString && typeof target === "string" &&
            target.indexOf("#") > -1) {
                moveTo = target.substring(target.indexOf("#")+1);
        }

        if (isCfiString) {
            moveTo = target;
        }

        return this.manager.display(section, moveTo)
            .then(() => {
                this.trigger("displayed", section);
            });

    }

    /*
    Rendition.prototype.render = function(view, show) {

        // view.onLayout = this.layout.format.bind(this.layout);
        view.create();

        // Fit to size of the container, apply padding
        this.manager.resizeView(view);

        // Render Chain
        return view.section.render(this.book.request)
            .then(function(contents){
                return view.load(contents);
            }.bind(this))
            .then(function(doc){
                return this.hooks.content.trigger(view, this);
            }.bind(this))
            .then(function(){
                this.layout.format(view.contents);
                return this.hooks.layout.trigger(view, this);
            }.bind(this))
            .then(function(){
                return view.display();
            }.bind(this))
            .then(function(){
                return this.hooks.render.trigger(view, this);
            }.bind(this))
            .then(function(){
                if(show !== false) {
                    this.q.enqueue(function(view){
                        view.show();
                    }, view);
                }
                // this.map = new Map(view, this.layout);
                this.hooks.show.trigger(view, this);
                this.trigger("rendered", view.section);

            }.bind(this))
            .catch(function(e){
                this.trigger("loaderror", e);
            }.bind(this));

    };
    */

    afterDisplayed(view) {
        this.hooks.content.trigger(view, this);
        this.trigger("rendered", view.section);
        this.reportLocation();
    }

    onResized(size) {

        this.manager.updateLayout();

        if(this.location) {
            this.display(this.location.start);
        }

        this.trigger("resized", {
            width: size.width,
            height: size.height
        });

    }

    moveTo(offset) {
        this.manager.moveTo(offset);
    }

    next() {
        return this.q.enqueue(this.manager.next.bind(this.manager))
            .then(this.reportLocation.bind(this));
    }

    prev() {
        return this.q.enqueue(this.manager.prev.bind(this.manager))
            .then(this.reportLocation.bind(this));
    }

    //-- http://www.idpf.org/epub/fxl/
    parseLayoutProperties(_metadata) {
        const metadata = _metadata || this.book.package.metadata;
        const layout = (this.layoutOveride && this.layoutOveride.layout) || metadata.layout || "reflowable";
        const spread = (this.layoutOveride && this.layoutOveride.spread) || metadata.spread || "auto";
        const orientation = (this.layoutOveride && this.layoutOveride.orientation) || metadata.orientation || "auto";
        const flow = (this.layoutOveride && this.layoutOveride.flow) || metadata.flow || "auto";
        const viewport = (this.layoutOveride && this.layoutOveride.viewport) || metadata.viewport || "";

        this.settings.globalLayoutProperties = {
            layout,
            spread,
            orientation,
            flow,
            viewport
        };

        return this.settings.globalLayoutProperties;
    }

    /**
    * Uses the settings to determine which Layout Method is needed
    */
    // Rendition.prototype.determineLayout = function(settings){
    //   // Default is layout: reflowable & spread: auto
    //   var spreads = this.determineSpreads(this.settings.minSpreadWidth);
    //   var layoutMethod = spreads ? "ReflowableSpreads" : "Reflowable";
    //   var scroll = false;
    //
    //   if(settings.layout === "pre-paginated") {
    //
    //   }
    //
    //   if(settings.layout === "reflowable" && settings.spread === "none") {
    //
    //   }
    //
    //   if(settings.layout === "reflowable" && settings.spread === "both") {
    //
    //   }
    //
    //   this.spreads = spreads;
    //
    //   return layoutMethod;
    // };


    reportLocation() {
      return this.q.enqueue(() => {
        this.location = this.manager.currentLocation();
        this.trigger("locationChanged", this.location);
      });
    }

    destroy() {
      // Clear the queue
        this.q.clear();

        this.views.clear();

        clearTimeout(this.trimTimeout);
        if(this.settings.hidden) {
            this.element.removeChild(this.wrapper);
        } else {
            this.element.removeChild(this.container);
        }

    }

    passViewEvents(view) {
      view.contents.listenedEvents.forEach(e => {
            view.on(e, this.triggerViewEvent.bind(this));
        });

        view.on("selected", this.triggerSelectedEvent.bind(this));
    }

    triggerViewEvent(e) {
      this.trigger(e.type, e);
    }

    triggerSelectedEvent(cfirange) {
      this.trigger("selected", cfirange);
    }

    replacements() {
        // Wait for loading
        return this.q.enqueue(() => {
            // Get thes books manifest
            const manifest = this.book.package.manifest;
          const manifestArray = Object.keys(manifest).
            map(key => manifest[key]);

          // Exclude HTML
          const items = manifestArray.
            filter(item => {
              if (item.type != "application/xhtml+xml" &&
                  item.type != "text/html") {
                return true;
              }
            });

          // Only CSS
          const css = items.
            filter(item => {
              if (item.type === "text/css") {
                return true;
              }
            });

            // Css Urls
            const cssUrls = css.map(item => item.href);

            // All Assets Urls
          const urls = items.
            map(item => item.href);

            // Create blob urls for all the assets
          const processing = urls.
            map(url => {
                    const absolute = URI(url).absoluteTo(this.book.baseUrl).toString();
                    // Full url from archive base
              return this.book.archive.createUrl(absolute);
            });

            // After all the urls are created
          return RSVP.all(processing).
            then(replacementUrls => {

                    // Replace Asset Urls in the text of all css files
                    cssUrls.forEach(href => {
                        this.replaceCss(href, urls, replacementUrls);
                });

                    // Replace Asset Urls in chapters
                    // by registering a hook after the sections contents has been serialized
              this.book.spine.hooks.serialize.register((output, section) => {
                        this.replaceAssets(section, urls, replacementUrls);
              });

            }).catch(reason => {
              console.error(reason);
            });
        });
    }

    replaceCss(href, urls, replacementUrls) {
            let newUrl;
            let indexInUrls;

            // Find the absolute url of the css file
            const fileUri = URI(href);
            const absolute = fileUri.absoluteTo(this.book.baseUrl).toString();
            // Get the text of the css file from the archive
            let text = this.book.archive.getText(absolute);
            // Get asset links relative to css file
            const relUrls = urls.
                map(assetHref => {
                    const assetUri = URI(assetHref).absoluteTo(this.book.baseUrl);
                    const relative = assetUri.relativeTo(absolute).toString();
                    return relative;
                });

            // Replacements in the css text
            text = replace.substitute(text, relUrls, replacementUrls);

            // Get the new url
            newUrl = core.createBlobUrl(text, 'text/css');

            // switch the url in the replacementUrls
            indexInUrls = urls.indexOf(href);
            if (indexInUrls > -1) {
                replacementUrls[indexInUrls] = newUrl;
            }
    }

    replaceAssets(section, urls, replacementUrls) {
        const fileUri = URI(section.url);
        // Get Urls relative to current sections
        const relUrls = urls.
            map(href => {
                const assetUri = URI(href).absoluteTo(this.book.baseUrl);
                const relative = assetUri.relativeTo(fileUri).toString();
                return relative;
            });


        section.output = replace.substitute(section.output, relUrls, replacementUrls);
    }

    range(_cfi, ignoreClass) {
      const cfi = new EpubCFI(_cfi);
      const found = this.visible().filter(view => {
            if(cfi.spinePos === view.index) return true;
        });

        // Should only every return 1 item
      if (found.length) {
        return found[0].range(cfi, ignoreClass);
      }
    }

    adjustImages(view) {

      view.addStylesheetRules([
          ["img",
            ["max-width", `${this.layout.spread}px`],
            ["max-height", `${this.layout.height}px`]
          ]
      ]);
      return new RSVP.Promise((resolve, reject) => {
        // Wait to apply
        setTimeout(() => {
          resolve();
        }, 1);
      });
    }
}

//-- Enable binding events to Renderer
RSVP.EventTarget.mixin(Rendition.prototype);

export default Rendition;
