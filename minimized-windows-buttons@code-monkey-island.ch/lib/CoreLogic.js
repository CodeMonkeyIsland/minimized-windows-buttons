/**
 * CoreLogic is for watching windows, constructing buttons and adding them to /removing them from the container
 * Placement, show/hide etc. is all done in DisplayManager
 * this class talks only to DisplayManager
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export class CoreLogic{
	
	/**
	 * container containing buttons. DisplayManager places it into a scrollContainer.
	 * Placement, show/hide is done with scrollContainer, but
	 * DisplayManager manipulates vertical/horizontal button stacking in this container
	 */
	container=null;

	#windowSignals=null

	//need those in DisplayManager.setWorkspaceButtonVisibility
    _windowButtons=null;
    _windowWorkspaces=null; //{window, workspaceIndex}

    #sessionSignal=0;
    #displaySignal=0;


    #displayManager=null;

	constructor(){
		this.#windowSignals=new Map();
        this._windowButtons=new Map();
        this._windowWorkspaces=new Map();
	}

	setDisplayManager(_displayManager){
		this.#displayManager=_displayManager;
	}

	init(){

        this.container = new St.BoxLayout();

        this.#displayManager.init();

		this.#sessionSignal = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this.#watchWindow(actor.meta_window);
            }
        });

        //new windows
        this.#displaySignal = global.display.connect('window-created', (_d, metaWindow) => this.#watchWindow(metaWindow));

        //existing windows
        for (const actor of global.get_window_actors()){
            this.#watchWindow(actor.meta_window);
        }

	}

	close(){

        if (this.#sessionSignal) {
            Main.sessionMode.disconnect(this.#sessionSignal);
            this.#sessionSignal = 0;
        }

        if (this.#displaySignal) {
            global.display.disconnect(this.#displaySignal);
            this.#displaySignal = 0;
        }

        for (const [win, ids] of this.#windowSignals) {
            win.disconnect(ids.minimized);
            win.disconnect(ids.unmanaged);
        }
        this.#windowSignals.clear();

        //dont need to disconnect anything here, just clear the map
        this._windowWorkspaces.clear();

        for (const btn of this._windowButtons.values()) {
            this.container.remove_child(btn);
            btn.destroy();
        }
        this._windowButtons.clear();

        this.#displayManager.destroySizingButton();


        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
	}


	#watchWindow(metaWindow) {
        if (!metaWindow || this.#windowSignals.has(metaWindow)){
            return;
        }

        this._windowWorkspaces.set(
            metaWindow,
            metaWindow.get_workspace().index()
        );

        const minimizedId = metaWindow.connect('notify::minimized', () => {
            if (metaWindow.minimized) {

                this.#ensureButton(metaWindow);
            } else {
                this._windowWorkspaces.delete(metaWindow);
                this.#removeButton(metaWindow);
            }
        });

        const unmanagedId = metaWindow.connect('unmanaged', () => {
            this.#removeButton(metaWindow);
            this.#unwatchWindow(metaWindow);
        });

        this.#windowSignals.set(metaWindow, { minimized: minimizedId, unmanaged: unmanagedId });

        //initial check
        if (metaWindow.minimized) {
            this.#ensureButton(metaWindow);
        }
    }

    #unwatchWindow(metaWindow) {
        const ids = this.#windowSignals.get(metaWindow);
        if (!ids) {return;}
        metaWindow.disconnect(ids.minimized);
        metaWindow.disconnect(ids.unmanaged);
        this.#windowSignals.delete(metaWindow);
        this._windowWorkspaces.delete(metaWindow);
    }

    #ensureButton(metaWindow) {
        if (this._windowButtons.has(metaWindow)) {return};

        let gicon = this.#getWindowGicon(metaWindow);
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
            x_expand: false,
            y_expand:false,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START
        });

        this.container.add_child(btn);

        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);
            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

            this.#removeButton(metaWindow);
        });

        //DISPLAY MANAGER
        this.#displayManager.styleButton(btn);

        this._windowButtons.set(metaWindow, btn);


        //DISPLAY MANAGER
        this.#displayManager.setWorkspaceButtonVisibility();
        this.#displayManager.setScrollcontainerReactivity();

    }

    #removeButton(metaWindow) {
        const btn = this._windowButtons.get(metaWindow);
        if (btn) {
            this.container.remove_child(btn);
            this._windowButtons.delete(metaWindow);
            btn.destroy();
        }

        //DISPLAY MANAGER
        this.#displayManager.setScrollcontainerReactivity();
    }

    #getWindowGicon(metaWindow) {
        try{
            let gicon = null;
            let app = null;
            let giconName = null;

            const gtkAppId = metaWindow.get_gtk_application_id?.();
            const wmClass = metaWindow.get_wm_class?.();
            const wmInstance = metaWindow.get_wm_class_instance?.();
            const appSys = Shell.AppSystem.get_default();

            //1. gtk app id
            if (gtkAppId){
                app = appSys.lookup_app(gtkAppId + '.desktop');
            }

            //2. wmClass
            if (!app && wmClass){
                app = appSys.lookup_startup_wmclass(wmClass);
            }

            //3. wm instance
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


}