/**
 * CoreLogic is for watching windows, getting ButtonFactory to make the Buttons
 * AND doing all button operations within the container (removing, adding, reordering and
 * showing according to workspace)
 * 
 * All button-hooks are to be set here.
 * 
 * everything done on the whole container and on every Button is supposed to be done in
 * DisplayManager (the Placement& Cover-Options stuff, stacking, styling after initial production, etc.)
 * 
 * need to share:
 * - the container with Displaymanager (public here)
 * - isHorizontal from DisplayManager (public there)
 * - windowButtons with displaymanager for resetAllButtonwindowIconPositions() -> public getter here
 * 
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';

const Mtk = imports.gi.Mtk;


export class CoreLogic{

    #settings=null;
    #buttonFactory=null;

    #displayManager=null;
	
	/**
	 * container containing buttons. DisplayManager places it into a scrollContainer.
	 * Placement, show/hide is done with scrollContainer, but
	 * DisplayManager manipulates vertical/horizontal button stacking in this container
	 */
    container=null;

    #windowSignals=null;
    #windowButtons=null; //{metawindow, button}
    #windowWorkspaces=null; //{window, workspaceIndex}

    #sessionSignal=0;
    #displaySignal=0;
    #workspaceSignal=0;

    #dragSuccess=false;

    placeholderButton=null;

	constructor(_settings, _buttonFactory){
		this.#windowSignals=new Map();
        this.#windowButtons=new Map();
        this.#windowWorkspaces=new Map();
        this.#settings=_settings;
        this.#buttonFactory=_buttonFactory;
	}

	setDisplayManager(_displayManager){
		this.#displayManager=_displayManager;
	}

    getWindowButtons(){
        return this.#windowButtons;
    }

	init(){

        this.#setupButtonContainer();

        this.#displayManager.init();

        //was in DM init, do i need it?
        this.#resetPlaceholder();

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

        this.#workspaceSignal = global.workspace_manager.connect(
            'active-workspace-changed',
            () => this.setWorkspaceButtonVisibility()
        );
	}

	close(){
        this.#clearPlaceholder();

        if (this.#sessionSignal) {
            Main.sessionMode.disconnect(this.#sessionSignal);
            this.#sessionSignal = 0;
        }

        if (this.#displaySignal) {
            global.display.disconnect(this.#displaySignal);
            this.#displaySignal = 0;
        }

        if (this.#workspaceSignal) {
            global.workspace_manager.disconnect(this.#workspaceSignal);
            this.#workspaceSignal = 0;
        }

        for (const [win, ids] of this.#windowSignals) {
            win.disconnect(ids.minimized);
            win.disconnect(ids.unmanaged);
        }
        this.#windowSignals.clear();

        //dont need to disconnect anything here, just clear the map
        this.#windowWorkspaces.clear();

        for (const btn of this.#windowButtons.values()) {
            if (this.container && btn.get_parent() === this.container) {
                this.container.remove_child(btn);
            }
            if (btn){
                btn._draggable=null;
                btn.destroy();
            }
        }
        this.#windowButtons.clear();

        if (this.container) {
            this.container._delegate = null;
            this.container.destroy();
            this.container = null;
        } 
	}


	#watchWindow(metaWindow) {
        if (!metaWindow || this.#windowSignals.has(metaWindow)){
            console.log('[Minimized Windows Buttons] WARNING: watchWindow early return!');
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

        //initial check, if minimized, windowopen-animation-position gets set in button.click()
        if (metaWindow.minimized) {
            this.#ensureButton(metaWindow);
        }else{
            //open windows: set animation-position to next free slot(placeholderButton-position)
            //Bad CodeMonkey: not understanding what to wait for
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this.#displayManager.setWindowAnimationPositionOpen(metaWindow);
            });
        }
    }

    //might need to disconnect signals on oldfocuswindow...(dragandresize)
    #unwatchWindow(metaWindow) {
        const ids = this.#windowSignals.get(metaWindow);
        if (!ids) {return;}
        metaWindow.disconnect(ids.minimized);
        metaWindow.disconnect(ids.unmanaged);
        this.#windowSignals.delete(metaWindow);
        this.#windowWorkspaces.delete(metaWindow);
    }

    #ensureButton(metaWindow) {
        this.#windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
        );
        if (this.#windowButtons.has(metaWindow)) {return;};

        const btn = this.#buttonFactory.makeButton(metaWindow);

        this.#setupButton(btn, metaWindow);

        this.#putButtonInPlace(btn);

        this.#windowButtons.set(metaWindow, btn);

        this.setWorkspaceButtonVisibility();

        //setting on old size here?
        this.#displayManager.setScrollcontainerReactivity();

        this.container.queue_relayout();

        //Bad CodeMonkey: not understanding what to wait for
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.updateIconGeometry(btn, metaWindow);
        });
    }

    #putButtonInPlace(btn){
        let placeholderIndex=this.#getPlaceholderIndex();
        if (placeholderIndex==-1){console.log('[Minimized Windows Buttons] WARNING: calling putButtonInPlace with placeholderIndex=-1!');}
        if (btn.get_parent()!==this.container){
            if (btn.get_parent()!==null){
                btn.get_parent().remove_child(btn);
            }
            this.container.add_child(btn);
        }
        this.container.set_child_at_index(btn, placeholderIndex); //removes placeholderButton
        this.#resetPlaceholder();

    }

    #removeButton(metaWindow) {
        this.#windowWorkspaces.delete(metaWindow);
        const btn = this.#windowButtons.get(metaWindow);

        if (btn) {
            if (btn._draggable) {
                btn._draggable = null;
            }
            this.container.remove_child(btn);
            this.#windowButtons.delete(metaWindow);
            btn.destroy();
        }
        this.#resetPlaceholder();

        //setting on old size?
        this.#displayManager.setScrollcontainerReactivity();

        //without relayout, the container leaves a gap in the buttons place
        this.container.queue_relayout();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.resetAllButtonwindowIconPositions();
        });
    }

    //-------------------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------container and button hooks: dnd and click logic-------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------------------
    #setupButtonContainer(){
        this.container = new St.BoxLayout();

        //dnd receive functionality
        this.container._delegate = {
            handleDragOver: (source, actor, x, y, time) => {
                return DND.DragDropResult.CONTINUE;
                //return DND.DragMotionResult.MOVE
            },
            handleDragOut: () => { 
                //not working?!
            },
            acceptDrop: (source, actor, x, y, time) => {
                this.#dragSuccess=true;
                this.reorderButtons(actor, x, y);
                this.#displayManager.resetAllButtonStyles();
                this.#displayManager.resetAllButtonwindowIconPositions();
                this.#displayManager.resetAllOpenWindowIconPositions();

                return true;
            }
        };
    }


    #setupButton(btn, metaWindow){
        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);

            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

            this.#removeButton(metaWindow);
        });

        btn._draggable = DND.makeDraggable(btn, {});
        /**
         * important: use ()=>{} function-define-structure to use "this"
         * why? because thats just the way it is in js. its nice to have this here.
         * 
         * normal hook on drag begin
         */
        btn._draggable.connect('drag-begin', () => {
            this.#dragSuccess=false;
            this.#displayManager.resetDnD();
        });


        /**
         * need to mess around in gnome-shell's js/ui/dnd.js a little bit for the next 2 hooks
         * -> should have a closer look at the originals and do some checks.
         */

        /**
         * need to overwrite this for snapback-location on "failed" drop (outside buttoncontainer)
         * seems the simplest solution right now, 
         * 
         * TODO: maybe for not-snapback (open window) use cursor xy and scale 1?
         */
        btn._draggable._getRestoreLocation = () => {
            let [x, y]= this.placeholderButton.get_transformed_position();

            //this is basically _draggable._getRealActorScale(actor)
            let actor=btn._draggable._dragOrigParent;
            let scale= 1.0;
            while (actor) {
                scale *= actor.scale_x;
                actor = actor.get_parent();
            }

            return [x,y,scale]
        };

        /**
         * need this for reordering in snapback-mode
         * but also to detect the drag button container-leave-event in non-snapback-mode
         */
        const _originalUpdate = btn._draggable._updateDragPosition;
        btn._draggable._updateDragPosition = (event) => {

            //reducing errors on touch device
            if (!btn._draggable._dragActor || btn._draggable._dragActor.is_finalized?.()) {return;}

            let [x, y] = event.get_coords();

            if (this.#settings.get_boolean('drag-scroll-hack')){
                this.#displayManager.dragScrollHack(x,y);
            }

            _originalUpdate.call(btn._draggable, event);//do i still need this?
            
            this.reorderButtons(null, x, y);
        };


        /**
         * normal hook again.
         * this gets called also if no drop on buttoncontainer
         * here case drop on !buttoncontainer gets handled. drop on buttoncontainer
         * gets handled in container-hook
         */
        btn._draggable.connect('drag-end', (draggable) => {

            this.#displayManager.resetDnD();

            if (!this.#dragSuccess) {

                //if snapback, the placeholder button is in the right place
                if (this.#settings.get_boolean('snapback')){
                    this.#putButtonInPlace(btn);
                    this.#displayManager.resetAllButtonStyles();
                    this.#displayManager.resetAllButtonwindowIconPositions();
                    this.#displayManager.resetAllOpenWindowIconPositions();
                    return;
                }


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

                        this.#windowWorkspaces.delete(metaWindow);
                        this.#removeButton(metaWindow);
                    }
                }
            }
        });


    }

    //-------------------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------Placeholderbutton & reordering stuff------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------------------

    reorderButtons(btn, dropX, dropY) {

        const children = this.container.get_children();
        let hoveredIndex=this.#getAppropriatePlaceholderIndex(children, dropX, dropY);

        //its the placeholder (we are during drag)
        if (btn === null) {
            if (!this.placeholderButton) {
                this.placeholderButton = this.#buttonFactory.makePlaceholderButton();
            }

            // If hovering over placeholder or nothing new, do nothing
            if (children[hoveredIndex] === this.placeholderButton) {return;}

            // Move placeholder to the new hovered position
            if (this.placeholderButton.get_parent()) {
                this.container.remove_child(this.placeholderButton);
            }
            this.container.add_child(this.placeholderButton);
            this.container.set_child_at_index(this.placeholderButton, hoveredIndex);

        //not the placeholder, but the real button, dropped into container
        }else{ 
            this.#putButtonInPlace(btn);
            this.#displayManager.resetAllButtonwindowIconPositions();
        }
    }


    //still one nasty settings call
    #getAppropriatePlaceholderIndex(children, dropX, dropY){
        let hoveredIndex = -1;

        let snapback_enabled=this.#settings.get_boolean('snapback');

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const [cx, cy] = child.get_transformed_position();

            if (snapback_enabled){
                // just check x for horizontal, y for vertical
                // return if smaller (covering button gaps)
                if (this.#displayManager.isHorizontal){
                    if (dropX <= cx + child.width){
                        return i;
                    }
                }else{
                    if (dropY <= cy + child.height){
                        return i;
                    }
                }
            }else{
                //check over which button the event is
                //not checking in the margins here!!!
                if (dropX >= cx && dropX <= cx + child.width &&
                    dropY >= cy && dropY <= cy + child.height) {
                    return i;
                }
            }

        }

        if (hoveredIndex==-1){
            hoveredIndex=children.length;//after last button
        }

        return hoveredIndex;
    }

    #getPlaceholderIndex(){
        return this.container.get_children().indexOf(this.placeholderButton);
    }

    #resetPlaceholder(){
        if (this.placeholderButton==null){
            console.log('[Minimized Windows Buttons] WARNING: placeholderButton=null, this is ok only during init!');
            this.placeholderButton=this.#buttonFactory.makePlaceholderButton();
        }
        if (this.placeholderButton.get_parent()){this.placeholderButton.get_parent().remove_child(this.placeholderButton);}
        this.container.add_child(this.placeholderButton);

    }

    #clearPlaceholder() {
        if (this.placeholderButton) {
            const container = this.container;
            if (this.placeholderButton.get_parent() === container) {
                container.remove_child(this.placeholderButton);
            }
            this.placeholderButton.destroy();
            this.placeholderButton = null;
        }
    }

    //-------------------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------Rest: Workspacebuttonvisibility, ... -----------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------------------
    setWorkspaceButtonVisibility(){
        if (this.#settings.get_boolean('per-workspace-buttons')){
            let currentWorkspaceNr=global.workspace_manager.get_active_workspace().index();
            for (let [metaWindow, btn] of this.#windowButtons) {
                let windowWorkspaceNr = this.#windowWorkspaces.get(metaWindow);
                if (windowWorkspaceNr==currentWorkspaceNr){
                    btn.visible=true;
                }else{
                    btn.visible=false;
                }
            }
        }else{
            for (let [metaWindow, btn] of this.#windowButtons) {
                btn.visible=true;
            }
        }
    }
}