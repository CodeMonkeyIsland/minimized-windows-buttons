/**
 * splitting settings page into subpages, see /lib/prefs/
 */

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import CoverOptionsPage from './lib/prefs/coverOptions.js';
import PlacementPage from './lib/prefs/placement.js';
import StylePage from './lib/prefs/style.js'
import MiscPage from './lib/prefs/misc.js'

export default class MinimizedWindowsButtonsPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {

        //window._settings = this.getSettings();

        const coverOptions = new CoverOptionsPage(this.getSettings());
        window.add(coverOptions.page);

        const placement = new PlacementPage(this.getSettings());
        window.add(placement.page)

        const style = new StylePage(this.getSettings());
        window.add(style.page);

        const miscellaneous = new MiscPage(this.getSettings());
        window.add(miscellaneous.page);
    }
}