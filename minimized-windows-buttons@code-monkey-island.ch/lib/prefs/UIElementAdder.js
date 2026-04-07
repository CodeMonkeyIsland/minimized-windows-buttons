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
     * makes a grid with sliders for r,g,b,a
     * for background, text and border color
     */
    addColorSection(colorExpander, varName){
        
        const entryBox = new Adw.ActionRow({ title: _('RGBA Value') });

        const rgbaLabel = new Gtk.Label({
            selectable: true,
            valign: Gtk.Align.CENTER,
            css_classes: ['monospace'],
            label: this.#settings.get_string(varName)
        });
        entryBox.add_suffix(rgbaLabel);

        this.#settings.connect('changed::'+varName, () => {
            rgbaLabel.set_label(this.#settings.get_string(varName));
        });

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

        const grid = new Gtk.Grid({
            column_spacing: 12,
            row_spacing: 2,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 20,
            margin_end: 20
        });

        const components=['r','g','b','a'];
        for (let i=0;i<components.length;i++){
            const component=components[i];
            let isAlpha=false;
            if (component=='a'){
                isAlpha=true;
            }
            const slider = this.#createColorSlider(varName, component, isAlpha);
            const label = new Gtk.Label({ label: component.toUpperCase(), xalign: 0 });
            grid.attach(label, 0, i, 1, 1);
            grid.attach(slider, 1, i, 1, 1);

            this.#settings.connect('changed::'+varName+'-'+component, () => {
                this.#updateRgbaString(varName);
            });
        }

        const gridRow = new Adw.ActionRow({ selectable: false });
        gridRow.set_child(grid);
        colorExpander.add_row(gridRow);
    }

    #createColorSlider(baseVarName, component, isAlpha) {
        const key=baseVarName+'-'+component;

        const adj = new Gtk.Adjustment({
            lower: 0,
            upper: isAlpha ? 1.0 : 255,
            step_increment: isAlpha ? 0.01 : 1,
            value: isAlpha ? this.#settings.get_double(key) : this.#settings.get_int(key)
        });

        const slider = new Gtk.Scale({
            adjustment: adj,
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            draw_value: true,
            digits: isAlpha ? 2 : 0,
            value_pos: Gtk.PositionType.RIGHT
        });

        slider.connect('value-changed', () => {
            const val = slider.get_value();
            isAlpha ? this.#settings.set_double(key, val) : this.#settings.set_int(key, Math.round(val));
        });

        this.#settings.connect('changed::'+key, () => {
            slider.set_value(isAlpha ? this.#settings.get_double(key) : this.#settings.get_int(key));
        });

        return slider;
    }

    #updateRgbaString(varName) {
        const r = this.#settings.get_int(varName+'-r');
        const g = this.#settings.get_int(varName+'-g');
        const b = this.#settings.get_int(varName+'-b');
        const a = this.#settings.get_double(varName+'-a').toFixed(2);
        
        const rgbaString = 'rgba('+r+','+g+','+b+','+a+')';
        this.#settings.set_string(varName, rgbaString);
    }

}
