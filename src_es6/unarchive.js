import RSVP from 'rsvp';
import URI from 'urijs';
import core from './core';
import request from './request';
import mime from '../libs/mime/mime';

class Unarchive {
  constructor() {

    this.checkRequirements();
    this.urlCache = {};

  }

  checkRequirements(callback) {
    try {
      if (typeof JSZip !== 'undefined') {
        this.zip = new JSZip();
      } else {
        JSZip = require('jszip');
        this.zip = new JSZip();
      }
    } catch (e) {
      console.error("JSZip lib not loaded");
    }
  }

  open(zipUrl) {
      if (zipUrl instanceof ArrayBuffer) {
      return new RSVP.Promise(function(resolve, reject) {
        this.zip = new JSZip(zipUrl);
        resolve(this.zip);
      });
      } else {
          return request(zipUrl, "binary")
        .then(data => {
                this.zip = new JSZip(data);
          return this.zip;
            });
      }
  }

  request(url, type) {
    const deferred = new RSVP.defer();
    let response;
    let r;

    // If type isn't set, determine it from the file extension
      if(!type) {
          uri = URI(url);
          type = uri.suffix();
      }

    if(type == 'blob'){
      response = this.getBlob(url);
    } else {
      response = this.getText(url);
    }

    if (response) {
      r = this.handleResponse(response, type);
      deferred.resolve(r);
    } else {
      deferred.reject({
        message : `File not found in the epub: ${url}`,
        stack : new Error().stack
      });
    }
    return deferred.promise;
  }

  handleResponse(response, type) {
    let r;

    if(type == "json") {
      r = JSON.parse(response);
    }
    else
    if(core.isXml(type)) {
      r = new DOMParser().parseFromString(response, "text/xml");
      }
    else
      if(type == 'xhtml') {
      r = new DOMParser().parseFromString(response, "application/xhtml+xml");
      }
    else
      if(type == 'html' || type == 'htm') {
      r = new DOMParser().parseFromString(response, "text/html");
      } else {
        r = response;
      }

    return r;
  }

  getBlob(url, _mimeType) {
      const decodededUrl = window.decodeURIComponent(url.substr(1)); // Remove first slash
      const entry = this.zip.file(decodededUrl);
    let mimeType;

      if(entry) {
      mimeType = _mimeType || mime.lookup(entry.name);
      return new Blob([entry.asUint8Array()], {type : mimeType});
      }
  }

  getText(url, encoding) {
      const decodededUrl = window.decodeURIComponent(url.substr(1)); // Remove first slash
      const entry = this.zip.file(decodededUrl);

      if(entry) {
      return entry.asText();
      }
  }

  createUrl(url, mime) {
      const deferred = new RSVP.defer();
      const _URL = window.URL || window.webkitURL || window.mozURL;
      let tempUrl;
      let blob;

      if(url in this.urlCache) {
          deferred.resolve(this.urlCache[url]);
          return deferred.promise;
      }

      blob = this.getBlob(url);

    if (blob) {
      tempUrl = _URL.createObjectURL(blob);
      deferred.resolve(tempUrl);
      this.urlCache[url] = tempUrl;
    } else {
      deferred.reject({
        message : `File not found in the epub: ${url}`,
        stack : new Error().stack
      });
    }

      return deferred.promise;
  }

  revokeUrl(url) {
      const _URL = window.URL || window.webkitURL || window.mozURL;
      const fromCache = this.urlCache[url];
      if(fromCache) _URL.revokeObjectURL(fromCache);
  }
}

export default Unarchive;
