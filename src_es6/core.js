import RSVP from 'rsvp';

const requestAnimationFrame = (typeof window != 'undefined') ? (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame) : false;

function isElement(obj) {
    return !!(obj && obj.nodeType == 1);
}

// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
function uuid() {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}

// From Lodash
function values(object) {
  let index = -1;
  const props = Object.keys(object);
  const length = props.length;
  const result = Array(length);

  while (++index < length) {
    result[index] = object[props[index]];
  }
  return result;
}

function resolveUrl(base, path) {
  let url = [];
  const segments = [];
  const baseUri = uri(base);
  const pathUri = uri(path);
  let baseDirectory = baseUri.directory;
  let pathDirectory = pathUri.directory;
  let directories = [];

  let // folders = base.split("/"),
  paths;

  // if(uri.host) {
  //   return path;
  // }

  if(baseDirectory[0] === "/") {
    baseDirectory = baseDirectory.substring(1);
  }

  if(pathDirectory[pathDirectory.length-1] === "/") {
    baseDirectory = baseDirectory.substring(0, baseDirectory.length-1);
  }

  if(pathDirectory[0] === "/") {
    pathDirectory = pathDirectory.substring(1);
  }

  if(pathDirectory[pathDirectory.length-1] === "/") {
    pathDirectory = pathDirectory.substring(0, pathDirectory.length-1);
  }

  if(baseDirectory) {
    directories = baseDirectory.split("/");
  }

  paths = pathDirectory.split("/");

  paths.reverse().forEach((part, index) => {
    if(part === ".."){
      directories.pop();
    } else if(part === directories[directories.length-1]) {
      directories.pop();
      segments.unshift(part);
    } else {
      segments.unshift(part);
    }
  });

  url = [baseUri.origin];

  if(directories.length) {
    url = url.concat(directories);
  }

  if(segments) {
    url = url.concat(segments);
  }

  url = url.concat(pathUri.filename);

  return url.join("/");
}

