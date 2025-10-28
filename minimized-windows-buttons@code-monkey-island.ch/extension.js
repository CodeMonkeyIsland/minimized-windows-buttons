import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


export default class MinimizedButtonsExtension extends Extension {

    container=null;
    displaySig=0;
    sessionSig=0;
    windowSignals=new Map();
    windowButtons=new Map();
    sizingButton=null;
    settings=null;

    enable() {

        this.settings=this.getSettings();
        //new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.minimized-windows-buttons' });

        this.sessionSig = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this._watchWindow(actor.meta_window);
            }
        });

        this.container = new St.BoxLayout({
            vertical: false,
            style_class: "bottom-container"
        });

        Main.layoutManager.addChrome(this.container, { trackFullscreen: true });

        Main.overview.connect('showing', () => this._setOverviewVisibility());
        Main.overview.connect('hiding', () => this._setOverviewVisibility());
        this._setOverviewVisibility();


        // Create button for sizing, then hide it
        this.sizingButton = new St.Button({ label: 'Hello', style_class: 'minimized-button' });
        this.container.add_child(this.sizingButton);
        this.sizingButton.hide();

        //position of the buttons (top/bottom)
        this._setPosition();
        this.settings.connect('changed::position-on-screen', () => {
            this._setPosition();
        });


        //new windows
        this.displaySig = global.display.connect('window-created', (_d, metaWindow) => this._watchWindow(metaWindow));

        //existing windows
        for (const actor of global.get_window_actors()){
            this._watchWindow(actor.meta_window);
        }
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
        if (this.windowButtons.has(metaWindow)) {return};

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
            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

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

    _setPosition(){
        let _position = this.settings.get_string('position-on-screen');
        let monitor=Main.layoutManager.primaryMonitor;
        if (_position=='top'){
            //need to find out top bars height somehow....
            //and set margin of buttons in settings
            this.container.set_position(3, 33);
        }else{ //bottom
            this.container.set_position(3, monitor.height - this.sizingButton.height - 3);
        }
    }

    _setOverviewVisibility(){
        let showInOverview = this.settings.get_boolean('show-in-overview');
        if (Main.overview.visible) {
            this.container.visible = showInOverview;
        } else {
            this.container.visible = true;
        }
    }

    _getWindowGicon(metaWindow) {
    	try{
            let gicon = null;
            let app = null;
            let giconName = null;

            const gtkAppId = metaWindow.get_gtk_application_id?.();
            const wmClass = metaWindow.get_wm_class?.();
            const wmInstance = metaWindow.get_wm_class_instance?.();
            const appSys = Shell.AppSystem.get_default();

            //1. GTK app ID
            if (gtkAppId){
                app = appSys.lookup_app(gtkAppId + '.desktop');
            }

            //2. WM_CLASS
            if (!app && wmClass){
                app = appSys.lookup_startup_wmclass(wmClass);
            }

            //3. WM instance
            if (!app && wmInstance){
                app = appSys.lookup_startup_wmclass(wmInstance);
            }

            //4. sublime, others?
            if (!app && wmClass){
                app=appSys.lookup_app(wmClass.replaceAll('-','_')+'.desktop');
            }

            //OK, get the gicon, preferably from app, else try something or fallback
            if (app){
                gicon = app.get_app_info()?.get_icon() || app.get_icon();
            }else{
                giconName = (gtkAppId || wmClass || wmInstance ).toLowerCase();
                gicon = new Gio.ThemedIcon({ name: giconName });
            }
            if (!gicon){
                giconName = 'application-x-executable';
            gicon = new Gio.ThemedIcon({ name: giconName });
            }

            return gicon;

        }catch(e){
        	console.error(e);
        }

        return new Gio.ThemedIcon({ name: 'application-x-executable' });
    }

    _unwatchWindow(metaWindow) {
        const ids = this.windowSignals.get(metaWindow);
        if (!ids) {return;}
        metaWindow.disconnect(ids.minimized);
        metaWindow.disconnect(ids.unmanaged);
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
            win.disconnect(ids.minimized);
            win.disconnect(ids.unmanaged);
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
        this.settings = null;

    }

} //MinimizedButtonsExtension extends Extension