import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class StylePage{

	#settings=null;
	page=null;

	constructor(_settings){
		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Style'),
            icon_name: 'preferences-desktop-appearance-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Button Style'),
        });
        this.page.add(group); 
    }
}