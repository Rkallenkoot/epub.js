import RSVP from 'rsvp';
import URI from 'urijs';
import core from './core';
import Spine from './spine';
import Locations from './locations';
import Parser from './parser';
import Navigation from './navigation';
import Rendition from './rendition';
import Unarchive from './unarchive';
import request from './request';
import EpubCFI from './epubcfi';

class Book {
  constructor(_url, options) {

    this.settings = core.extend(this.settings || {}, {
          requestMethod: this.requestMethod
      });

    core.extend(this.settings, options);


    // Promises
    this.opening = new RSVP.defer();
    this.opened = this.opening.promise;
    this.isOpen = false;

    this.url = undefined;

    this.loading = {
      manifest: new RSVP.defer(),
      spine: new RSVP.defer(),
      metadata: new RSVP.defer(),
      cover: new RSVP.defer(),
      navigation: new RSVP.defer(),
      pageList: new RSVP.defer()
    };

    this.loaded = {
      manifest: this.loading.manifest.promise,
      spine: this.loading.spine.promise,
      metadata: this.loading.metadata.promise,
      cover: this.loading.cover.promise,
      navigation: this.loading.navigation.promise,
      pageList: this.loading.pageList.promise
    };

    this.ready = RSVP.hash(this.loaded);

    // Queue for methods used before opening
    this.isRendered = false;
    // this._q = core.queue(this);

    this.request = this.settings.requestMethod.bind(this);

    this.spine = new Spine(this.request);
    this.locations = new Locations(this.spine, this.request);

    if(_url) {
      this.open(_url);
    }
  }

  open(_url) {
    let uri;
    const parse = new Parser();
    let epubPackage;
    let epubContainer;
    const book = this;
    const containerPath = "META-INF/container.xml";
    let location;
    let absoluteUri;

    if(!_url) {
      this.opening.resolve(this);
      return this.opened;
    }

    // Reuse parsed url or create a new uri object
    // if(typeof(_url) === "object") {
    //   uri = _url;
    // } else {
    //   uri = core.uri(_url);
    // }
    uri = URI(_url);

    if (window) {
      absoluteUri = uri.absoluteTo(window.location.href);
      this.url = absoluteUri.toString();
    } else {
      this.url = _url;
    }

    // Find path to the Container
    if(uri.suffix() === "opf") {
      // Direct link to package, no container
      this.packageUrl = _url;
      this.containerUrl = '';

      if(uri.origin()) {
        this.baseUrl = `${uri.origin()}/${uri.directory()}/`;
      } else if(absoluteUri){
        this.baseUrl = absoluteUri.origin();
        this.baseUrl += `${absoluteUri.directory()}/`;
      } else {
        this.baseUrl = `${uri.directory()}/`;
      }

      epubPackage = this.request(this.packageUrl);

    } else if(this.isArchivedUrl(uri)) {
      // Book is archived
      this.url = '/';
      this.containerUrl = URI(containerPath).absoluteTo(this.url).toString();

      epubContainer = this.unarchive(_url).
        then(() => this.request(this.containerUrl));

    }
    // Find the path to the Package from the container
    else if (!uri.suffix()) {

      this.containerUrl = this.url + containerPath;

      epubContainer = this.request(this.containerUrl)
        .catch(error => {
          // handle errors in loading container
          book.opening.reject(error);
        });
    }

    if (epubContainer) {
      epubPackage = epubContainer.
        then(containerXml => parse.container(containerXml)).
        then(paths => {
          const packageUri = URI(paths.packagePath);
          const absPackageUri = packageUri.absoluteTo(book.url);
          let absWindowUri;

          book.packageUrl = absPackageUri.toString();
          book.encoding = paths.encoding;

          // Set Url relative to the content
          if(absPackageUri.origin()) {
            book.baseUrl = `${absPackageUri.origin() + absPackageUri.directory()}/`;
          } else {
            book.baseUrl = `/${packageUri.directory()}/`;
          }

          return book.request(book.packageUrl);
        }).catch(function(error) {
          // handle errors in either of the two requests
          console.error(`Could not load book at: ${this.packageUrl || this.containerPath}`);
          book.trigger("book:loadFailed", (this.packageUrl || this.containerPath));
          book.opening.reject(error);
        });
    }

    epubPackage.then(packageXml => {
      // Get package information from epub opf
      book.unpack(packageXml);

      // Resolve promises
      book.loading.manifest.resolve(book.package.manifest);
      book.loading.metadata.resolve(book.package.metadata);
      book.loading.spine.resolve(book.spine);
      book.loading.cover.resolve(book.cover);

      book.isOpen = true;

      // Clear queue of any waiting book request

      // Resolve book opened promise
      book.opening.resolve(book);

    }).catch(error => {
      // handle errors in parsing the book
      console.error(error.message, error.stack);
      book.opening.reject(error);
    });

    return this.opened;
  }

