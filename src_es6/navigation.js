import core from './core';
import Parser from './parser';
import RSVP from 'rsvp';
import URI from 'urijs';

class Navigation {
  constructor(_package, _request) {
    const navigation = this;
    const parse = new Parser();
    const request = _request || require('./request');

    this.package = _package;
    this.toc = [];
    this.tocByHref = {};
    this.tocById = {};

    if(_package.navPath) {
      this.navUrl = URI(_package.navPath).absoluteTo(_package.baseUrl).toString();
      this.nav = {};

      this.nav.load = _request => {
        const loading = new RSVP.defer();
        const loaded = loading.promise;

        request(navigation.navUrl, 'xml').then(xml => {
          navigation.toc = parse.nav(xml);
          navigation.loaded(navigation.toc);
          loading.resolve(navigation.toc);
        });

        return loaded;
      };

    }

    if(_package.ncxPath) {
      this.ncxUrl = URI(_package.ncxPath).absoluteTo(_package.baseUrl).toString();
      this.ncx = {};

      this.ncx.load = _request => {
        const loading = new RSVP.defer();
        const loaded = loading.promise;

        request(navigation.ncxUrl, 'xml').then(xml => {
          navigation.toc = parse.ncx(xml);
          navigation.loaded(navigation.toc);
          loading.resolve(navigation.toc);
        });

        return loaded;
      };

    }
  }

  // Load the navigation
  load(_request) {
    const request = _request || require('./request');
    let loading, loaded;

    if(this.nav) {
      loading = this.nav.load();
    } else if(this.ncx) {
      loading = this.ncx.load();
    } else {
      loaded = new RSVP.defer();
      loaded.resolve([]);
      loading = loaded.promise;
    }

    return loading;

  }

  loaded(toc) {
    let item;

    for (let i = 0; i < toc.length; i++) {
      item = toc[i];
      this.tocByHref[item.href] = i;
      this.tocById[item.id] = i;
    }

  }

  // Get an item from the navigation
  get(target) {
    let index;

    if(!target) {
      return this.toc;
    }

    if(target.indexOf("#") === 0) {
      index = this.tocById[target.substring(1)];
    } else if(target in this.tocByHref){
      index = this.tocByHref[target];
    }

    return this.toc[index];
  }
}

export default Navigation;
