import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


export default class MinimizedButtonsExtension extends Extension {

    //some UI elements
    _container=null;
    _scrollContainer=null;
    _sizingButton=null;
    _oldFocusWindow=null;
    _autohide_detect_container=null;

    //saving the returns of the event bindings, in order to disconnect later/on disable
    //its an address, type int-ish .. however that works in js... 0 is "falsy" and can be used in if()-statements
    _displaySig=0;
    _sessionSig=0;
    _workspaceSig=0;
    _focusSignal=0;
    _scrollOverwriteSig=0;
    _resizeSignal =0; //window resize, not monitor!
    _positionSignal=0;
    _autohide_showSignal=0;
    _autohide_leaveSignal=0;
    _monitorResizeSignal=0;

    _windowSignals=new Map();
    _windowButtons=new Map();
    _windowWorkspaces=new Map(); //{window, workspaceIndex}

    //for bindings that may get triggered a lot, save some settings as booleans
    _useScrollPiping=false;
    _autohideActive=false;
    _autohide_always=false;

    //public?
    settings=null;


    //after turning on and off, need to go to overview in order for it to work.
    //after re-login all works fine
    enable() {

        this.settings=this.getSettings();

        this._sessionSig = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this._watchWindow(actor.meta_window);
            }
        });

        this._container = new St.BoxLayout();

        this._scrollContainer = new St.ScrollView({
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
            x_expand: true,
            y_expand: true,
            reactive: false,
            style_class: "button-scroll-container"
        });
        this._scrollContainer.add_child(this._container);


        //what covers what
        this._autohide_detect_container = new St.BoxLayout({
            reactive: true, //to get hover events
            x_expand: false,
            y_expand: false,
        });
        Main.layoutManager.addChrome(this._autohide_detect_container, {
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
        });
        this._setCoverPosition();
        this.settings.connect('changed::cover-behaviour', () => {
            this._setCoverPosition();
            this._setupAutohideDetector();
            //trigger reset and update in autohide
            this._updateVisibilityActiveWindow();
        });
        //decide what to do inside the function, calling it at any cover-behaviour
        this._focusSignal = global.display.connect('notify::focus-window', () => this._focusWindowChange() );
        this.settings.connect('changed::autohide-container-size', () => {
            this._setAutohideDefaultSize();
        });


        //per workspace
        this._workspaceSig = global.workspace_manager.connect(
            'active-workspace-changed',
            () => this._setWorkspaceButtonVisibility()
        );
        this.settings.connect('changed::per-workspace-buttons', () => {
            this._resetWorkspaceButtonVisibility();
        });

        //hide or show on overview?
        Main.overview.connect('showing', () => this._setOverviewVisibility());
        Main.overview.connect('hiding', () => this._setOverviewVisibility());
        this._setOverviewVisibility();

        // Create button for sizing, then hide it
        this._sizingButton = new St.Button({ label: 'Hello', style_class: 'minimized-button' });
        this._container.add_child(this._sizingButton);
        this._sizingButton.hide();

        //margins
        this.settings.connect('changed::margin-vertical', () => {
            this._setPosition();
            this._updateVisibilityActiveWindow();
        });
        this.settings.connect('changed::margin-horizontal', () => {
            this._setPosition();
            this._updateVisibilityActiveWindow();
        });
        this.settings.connect('changed::margin-buttons', () => {
            this._setPosition();
            this._updateVisibilityActiveWindow();
        });

        //position of the buttons (top/bottom)
        this._setPosition();
        this.settings.connect('changed::position-on-screen', () => {
            this._setPosition();
            this._updateVisibilityActiveWindow();
        });

        this._scrollOverwriteSig= this._scrollContainer.connect('scroll-event', (actor, event) => {
            if (this._useScrollPiping) {
                return this._scrollPiping(actor, event);
            }else{
                return Clutter.EVENT_PROPAGATE;
            }
        });

        //new windows
        this._displaySig = global.display.connect('window-created', (_d, metaWindow) => this._watchWindow(metaWindow));

        //existing windows
        for (const actor of global.get_window_actors()){
            this._watchWindow(actor.meta_window);
        }


        this._monitorResizeSignal = Main.layoutManager.connect('monitors-changed', () => {
            this._monitorChanged();
        });

    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------basic functions-------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------

    _watchWindow(metaWindow) {
        if (!metaWindow || this._windowSignals.has(metaWindow)){
            return;
        }

        const minimizedId = metaWindow.connect('notify::minimized', () => {
            if (metaWindow.minimized) {
                this._windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
                );
                this._ensureButton(metaWindow);
            } else {
                this._windowWorkspaces.delete(metaWindow);
                this._removeButton(metaWindow);
            }
        });

        const unmanagedId = metaWindow.connect('unmanaged', () => {
            this._removeButton(metaWindow);
            this._unwatchWindow(metaWindow);
        });

        this._windowSignals.set(metaWindow, { minimized: minimizedId, unmanaged: unmanagedId });

        //initial check
        if (metaWindow.minimized) {
            this._ensureButton(metaWindow);
        }
    }

    _unwatchWindow(metaWindow) {
        const ids = this._windowSignals.get(metaWindow);
        if (!ids) {return;}
        metaWindow.disconnect(ids.minimized);
        metaWindow.disconnect(ids.unmanaged);
        this._windowSignals.delete(metaWindow);
    }

    _ensureButton(metaWindow) {
        if (this._windowButtons.has(metaWindow)) {return};

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
            x_expand: false,
            y_expand:false,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START
        });

        this._container.add_child(btn);

        btn.connect('clicked', () => {
            let currentWorkspace = global.workspace_manager.get_active_workspace();
            metaWindow.change_workspace(currentWorkspace);
            try { metaWindow.unminimize(); } catch(e) { console.error(e); }
            try { metaWindow.activate(global.get_current_time());} catch(e) { console.error(e); }

            this._removeButton(metaWindow);
        });

        let buttonMargin=this.settings.get_int('margin-buttons');
        if (this.settings.get_string('position-on-screen') == 'top' ||
            this.settings.get_string('position-on-screen') == 'bottom'){
            btn.set_style('width: 150px; margin-right: '+buttonMargin+'px; margin-bottom: 0px;'); //do i really need to reset width here? (css?)
        }else{
            btn.set_style('width: 150px; margin-bottom: '+buttonMargin+'px; margin-right: 0px;');
        }

        this._windowButtons.set(metaWindow, btn);

        this._setWorkspaceButtonVisibility();

        this._setScrollcontainerReactivity();

    }

    _removeButton(metaWindow) {
        const btn = this._windowButtons.get(metaWindow);
        if (btn) {
            this._container.remove_child(btn);
            this._windowButtons.delete(metaWindow);
            //btn.destroy();
        }
        this._setScrollcontainerReactivity();
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

    //for example orientation change
    _monitorChanged(){
        this._setPosition();
        this._setupAutohideDetector();
        this._setScrollcontainerReactivity();

        //trigger reset and update in autohide
        //this._focusWindowChange();
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------setting: Position and margins-----------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
    _setPosition(){
        let position = this.settings.get_string('position-on-screen');
        let verticalMargin=this.settings.get_int('margin-vertical');
        let horizontalMargin=this.settings.get_int('margin-horizontal');

        //margin-right for position top and bottom, margin-bottom for left and right
        let buttonMargin=this.settings.get_int('margin-buttons');
        let buttonRightMargin=0;
        let buttonBottomMargin=0;
        let scrollContainerHeight=0;
        let scrollContainerWidth=0;

        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;

        let xPos=0;
        let yPos=0;

        switch (position){
            case 'top':
                this._scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.HORIZONTAL}));
                buttonRightMargin=buttonMargin;
                xPos=0;
                yPos=0;
                scrollContainerHeight=this._sizingButton.height+verticalMargin*2+topPanel.height;
                scrollContainerWidth=monitor.width;
                this._container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL}));
                this._scrollContainer.set_style('padding: '+(verticalMargin+topPanel.height)+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=true;
                break;
            case 'bottom':
                this._scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.HORIZONTAL}));
                buttonRightMargin=buttonMargin;
                xPos=0;
                yPos=monitor.height - this._sizingButton.height - verticalMargin*2;
                scrollContainerHeight=this._sizingButton.height + verticalMargin*2;
                scrollContainerWidth=monitor.width;
                this._container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL}));
                this._scrollContainer.set_style('padding: '+verticalMargin+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=true;
                break;
            case 'left':
                this._scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}));
                buttonBottomMargin=buttonMargin;
                xPos=0;
                yPos=topPanel.height;
                scrollContainerHeight=monitor.height-topPanel.height;
                scrollContainerWidth=this._sizingButton.width+horizontalMargin*2;
                this._container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL}));
                this._scrollContainer.set_style('padding: '+verticalMargin+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=false;
                break;
            case 'right':
                this._scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}));
                buttonBottomMargin=buttonMargin;
                xPos=monitor.width-this._sizingButton.width-horizontalMargin*2;
                yPos=topPanel.height;
                scrollContainerHeight=monitor.height-topPanel.height;
                scrollContainerWidth=this._sizingButton.width+horizontalMargin*2;
                this._container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL}));
                this._scrollContainer.set_style('padding: '+verticalMargin+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=false;
                break;
        }
        this._scrollContainer.set_policy(St.PolicyType.NEVER, St.PolicyType.NEVER); //just scrollbar, not ablility to scroll
        this._scrollContainer.set_position(xPos, yPos);
        this._scrollContainer.width=scrollContainerWidth;
        this._scrollContainer.height=scrollContainerHeight;

        this._scrollContainer.queue_relayout();

        //need to do this in ensure button, too.
        for (const child of this._container.get_children()) {
            child.set_style('margin-right: '+buttonRightMargin+'px; margin-bottom: '+buttonBottomMargin+'px;');
        }

        this._setupAutohideDetector();

    }

    //not triggering warnings anymore, but still not working for touch
    _scrollPiping(actor, event){

        const hadj = this._scrollContainer.get_hadjustment();
        if (!hadj)  {return Clutter.EVENT_STOP;}

        const direction=event.get_scroll_direction();
        let pipedScroll = 0;
        if (direction === Clutter.ScrollDirection.SMOOTH) {
            const [dx, dy] = event.get_scroll_delta();
            pipedScroll = dy+dx;
        //mouse wheel, cant get scroll delta
        } else if (direction === Clutter.ScrollDirection.UP) {
            pipedScroll = -1;
        } else if (direction === Clutter.ScrollDirection.DOWN) {
            pipedScroll = +1;
        //mouse wheel left/right? is there such a thing?
        } else if (direction === Clutter.ScrollDirection.LEFT) {
            pipedScroll = -1;
        } else if (direction === Clutter.ScrollDirection.RIGHT) {
            pipedScroll = +1;
        }

        let newVal = hadj.value + pipedScroll * 10;
        newVal = Math.max(hadj.lower, Math.min(newVal, hadj.upper - hadj.page_size));

        hadj.set_value(newVal);

        return Clutter.EVENT_STOP;
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------setting: show on overview---------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
    _setOverviewVisibility(){
        let showInOverview = this.settings.get_boolean('show-in-overview');
        if (Main.overview.visible){
            this._scrollContainer.visible = showInOverview;
        }else{
            this._scrollContainer.visible = true;
        }
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------setting: per workspace------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
    _resetWorkspaceButtonVisibility(){
        for (let [metaWindow, btn] of this._windowButtons) {
             btn.visible=true;
        }
        this._setWorkspaceButtonVisibility();
    }

    _setWorkspaceButtonVisibility(){
        if (this.settings.get_boolean('per-workspace-buttons')){
            let currentWorkspaceNr=global.workspace_manager.get_active_workspace().index();
            for (let [metaWindow, btn] of this._windowButtons) {
                let windowWorkspaceNr = this._windowWorkspaces.get(metaWindow);
                if (windowWorkspaceNr==currentWorkspaceNr){
                    btn.visible=true;
                }else{
                    btn.visible=false;
                }
            }
        }else{
            //do nothing
        }
    }


//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------setting: cover behaviour----------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------

    _setCoverPosition(){

        if (this._scrollContainer.get_parent()) {
            Main.layoutManager.removeChrome(this._scrollContainer);
        }

        if (this.settings.get_string('cover-behaviour') == "front"){
            this._scrollContainer.reactive = true;//false;
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
            });
            this._autohideActive=false;
            this._autohide_always=false;
        }else if(this.settings.get_string('cover-behaviour') == "leave space"){
            this._scrollContainer.reactive = true;//false;
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: true
            });
            this._autohideActive=false;
            this._autohide_always=false;
        }else if(this.settings.get_string('cover-behaviour') == "autohide"){
            this._scrollContainer.reactive = true;
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: true,
                trackFullscreen: true,
                affectsStruts: false
            });
            this._autohideActive=true;
            this._autohide_always=false;
        }else if (this.settings.get_string('cover-behaviour') == "autohide always"){
            this._scrollContainer.reactive = true;
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: true,
                trackFullscreen: true,
                affectsStruts: false
            });
            this._autohideActive=true;
            this._autohide_always=true;
        }
        this._setupAutohideDetector();
        this._scrollContainer.queue_relayout();

        //trigger reset and update in autohide
        this._updateVisibilityActiveWindow();

        this._setScrollcontainerReactivity();
        
    }

    //this is a hover detect container. show buttons on hover! (wrong name?)
    _setupAutohideDetector(){

        //here?
        this._disconnectAutohideSignals();

        if (this._autohideActive){

            this._autohide_detect_container.show();
            
            this._setAutohideDefaultSize();

            this._autohide_showSignal=this._autohide_detect_container.connect('enter-event', () => {
                this._scrollContainer.show();
            });

            if (this.settings.get_string('cover-behaviour') == "autohide"){
                this._updateVisibilityActiveWindow();
                this._autohide_leaveSignal=this._scrollContainer.connect('leave-event', () => {
                    //need to do this with a timeout because can only connect to visible elements? nah... check again. 
                    //if not necessary, remove glib import
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        if (!this._pointerInside(this._scrollContainer)) {
                            this._updateVisibilityActiveWindow();
                        }
                        return GLib.SOURCE_REMOVE;
                    });
                });
            }else if (this.settings.get_string('cover-behaviour') == "autohide always"){
                this._scrollContainer.hide();
                this._autohide_leaveSignal=this._scrollContainer.connect('leave-event', () => {
                    //need to do this with a timeout because can only connect to visible elements? nah... check again. 
                    //if not necessary, remove glib import
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        if (!this._pointerInside(this._scrollContainer)) {
                            this._scrollContainer.hide();
                        }
                        return GLib.SOURCE_REMOVE;
                    });
                });
            }

        }else{
            this._autohide_detect_container.hide();
        }
        this._autohide_detect_container.queue_relayout();
    }

    _pointerInside(actor) {
        const [x, y] = global.get_pointer();
        const box = actor.get_allocation_box();
        return x >= box.x1 && 
                x <= box.x2 && 
                y >= box.y1 && 
                y <= box.y2;
    }

    _setAutohideDefaultSize(){
        let containerSize=this.settings.get_int('autohide-container-size');//5;
        switch (this.settings.get_string('position-on-screen')){
            case 'top':
                this._autohide_detect_container.set_position(0, Main.panel.height);
                this._autohide_detect_container.width=Main.layoutManager.primaryMonitor.width;
                this._autohide_detect_container.height=containerSize;
                break;
            case 'bottom':
                this._autohide_detect_container.set_position(0, Main.layoutManager.primaryMonitor.height-containerSize);
                this._autohide_detect_container.width=Main.layoutManager.primaryMonitor.width;
                this._autohide_detect_container.height=containerSize;
                break;
            case 'left':
                this._autohide_detect_container.set_position(0, Main.panel.height);
                this._autohide_detect_container.width=containerSize;
                this._autohide_detect_container.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
            case 'right':
                this._autohide_detect_container.set_position(Main.layoutManager.primaryMonitor.width-containerSize, Main.panel.height);
                this._autohide_detect_container.width=containerSize;
                this._autohide_detect_container.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
        }
    }

    _focusWindowChange(){
        
        if (this._autohideActive){
            let win = global.display.get_focus_window();
            if (!win) {
                console.log('no window');
                return false;
            }
            this._disconnectWindowDragAndRezizeSignals();
            this._resizeSignal = win.connect('size-changed', () => {
                this._updateVisibilityActiveWindow();
            });

            this._positionSignal = win.connect('position-changed', () => {
                this._updateVisibilityActiveWindow();
            });
            this._oldFocusWindow=win;
            this._updateVisibilityActiveWindow();
        }
    }

    _updateVisibilityActiveWindow() {

        if (!this._scrollContainer){return};

        if (this._autohideActive){
            if (this._autohide_always){
                this._scrollContainer.hide();
            }else{
                if (this._isContainerCoveredByActiveWindow()) {
                    this._scrollContainer.hide();
                }else{
                    this._scrollContainer.show();
                }
            }
        }else{
            this._scrollContainer.show();
        }
    }
    
    _isContainerCoveredByActiveWindow() {
        if (!this._scrollContainer) {return false;}

        let activeWin = global.display.get_focus_window();
        if (!activeWin) {
            console.log('no window');
            return false;
        }

        let [x, y] = this._scrollContainer.get_transformed_position();
        let containerRect = {
            x1: x,
            y1: y,
            x2: x + this._scrollContainer.width,
            y2: y + this._scrollContainer.height,
        };
        let windowRectRaw = activeWin.get_frame_rect();
        let windowRect = {
            x1: windowRectRaw.x,
            y1: windowRectRaw.y,
            x2: windowRectRaw.x + windowRectRaw.width,
            y2: windowRectRaw.y + windowRectRaw.height,
        };

        return !(
            containerRect.x2 < windowRect.x1 ||
            containerRect.x1 > windowRect.x2 ||
            containerRect.y2 < windowRect.y1 ||
            containerRect.y1 > windowRect.y2
        );

    }

    _setScrollcontainerReactivity(){
        if (this._autohideActive){
            this._scrollContainer.reactive=true;
        }else{ //front and leave-space
            if (this.settings.get_string('position-on-screen') == 'top' ||
                this.settings.get_string('position-on-screen') == 'bottom'){
                if (this._container.width > this._scrollContainer.width){
                    this._scrollContainer.reactive=true;
                }else{
                    this._scrollContainer.reactive=false;
                }
            }else{
                if (this._container.height > this._scrollContainer.height){
                    this._scrollContainer.reactive=true;
                }else{
                    this._scrollContainer.reactive=false;
                }
            }
        }
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------disconnect/disable----------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------

    _disconnectAutohideSignals(){
        if (this._autohide_leaveSignal) {
            this._scrollContainer.disconnect(this._autohide_leaveSignal);
            this._autohide_leaveSignal = 0;
        }
        if (this._autohide_showSignal) {

            this._autohide_detect_container.disconnect(this._autohide_showSignal);
            this._autohide_showSignal = 0;
        }
    }

    _disconnectWindowDragAndRezizeSignals(){
        const win = this._oldFocusWindow;
        if (win) {
            if (this._resizeSignal) {
                win.disconnect(this._resizeSignal);
                this._resizeSignal = 0;
            }
            if (this._positionSignal) {
                win.disconnect(this._positionSignal);
                this._positionSignal = 0;
            }
        }
        this._oldFocusWindow=null; //dont destroy the window!
    }

    _disconnectSingleHooks(){
        this._disconnectAutohideSignals();
        this._disconnectWindowDragAndRezizeSignals();

        if (this._displaySig) {
            global.display.disconnect(this._displaySig);
            this._displaySig = 0;
        }

        if (this._sessionSig) {
            Main.sessionMode.disconnect(this._sessionSig);
            this._sessionSig = 0;
        }

        if (this._workspaceSig) {
            global.workspace_manager.disconnect(this._workspaceSig);
            this._workspaceSig = 0;
        }

        if (this._focusSignal) {
            global.display.disconnect(this._focusSignal);
            this._focusSignal = 0;
        }

        if (this.__scrollOverwriteSig) {
            this._scrollContainer.disconnect(this._scrollOverwriteSig);
            this._scrollOverwriteSig = 0;
        }

        if (this._monitorResizeSignal) {
            Main.layoutManager.disconnect(this._monitorResizeSignal);
            this._monitorResizeSignal = 0;
        }

    }

    _disconnectMappedHooks(){

        for (const [win, ids] of this._windowSignals) {
            win.disconnect(ids.minimized);
            win.disconnect(ids.unmanaged);
        }
        this._windowSignals.clear();

        //dont need to disconnect anything here, just clear the map
        this._windowWorkspaces.clear();
    }

    _destroyUIElements(){
        Main.layoutManager.removeChrome(this._scrollContainer);

        if (this._sizingButton) {
            this._sizingButton.destroy();
            this._sizingButton = null;
        }

        if (this._container) {
            this._container.destroy();
            this._container = null;
        }

        if (this._scrollContainer) {
            this._scrollContainer.destroy();
            this._scrollContainer = null;
        }

        if (this._autohide_detect_container) {
            this._autohide_detect_container.destroy();
            this._autohide_detect_container = null;
        }
    }

    disable() {
        this._disconnectSingleHooks();

        this._disconnectMappedHooks();

        for (const btn of this._windowButtons.values()) {
            this._container.remove_child(btn);
            btn.destroy();
        }
        this._windowButtons.clear();

        this._destroyUIElements();
        
        //gets me into trouble when switching extension on/off
        //this.settings = null;
    }

} //MinimizedButtonsExtension extends Extension