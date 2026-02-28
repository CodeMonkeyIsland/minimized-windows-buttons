import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CoverOptionsPage{

	#settings=null;
	page=null;

	constructor(_settings){
		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Cover Options'),
            icon_name: 'focus-windows-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Cover options'),
        });
        this.page.add(group);



        //cover behavior
        let coverText='front: Buttons cover Windows\n'+
                        'leave space:Workarea gets adjusted to leave space for the buttons\n'+
                        'autohide:buttons disappear when covered by the focused window\n'+
                        'autohide always: button appear only when cursor is at their monitor edge';
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




        //autohide-container size
        const rowAutohideContainer = new Adw.ActionRow({
            title: 'autohide: detect container size',
            subtitle: 'how close to the edge you have to put the cursor in order to show the buttons when auto-hidden.',
        });

        const adjustmentCover = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('autohide-container-size'),
        });

        const sliderCover = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustmentCover,
            digits: 0,
            draw_value: true,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            width_request: 200
        });

        sliderCover.connect('value-changed', () => {
            this.#settings.set_int('autohide-container-size', Math.round(sliderCover.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::autohide-container-size', () => {
            sliderCover.set_value(this.#settings.get_int('autohide-container-size'));
        });

        rowAutohideContainer.add_suffix(sliderCover);
        rowAutohideContainer.activatable_widget = sliderCover;

        group.add(rowAutohideContainer);

	}
}