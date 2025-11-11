import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class MinimizedWindowsButtonsPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {

        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);


//----------------------------------------------------------------------------------------------------------
//-------------------------------------------WORKSPACE & OVERVIEW-------------------------------------------
//----------------------------------------------------------------------------------------------------------

        const group2 = new Adw.PreferencesGroup({
            title: _('Workspace and Overview behaviour'),
        });
        page.add(group2); 

        // show in overview?
        const row = new Adw.SwitchRow({
            title: _('Show in Overview'),
            subtitle: _('Whether to show buttons in overview'),
        });
        group2.add(row);
        window._settings.bind('show-in-overview', row, 'active', Gio.SettingsBindFlags.DEFAULT);


        // stick to workspace or always visible
        const rowWS = new Adw.SwitchRow({
            title: _('Per Workspace Buttons'),
            subtitle: _('Show all Buttons(false), or only those belonging to the current workspace(true). Windows will always open in the current workspace'),
        });

        group2.add(rowWS);
        window._settings = this.getSettings();
        window._settings.bind('per-workspace-buttons', rowWS, 'active', Gio.SettingsBindFlags.DEFAULT);


//----------------------------------------------------------------------------------------------------------
//---------------------------------------------COVER OPTIONS------------------------------------------------
//----------------------------------------------------------------------------------------------------------

        const group3 = new Adw.PreferencesGroup({
            title: _('Cover options'),
        });
        page.add(group3);

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

        const coverCurrent = this.getSettings().get_string('cover-behaviour');
        coverCombo.set_selected(coverOptions.indexOf(coverCurrent));

        coverCombo.connect('notify::selected', () => {
            const newValue = coverOptions[coverCombo.selected];
            this.getSettings().set_string('cover-behaviour', newValue);
        });

        group3.add(coverCombo);
        window._settings.bind('cover-behaviour', coverCombo, 'active', Gio.SettingsBindFlags.DEFAULT);

        //autohide-container size
        const rowAutohideContainer = new Adw.ActionRow({
            title: 'autohide: detect container size',
            subtitle: 'how close to the edge you have to put the cursor in order to show button when auto-hidden',
        });

        const adjustmentCover = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 1,
            value: this.getSettings().get_int('autohide-container-size'),
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
            this.getSettings().set_int('autohide-container-size', Math.round(sliderCover.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.getSettings().connect('changed::autohide-container-size', () => {
            sliderCover.set_value(this.getSettings().get_int('autohide-container-size'));
        });

        rowAutohideContainer.add_suffix(sliderCover);
        rowAutohideContainer.activatable_widget = sliderCover;

        group3.add(rowAutohideContainer);

//----------------------------------------------------------------------------------------------------------
//---------------------------------------------PLACEMENT----------------------------------------------------
//----------------------------------------------------------------------------------------------------------

        const group = new Adw.PreferencesGroup({
            title: _('Placement'),
        });
        page.add(group); 

        //position: top or bottom for now
        const combo = new Adw.ComboRow({
            title: 'Position',
            subtitle: 'Buttons appear at the top or bottom of main screen?'
        });

        const options = ['top', 'bottom', 'left', 'right'];
        combo.set_model(Gtk.StringList.new(options));
        const current = this.getSettings().get_string('position-on-screen');
        combo.set_selected(options.indexOf(current));

        combo.connect('notify::selected', () => {
            const newValue = options[combo.selected];
            this.getSettings().set_string('position-on-screen', newValue);
        });

        group.add(combo);
        window._settings.bind('position-on-screen', combo, 'active', Gio.SettingsBindFlags.DEFAULT);



        //vertical margins
        const row1 = new Adw.ActionRow({
            title: 'Button container: vertical margin',
            subtitle: 'Vertical spacing, margin top for position top/margin bottom for position bottom',
        });

        const adjustment1 = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 1,
            value: this.getSettings().get_int('margin-vertical')
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
            this.getSettings().set_int('margin-vertical', Math.round(slider1.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.getSettings().connect('changed::margin-vertical', () => {
            slider1.set_value(this.getSettings().get_int('margin-vertical'));
        });

        row1.add_suffix(slider1);
        row1.activatable_widget = slider1;

        group.add(row1);





        //horizontal margins
        const row2 = new Adw.ActionRow({
            title: 'Button container: horizontal margin',
            subtitle: 'Horizontal spacing, for now margin-left',
        });

        const adjustment2 = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 1,
            value: this.getSettings().get_int('margin-horizontal'),
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
            this.getSettings().set_int('margin-horizontal', Math.round(slider2.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.getSettings().connect('changed::margin-horizontal', () => {
            slider2.set_value(this.getSettings().get_int('margin-horizontal'));
        });

        row2.add_suffix(slider2);
        row2.activatable_widget = slider2;

        group.add(row2);


        //button margins
        const row3 = new Adw.ActionRow({
            title: 'Button margins',
            subtitle: 'margin between buttons',
        });

        const adjustment3 = new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1,
            page_increment: 1,
            value: this.getSettings().get_int('margin-buttons'),
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
            this.getSettings().set_int('margin-buttons', Math.round(slider3.get_value()));
        });

        // Keep slider synced if settings change elsewhere
        this.getSettings().connect('changed::margin-buttons', () => {
            slider3.set_value(this.getSettings().get_int('margin-horizontal'));
        });

        row3.add_suffix(slider3);
        row3.activatable_widget = slider3;

        group.add(row3);



 
    }
}