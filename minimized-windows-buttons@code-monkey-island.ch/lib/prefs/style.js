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
            title: _('Button Size'),
        });
        this.page.add(group); 

        //button height
        const row1 = new Adw.ActionRow({
            title: 'Button height',
            subtitle: '',
        });

        const adjustment1 = new Gtk.Adjustment({
            lower: 5,
            upper: 100,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('button-height'),
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
            this.#settings.set_int('button-height', Math.round(slider1.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::button-height', () => {
            slider1.set_value(this.#settings.get_int('button-height'));
        });

        row1.add_suffix(slider1);
        row1.activatable_widget = slider1;

        group.add(row1);


        //button width
        const row2 = new Adw.ActionRow({
            title: 'Button width',
            subtitle: '',
        });

        const adjustment2 = new Gtk.Adjustment({
            lower: 20,
            upper: 500,
            step_increment: 1,
            page_increment: 1,
            value: this.#settings.get_int('button-width'),
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
            this.#settings.set_int('button-width', Math.round(slider2.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.#settings.connect('changed::button-width', () => {
            slider2.set_value(this.#settings.get_int('button-width'));
        });

        row2.add_suffix(slider2);
        row2.activatable_widget = slider2;

        group.add(row2);
    }
}