/**
 * CoreLogic is for watching windows, getting ButtonFactory to make the Buttons 
 * and adding them to /removing them from the container
 * Placement, show/hide etc. is all done in DisplayManager
 * 
 * this class talks only to DisplayManager and ButtonFactory
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';

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
    _windowButtons=null; //{metawindow, button}
    _windowWorkspaces=null; //{window, workspaceIndex}

    #sessionSignal=0;
    #displaySignal=0;

    #displayManager=null;
    #buttonFactory=null;

    //save button while dragging here, so displaymanager can access it.
    draggedButton=null;
    #dragSuccess=false;

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

        this.#setupButtonContainer();

        this.#displayManager.init();

        this.#sessionSignal = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this.#watchWindow(actor.meta_window);
            }
        });

        //new windows
        this.#displaySignal = global.display.connect('window-created', (_d, metaWindow) => {
            this.#watchWindow(metaWindow);
        });

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

        this.draggedButton=null;
        
	}


	#watchWindow(metaWindow) {
        if (!metaWindow || this.#windowSignals.has(metaWindow)){
            return;
        }
        
        const minimizedId = metaWindow.connect('notify::minimized', () => {
            if (metaWindow.minimized) {
                this.#ensureButton(metaWindow);
            } else {
                this.#removeButton(metaWindow);
            }
        });

        const unmanagedId = metaWindow.connect('unmanaged', () => {
            this.#removeButton(metaWindow);
            this.#unwatchWindow(metaWindow);
        });

        this.#windowSignals.set(metaWindow, { minimized: minimizedId, unmanaged: unmanagedId });

        //initial check, if minimized, windowopen-animation-position gets et in button.click()
        if (metaWindow.minimized) {
            this.#ensureButton(metaWindow);
        }else{//open windows: set animation-position position to next free slot
            this.#displayManager.setWindowAnimationPositionOpen(metaWindow);
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
        this._windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
        );
        if (this._windowButtons.has(metaWindow)) {return;};

        const btn = this.#buttonFactory.makeButton(metaWindow);

        this.#setupButton(btn, metaWindow);

        this.putButtonInPlace(btn);

        this._windowButtons.set(metaWindow, btn);

        this.#displayManager.setWorkspaceButtonVisibility();

        //setting on old size here?
        this.#displayManager.setScrollcontainerReactivity();

        this.container.queue_relayout();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.updateIconGeometry(btn, metaWindow);
        });
    }

    putButtonInPlace(btn){
        let placeholderIndex=this.#displayManager.getPlaceholderIndex();
        if (placeholderIndex==-1){console.log('WARNING: calling putButtonInPlace with placeholderIndex=-1!');}
        if (btn.get_parent()!==this.container){
            if (btn.get_parent()!==null){
                btn.get_parent().remove_child(btn);
            }
            this.container.add_child(btn);
        }
        this.container.set_child_at_index(btn, placeholderIndex); //removes placeholderButton
        this.#displayManager.resetPlaceholder();

    }

    #removeButton(metaWindow) {
        this._windowWorkspaces.delete(metaWindow);
        const btn = this._windowButtons.get(metaWindow);

        if (btn) {
            if (btn._draggable) {
                btn._draggable = null;
            }
            this.container.remove_child(btn);
            this._windowButtons.delete(metaWindow);
            btn.destroy();
        }
        this.#displayManager.resetPlaceholder();

        //setting on old size?
        this.#displayManager.setScrollcontainerReactivity();

        //without relayout, the container leaves a gap in the buttons place
        this.container.queue_relayout();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.resetAllButtonwindowIconPositions();
        });
    }

    #setupButtonContainer(){
        this.container = new St.BoxLayout();

        //dnd receive functionality
        this.container._delegate = {
            handleDragOver: (source, actor, x, y, time) => {
                //this.#displayManager.reorderButtons(null, x, y);
                return DND.DragDropResult.CONTINUE;
                //return DND.DragMotionResult.MOVE
            },
            handleDragOut: () => { //not working?!
                console.log('gigsgisg')
                //this.#displayManager.clearPlaceholder();
            },
            acceptDrop: (source, actor, x, y, time) => {
                this.#dragSuccess=true;
                this.#displayManager.reorderButtons(actor, x, y);
                this.#displayManager.resetAllButtonStyles();
                this.#displayManager.resetAllButtonwindowIconPositions();
                this.#displayManager.resetAllOpenWindowIconPositions();
                this.draggedButton=null;

                return true;
            }
        };
    }

    //meh, better place it here
    reorderButtons(btn, x, y){
        this.#displayManager.reorderButtons(btn, x, y);
    }

    #setupButton(btn, metaWindow){
        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);

            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

            this.#removeButton(metaWindow);
        });

        //dnd reordering
        btn._draggable = DND.makeDraggable(btn, {});

        btn._draggable.connect('drag-begin', () => {
            this.#dragSuccess=false;
            this.draggedButton=btn;
        });


        const _originalUpdate = btn._draggable._updateDragPosition; //do i really need this?
        //important, use (event)=>{} function define structure to have this
        btn._draggable._updateDragPosition = (event) => {
            _originalUpdate.call(btn._draggable, event);
            let [x, y] = event.get_coords();
            this.reorderButtons(null, x, y);
        };

        /**
         * this gets called also if no drop on buttoncontainer
         * here case drop on !buttoncontainer gets handled. drop on buttoncontainer
         * gets handled in container-hook
         */
        btn._draggable.connect('drag-end', (draggable) => {
            if (!this.#dragSuccess) {
                if (metaWindow) {
                    const [px, py] = global.get_pointer();
                    const rect = new Mtk.Rectangle({ x: px, y: py, width: 1, height: 1 });
                    const monitorIndex = global.display.get_monitor_index_for_rect(rect);
                    
                    if (monitorIndex !== -1) {
                        const monitorGeo = global.display.get_monitor_geometry(monitorIndex);
                        const windowRect = metaWindow.get_buffer_rect(); 
                        
                        const newX = monitorGeo.x + (monitorGeo.width - windowRect.width) / 2;
                        const newY = monitorGeo.y + (monitorGeo.height - windowRect.height) / 2;

                        metaWindow.move_frame(true, newX, newY);
                        
                        let targetWorkspace = global.workspace_manager.get_active_workspace();
                        metaWindow.change_workspace(targetWorkspace);

                        try {
                            metaWindow.unminimize();
                            metaWindow.activate(global.get_current_time());
                        }catch(e){
                            logError(e);
                        }

                        this._windowWorkspaces.delete(metaWindow);
                        this.#removeButton(metaWindow);
                    }
                }
            }
        });

    }

}