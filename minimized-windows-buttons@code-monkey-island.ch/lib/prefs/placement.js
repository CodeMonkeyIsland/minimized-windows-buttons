import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import UIElementAdder from './UIElementAdder.js';

export default class PlacementPage{

    #settings=null;
    page=null;

    constructor(_settings){

        let uiElementAdder=new UIElementAdder(_settings);

        this.#settings=_settings;

        this.page = new Adw.PreferencesPage({
            title: _('Placement'),
            icon_name: 'sidebar-show-right-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Placement'),
        });
        this.page.add(group);


        //----------------------------------position: top, bottom, left and right-------------------------------------
        const combo = new Adw.ComboRow({
            title: 'Position',
            subtitle: 'Buttons appear at the top, bottom, left or right screen edge?'
        });

        const options = ['top', 'bottom', 'left', 'right'];
        combo.set_model(Gtk.StringList.new(options));
        const current = this.#settings.get_string('position-on-screen');
        combo.set_selected(options.indexOf(current));

        combo.connect('notify::selected', () => {
            const newValue = options[combo.selected];
            this.#settings.set_string('position-on-screen', newValue);
        });

        group.add(combo);
        this.#settings.bind('position-on-screen', combo, 'active', Gio.SettingsBindFlags.DEFAULT);


        //------------------------------sliders for horizontal/vertical and button margins----------------------------
        uiElementAdder.addIntSlider(group,
                                    0,
                                    100,
                                    1,
                                    1,
                                    'Button container: vertical margin',
                                    'Vertical spacing between buttoncontainer and screen edge',
                                    'margin-vertical');

        uiElementAdder.addIntSlider(group,
                                    0,
                                    100,
                                    1,
                                    1,
                                    'Button container: horizontal margin',
                                    'Horizontal spacing between buttoncontainer and screen edge',
                                    'margin-horizontal');

        uiElementAdder.addIntSlider(group,
                                    0,
                                    20,
                                    1,
                                    1,
                                    'Button margins',
                                    'margin between buttons. Vertical for position: left and right, horizontal for top and bottom',
                                    'margin-buttons');
    }
}