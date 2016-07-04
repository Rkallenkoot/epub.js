import RSVP from 'rsvp';
import core from './core';
import EpubCFI from './epubcfi';

class Contents {
  constructor(doc, content) {
    // Blank Cfi for Parsing
    this.epubcfi = new EpubCFI();

    this.document = doc;
    this.documentElement =  this.document.documentElement;
    this.content = content || this.document.body;
    this.window = this.document.defaultView;
    // Dom events to listen for
    this.listenedEvents = ["keydown", "keyup", "keypressed", "mouseup", "mousedown", "click", "touchend", "touchstart"];

  }

  width(w) {

    if (w && core.isNumber(w)) {
      w = `${w}px`;
    }

    if (w) {
      this.documentElement.style.width = w;
      this.content.style.width = w;
    }

    return this.window.getComputedStyle(this.documentElement)['width'];


  }

  height(h) {

    if (h && core.isNumber(h)) {
      h = `${h}px`;
    }

    if (h) {
      this.documentElement.style.height = h;
      this.content.style.height = h;
    }

    return this.window.getComputedStyle(this.documentElement)['height'];

  }

  textWidth() {
    let width;
    const range = this.document.createRange();

    // Select the contents of frame
    range.selectNodeContents(this.content);

    // get the width of the text content
    width = range.getBoundingClientRect().width;
    return width;

  }

  textHeight() {
    let height;
    const range = this.document.createRange();


    range.selectNodeContents(this.content);

    height = range.getBoundingClientRect().height;

    return height;
  }

  scrollWidth() {
    const width = this.documentElement.scrollWidth;

    return width;
  }

  scrollHeight() {
    const height = this.documentElement.scrollHeight;

    return height;
  }

  overflow(overflow) {

    if (overflow) {
      this.documentElement.style.overflow = overflow;
    }

    return this.window.getComputedStyle(this.documentElement)['overflow'];
  }

  css(property, value) {

    if (value) {
      this.content.style[property] = value;
    }

    return this.window.getComputedStyle(this.content)[property];
  }

  viewport() {
    let width, height;
    const $doc = this.document.documentElement;
    const $viewport = $doc.querySelector("[name=viewport");

    /**
    * check for the viewport size
    * <meta name="viewport" content="width=1024,height=697" />
    */
    if($viewport && $viewport.hasAttribute("content")) {
      content = $viewport.getAttribute("content");
      contents = content.split(',');
      if(contents[0]){
        width = contents[0].replace("width=", '');
      }
      if(contents[1]){
        height = contents[1].replace("height=", '');
      }
    }

    return {
      width,
      height
    };
  }

  // Contents.prototype.layout = function(layoutFunc) {
  //
  //   this.iframe.style.display = "inline-block";
  //
  //   // Reset Body Styles
  //   this.content.style.margin = "0";
  //   //this.document.body.style.display = "inline-block";
  //   //this.document.documentElement.style.width = "auto";
  //
  //   if(layoutFunc){
  //     layoutFunc(this);
  //   }
  //
  //   this.onLayout(this);
  //
  // };
  //
  // Contents.prototype.onLayout = function(view) {
  //   // stub
  // };

  expand() {
    //TODO: this should just report resize
  }

  listeners() {

    this.imageLoadListeners();

    this.mediaQueryListeners();

    this.addEventListeners();

    this.addSelectionListeners();
  }

  removeListeners() {

    this.removeEventListeners();

    this.removeSelectionListeners();
  }

  resizeListenters() {
    // Test size again
    clearTimeout(this.expanding);
    this.expanding = setTimeout(this.expand.bind(this), 350);
  }

  //https://github.com/tylergaw/media-query-events/blob/master/js/mq-events.js
  mediaQueryListeners() {
      const sheets = this.document.styleSheets;
      const mediaChangeHandler = m => {
        if(m.matches && !this._expanding) {
          setTimeout(this.expand.bind(this), 1);
          // this.expand();
        }
      };

      for (let i = 0; i < sheets.length; i += 1) {
          const rules = sheets[i].cssRules;
          if(!rules) return; // Stylesheets changed
          for (let j = 0; j < rules.length; j += 1) {
              //if (rules[j].constructor === CSSMediaRule) {
              if(rules[j].media){
                  const mql = this.window.matchMedia(rules[j].media.mediaText);
                  mql.addListener(mediaChangeHandler);
                  //mql.onchange = mediaChangeHandler;
              }
          }
      }
  }

  observe(target) {
    const renderer = this;

    // create an observer instance
    const observer = new MutationObserver(mutations => {
      if(renderer._expanding) {
        renderer.expand();
      }
      // mutations.forEach(function(mutation) {
      //   console.log(mutation);
      // });
    });

    // configuration of the observer:
    const config = { attributes: true, childList: true, characterData: true, subtree: true };

    // pass in the target node, as well as the observer options
    observer.observe(target, config);

    return observer;
  }

  imageLoadListeners(target) {
    const images = this.contentDocument.querySelectorAll("img");
    let img;
    for (let i = 0; i < images.length; i++) {
      img = images[i];

      if (typeof img.naturalWidth !== "undefined" &&
          img.naturalWidth === 0) {
        img.onload = this.expand.bind(this);
      }
    }
  }

