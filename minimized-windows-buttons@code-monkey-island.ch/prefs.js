import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Settings'),
            description: _('Configure the extension'),
        });
        page.add(group); 

        // show in overview?
        const row = new Adw.SwitchRow({
            title: _('Show in Overview'),
            subtitle: _('Whether to show buttons in overview'),
        });
        group.add(row);

        // Create a settings object and bind the row
        window._settings = this.getSettings();
        window._settings.bind('show-in-overview', row, 'active', Gio.SettingsBindFlags.DEFAULT);



        //position: top or bottom for now
        const combo = new Adw.ComboRow({
            title: 'Position',
            subtitle: 'Buttons appear at the top or bottom of main screen?'
        });

        const options = ['top', 'bottom'];
        combo.set_model(Gtk.StringList.new(options));
        const current = this.getSettings().get_string('position-on-screen');
        combo.set_selected(options.indexOf(current));

        combo.connect('notify::selected', () => {
            const newValue = options[combo.selected];
            this.getSettings().set_string('position-on-screen', newValue);
        });

        group.add(combo);
        window._settings.bind('position-on-screen', combo, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}