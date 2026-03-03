/**
 * self-explanatory. helper class for preference pages.
 * used for sliders and color-set-groups
 * basically using it like a static class
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class UIElementAdder{

    #settings;

    constructor(_settings){
        this.#settings=_settings;
    }

	addIntSlider(group, minValue, maxValue, stepIncrement, pageIncrement, titleValue, subtitleValue, varName){
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

    /**
     * makes a grid with sliders for r, g, b,a
     * for background, text and border color
     */
    addColorSection(colorExpander, varName){
        
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
