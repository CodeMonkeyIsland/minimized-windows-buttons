import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MiscPage{

	#settings=null;
	page=null;

	constructor(_settings){
		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Misc.'),
            icon_name: 'view-more-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Workspace and Overview behaviour'),
        });
        this.page.add(group); 



        // show in overview?
        const row = new Adw.SwitchRow({
            title: _('Show in Overview'),
            subtitle: _('Whether to show buttons in overview'),
        });
        group.add(row);
        this.#settings.bind('show-in-overview', row, 'active', Gio.SettingsBindFlags.DEFAULT);



        // stick to workspace or always visible
        const rowWS = new Adw.SwitchRow({
            title: _('Per Workspace Buttons'),
            subtitle: _('Show all Buttons(false), or only those belonging to the current workspace(true). Windows will always open in the current workspace'),
        });

        group.add(rowWS);
        this.#settings.bind('per-workspace-buttons', rowWS, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}