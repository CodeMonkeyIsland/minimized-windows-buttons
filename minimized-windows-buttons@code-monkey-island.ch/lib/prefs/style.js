import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import UIElementAdder from './UIElementAdder.js';

export default class StylePage{

	#settings=null;
	page=null;

	constructor(_settings){

        let uiElementAdder=new UIElementAdder(_settings);

		this.#settings=_settings;

		this.page = new Adw.PreferencesPage({
            title: _('Style'),
            icon_name: 'preferences-desktop-appearance-symbolic',
        });

        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group size---------------------------------------------------
        //------------------------------------------------------------------------------------------------------

        const group = new Adw.PreferencesGroup({
            title: _('Size of buttons and components'),
        });
        this.page.add(group); 

        uiElementAdder.addIntSlider(group, 5, 100, 1, 1, 'Button height', '', 'button-height');
        uiElementAdder.addIntSlider(group, 20, 500, 1, 1, 'Button width', '', 'button-width');
        uiElementAdder.addIntSlider(group, 5, 100, 1, 1, 'Icon size', '', 'icon-height');
        uiElementAdder.addIntSlider(group, 5, 100, 1, 1, 'Font size', '', 'line-height');
        

        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group colors-------------------------------------------------
        //------------------------------------------------------------------------------------------------------
        const group2 = new Adw.PreferencesGroup({
            title: _('All colors are beautiful'),
        });
        this.page.add(group2); 
        

        const colorExpander = new Adw.ExpanderRow({
            title: _('Background color'),
            subtitle: '',
        });
        group2.add(colorExpander);
        uiElementAdder.addColorSection(colorExpander, 'bg-color');

        const colorExpander1 = new Adw.ExpanderRow({
            title: _('Text color'),
            subtitle: '',
        });
        group2.add(colorExpander1);
        uiElementAdder.addColorSection(colorExpander1, 'text-color');

        const colorExpander2 = new Adw.ExpanderRow({
            title: _('Border color'),
            subtitle: '',
        });
        group2.add(colorExpander2);
        uiElementAdder.addColorSection(colorExpander2, 'border-color');


        //------------------------------------------------------------------------------------------------------
        //-----------------------------------------group misc---------------------------------------------------
        //------------------------------------------------------------------------------------------------------
        const group3 = new Adw.PreferencesGroup({
            title: _('Style misc.'),
        });
        this.page.add(group3); 

        uiElementAdder.addIntSlider(group3, 0, 50, 1, 1, 'Border radius', '', 'border-radius');

        //NEED TO FIX 100er STEPS!
        uiElementAdder.addIntSlider(group3, 100, 900, 100, 100, 'Font weight', 'will be adjusted to 200, 300 etc.', 'font-weight');
        //also shadow...

    }

}