function documentHeight() {
  return Math.max(
      document.documentElement.clientHeight,
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
  );
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function prefixed(unprefixed) {
  const vendors = ["Webkit", "Moz", "O", "ms" ], prefixes = ['-Webkit-', '-moz-', '-o-', '-ms-'], upper = unprefixed[0].toUpperCase() + unprefixed.slice(1), length = vendors.length;

  if (typeof(document) === 'undefined' || typeof(document.body.style[unprefixed]) != 'undefined') {
    return unprefixed;
  }

  for ( let i=0; i < length; i++ ) {
    if (typeof(document.body.style[vendors[i] + upper]) != 'undefined') {
      return vendors[i] + upper;
    }
  }

  return unprefixed;
}

function defaults(obj) {
  for (let i = 1, length = arguments.length; i < length; i++) {
    const source = arguments[i];
    for (const prop in source) {
      if (obj[prop] === void 0) obj[prop] = source[prop];
    }
  }
  return obj;
}

function extend(target) {
    const sources = [].slice.call(arguments, 1);
    sources.forEach(source => {
      if(!source) return;
      Object.getOwnPropertyNames(source).forEach(propName => {
        Object.defineProperty(target, propName, Object.getOwnPropertyDescriptor(source, propName));
      });
    });
    return target;
}

// Fast quicksort insert for sorted array -- based on:
// http://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
function insert(item, array, compareFunction) {
  const location = locationOf(item, array, compareFunction);
  array.splice(location, 0, item);

  return location;
}
// Returns where something would fit in
function locationOf(item, array, compareFunction, _start, _end) {
  const start = _start || 0;
  const end = _end || array.length;
  const pivot = parseInt(start + (end - start) / 2);
  let compared;
  if(!compareFunction){
    compareFunction = (a, b) => {
      if(a > b) return 1;
      if(a < b) return -1;
      if(a = b) return 0;
    };
  }
  if(end-start <= 0) {
    return pivot;
  }

  compared = compareFunction(array[pivot], item);
  if(end-start === 1) {
    return compared > 0 ? pivot : pivot + 1;
  }

  if(compared === 0) {
    return pivot;
  }
  if(compared === -1) {
    return locationOf(item, array, compareFunction, pivot, end);
  } else{
    return locationOf(item, array, compareFunction, start, pivot);
  }
}
// Returns -1 of mpt found
function indexOfSorted(item, array, compareFunction, _start, _end) {
  const start = _start || 0;
  const end = _end || array.length;
  const pivot = parseInt(start + (end - start) / 2);
  let compared;
  if(!compareFunction){
    compareFunction = (a, b) => {
      if(a > b) return 1;
      if(a < b) return -1;
      if(a = b) return 0;
    };
  }
  if(end-start <= 0) {
    return -1; // Not found
  }

  compared = compareFunction(array[pivot], item);
  if(end-start === 1) {
    return compared === 0 ? pivot : -1;
  }
  if(compared === 0) {
    return pivot; // Found
  }
  if(compared === -1) {
    return indexOfSorted(item, array, compareFunction, pivot, end);
  } else{
    return indexOfSorted(item, array, compareFunction, start, pivot);
  }
}

function bounds(el) {

  const style = window.getComputedStyle(el);
  const widthProps = ["width", "paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
  const heightProps = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];

  let width = 0;
  let height = 0;

  widthProps.forEach(prop => {
    width += parseFloat(style[prop]) || 0;
  });

  heightProps.forEach(prop => {
    height += parseFloat(style[prop]) || 0;
  });

  return {
    height,
    width
  };

}

function borders(el) {

  const style = window.getComputedStyle(el);
  const widthProps = ["paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
  const heightProps = ["paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];

  let width = 0;
  let height = 0;

  widthProps.forEach(prop => {
    width += parseFloat(style[prop]) || 0;
  });

  heightProps.forEach(prop => {
    height += parseFloat(style[prop]) || 0;
  });

  return {
    height,
    width
  };

}

function windowBounds() {

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height
  };

}

//https://stackoverflow.com/questions/13482352/xquery-looking-for-text-with-single-quote/13483496#13483496
function cleanStringForXpath(str)  {
    let parts = str.match(/[^'"]+|['"]/g);
    parts = parts.map(part => {
        if (part === "'")  {
            return '\"\'\"'; // output "'"
        }

        if (part === '"') {
            return "\'\"\'"; // output '"'
        }
        return `'${part}'`;
    });
    return `concat('',${parts.join(",")})`;
}

function indexOfTextNode(textNode){
  const parent = textNode.parentNode;
  const children = parent.childNodes;
  let sib;
  let index = -1;
  for (let i = 0; i < children.length; i++) {
    sib = children[i];
    if(sib.nodeType === Node.TEXT_NODE){
      index++;
    }
    if(sib == textNode) break;
  }

  return index;
}

function isXml(ext) {
  return ['xml', 'opf', 'ncx'].indexOf(ext) > -1;
}

function createBlobUrl(content, mime){
	const _URL = window.URL || window.webkitURL || window.mozURL;
	let tempUrl;
	const blob = new Blob([content], {type : mime });

  tempUrl = _URL.createObjectURL(blob);

  return tempUrl;
}

function type(obj){
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function parse(markup, mime) {
  let doc;
  // console.log("parse", markup);

  if (typeof DOMParser === "undefined") {
    DOMParser = require('xmldom').DOMParser;
  }


  doc = new DOMParser().parseFromString(markup, mime);

  return doc;
}

function qs(el, sel) {
  let elements;

  if (typeof el.querySelector != "undefined") {
    return el.querySelector(sel);
  } else {
    elements = el.getElementsByTagName(sel);
    if (elements.length) {
      return elements[0];
    }
  }
}

function qsa(el, sel) {
  
  if (typeof el.querySelector != "undefined") {
    return el.querySelectorAll(sel);
  } else {
    return el.getElementsByTagName(sel);
  }
}

function qsp(el, sel, props) {
  let q, filtered;
  if (typeof el.querySelector != "undefined") {
    sel += '[';
    for (const prop in props) {
      sel += `${prop}='${props[prop]}'`;
    }
    sel += ']';
    return el.querySelector(sel);
  } else {
    q = el.getElementsByTagName(sel);
    filtered = Array.prototype.slice.call(q, 0).filter(el => {
      for (const prop in props) {
        if(el.getAttribute(prop) === props[prop]){
          return true;
        }
      }
      return false;
    });

    if (filtered) {
      return filtered[0];
    }
  }
}

export default {
  // 'uri': uri,
  // 'folder': folder,
  'isElement': isElement,
  'uuid': uuid,
  'values': values,
  'resolveUrl': resolveUrl,
  'indexOfSorted': indexOfSorted,
  'documentHeight': documentHeight,
  'isNumber': isNumber,
  'prefixed': prefixed,
  'defaults': defaults,
  'extend': extend,
  'insert': insert,
  'locationOf': locationOf,
  'indexOfSorted': indexOfSorted,
  'requestAnimationFrame': requestAnimationFrame,
  'bounds': bounds,
  'borders': borders,
  'windowBounds': windowBounds,
  'cleanStringForXpath': cleanStringForXpath,
  'indexOfTextNode': indexOfTextNode,
  'isXml': isXml,
  'createBlobUrl': createBlobUrl,
  'type': type,
  'parse' : parse,
  'qs' : qs,
  'qsa' : qsa,
  'qsp' : qsp
};
