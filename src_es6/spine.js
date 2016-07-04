import RSVP from 'rsvp';
import core from './core';
import EpubCFI from './epubcfi';
import Hook from './hook';
import Section from './section';
import replacements from './replacements';

class Spine {
  constructor(_request) {
    this.request = _request;
    this.spineItems = [];
    this.spineByHref = {};
    this.spineById = {};

    this.hooks = {};
    this.hooks.serialize = new Hook();
    this.hooks.content = new Hook();

    // Register replacements
    this.hooks.content.register(replacements.base);
    this.hooks.content.register(replacements.canonical);

    this.epubcfi = new EpubCFI();

    this.loaded = false;
  }

  load(_package) {

    this.items = _package.spine;
    this.manifest = _package.manifest;
    this.spineNodeIndex = _package.spineNodeIndex;
    this.baseUrl = _package.baseUrl || '';
    this.length = this.items.length;

    this.items.forEach((item, index) => {
      let href, url;
      const manifestItem = this.manifest[item.idref];
      let spineItem;

      item.cfiBase = this.epubcfi.generateChapterComponent(this.spineNodeIndex, item.index, item.idref);

      if(manifestItem) {
        item.href = manifestItem.href;
        item.url = this.baseUrl + item.href;

        if(manifestItem.properties.length){
          item.properties.push(...manifestItem.properties);
        }
      }

      // if(index > 0) {
        item.prev = () => this.get(index-1);
      // }

      // if(index+1 < this.items.length) {
        item.next = () => this.get(index+1);
      // }

      spineItem = new Section(item, this.hooks);

      this.append(spineItem);


    });

    this.loaded = true;
  }

  // book.spine.get();
  // book.spine.get(1);
  // book.spine.get("chap1.html");
  // book.spine.get("#id1234");
  get(target) {
    let index = 0;

    if(this.epubcfi.isCfiString(target)) {
      cfi = new EpubCFI(target);
      index = cfi.spinePos;
    } else if(target && (typeof target === "number" || isNaN(target) === false)){
      index = target;
    } else if(target && target.indexOf("#") === 0) {
      index = this.spineById[target.substring(1)];
    } else if(target) {
      // Remove fragments
      target = target.split("#")[0];
      index = this.spineByHref[target];
    }

    return this.spineItems[index] || null;
  }

  append(section) {
    const index = this.spineItems.length;
    section.index = index;

    this.spineItems.push(section);

    this.spineByHref[section.href] = index;
    this.spineById[section.idref] = index;

    return index;
  }

  prepend(section) {
    const index = this.spineItems.unshift(section);
    this.spineByHref[section.href] = 0;
    this.spineById[section.idref] = 0;

    // Re-index
    this.spineItems.forEach((item, index) => {
      item.index = index;
    });

    return 0;
  }

  insert(section, index) {

  }

  remove(section) {
    const index = this.spineItems.indexOf(section);

    if(index > -1) {
      delete this.spineByHref[section.href];
      delete this.spineById[section.idref];

      return this.spineItems.splice(index, 1);
    }
  }

  each() {
      return this.spineItems.forEach(...arguments);
  }
}

export default Spine;
