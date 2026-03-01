/**
 * CoreLogic is for watching windows, constructing buttons and adding them to /removing them from the container
 * Placement, show/hide etc. is all done in DisplayManager
 * this class talks only to DisplayManager and ButtonFactory
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

//not nulling this on disable! (module level const should be gc'd on disable)
const Mtk = imports.gi.Mtk;


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
    #buttonFactory=null;

	constructor(){
		this.#windowSignals=new Map();
        this._windowButtons=new Map();
        this._windowWorkspaces=new Map();
	}

	setDisplayManager(_displayManager){
		this.#displayManager=_displayManager;
	}

    setButtonFactory(_buttonFactory){
        this.#buttonFactory=_buttonFactory;
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

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
	}


	#watchWindow(metaWindow) {
        if (!metaWindow || this.#windowSignals.has(metaWindow)){
            return;
        }

        const minimizedId = metaWindow.connect('notify::minimized', () => {
            if (metaWindow.minimized) {
                this._windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
                );
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
            this._windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
            );
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
        if (this._windowButtons.has(metaWindow)) {return;};

        const btn = this.#buttonFactory.makeButton(metaWindow);

        this.container.add_child(btn);

        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);

            //window-open-animation: this feels like it belongs in displaymanager
            let [x, y] = btn.get_transformed_position();
            let [w, h] = btn.get_transformed_size();
            let rect = new Mtk.Rectangle({
                x: Math.floor(x),
                y: Math.floor(y),
                width: Math.floor(w),
                height: Math.floor(h),
            });
            metaWindow.set_icon_geometry(rect);


            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

            this._windowWorkspaces.delete(metaWindow);
            this.#removeButton(metaWindow);
            //this.#unwatchWindow(metaWindow);
        });

        this._windowButtons.set(metaWindow, btn);

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

        this.#displayManager.setScrollcontainerReactivity();

        //without this, the container leaves a gap in the buttons place
        this.container.queue_relayout();
    }


}