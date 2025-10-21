import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
//import Gtk from 'gi://Gtk';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

//function init() {}

export default class MinimizedButtonsExtension extends Extension {

    container=null;
    displaySig=0;
    sessionSig=0;
    windowSignals=new Map();
    windowButtons=new Map();

    enable() {

        this.sessionSig = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this._watchWindow(actor.meta_window);
            }
        });

        this.container = new St.BoxLayout({
            vertical: false,
            style_class: "bottom-container"
        });
        //Main.layoutManager.uiGroup.add_child(container);
        Main.layoutManager.addChrome(this.container, { trackFullscreen: true });

        // Create button for sizing, then hide it
        let button = new St.Button({ label: 'Hello', style_class: 'minimized-button' });
        this.container.add_child(button);
        button.hide();

        let monitor=Main.layoutManager.primaryMonitor;
        this.container.set_position(10, monitor.height - button.height - 10);

        //new windows
        this.displaySig = global.display.connect('window-created', (_d, metaWindow) => this._watchWindow(metaWindow));

        //existing windows
        for (const actor of global.get_window_actors())
            this._watchWindow(actor.meta_window);

        /*
        container._resizeSignal = global.display.connect('monitors-changed', () => {
            monitor=Main.layoutManager.primaryMonitor;
            button.set_position(10, monitor.height - button.height - 10);
        });
        */
    }

    _watchWindow(metaWindow) {
        if (!metaWindow || this.windowSignals.has(metaWindow)){
            return;
        }

        const minimizedId = metaWindow.connect('notify::minimized', () => {
            if (metaWindow.minimized) {
                this._ensureButton(metaWindow);
            } else {
                this._removeButton(metaWindow);
            }
        });

        const unmanagedId = metaWindow.connect('unmanaged', () => {
            this._removeButton(metaWindow);
            this._unwatchWindow(metaWindow);
        });

        this.windowSignals.set(metaWindow, { minimized: minimizedId, unmanaged: unmanagedId });

        //initial check
        if (metaWindow.minimized) {
            this._ensureButton(metaWindow);
        }
    }

    _ensureButton(metaWindow) {
        if (this.windowButtons.has(metaWindow))
            return;

        let gicon = this._getWindowGicon(metaWindow);
        let icon = new St.Icon({ gicon, style_class: 'button-icon' });

        let label = new St.Label({
            style_class: 'minimized-button-label',
            text: metaWindow.get_title(),
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true
        });

        let content = new St.BoxLayout({
            style_class: 'minimized-button-content',
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        content.add_child(icon);
        content.add_child(label);

        const btn = new St.Button({
            style_class: 'minimized-button',
            child: content,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.container.add_child(btn);

        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);
            try { metaWindow.unminimize(); } catch(e) { logError(e); }
            try { metaWindow.activate(global.get_current_time()); } catch(e) { logError(e); }

            this._removeButton(metaWindow);
        });

        this.windowButtons.set(metaWindow, btn);
    }

    _removeButton(metaWindow) {
        const btn = this.windowButtons.get(metaWindow);
        if (btn) {
            this.container.remove_child(btn);
            this.windowButtons.delete(metaWindow);
        }
    }

    _getWindowGicon(metaWindow) {
    	try{
            /*
    		log('pid: '+metaWindow.get_pid());
    		log('wm_class: '+metaWindow.get_wm_class());
    		log('wm_class_instance: '+metaWindow.get_wm_class_instance());
    		log('gtk menubar object path: '+metaWindow.get_gtk_menubar_object_path());
    		log('gtk app id: '+metaWindow.get_gtk_application_id());
    */

            let giconName = metaWindow.get_gtk_application_id() || (metaWindow.get_wm_class() + '').toLowerCase();

            let gicon = new Gio.ThemedIcon({ name: giconName });

            if (!gicon) {
                log('MinimizedButtonsExtension: no icon found for '+giconName+', using default');
                gicon = new Gio.ThemedIcon({ name: 'application-x-executable' });
            }

            return gicon;

        }catch(e){
        	log('failed');
        	log(e.stack);
        }
        //fallback
        return Gio.icon_new_for_string('application-x-executable'); 
    }

    _unwatchWindow(metaWindow) {
        const ids = this.windowSignals.get(metaWindow);
        if (!ids) return;
        try { metaWindow.disconnect(ids.minimized); } catch (e) { logError(e); }
        try { metaWindow.disconnect(ids.unmanaged); } catch (e) { logError(e); }
        this.windowSignals.delete(metaWindow);
    }

    disable() {
        if (this.sessionSig) {
            Main.sessionMode.disconnect(this.sessionSig);
            this.sessionSig = null;
        }
        if (this.displaySig) {
            global.display.disconnect(this.displaySig);
            this.displaySig = 0;
        }

        for (const [win, ids] of this.windowSignals) {
            try { win.disconnect(ids.minimized); } catch(e) { logError(e); }
            try { win.disconnect(ids.unmanaged); } catch(e) { logError(e); }
        }
        this.windowSignals.clear();

        for (const btn of this.windowButtons.values()) {
            this.container.remove_child(btn);
        }
        this.windowButtons.clear();

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

} //extends extension