  root() {
    if(!this.document) return null;
    return this.document.documentElement;
  }

  locationOf(target, ignoreClass) {
    let targetPos = {"left": 0, "top": 0};

    if(!this.document) return;

    if(this.epubcfi.isCfiString(target)) {
      range = new EpubCFI(cfi).toRange(this.document, ignoreClass);

      if(range) {
        if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
          targetPos = range.startContainer.getBoundingClientRect();
        } else {
          targetPos = range.getBoundingClientRect();
        }
      }

    } else if(typeof target === "string" &&
      target.indexOf("#") > -1) {

      id = target.substring(target.indexOf("#")+1);
      el = this.document.getElementById(id);

      if(el) {
        targetPos = el.getBoundingClientRect();
      }
    }

    return targetPos;
  }

  addStylesheet(src) {
    return new RSVP.Promise((resolve, reject) => {
      let $stylesheet;
      let ready = false;

      if(!this.document) {
        resolve(false);
        return;
      }

      $stylesheet = this.document.createElement('link');
      $stylesheet.type = 'text/css';
      $stylesheet.rel = "stylesheet";
      $stylesheet.href = src;
      $stylesheet.onload = $stylesheet.onreadystatechange = function() {
        if ( !ready && (!this.readyState || this.readyState == 'complete') ) {
          ready = true;
          // Let apply
          setTimeout(() => {
            resolve(true);
          }, 1);
        }
      };

      this.document.head.appendChild($stylesheet);

    });
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule
  addStylesheetRules(rules) {
    let styleEl;
    let styleSheet;

    if(!this.document) return;

    styleEl = this.document.createElement('style');

    // Append style element to head
    this.document.head.appendChild(styleEl);

    // Grab style sheet
    styleSheet = styleEl.sheet;

    for (let i = 0, rl = rules.length; i < rl; i++) {
      let j = 1;
      let rule = rules[i];
      const selector = rules[i][0];
      let propStr = '';
      // If the second argument of a rule is an array of arrays, correct our variables.
      if (Object.prototype.toString.call(rule[1][0]) === '[object Array]') {
        rule = rule[1];
        j = 0;
      }

      for (const pl = rule.length; j < pl; j++) {
        const prop = rule[j];
        propStr += `${prop[0]}:${prop[1]}${prop[2] ? ' !important' : ''};\n`;
      }

      // Insert CSS Rule
      styleSheet.insertRule(`${selector}{${propStr}}`, styleSheet.cssRules.length);
    }
  }

  addScript(src) {

    return new RSVP.Promise((resolve, reject) => {
      let $script;
      let ready = false;

      if(!this.document) {
        resolve(false);
        return;
      }

      $script = this.document.createElement('script');
      $script.type = 'text/javascript';
      $script.async = true;
      $script.src = src;
      $script.onload = $script.onreadystatechange = function() {
        if ( !ready && (!this.readyState || this.readyState == 'complete') ) {
          ready = true;
          setTimeout(() => {
            resolve(true);
          }, 1);
        }
      };

      this.document.head.appendChild($script);

    });
  }

  addEventListeners() {
    if(!this.document) {
      return;
    }
    this.listenedEvents.forEach(function(eventName){
      this.document.addEventListener(eventName, this.triggerEvent.bind(this), false);
    }, this);

  }

  removeEventListeners() {
    if(!this.document) {
      return;
    }
    this.listenedEvents.forEach(function(eventName){
      this.document.removeEventListener(eventName, this.triggerEvent, false);
    }, this);

  }

  // Pass browser events
  triggerEvent(e) {
    this.trigger(e.type, e);
  }

  addSelectionListeners() {
    if(!this.document) {
      return;
    }
    this.document.addEventListener("selectionchange", this.onSelectionChange.bind(this), false);
  }

  removeSelectionListeners() {
    if(!this.document) {
      return;
    }
    this.document.removeEventListener("selectionchange", this.onSelectionChange, false);
  }

  onSelectionChange(e) {
    if (this.selectionEndTimeout) {
      clearTimeout(this.selectionEndTimeout);
    }
    this.selectionEndTimeout = setTimeout(() => {
      const selection = this.window.getSelection();
      this.triggerSelectedEvent(selection);
    }, 500);
  }

  triggerSelectedEvent(selection) {
      let range, cfirange;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if(!range.collapsed) {
        cfirange = this.section.cfiFromRange(range);
        this.trigger("selected", cfirange);
        this.trigger("selectedRange", range);
      }
    }
  }

  range(_cfi, ignoreClass) {
    const cfi = new EpubCFI(_cfi);
    return cfi.toRange(this.document, ignoreClass);
  }

  map(layout) {
    const map = new Map(layout);
    return map.section();
  }

  destroy() {
    // Stop observing
    if(this.observer) {
      this.observer.disconnect();
    }

    this.removeListeners();

  }
}

RSVP.EventTarget.mixin(Contents.prototype);

export default Contents;
