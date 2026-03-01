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

        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group size---------------------------------------------------
        //------------------------------------------------------------------------------------------------------

        const group = new Adw.PreferencesGroup({
            title: _('Size'),
        });
        this.page.add(group); 

        this.#addIntSlider(group, 5, 100, 1, 1, 'Button height', '', 'button-height');
        this.#addIntSlider(group, 20, 500, 1, 1, 'Button width', '', 'button-width');
        this.#addIntSlider(group, 5, 100, 1, 1, 'Icon size', '', 'icon-height');
        this.#addIntSlider(group, 5, 100, 1, 1, 'Font size', '', 'line-height');
        

        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group colors-------------------------------------------------
        //------------------------------------------------------------------------------------------------------
        const group2 = new Adw.PreferencesGroup({
            title: _('All colors are beautiful'),
        });
        this.page.add(group2); 

        //-----------------------------------background-color rgba----------------------------------------------
        const colorExpander = new Adw.ExpanderRow({
            title: _('Background color'),
            subtitle: '',
        });
        group2.add(colorExpander);
        this.#addColorSection(colorExpander, 'bg-color');

        //-------------------------------------text color rgba--------------------------------------------------
        const colorExpander1 = new Adw.ExpanderRow({
            title: _('Text color'),
            subtitle: '',
        });
        group2.add(colorExpander1);
        this.#addColorSection(colorExpander1, 'text-color');

        //------------------------------------------border------------------------------------------------------
        const colorExpander2 = new Adw.ExpanderRow({
            title: _('Border color'),
            subtitle: '',
        });
        group2.add(colorExpander2);
        this.#addColorSection(colorExpander2, 'border-color');


        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group misc---------------------------------------------------
        //------------------------------------------------------------------------------------------------------
        const group3 = new Adw.PreferencesGroup({
            title: _('Style misc.'),
        });
        this.page.add(group3); 

        this.#addIntSlider(group3, 0, 50, 1, 1, 'Border radius', '', 'border-radius');

        //NEED TO FIX 100er STEPS!
        this.#addIntSlider(group3, 100, 900, 100, 100, 'Font weight', 'will be adjusted to 200, 300 etc.', 'font-weight');
        //also shadow...

    }

    #addIntSlider(group, minValue, maxValue, stepIncrement, pageIncrement, titleValue, subtitleValue, varName){
        const row = new Adw.ActionRow({
            title: titleValue,
            subtitle: subtitleValue,
        });

        const adjustment = new Gtk.Adjustment({
            lower: minValue,
            upper: maxValue,
            step_increment: stepIncrement,
            page_increment: pageIncrement,
            value: this.#settings.get_int(varName),
        });

        const slider = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustment,
            digits: 0,
            draw_value: true,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            width_request: 200
        });
        slider.set_property('snap-to-ticks', true);

        slider.connect('value-changed', () => {
            this.#settings.set_int(varName, Math.round(slider.get_value()));
        });
        this.#settings.connect('changed::'+varName, () => {
            slider.set_value(this.#settings.get_int(varName));
        });

        row.add_suffix(slider);
        row.activatable_widget = slider;

        group.add(row);
    }


    #addColorSection(colorExpander, varName){
        
        //for hex rgb entry
        //const entryBox = new Adw.ActionRow({ title: _('Hex RGB-Code') });
        const entryBox = new Adw.ActionRow({ title: _('') });
        /*
        const hexEntry = new Gtk.Entry({
            text: '',
            valign: Gtk.Align.CENTER,
            placeholder_text: '#RRGGBB'
        });
        entryBox.add_suffix(hexEntry)
*/
        //reset to default
        const resetButton = new Gtk.Button({
            label: _('reset to default'),
            valign: Gtk.Align.CENTER,
            margin_start: 10
        });
        resetButton.connect('clicked', () => {
            this.#settings.reset(varName+'-r');
            this.#settings.reset(varName+'-g');
            this.#settings.reset(varName+'-b');
            this.#settings.reset(varName+'-a');
        });
        entryBox.add_suffix(resetButton);
        colorExpander.add_row(entryBox);

        //here we go, the color grid
        const grid = new Gtk.Grid({
            column_spacing: 12,
            row_spacing: 2,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 20,
            margin_end: 20
        });

        //bg-color: R
        const label = new Gtk.Label({ label: 'r', xalign: 0 });
        const adj = new Gtk.Adjustment({
            lower: 0, upper: 255,
            value: this.#settings.get_int(varName+'-r'),
            step_increment: 1
        });
        const slider = new Gtk.Scale({
            adjustment: adj,
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            draw_value: true,
            digits: 0,
            value_pos: Gtk.PositionType.RIGHT
        });
        slider.connect('value-changed', () => {
            this.#settings.set_int(varName+'-r', Math.round(slider.get_value()));
            //set rgb-field
        });
        this.#settings.connect('changed::'+varName+'-r', () => {
            slider.set_value(this.#settings.get_int(varName+'-r'));
            //set rgb field
        });
        grid.attach(label, 0, 0, 1, 1);
        grid.attach(slider, 1, 0, 1, 1);


        //bg-color: G
        const label1 = new Gtk.Label({ label: 'g', xalign: 0 });
        const adj1 = new Gtk.Adjustment({
            lower: 0, upper: 255,
            value: this.#settings.get_int(varName+'-g'),
            step_increment: 1
        });
        const colorslider1 = new Gtk.Scale({
            adjustment: adj1,
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            draw_value: true,
            digits: 0,
            value_pos: Gtk.PositionType.RIGHT
        });
        colorslider1.connect('value-changed', () => {
            this.#settings.set_int(varName+'-g', Math.round(colorslider1.get_value()));
            //set rgb-field
        });
        this.#settings.connect('changed::'+varName+'-g', () => {
            colorslider1.set_value(this.#settings.get_int(varName+'-g'));
            //set rgb field
        });
        grid.attach(label1, 0, 1, 1, 1);
        grid.attach(colorslider1, 1, 1, 1, 1);

        
        //bg-color: B
        const label2 = new Gtk.Label({ label: 'b', xalign: 0 });
        const adj2 = new Gtk.Adjustment({
            lower: 0, upper: 255,
            value: this.#settings.get_int(varName+'-b'),
            step_increment: 1
        });
        const colorslider2 = new Gtk.Scale({
            adjustment: adj2,
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            draw_value: true,
            digits: 0,
            value_pos: Gtk.PositionType.RIGHT
        });
        colorslider2.connect('value-changed', () => {
            this.#settings.set_int(varName+'-b', Math.round(colorslider2.get_value()));
            //set rgb-field
        });
        this.#settings.connect('changed::'+varName+'-b', () => {
            colorslider2.set_value(this.#settings.get_int(varName+'-b'));
            //set rgb field
        });
        grid.attach(label2, 0, 2, 1, 1);
        grid.attach(colorslider2, 1, 2, 1, 1);

        //bg-color: A
        const label3 = new Gtk.Label({ label: 'a', xalign: 0 });
        const adj3 = new Gtk.Adjustment({
            lower: 0, upper: 1.0,
            value: this.#settings.get_double(varName+'-a'),
            step_increment: 0.01
        });
        const colorslider3 = new Gtk.Scale({
            adjustment: adj3,
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            draw_value: true,
            digits: 2,
            value_pos: Gtk.PositionType.RIGHT
        });
        colorslider3.connect('value-changed', () => {
            this.#settings.set_double(varName+'-a', colorslider3.get_value());
            //set rgb-field
        });
        this.#settings.connect('changed::'+varName+'-a', () => {
            colorslider3.set_value(this.#settings.get_double(varName+'-a'));
            //set rgb field
        });
        grid.attach(label3, 0, 3, 1, 1);
        grid.attach(colorslider3, 1, 3, 1, 1);


        const gridRow = new Adw.ActionRow({ selectable: false });
        gridRow.set_child(grid);
        colorExpander.add_row(gridRow);
    }
}