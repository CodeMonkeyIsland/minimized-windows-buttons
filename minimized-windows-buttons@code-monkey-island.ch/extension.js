import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


export default class MinimizedButtonsExtension extends Extension {

    _container=null;
    _scrollContainer=null;

    _scrollOverwriteSig=0;
    _useScrollPiping=false;
    _autohideActive=false;
    displaySig=0;
    sessionSig=0;
    workspaceSig=0;

    windowSignals=new Map();
    windowButtons=new Map();
    windowWorkspaces=new Map();

    sizingButton=null;

    settings=null;

    _resizeSignal =null;
    _positionSignal=null;


    enable() {

        this.settings=this.getSettings();

        this.sessionSig = Main.sessionMode.connect('updated', () => {
            for (const actor of global.get_window_actors()){
                this._watchWindow(actor.meta_window);
            }
        });

        this._container = new St.BoxLayout({
            vertical: false, //            reactive: true, ?
            style_class: "bottom-container"
        });

        this._scrollContainer = new St.ScrollView({
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
            x_expand: true,
            y_expand: true,
            reactive: false,
            style_class: "button-scroll-container"
        });
        this._scrollContainer.add_child(this._container);

        this._scrollContainer.ease({
            opacity: this._isContainerCoveredByActiveWindow() ? 0 : 255,
            duration: 200,
        });


        //what covers what chrome=front
        this._setCoverPosition();
        this.settings.connect('changed::cover-behaviour', () => {
            this._setCoverPosition();
        });

        let focusSignal = global.display.connect('notify::focus-window', () => this._updateVisibilityActiveWindow() );


        //hide or show on overview?
        Main.overview.connect('showing', () => this._setOverviewVisibility());
        Main.overview.connect('hiding', () => this._setOverviewVisibility());
        this._setOverviewVisibility();


        //per workspace
        this.workspaceSig = global.workspace_manager.connect(
            'active-workspace-changed',
            () => this._setWorkspaceButtonVisibility()
        );
        this.settings.connect('changed::per-workspace-buttons', () => {
            this._resetWorkspaceButtonVisibility();
        });


        // Create button for sizing, then hide it
        this.sizingButton = new St.Button({ label: 'Hello', style_class: 'minimized-button' });
        this._container.add_child(this.sizingButton);
        this.sizingButton.hide();

        this._scrollPiper = this._scrollPiping.bind(this);

        //margins
        this.settings.connect('changed::margin-vertical', () => {
            this._setPosition();
        });
        this.settings.connect('changed::margin-horizontal', () => {
            this._setPosition();
        });
        this.settings.connect('changed::margin-buttons', () => {
            this._setPosition();
        });

        //position of the buttons (top/bottom)
        this._setPosition();
        this.settings.connect('changed::position-on-screen', () => {
            this._setPosition();
        });

        this._scrollContainer.connect('scroll-event', (actor, event) => {
            if (this._useScrollPiping) {
                return this._scrollPiping(actor, event);
            }
            return Clutter.EVENT_PROPAGATE;
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
                this.windowWorkspaces.set(
                    metaWindow,
                    metaWindow.get_workspace().index()
                );
                this._ensureButton(metaWindow);
            } else {
                this.windowWorkspaces.delete(metaWindow);
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
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER
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

        this.windowButtons.set(metaWindow, btn);

        this._setWorkspaceButtonVisibility();

    }

    _removeButton(metaWindow) {
        const btn = this.windowButtons.get(metaWindow);
        if (btn) {
            this._container.remove_child(btn);
            this.windowButtons.delete(metaWindow);
        }
    }

    _setCoverPosition(){
        Main.layoutManager.removeChrome(this._scrollContainer);

        if (this.settings.get_string('cover-behaviour') == "front"){
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
            });
            this._autohideActive=false;
        }else if(this.settings.get_string('cover-behaviour') == "leave space"){
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: true
            });
            this._autohideActive=false;
        }else if(this.settings.get_string('cover-behaviour') == "autohide"){
            Main.layoutManager.addChrome(this._scrollContainer,{
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
            });
            this._autohideActive=true;
        }
        this._scrollContainer.queue_relayout();

        this._updateVisibilityActiveWindow();
        
    }

    _setPosition(){
        let position = this.settings.get_string('position-on-screen');
        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;
        let verticalMargin=this.settings.get_int('margin-vertical');
        let horizontalMargin=this.settings.get_int('margin-horizontal');

        let xPos=0;
        let yPos=0;

        let buttonMargin=this.settings.get_int('margin-buttons');//margin-right for position top and bottom, margin-bottom for left and right
        let buttonRightMargin=0;
        let buttonBottomMargin=0;
        let scrollContainerHeight=0;
        let scrollContainerWidth=0;

        switch (position){
            case 'top':
                this._container.vertical = false;
                buttonRightMargin=buttonMargin;
                xPos=0;
                yPos=0;
                scrollContainerHeight=this.sizingButton.height+verticalMargin*2+topPanel.height;
                scrollContainerWidth=monitor.width;
                this._scrollContainer.set_style('padding: '+(verticalMargin+topPanel.height)+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=true;
                break;
            case 'bottom':
                this._container.vertical = false;
                buttonRightMargin=buttonMargin;
                xPos=0;
                yPos=monitor.height - this.sizingButton.height - verticalMargin*2;
                scrollContainerHeight=this.sizingButton.height + verticalMargin*2;
                scrollContainerWidth=monitor.width;
                this._scrollContainer.set_style('padding: '+verticalMargin+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=true;
                break;
            case 'left':
                this._container.vertical = true;
                buttonBottomMargin=buttonMargin;
                xPos=0;
                yPos=0;
                scrollContainerHeight=monitor.height;
                scrollContainerWidth=this.sizingButton.width+horizontalMargin*2;
                this._scrollContainer.set_style('padding: '+(verticalMargin+topPanel.height)+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=false;
                break;
            case 'right':
                this._container.vertical = true;
                buttonBottomMargin=buttonMargin;
                xPos=monitor.width-this.sizingButton.width-horizontalMargin*2;
                yPos=0;
                scrollContainerHeight=monitor.height;
                scrollContainerWidth=this.sizingButton.width+horizontalMargin*2;
                this._scrollContainer.set_style('padding: '+(verticalMargin+topPanel.height)+'px '+horizontalMargin+'px '+verticalMargin+'px '+horizontalMargin+'px;');
                this._useScrollPiping=false;
                break;
        }
        this._scrollContainer.set_policy(St.PolicyType.NEVER, St.PolicyType.NEVER); //just scrollbar, not ablility to scroll
        this._scrollContainer.set_position(xPos, yPos);
        this._scrollContainer.width=scrollContainerWidth;
        this._scrollContainer.height=scrollContainerHeight;

        this._scrollContainer.queue_relayout();


        //need to do this in ensure button, too.
        //let buttonMargin=this.settings.get_int('margin-buttons');
        for (const child of this._container.get_children()) {
            child.set_style('margin-right: '+buttonRightMargin+'px; margin-bottom: '+buttonBottomMargin+'px;');
            //child.width=150;
        }

    }

    _scrollPiping(actor, event) {
        const hadj = this._scrollContainer.get_hadjustment();
        if (!hadj) return Clutter.EVENT_PROPAGATE;

        const [dx, dy] = event.get_scroll_delta();
        let newVal = hadj.value + dy * 40;
        newVal = Math.max(hadj.lower, Math.min(newVal, hadj.upper - hadj.page_size));

        hadj.set_value(newVal);

        return Clutter.EVENT_STOP;
    }

    _updateVisibilityActiveWindow() {

        if (!this._scrollContainer){return};

        this._disconnectWindowDragAndRezizeSignals();

        if (this._autohideActive){
            let win = global.display.get_focus_window();
            if (!win) {
                console.log('no window');
                return false;
            }
            this._resizeSignal = win.connect('size-changed', () => {
                this._updateVisibilityActiveWindow();
            });

            // Connect to position-changed
            this._positionSignal = win.connect('position-changed', () => {
                this._updateVisibilityActiveWindow();
            });

            if (this._isContainerCoveredByActiveWindow()) {
                console.log('hide');
                this._scrollContainer.hide();
            } else {
                console.log('show');
                this._scrollContainer.show();
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

        // skip panels, docks, and non-normal windows
        /*
        if (activeWin.window_type !== Meta.WindowType.NORMAL || activeWin.skip_taskbar){
            return false;
        }
        */
        
        const [x, y] = this._scrollContainer.get_transformed_position();
        //const extents = this._scrollContainer.get_transformed_extents();
        const containerRect = {
            x1: x,
            y1: y,
            x2: x + this._scrollContainer.width,
            y2: y + this._scrollContainer.height,
        };
        const windowRectRaw = activeWin.get_frame_rect();
        const windowRect = {
            x1: windowRectRaw.x,
            y1: windowRectRaw.y,
            x2: windowRectRaw.x + windowRectRaw.width,
            y2: windowRectRaw.y + windowRectRaw.height,
        };
/*
        console.log('container:');
        console.log('x1: '+containerRect.x1+' x2: '+containerRect.x2);
        console.log('y1: '+containerRect.y1+' y2: '+containerRect.y2);

        console.log('window:');
        console.log('x1: '+windowRect.x+' x2: '+windowRect.y);
        console.log('width: '+windowRect.width+' height: '+windowRect.height);
*/
        console.log('container:', containerRect);
        console.log('window:', windowRect);

        // Return true if the rectangles overlap at all
        return !(
            containerRect.x2 < windowRect.x1 || // container is left of window
            containerRect.x1 > windowRect.x2 || // container is right of window
            containerRect.y2 < windowRect.y1 || // container is above window
            containerRect.y1 > windowRect.y2    // container is below window
        );

    }

    _disconnectWindowDragAndRezizeSignals(){
        const win = global.display.focus_window;
        if (win) {
            if (this._resizeSignal) {
                win.disconnect(this._resizeSignal);
                this._resizeSignal = null;
            }
            if (this._positionSignal) {
                win.disconnect(this._positionSignal);
                this._positionSignal = null;
            }
        }
    }

    _resetWorkspaceButtonVisibility(){
        for (let [metaWindow, btn] of this.windowButtons) {
             btn.visible=true;
        }
        _setWorkspaceButtonVisibility();
    }

    _setWorkspaceButtonVisibility(){
        if (this.settings.get_boolean('per-workspace-buttons')){
            let currentWorkspaceNr=global.workspace_manager.get_active_workspace().index();
            for (let [metaWindow, btn] of this.windowButtons) {
                let windowWorkspaceNr = this.windowWorkspaces.get(metaWindow);
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

    _setOverviewVisibility(){
        let showInOverview = this.settings.get_boolean('show-in-overview');
        if (Main.overview.visible) {
            this._container.visible = showInOverview;
        } else {
            this._container.visible = true;
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

    _unwatchWindow(metaWindow) {
        const ids = this.windowSignals.get(metaWindow);
        if (!ids) {return;}
        metaWindow.disconnect(ids.minimized);
        metaWindow.disconnect(ids.unmanaged);
        this.windowSignals.delete(metaWindow);
    }

    disable() {

        if (this.workspaceSig) {
            global.workspace_manager.disconnect(this.workspaceSig);
            this.workspaceSig = 0;
        }
        this.windowWorkspaces.clear();
        
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
            this._container.remove_child(btn);
        }
        this.windowButtons.clear();

        if (this._container) {
            this._container.destroy();
            this._container = null;
        }
        this.settings = null;
        

    }

} //MinimizedButtonsExtension extends Extension