import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import UIElementAdder from './UIElementAdder.js';

export default class CoverOptionsPage{

	#settings=null;
	page=null;

	constructor(_settings){

        let uiElementAdder=new UIElementAdder(_settings);

		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Cover Options'),
            icon_name: 'focus-windows-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Cover options'),
        });
        this.page.add(group);



        //--------------------------------------cover behavior-------------------------------------------------
        let coverText='front: Buttons cover Windows\n'+
                        'leave space: Workarea gets adjusted to leave space for the buttons\n'+
                        'autohide: Buttons disappear when covered by the focused window\n'+
                        'autohide always: Buttons appear only when cursor is at their monitor edge';
        const coverCombo = new Adw.ComboRow({
            title: 'Cover behaviour',
            subtitle: coverText
        });

        const coverOptions = ['front', 'leave space', 'autohide', 'autohide always'];
        coverCombo.set_model(Gtk.StringList.new(coverOptions));

        const coverCurrent = this.#settings.get_string('cover-behaviour');
        coverCombo.set_selected(coverOptions.indexOf(coverCurrent));

        coverCombo.connect('notify::selected', () => {
            const newValue = coverOptions[coverCombo.selected];
            this.#settings.set_string('cover-behaviour', newValue);
        });

        group.add(coverCombo);
        this.#settings.bind('cover-behaviour', coverCombo, 'active', Gio.SettingsBindFlags.DEFAULT);




        //---------------------------------autohide-container size. leavespace-margin here too?----------------
        const group1 = new Adw.PreferencesGroup({
            title: _('option-specific Settings'),
        });
        this.page.add(group1);

        uiElementAdder.addIntSlider(group1, 
                                    0, 
                                    50, 
                                    1, 
                                    1, 
                                    '<b>autohide/autohide always:</b> detect container size', 
                                    'how close to the edge you have to put the cursor in order to show the buttons when auto-hidden.', 
                                    'autohide-container-size');
        uiElementAdder.addIntSlider(group1, 
                                    0, 
                                    50, 
                                    1, 
                                    1, 
                                    '<b>leave space:</b> margin', 
                                    'spacing between the edge of maximized windows and the buttons', 
                                    'leave-space-margin');
	}
}