  unpack(packageXml) {
    const book = this, parse = new Parser();

    book.package = parse.packageContents(packageXml); // Extract info from contents
    if(!book.package) {
      return;
    }

    book.package.baseUrl = book.baseUrl; // Provides a url base for resolving paths

    this.spine.load(book.package);

    book.navigation = new Navigation(book.package, this.request);
    book.navigation.load().then(toc => {
      book.toc = toc;
      book.loading.navigation.resolve(book.toc);
    });

    // //-- Set Global Layout setting based on metadata
    // MOVE TO RENDER
    // book.globalLayoutProperties = book.parseLayoutProperties(book.package.metadata);

    book.cover = URI(book.package.coverPath).absoluteTo(book.baseUrl).toString();
  }

  // Alias for book.spine.get
  section(target) {
    return this.spine.get(target);
  }

  // Sugar to render a book
  renderTo(element, options) {
    // var renderMethod = (options && options.method) ?
    //     options.method :
    //     "single";

    this.rendition = new Rendition(this, options);
    this.rendition.attachTo(element);

    return this.rendition;
  }

  requestMethod(_url) {
    // Switch request methods
    if(this.archive) {
      return this.archive.request(_url);
    } else {
      return request(_url, null, this.requestCredentials, this.requestHeaders);
    }

  }

  setRequestCredentials(_credentials) {
    this.requestCredentials = _credentials;
  }

  setRequestHeaders(_headers) {
    this.requestHeaders = _headers;
  }

  unarchive(bookUrl) {
      this.archive = new Unarchive();
      return this.archive.open(bookUrl);
  }

  //-- Checks if url has a .epub or .zip extension, or is ArrayBuffer (of zip/epub)
  isArchivedUrl(bookUrl) {
    let uri;
    let extension;

    if (bookUrl instanceof ArrayBuffer) {
          return true;
      }

    // Reuse parsed url or create a new uri object
    // if(typeof(bookUrl) === "object") {
    //   uri = bookUrl;
    // } else {
    //   uri = core.uri(bookUrl);
    // }
    uri = URI(bookUrl);
    extension = uri.suffix();

      if(extension && (extension == "epub" || extension == "zip")){
          return true;
      }

      return false;
  }

  //-- Returns the cover
  coverUrl() {
      const retrieved = this.loaded.cover.
          then(url => {
              if(this.archive) {
                  return this.archive.createUrl(this.cover);
              }else{
                  return this.cover;
              }
          });



      return retrieved;
  }

  range(cfiRange) {
    const cfi = new EpubCFI(cfiRange);
    const item = this.spine.get(cfi.spinePos);

    return item.load().then(contents => {
      const range = cfi.toRange(item.document);
      return range;
    })
  }
}

export default Book;

//-- Enable binding events to book
RSVP.EventTarget.mixin(Book.prototype);

//-- Handle RSVP Errors
RSVP.on('error', event => {
  console.error(event);
});

RSVP.configure('instrument', true); //-- true | will logging out all RSVP rejections
// RSVP.on('created', listener);
// RSVP.on('chained', listener);
// RSVP.on('fulfilled', listener);
RSVP.on('rejected', event => {
  console.error(event.detail.message, event.detail.stack);
});
