import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class PlacementPage{

	#settings=null;
	page=null;

	constructor(_settings){
		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Placement'),
            icon_name: 'sidebar-show-right-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Placement'),
        });
        this.page.add(group); 

        //position: top or bottom for now
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



        //vertical margins
        const row1 = new Adw.ActionRow({
            title: 'Button container: vertical margin',
            subtitle: 'Vertical spacing between buttoncontainer and screen edge',
        });

        const adjustment1 = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('margin-vertical')
        });

        const slider1 = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustment1,
            digits: 0,
            draw_value: true,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            width_request: 200
        });

        slider1.connect('value-changed', () => {
            this.#settings.set_int('margin-vertical', Math.round(slider1.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::margin-vertical', () => {
            slider1.set_value(this.#settings.get_int('margin-vertical'));
        });

        row1.add_suffix(slider1);
        row1.activatable_widget = slider1;

        group.add(row1);





        //horizontal margins
        const row2 = new Adw.ActionRow({
            title: 'Button container: horizontal margin',
            subtitle: 'Horizontal spacing between buttoncontainer and screen edge',
        });

        const adjustment2 = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('margin-horizontal'),
        });

        const slider2 = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustment2,
            digits: 0,
            draw_value: true,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            width_request: 200
        });

        slider2.connect('value-changed', () => {
            this.#settings.set_int('margin-horizontal', Math.round(slider2.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::margin-horizontal', () => {
            slider2.set_value(this.#settings.get_int('margin-horizontal'));
        });

        row2.add_suffix(slider2);
        row2.activatable_widget = slider2;

        group.add(row2);


        //button margins
        const row3 = new Adw.ActionRow({
            title: 'Button margins',
            subtitle: 'margin between buttons. Vertical for position: left and right, horizontal for top and bottom',
        });

        const adjustment3 = new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('margin-buttons'),
        });

        const slider3 = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustment3,
            digits: 0,
            draw_value: true,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            width_request: 200
        });

        slider3.connect('value-changed', () => {
            this.#settings.set_int('margin-buttons', Math.round(slider3.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::margin-buttons', () => {
            slider3.set_value(this.#settings.get_int('margin-horizontal'));
        });

        row3.add_suffix(slider3);
        row3.activatable_widget = slider3;

        group.add(row3);
    }
}