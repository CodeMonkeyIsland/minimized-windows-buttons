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
 * - windowMap with displaymanager for resetAllButtonwindowIconPositions() -> public getter here
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

    #windowMap=null; //metaWindow, {button, workspaceIndex}

    #dragSuccess=false;

    placeholderButton=null;

    constructor(_settings, _buttonFactory){
        this.#windowMap=new Map();
        this.#settings=_settings;
        this.#buttonFactory=_buttonFactory;
    }

    setDisplayManager(_displayManager){
        this.#displayManager=_displayManager;
    }

    getWindowMap(){
        return this.#windowMap;
    }

    init(){
        this.#setupButtonContainer();

        this.#displayManager.init();

        //was in DM init, do i really need it here?
        this.#resetPlaceholder();

        //existing windows
        for (const actor of global.get_window_actors()){
            this.#watchWindow(actor.meta_window);
        }

        Main.sessionMode.connectObject(
            'updated', 
            () => {
                for (const actor of global.get_window_actors()){
                    this.#watchWindow(actor.meta_window);
                }
            },
            this
        );

        //new windows
        global.display.connectObject(
            'window-created', 
            (_d, metaWindow) => {
                this.#watchWindow(metaWindow);
            },
            this
        );

        global.workspace_manager.connectObject(
            'active-workspace-changed',
            () => {
                this.setWorkspaceButtonVisibility();
            },
            this
        );
    }

    close(){
        this.#clearPlaceholder();

        Main.sessionMode.disconnectObject(this);
        global.display.disconnectObject(this);
        global.workspace_manager.disconnectObject(this);

        for (const { button } of this.#windowMap.values()) {
            if (!button) {continue;}

            if (this.container && button.get_parent() === this.container) {
                this.container.remove_child(button);
            }

            button.disconnectObject(button);
            if (button._draggable) {
                button._draggable.disconnectObject(button);
                button._draggable = null;
            }
            button.destroy();
        }

        for (const win of this.#windowMap.keys()) {
            this.#unwatchWindow(win);
        }

        this.#windowMap.clear();

        if (this.container) {
            this.container._delegate = null;
            this.container.destroy();
            this.container = null;
        }
    }


    #watchWindow(metaWindow) {
        if (!metaWindow || this.#windowMap.has(metaWindow)){
            console.log('[Minimized Windows Buttons] WARNING: watchWindow early return!');
            return;
        }

        metaWindow.connectObject(
            'notify::minimized', 
            () => {
                if (metaWindow.minimized) {
                    this.#ensureButton(metaWindow);
                } else {
                    this.#removeButton(metaWindow);
                }
            },
            metaWindow
        );

        metaWindow.connectObject(
            'unmanaged', 
            () => {
                this.#removeButton(metaWindow);
                this.#unwatchWindow(metaWindow);
            },
            metaWindow
        );

        this.#windowMap.set(metaWindow, { button: null, workspace_index: null } );

        //initial check, if minimized, windowopen-animation-position gets set in button.click()
        if (metaWindow.minimized) {
            this.#ensureButton(metaWindow);
        }else{
            //open windows: set animation-position to next free slot(placeholderButton-position)
            //Bad CodeMonkey: not understanding what to wait for
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this.#displayManager.setWindowAnimationPositionOpen(metaWindow);
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    //might need to disconnect signals on oldfocuswindow...(dragandresize)
    #unwatchWindow(metaWindow) {
        if (!this.#windowMap.has(metaWindow)){return;}
        metaWindow.disconnectObject(metaWindow); //lol
        this.#windowMap.delete(metaWindow);
    }

    #ensureButton(metaWindow) {

        const windowData = this.#windowMap.get(metaWindow);
        if(!windowData){
            console.log('[Minimized Windows Buttons] ERROR: ensureButton called on non-mapped window!');
            return;
        }

        if (windowData.button){return;}
        const btn = this.#buttonFactory.makeButton(metaWindow);
        this.#setupButton(btn, metaWindow);
        this.#putButtonInPlace(btn);

        windowData.button=btn;
        windowData.workspace_index=metaWindow.get_workspace().index();

        this.#windowMap.set(metaWindow, windowData);


        this.setWorkspaceButtonVisibility();
        this.#displayManager.setScrollcontainerReactivity();
        this.container.queue_relayout();

        //Bad CodeMonkey: not understanding what to wait for
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.updateIconGeometry(btn, metaWindow);
            return GLib.SOURCE_REMOVE;
        });
    }

    #putButtonInPlace(btn){
        let placeholderIndex=this.#getPlaceholderIndex();
        if (placeholderIndex==-1){
            console.log('[Minimized Windows Buttons] WARNING: calling putButtonInPlace with placeholderIndex=-1!');
        }
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

        const windowData = this.#windowMap.get(metaWindow);
        if (!windowData){return;}

        const btn = windowData.button;
        if (btn) {
            btn.disconnectObject(btn);
            if (btn._draggable) {
                btn._draggable.disconnectObject(btn);
                btn._draggable = null;
            }
            this.container.remove_child(btn);
            btn.destroy();
        }

        windowData.button = null;
        windowData.workspace_index = null;

        this.#resetPlaceholder();
        this.#displayManager.setScrollcontainerReactivity();

        //without relayout, the container leaves a gap in the buttons place
        this.container.queue_relayout();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.#displayManager.resetAllOpenWindowIconPositions();
            this.#displayManager.resetAllButtonwindowIconPositions();
            return GLib.SOURCE_REMOVE;
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
            handleDragLeave: () => {
                return DND.DragDropResult.CONTINUE;
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

        /**
         * click-hook: there is a new way of doing it. With Clutter.ClickGesture.
         * this is the old way. still working in Gnome 51, but will have to rewrite before 52.
         * that will make it incompatible with Gnome <= 50
         */
        btn.connectObject('clicked',() => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);
            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }
        },btn);

        btn._draggable = DND.makeDraggable(btn, {});

        /**
         * need to overwrite this for snapback-location on "failed" drop (outside buttoncontainer)
         * seems the simplest solution right now,
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
         * another overwrite, need this for reordering in snapback-mode
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

            _originalUpdate.call(btn._draggable, event); //the dnd animation

            this.reorderButtons(null, x, y);
        };


        /**
         * havent figured out yet how to do DnD "the new way",
         * or if its possible. Check next two hooks before Gnome 52!
         */
        btn._draggable.connectObject('drag-begin', 
                () => {
                    this.#dragSuccess=false;
                    this.#displayManager.resetDnD();
                },
                btn
        );


        /**
         * this gets called also if no drop on buttoncontainer
         * here case drop on !buttoncontainer gets handled. drop on buttoncontainer
         * gets handled in container-hook
         */
        btn._draggable.connectObject('drag-end', 
            (draggable) => {

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
                            this.#removeButton(metaWindow);
                        }
                    }
                }
            },
            btn
        );
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

            for (let [metaWindow, {button,workspace_index}] of this.#windowMap) {
                if (workspace_index==currentWorkspaceNr){
                    button.visible=true;
                }else{
                    button.visible=false;
                }
            }
        }else{
            for (let [metaWindow, { button }] of this.#windowMap){
                if (button){
                    button.visible = true;
                }
            }
        }
    }
}