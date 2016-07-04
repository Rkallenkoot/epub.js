class Map {
  constructor(layout) {
    this.layout = layout;
  }

  section(view) {
    const ranges = this.findRanges(view);
    const map = this.rangeListToCfiList(view, ranges);

    return map;
  }

  page(view, start, end) {
    const root = view.contents.document.body;
    return this.rangePairToCfiPair(view.section, {
      start: this.findStart(root, start, end),
      end: this.findEnd(root, start, end)
    });
  }

  walk(root, func) {
    //var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT, null, false);
    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if ( node.data.trim().length > 0 ) {
              return NodeFilter.FILTER_ACCEPT;
            } else {
              return NodeFilter.FILTER_REJECT;
            }
        }
    }, false);
    let node;
    let result;
    while ((node = treeWalker.nextNode())) {
      result = func(node);
      if(result) break;
    }

    return result;
  }

  findRanges(view) {
    const columns = [];
    const count = this.layout.count(view);
    const column = this.layout.column;
    const gap = this.layout.gap;
    let start, end;

    for (let i = 0; i < count.pages; i++) {
      start = (column + gap) * i;
      end = (column * (i+1)) + (gap * i);
      columns.push({
        start: this.findStart(view.document.body, start, end),
        end: this.findEnd(view.document.body, start, end)
      });
    }

    return columns;
  }

  findStart(root, start, end) {
    const stack = [root];
    let $el;
    let found;
    let $prev = root;
    while (stack.length) {

      $el = stack.shift();

      found = this.walk($el, node => {
        let left, right;
        let elPos;
        let elRange;


        if(node.nodeType == Node.TEXT_NODE){
          elRange = document.createRange();
          elRange.selectNodeContents(node);
          elPos = elRange.getBoundingClientRect();
        } else {
          elPos = node.getBoundingClientRect();
        }

        left = elPos.left;
        right = elPos.right;

        if( left >= start && left <= end ) {
          return node;
        } else if (right > start) {
          return node;
        } else {
          $prev = node;
          stack.push(node);
        }

      });

      if(found) {
        return this.findTextStartRange(found, start, end);
      }

    }

    // Return last element
    return this.findTextStartRange($prev, start, end);
  }

  findEnd(root, start, end) {
    const stack = [root];
    let $el;
    let $prev = root;
    let found;

    while (stack.length) {

      $el = stack.shift();

      found = this.walk($el, node => {

        let left, right;
        let elPos;
        let elRange;


        if(node.nodeType == Node.TEXT_NODE){
          elRange = document.createRange();
          elRange.selectNodeContents(node);
          elPos = elRange.getBoundingClientRect();
        } else {
          elPos = node.getBoundingClientRect();
        }

        left = elPos.left;
        right = elPos.right;

        if(left > end && $prev) {
          return $prev;
        } else if(right > end) {
          return node;
        } else {
          $prev = node;
          stack.push(node);
        }

      });


      if(found){
        return this.findTextEndRange(found, start, end);
      }

    }

    // end of chapter
    return this.findTextEndRange($prev, start, end);
  }

  findTextStartRange(node, start, end) {
    const ranges = this.splitTextNodeIntoRanges(node);
    let prev;
    let range;
    let pos;

    for (let i = 0; i < ranges.length; i++) {
      range = ranges[i];

      pos = range.getBoundingClientRect();

      if( pos.left >= start ) {
        return range;
      }

      prev = range;

    }

    return ranges[0];
  }

  findTextEndRange(node, start, end) {
    const ranges = this.splitTextNodeIntoRanges(node);
    let prev;
    let range;
    let pos;

    for (let i = 0; i < ranges.length; i++) {
      range = ranges[i];

      pos = range.getBoundingClientRect();

      if(pos.left > end && prev) {
        return prev;
      } else if(pos.right > end) {
        return range;
      }

      prev = range;

    }

    // Ends before limit
    return ranges[ranges.length-1];

  }

  splitTextNodeIntoRanges(node, _splitter) {
    const ranges = [];
    const textContent = node.textContent || "";
    const text = textContent.trim();
    let range;
    let rect;
    let list;
    const doc = node.ownerDocument;
    const splitter = _splitter || " ";

    pos = text.indexOf(splitter);

    if(pos === -1 || node.nodeType != Node.TEXT_NODE) {
      range = doc.createRange();
      range.selectNodeContents(node);
      return [range];
    }

    range = doc.createRange();
    range.setStart(node, 0);
    range.setEnd(node, pos);
    ranges.push(range);
    range = false;

    while ( pos != -1 ) {

      pos = text.indexOf(splitter, pos + 1);
      if(pos > 0) {

        if(range) {
          range.setEnd(node, pos);
          ranges.push(range);
        }

        range = doc.createRange();
        range.setStart(node, pos+1);
      }
    }

    if(range) {
      range.setEnd(node, text.length);
      ranges.push(range);
    }

    return ranges;
  }

  rangePairToCfiPair(section, rangePair) {

    const startRange = rangePair.start;
    const endRange = rangePair.end;

    startRange.collapse(true);
    endRange.collapse(true);

    startCfi = section.cfiFromRange(startRange);
    endCfi = section.cfiFromRange(endRange);

    return {
      start: startCfi,
      end: endCfi
    };

  }

  rangeListToCfiList(view, columns) {
    const map = [];
    let rangePair, cifPair;

    for (let i = 0; i < columns.length; i++) {
      cifPair = this.rangePairToCfiPair(view.section, columns[i]);

      map.push(cifPair);

    }

    return map;
  }
}

export default Map;
