import core from './core';
import Queue from './queue';
import EpubCFI from './epubcfi';
import RSVP from 'rsvp';

class Locations {
  constructor(spine, request) {
    this.spine = spine;
    this.request = request;

    this.q = new Queue(this);
    this.epubcfi = new EpubCFI();

    this._locations = [];
    this.total = 0;

    this.break = 150;

    this._current = 0;

  }

  // Load all of sections in the book
  generate(chars) {

    if (chars) {
      this.break = chars;
    }

    this.q.pause();

    this.spine.each(section => {

      this.q.enqueue(this.process, section);

    });

    return this.q.run().then(() => {
      this.total = this._locations.length-1;

      if (this._currentCfi) {
        this.currentLocation = this._currentCfi;
      }

      return this._locations;
      // console.log(this.precentage(this.book.rendition.location.start), this.precentage(this.book.rendition.location.end));
    });

  }

  process(section) {

    return section.load(this.request)
      .then(contents => {

        let range;
        const doc = contents.ownerDocument;
        let counter = 0;

        this.sprint(contents, node => {
          const len = node.length;
          let dist;
          let pos = 0;

          // Start range
          if (counter == 0) {
            range = doc.createRange();
            range.setStart(node, 0);
          }

          dist = this.break - counter;

          // Node is smaller than a break
          if(dist > len){
            counter += len;
            pos = len;
          }

          while (pos < len) {
            counter = this.break;
            pos += this.break;

            // Gone over
            if(pos >= len){
              // Continue counter for next node
              counter = len - (pos - this.break);

            // At End
            } else {
              // End the previous range
              range.setEnd(node, pos);
              cfi = section.cfiFromRange(range);
              this._locations.push(cfi);
              counter = 0;

              // Start new range
              pos += 1;
              range = doc.createRange();
              range.setStart(node, pos);
            }
          }



        });

        // Close remaining
        if (range) {
          range.setEnd(prev, prev.length);
          cfi = section.cfiFromRange(range);
          this._locations.push(cfi)
          counter = 0;
        }

      });

  }

  sprint(root, func) {
      const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);

      while ((node = treeWalker.nextNode())) {
          func(node);
      }

  }

  locationFromCfi(cfi) {
    // Check if the location has not been set yet
      if(this._locations.length === 0) {
          return -1;
      }

    return core.locationOf(cfi, this._locations, this.epubcfi.compare);
  }

  precentageFromCfi(cfi) {
    // Find closest cfi
    const loc = this.locationFromCfi(cfi);
    // Get percentage in total
    return this.precentageFromLocation(loc);
  }

  percentageFromLocation(loc) {
    if (!loc || !this.total) {
      return 0;
    }
    return (loc / this.total);
  }

  cfiFromLocation(loc) {
      let cfi = -1;
      // check that pg is an int
      if(typeof loc != "number"){
          loc = parseInt(pg);
      }

      if(loc >= 0 && loc < this._locations.length) {
          cfi = this._locations[loc];
      }

      return cfi;
  }

  cfiFromPercentage(value) {
    const percentage = (value > 1) ? value / 100 : value; // Normalize value to 0-1
      const loc = Math.ceil(this.total * percentage);

      return this.cfiFromLocation(loc);
  }

  load(locations) {
      this._locations = JSON.parse(locations);
    this.total = this._locations.length-1;
    return this._locations;
  }

  save(json) {
      return JSON.stringify(this._locations);
  }

  getCurrent(json) {
      return this._current;
  }

  setCurrent(curr) {
    let loc;

    if(typeof curr == "string"){
      this._currentCfi = curr;
    } else if (typeof curr == "number") {
      this._current = curr;
    } else {
      return;
    }

    if(this._locations.length === 0) {
      return;
      }

    if(typeof curr == "string"){
      loc = this.locationFromCfi(curr);
      this._current = loc;
    } else {
      loc = curr;
    }

    this.trigger("changed", {
      percentage: this.precentageFromLocation(loc)
    });
  }

  get currentLocation() {
    return this._current;
  }

  set currentLocation(curr) {
    this.setCurrent(curr);
  }
}

RSVP.EventTarget.mixin(Locations.prototype);

export default Locations;
