class Views {
  constructor(container) {
    this.container = container;
    this._views = [];
    this.length = 0;
    this.hidden = false;
  }

  all() {
      return this._views;
  }

  first() {
      return this._views[0];
  }

  last() {
      return this._views[this._views.length-1];
  }

  indexOf(view) {
      return this._views.indexOf(view);
  }

  slice() {
      return this._views.slice(...arguments);
  }

  get(i) {
      return this._views[i];
  }

  append(view) {
      this._views.push(view);
    if(this.container){
      this.container.appendChild(view.element);
    }
    this.length++;
    return view;
  }

  prepend(view) {
      this._views.unshift(view);
    if(this.container){
      this.container.insertBefore(view.element, this.container.firstChild);
    }
    this.length++;
    return view;
  }

  insert(view, index) {
      this._views.splice(index, 0, view);

    if(this.container){
      if(index < this.container.children.length){
          this.container.insertBefore(view.element, this.container.children[index]);
      } else {
          this.container.appendChild(view.element);
      }
    }

    this.length++;
    return view;
  }

  remove(view) {
      const index = this._views.indexOf(view);

      if(index > -1) {
          this._views.splice(index, 1);
      }


      this.destroy(view);

    this.length--;
  }

  destroy(view) {
      view.off("resized");

      if(view.displayed){
          view.destroy();
      }
    if(this.container){
         this.container.removeChild(view.element);
    }
      view = null;
  }

  // Iterators

  each() {
      return this._views.forEach(...arguments);
  }

  clear() {
      // Remove all views
    let view;
    const len = this.length;

    if(!this.length) return;

    for (let i = 0; i < len; i++) {
      view = this._views[i];
          this.destroy(view);
    }

    this._views = [];
    this.length = 0;
  }

  find(section) {

    let view;
    const len = this.length;

    for (let i = 0; i < len; i++) {
      view = this._views[i];
          if(view.displayed && view.section.index == section.index) {
              return view;
          }
    }

  }

  displayed() {
    const displayed = [];
    let view;
    const len = this.length;

    for (let i = 0; i < len; i++) {
      view = this._views[i];
      if(view.displayed){
        displayed.push(view);
      }
    }
    return displayed;
  }

  show() {
    let view;
    const len = this.length;

    for (let i = 0; i < len; i++) {
      view = this._views[i];
      if(view.displayed){
        view.show();
      }
    }
    this.hidden = false;
  }

  hide() {
    let view;
    const len = this.length;

    for (let i = 0; i < len; i++) {
      view = this._views[i];
      if(view.displayed){
        view.hide();
      }
    }
    this.hidden = true;
  }
}

export default Views;
