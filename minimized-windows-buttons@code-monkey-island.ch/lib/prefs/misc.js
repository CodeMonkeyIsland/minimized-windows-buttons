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




        const group2 = new Adw.PreferencesGroup({
            title: _('Button Drag and Drop'),
        });
        this.page.add(group2);

        const row3 = new Adw.SwitchRow({
            title: _('snapback'),
            subtitle: _('<b>enabled:</b> same behaviour if drag-and-dropped inside or outside the container (will snap back into appropriate position if dropped outside)\n <b>disabled:</b> open windows if dropped outside container'),
        });
        group2.add(row3);
        this.#settings.bind('snapback', row3, 'active', Gio.SettingsBindFlags.DEFAULT);




        const group3 = new Adw.PreferencesGroup({
            title: _('Touch Support'),
        });
        this.page.add(group3);

        const row4 = new Adw.SwitchRow({
            title: _('drag-scroll hack'),
            subtitle: _('use button-drag to scroll the container. Enable this for scrolling on touch-devices. \n (touch scroll event on button-container not working)'),
        });
        group3.add(row4);
        this.#settings.bind('drag-scroll-hack', row4, 'active', Gio.SettingsBindFlags.DEFAULT);

        const row5 = new Adw.SwitchRow({
            title: _('autohide global event hook'),
            subtitle: _('the leave-event isnt triggered on touch-devices. Add a hook to global event, and check every every time...'),
        });
        group3.add(row5);
        this.#settings.bind('global-event-hook', row5, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}