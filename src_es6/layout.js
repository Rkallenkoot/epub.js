import core from './core';

class Reflowable {
  constructor() {
    this.columnAxis = core.prefixed('columnAxis');
    this.columnGap = core.prefixed('columnGap');
    this.columnWidth = core.prefixed('columnWidth');
    this.columnFill = core.prefixed('columnFill');

    this.width = 0;
    this.height = 0;
    this.spread = 0;
    this.delta = 0;

    this.column = 0;
    this.gap = 0;
    this.divisor = 0;

    this.name = "reflowable";
  }

  calculate(_width, _height, _gap, _devisor) {

    const divisor = _devisor || 1;

    //-- Check the width and create even width columns
    const fullWidth = Math.floor(_width);
    const width = _width; //(fullWidth % 2 === 0) ? fullWidth : fullWidth - 1;

    const section = Math.floor(width / 8);
    const gap = (_gap >= 0) ? _gap : ((section % 2 === 0) ? section : section - 1);


    let colWidth;
    let spreadWidth;
    let delta;

    //-- Double Page
    if(divisor > 1) {
      colWidth = Math.floor((width - gap) / divisor);
    } else {
      colWidth = width;
    }

    spreadWidth = colWidth * divisor;

    delta = (colWidth + gap) * divisor;

    this.columnAxis = core.prefixed('columnAxis');
    this.columnGap = core.prefixed('columnGap');
    this.columnWidth = core.prefixed('columnWidth');
    this.columnFill = core.prefixed('columnFill');

    this.width = width;
    this.height = _height;
    this.spread = spreadWidth;
    this.delta = delta;

    this.column = colWidth;
    this.gap = gap;
    this.divisor = divisor;

  }

  format(contents) {

    // var $doc = doc.documentElement;
    // var $body = doc.body;//view.document.querySelector("body");

    // $doc.style.overflow = "hidden";
    contents.overflow("hidden");

    // Must be set to the new calculated width or the columns will be off
    // $body.style.width = this.width + "px";
    // $doc.style.width = this.width + "px";
    contents.width(this.width);

    //-- Adjust height
    // $body.style.height = this.height + "px";
    contents.height(this.height);

    contents.css("margin", "0");

    //-- Add columns
    // $body.style[this.columnAxis] = "horizontal";
    contents.css(this.columnAxis, "horizontal");
    // $body.style[this.columnFill] = "auto";
    contents.css(this.columnFill, "auto");
    // $body.style[this.columnGap] = this.gap+"px";
    contents.css(this.columnGap, `${this.gap}px`);
    // $body.style[this.columnWidth] = this.column +"px";
    contents.css(this.columnWidth, `${this.column}px`);

    // Add extra padding for the gap between this and the next view
    // view.iframe.style.marginRight = this.gap+"px";
  }

  count(totalWidth) {
    // var totalWidth = view.root().scrollWidth;
    const spreads = Math.ceil(totalWidth / this.spread);

    return {
      spreads,
      pages : spreads * this.divisor
    };
  }
}

class Fixed {
  constructor(_width, _height) {
    this.width = 0;
    this.height = 0;

    this.name = "pre-paginated";

  }

  calculate(_width, _height) {
    this.width = _width;
    this.height = _height;
  }

  format(contents) {
    const viewport = contents.viewport();
    // var width, height;
    //
    // var $doc = doc.documentElement;
    // var $viewport = $doc.querySelector("[name=viewport");
    //
    // /**
    // * check for the viewport size
    // * <meta name="viewport" content="width=1024,height=697" />
    // */
    // if($viewport && $viewport.hasAttribute("content")) {
    //   content = $viewport.getAttribute("content");
    //   contents = content.split(',');
    //   if(contents[0]){
    //     width = contents[0].replace("width=", '');
    //   }
    //   if(contents[1]){
    //     height = contents[1].replace("height=", '');
    //   }
    // }

    //-- Adjust width and height
    // $doc.style.width =  width + "px" || "auto";
    // $doc.style.height =  height + "px" || "auto";
    if (viewport.width) {
      contents.width(viewport.width);
    }

    if (viewport.height) {
      contents.height(viewport.height);
    }

    //-- Scroll
    // $doc.style.overflow = "auto";
    contents.overflow("auto");

  }

  count() {
    return {
      spreads : 1,
      pages : 1
    };
  }
}

class Scroll {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.spread = 0;
    this.column = 0;
    this.gap = 0;
    this.name = "scrolled";
  }

  calculate(_width, _height) {
    this.spread = _width;
    this.column = _width;
    this.gap = 0;
  }

  format(contents) {

    // var $doc = doc.documentElement;

    // $doc.style.width = "auto";
    // $doc.style.height = "auto";
    // contents.width("auto");
    contents.height("auto");

  }

  count() {
    return {
      spreads : 1,
      pages : 1
    };
  }
}

export default {
  'Reflowable': Reflowable,
  'Fixed': Fixed,
  'Scroll': Scroll
};
