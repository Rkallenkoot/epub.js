import Book from './book';
import EpubCFI from './epubcfi';
import Rendition from './rendition';
import Contents from './contents';
import RSVP from 'rsvp';

function ePub(_url) {
	return new Book(_url);
}

ePub.VERSION = "0.3.0";

ePub.CFI = EpubCFI;
ePub.Rendition = Rendition;
ePub.Contents = Contents;
ePub.RSVP = RSVP;

ePub.ViewManagers = {};
ePub.Views = {};
ePub.register = {
	manager(name, manager) {
  	return ePub.ViewManagers[name] = manager;
	},
	view(name, view) {
		return ePub.Views[name] = view;
	}
};

// Default Views
ePub.register.view("iframe", require('./views/iframe'));
ePub.register.view("inline", require('./views/inline'));

// Default View Managers
ePub.register.manager("single", require('./managers/single'));
ePub.register.manager("continuous", require('./managers/continuous'));
ePub.register.manager("paginate", require('./managers/paginate'));

export default ePub;
