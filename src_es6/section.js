import RSVP from 'rsvp';
import URI from 'urijs';
import core from './core';
import EpubCFI from './epubcfi';
import Hook from './hook';

class Section {
  constructor(item, hooks) {
      this.idref = item.idref;
      this.linear = item.linear;
      this.properties = item.properties;
      this.index = item.index;
      this.href = item.href;
      this.url = item.url;
      this.next = item.next;
      this.prev = item.prev;

      this.cfiBase = item.cfiBase;

      if (hooks) {
        this.hooks = hooks;
      } else {
        this.hooks = {};
        this.hooks.serialize = new Hook(this);
        this.hooks.content = new Hook(this);
      }

  }

  load(_request) {
    const request = _request || this.request || require('./request');
    const loading = new RSVP.defer();
    const loaded = loading.promise;

    if(this.contents) {
      loading.resolve(this.contents);
    } else {
      request(this.url)
        .then(xml => {
          let base;
          const directory = URI(this.url).directory();

          this.document = xml;
          this.contents = xml.documentElement;

          return this.hooks.content.trigger(this.document, this);
        })
        .then(() => {
          loading.resolve(this.contents);
        })
        .catch(error => {
          loading.reject(error);
        });
    }

    return loaded;
  }

  base(_document) {
      const task = new RSVP.defer();
      const base = _document.createElement("base"); // TODO: check if exists
      let head;
      console.log(`${window.location.origin}/${this.url}`);

      base.setAttribute("href", `${window.location.origin}/${this.url}`);

      if(_document) {
        head = _document.querySelector("head");
      }
      if(head) {
        head.insertBefore(base, head.firstChild);
        task.resolve();
      } else {
        task.reject(new Error("No head to insert into"));
      }


      return task.promise;
  }

  beforeSectionLoad() {
    // Stub for a hook - replace me for now
  }

  render(_request) {
    const rendering = new RSVP.defer();
    const rendered = rendering.promise;
    this.output; // TODO: better way to return this from hooks?

    this.load(_request).
      then(contents => {
        let serializer;

        if (typeof XMLSerializer === "undefined") {
          XMLSerializer = require('xmldom').XMLSerializer;
        }
        serializer = new XMLSerializer();
        this.output = serializer.serializeToString(contents);
        return this.output;
      }).
      then(() => this.hooks.serialize.trigger(this.output, this)).
      then(() => {
        rendering.resolve(this.output);
      })
      .catch(error => {
        rendering.reject(error);
      });

    return rendered;
  }

  find(_query) {

  }

  /**
  * Reconciles the current chapters layout properies with
  * the global layout properities.
  * Takes: global layout settings object, chapter properties string
  * Returns: Object with layout properties
  */
  reconcileLayoutSettings(global) {
    //-- Get the global defaults
    const settings = {
      layout : global.layout,
      spread : global.spread,
      orientation : global.orientation
    };

    //-- Get the chapter's display type
    this.properties.forEach(prop => {
      const rendition = prop.replace("rendition:", '');
      const split = rendition.indexOf("-");
      let property, value;

      if(split != -1){
        property = rendition.slice(0, split);
        value = rendition.slice(split+1);

        settings[property] = value;
      }
    });
   return settings;
  }

  cfiFromRange(_range) {
    return new EpubCFI(_range, this.cfiBase).toString();
  }

  cfiFromElement(el) {
    return new EpubCFI(el, this.cfiBase).toString();
  }
}

export default Section;
