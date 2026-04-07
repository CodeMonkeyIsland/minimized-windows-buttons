/**
 * Here, all graphical things are done
 * 
 * Basically all Operations on the whole container and all buttons
 * Operations inside the container (adding/removing buttons, button hooks, reordering, workspacevisibility ...)
 * are done in coreLogic
 * 
 * autohide outsourced to DisplayManager_AutohideHelper. Functions of the same name get piped to it. 
 * 
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import DisplayManager_AutohideHelper from './DisplayManager_AutohideHelper.js';

const Mtk = imports.gi.Mtk;

export class DisplayManager{

    #settings=null;
    #buttonFactory=null;
    #coreLogic=null;
    #autohideHelper=null;

    #focusSignal=0;
    #scrollOverwriteSignal=0;
    #monitorResizeSignal=0;
    #autohide_showSignal=0;
    #autohide_leaveSignal=0;
    #overviewShowSignal=0;
    #overviewHideSignal=0;
    #resizeSignal=0; //window resize, not monitor!
    #positionSignal=0;

    #scrollContainer=null;
    #autohide_detect_container=null;
    #oldFocusWindow=null;
    #leaveSpaceContainer=null;

    //save some settings-dependent values for quicker access
    #useScrollPiping=false;
    #autohideActive=false;
    #autohide_always=false;
    //public (shared with coreLogic)
    isHorizontal=false; //true for pos top&bottom

    //for touch scroll hack
    #dndStartX=null;
    #dndStartY=null;
    #buttonMargin=0; //setting at drag start

    //autohide for touch hack(no leave event...)
    //nasty: global event hook
    #globalEventSignal=null;


	constructor(_settings,  _buttonFactory, _coreLogic){
		this.#coreLogic=_coreLogic;
		this.#settings=_settings;
        this.#buttonFactory=_buttonFactory;
	}

	init(){
        this.#autohideHelper=new DisplayManager_AutohideHelper();

        this.#scrollContainer = new St.ScrollView({
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
            x_expand: true,
            y_expand: true,
            reactive: false,
            style_class: "button-scroll-container"
        });
        this.#scrollContainer.add_child(this.#coreLogic.container);

        this.#autohide_detect_container = new St.BoxLayout({
            reactive: true, //to get hover events, blocks input
            x_expand: false,
            y_expand: false,
        });

        //decide what to do inside the function, calling it at any cover-behaviour
        this.#focusSignal = global.display.connect('notify::focus-window', () => {
            //when opening a window, this hook starts before the window is not null!

            this.focusWindowChange();

        });

        this.#monitorResizeSignal = Main.layoutManager.connect('monitors-changed', () => {
            this.monitorChanged();
        });

        //SCROLL:pos top and bottom:pipe vertical scroll to horizontal
        this.#scrollOverwriteSignal= this.#scrollContainer.connect('scroll-event', (actor, event) => {
            if (this.#useScrollPiping) {
                return this.#scrollPiping(actor, event);
            }else{
                return Clutter.EVENT_PROPAGATE;
            }
        });

        this.setPosition();

        this.setCoverOption();


        this.#overviewShowSignal=Main.overview.connect('showing', () => this.setOverviewVisibility());
        this.#overviewHideSignal=Main.overview.connect('hiding', () => this.setOverviewVisibility());
        this.setOverviewVisibility();

        if (this.#settings.get_boolean('global-event-hook') ){
            this.setupGlobalEventHook();
        }

        //for detecting the extensions-window when turning on/off
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.focusWindowChange(); 
            return GLib.SOURCE_REMOVE;
        });
	}


	close(){
        this.disconnectGlobalEventHook();
        this.disconnectAutohideSignals();
        this.disconnectWindowDragAndRezizeSignals();

        if (this.#focusSignal) {
            global.display.disconnect(this.#focusSignal);
            this.#focusSignal = 0;
        }

        if (this.#scrollOverwriteSignal) {
            this.#scrollContainer.disconnect(this.#scrollOverwriteSignal);
            this.#scrollOverwriteSignal = 0;
        }

        if (this.#monitorResizeSignal) {
            Main.layoutManager.disconnect(this.#monitorResizeSignal);
            this.#monitorResizeSignal = 0;
        }

        if (this.#overviewShowSignal) {
            Main.overview.disconnect(this.#overviewShowSignal);
            this.#overviewShowSignal = 0;
        }

        if (this.#overviewHideSignal) {
            Main.overview.disconnect(this.#overviewHideSignal);
            this.#overviewHideSignal = 0;
        }

        this.#destroyUIElements();

        this.destroyLeaveSpaceContainer();

        this.#settings=null;
        this.#coreLogic=null;

        this.#autohideHelper=null;
	}


    //---------------------------------------------------------------------------------------------------------------------
    //---------------------------------------setPosition/ set Cover position-----------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------

    setPosition(){
        let position = this.#settings.get_string('position-on-screen');
        let verticalMargin=this.#settings.get_int('margin-vertical');
        let horizontalMargin=this.#settings.get_int('margin-horizontal');

        let scrollContainerHeight=0;
        let scrollContainerWidth=0;

        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;

        let xPos=0;
        let yPos=0;

        switch (position){
            case 'top':
                this.isHorizontal=true;
                xPos=0;
                yPos=topPanel.height+verticalMargin;
                break;
            case 'bottom':
                this.isHorizontal=true;
                xPos=0;
                yPos=monitor.height - this.#buttonFactory.getButtonHeight() - verticalMargin;
                break;
            case 'left':
                this.isHorizontal=false;
                xPos=horizontalMargin;
                yPos=topPanel.height;
                break;
            case 'right':
                this.isHorizontal=false;
                xPos=monitor.width-this.#buttonFactory.getButtonWidth()-horizontalMargin;
                yPos=topPanel.height;
                break;
        }

        if (this.isHorizontal){
            this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.HORIZONTAL}));
            this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL}));
            this.#useScrollPiping=true;
            this.#scrollContainer.set_style('padding: 0px '+horizontalMargin+'px 0px '+horizontalMargin+'px;');
        }else{
            this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}));
            this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL}));
            this.#useScrollPiping=false;
            this.#scrollContainer.set_style('padding: '+verticalMargin+'px 0px '+verticalMargin+'px 0px;');
        }

        this.#scrollContainer.set_policy(St.PolicyType.NEVER, St.PolicyType.NEVER); //just scrollbar, not ablility to scroll
        this.#scrollContainer.set_position(xPos, yPos);

        this.#scrollContainer.width=this.#getScrollContainerWidth();
        this.#scrollContainer.height=this.#getScrollContainerHeight();

        this.#scrollContainer.queue_relayout();

        this.resetAllButtonStyles();

        this.setupAutohideDetector();

        if(this.#settings.get_string('cover-behaviour')=='leave space'){
            this.#setupLeaveSpaceContainer();
        }

    }


    //set according to cover option
    setCoverOption(){

        if (this.#scrollContainer.get_parent()) {
            Main.layoutManager.removeChrome(this.#scrollContainer);
        }

        let affectInput=false; //set it to properly init?

        switch (this.#settings.get_string('cover-behaviour')){
            case 'front':
                affectInput=false;
                this.#autohideActive=false;
                this.#autohide_always=false;
                this.destroyLeaveSpaceContainer();
                break;
            case 'leave space':
                affectInput=false;
                this.#autohideActive=false;
                this.#autohide_always=false;
                this.#setupLeaveSpaceContainer();
                break;
            case 'autohide':
                affectInput=true;
                this.#autohideActive=true;
                this.#autohide_always=false;
                this.destroyLeaveSpaceContainer();
                break;
            case 'autohide always':
                affectInput=true;
                this.#autohideActive=true;
                this.#autohide_always=true;
                this.destroyLeaveSpaceContainer();
                break;
        }

        Main.layoutManager.addChrome(this.#scrollContainer,{
            affectsInputRegion: affectInput,
            trackFullscreen: true,
            affectsStruts: false
        });

        this.#scrollContainer.show();
        this.#scrollContainer.queue_relayout();

        this.setupAutohideDetector();

        //trigger reset and update in autohide
        this.updateVisibilityActiveWindow();

        this.setScrollcontainerReactivity();
        
    }


    #getScrollContainerHeight(){
        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;
        if (this.isHorizontal){
            return this.#buttonFactory.getButtonHeight();
        }else{
            return monitor.height-topPanel.height;
        }
    }

    #getScrollContainerWidth(){
        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;
        if (this.isHorizontal){
            return monitor.width;
        }else{
            return this.#buttonFactory.getButtonWidth();
        }
    }



    //---------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------cover-leave-space-option----------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------

    #setupLeaveSpaceContainer(){
        //this.destroyLeaveSpaceContainer();
        if (this.#leaveSpaceContainer==null){
            this.#leaveSpaceContainer= new St.Widget({
                name: 'minimized-buttons-strut-container',
                visible: true,
                reactive: false,
                opacity: 0,
                can_focus: false
            });
            Main.layoutManager.addChrome(this.#leaveSpaceContainer, {
                affectsStruts: true,
                trackFullscreen: true
            });
        }

        const sc_height=this.#getScrollContainerHeight();
        const sc_width=this.#getScrollContainerWidth();

        let verticalMargin=this.#settings.get_int('margin-vertical');
        let horizontalMargin=this.#settings.get_int('margin-horizontal');

        let position = this.#settings.get_string('position-on-screen');
        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;

        let borderSpace=this.#settings.get_int('leave-space-margin');

        switch (position){
            case 'top':
                this.#leaveSpaceContainer.set_position(0, 0);
                this.#leaveSpaceContainer.set_size(monitor.width, sc_height+verticalMargin+topPanel.height+borderSpace);
                break;
            case 'bottom':
                this.#leaveSpaceContainer.set_position(0, monitor.height-(sc_height+verticalMargin+borderSpace));
                this.#leaveSpaceContainer.set_size(monitor.width, sc_height+verticalMargin+borderSpace);
                break;
            case 'left':
                this.#leaveSpaceContainer.set_position(0, topPanel.height);
                this.#leaveSpaceContainer.set_size(sc_width+horizontalMargin+borderSpace, monitor.height-topPanel.height);
                break;
            case 'right':
                this.#leaveSpaceContainer.set_position(monitor.width-(sc_width+horizontalMargin+borderSpace), topPanel.height);
                this.#leaveSpaceContainer.set_size(sc_width+horizontalMargin+borderSpace, monitor.height-topPanel.height);
                break;
        }
    }

    destroyLeaveSpaceContainer(){
        if (this.#leaveSpaceContainer==null){return;}
        Main.layoutManager.removeChrome(this.#leaveSpaceContainer);
        this.#leaveSpaceContainer.destroy();
        this.#leaveSpaceContainer=null;
    }

    
    //---------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------autohide--------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------
    /**
     * just trying to reduce LOC in this file, DM has always been too big and is not getting any smaller
     * leaving only piping functions here
     * 
     * idea: keep all signals in the 3 main classes
     * Problem: setting connect/disconnect-signals in helper. solution: public setSignal and disconnect functions here
     */

    updateVisibilityActiveWindow() {
        this.#autohideHelper.updateVisibilityActiveWindow(this.#scrollContainer, this.#autohideActive, this.#autohide_always);
    }

    setAutohideDefaultSize(){
        this.#autohideHelper.setAutohideDefaultSize(this.#settings, this.#autohide_detect_container);
    }

    focusWindowChange(){
        this.#autohideHelper.focusWindowChange(this, this.#autohideActive);
    }
    setResizeSignal(_signal){
        this.#resizeSignal=_signal;
    }
    setPositionSignal(_signal){
        this.#positionSignal=_signal;
    }
    setOldFocusWindow(win) {
        this.#oldFocusWindow = win;
    }

    //this is a hover detect container. show buttons on hover! (wrong name)
    setupAutohideDetector(){
        this.#autohideHelper.setupAutohideDetector(this, this.#scrollContainer, this.#autohide_detect_container, this.#autohideActive, this.#settings);
    }
    set_Autohide_Show_Signal(_signal){
        this.#autohide_showSignal=_signal;
    }
    set_Autohide_Leave_Signal(_signal){
        this.#autohide_leaveSignal=_signal;
    }

    //---------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------rest------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------


    /**
     * drag-scroll-hack:
     * still spitting out some errors on touch devices,
     * probalby, because im messing around in dnd.js in coreLogic.
     * but it works.
     */

    resetDnD(){
        this.#dndStartX=null;
        this.#dndStartY=null;
        this.#buttonMargin=this.#settings.get_int('margin-buttons');
    }

    /**
     * if dragged inside the container, scroll with the drag movement 
     * if dragged outside the container, dont scroll (dnd reordering)
     */
    dragScrollHack(x,y){
        if (!this.#isInsideButtonContainer(x,y)){
            this.resetDnD();
            return;
        }

        //always setting both, need to check only one
        if (this.#dndStartX==null){
            this.#dndStartX=x;
            this.#dndStartY=y;
        }

        if (this.isHorizontal){
            const dndHadjStart=this.#scrollContainer.get_hadjustment().get_value();
            const hadj = this.#scrollContainer.get_hadjustment();
            hadj.set_value(dndHadjStart-(x-this.#dndStartX));
        }else{
            const dndVadjStart=this.#scrollContainer.get_vadjustment().get_value()
            const vadj = this.#scrollContainer.get_vadjustment();
            vadj.set_value(dndVadjStart-(y-this.#dndStartY));
        }
        this.#dndStartX=x;
        this.#dndStartY=y;
    }

    /**
     * container.get_transformed_extents() gets the screen-pixel value. (zero is top/left)
     * no more messing around with allocation box and adjustments!
     * but: need to adjust a bit for buttonmargins, or feels strange (dropping out too soon/often)
     */
    #isInsideButtonContainer(x,y){
        const rect = this.#scrollContainer.get_transformed_extents();
        return x+this.#buttonMargin >= rect.origin.x && 
               x-this.#buttonMargin <= rect.origin.x + rect.size.width && 
               y+this.#buttonMargin >= rect.origin.y && 
               y-this.#buttonMargin <= rect.origin.y + rect.size.height;
    }

    //not triggering warnings anymore, but still not working for touch
    #scrollPiping(actor, event){

        const hadj = this.#scrollContainer.get_hadjustment();
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

    setOverviewVisibility(){
        let showInOverview = this.#settings.get_boolean('show-in-overview');
        if (Main.overview.visible){
            this.#scrollContainer.visible = showInOverview;
        }else{
            this.#scrollContainer.visible = true;
        }
    }

    //for example at orientation change
    monitorChanged(){
        this.setPosition();
        this.setupAutohideDetector();
        this.setScrollcontainerReactivity();
    }

    //needs to go into autohide?
    //WARNING watch out for placeholderButton!!!!
    setScrollcontainerReactivity(){

        if (this.#autohideActive){
            this.#scrollContainer.reactive=true;
        }else{ //front and leave-space
            if (this.#settings.get_string('position-on-screen') == 'top' ||
                this.#settings.get_string('position-on-screen') == 'bottom'){
                if (this.#coreLogic.container.width > this.#scrollContainer.width){
                    this.#scrollContainer.reactive=true;
                }else{
                    this.#scrollContainer.reactive=false;
                }
            }else{
                if (this.#coreLogic.container.height > this.#scrollContainer.height){
                    this.#scrollContainer.reactive=true;
                }else{
                    this.#scrollContainer.reactive=false;
                }
            }
        }
    }

    //set all to placeholder-position
    resetAllOpenWindowIconPositions(){
        for (const actor of global.get_window_actors()){
            if (!actor.meta_window.minimized){            
                this.setWindowAnimationPositionOpen(actor.meta_window)
            }
        }
    }

    resetAllButtonwindowIconPositions(){
        for (let [metaWindow, btn] of this.#coreLogic.getWindowButtons()) {
            if (btn!==this.#coreLogic.placeholderButton){
                this.updateIconGeometry(btn, metaWindow);
            }
        }
    }

    //watch out for placeholder!!!
    //better do this with windowButtons?
    resetAllButtonStyles(){
        for (const child of this.#coreLogic.container.get_children()) {
            if (child!==this.#coreLogic.placeholderButton){
                this.#buttonFactory.styleButton(child);
            }
        }
    }

    //for minimized windows, set to button position
    updateIconGeometry(btn, metaWindow) {
        let [x, y] = btn.get_transformed_position();
        let [w, h] = btn.get_transformed_size();
        this.setIconGeometry(x,y,w,h,metaWindow);
    }

    //open windows, set animation position to next free slot in contianer
    setWindowAnimationPositionOpen(metaWindow){
        let btn=this.#coreLogic.placeholderButton;
        btn.get_allocation_box(); 
        
        let [x, y] = btn.get_transformed_position();
        let [w, h] = btn.get_transformed_size();
        this.setIconGeometry(x,y,w,h,metaWindow);
    }

    //doing the actual setting work for the functions above
    setIconGeometry(x,y,w,h, metaWindow){
        let rect = new Mtk.Rectangle({
            x: Math.floor(x),
            y: Math.floor(y),
            width: Math.floor(w),
            height: Math.floor(h),
        });
        metaWindow.set_icon_geometry(rect);
    }

    setupGlobalEventHook(){
        this.#globalEventSignal= global.stage.connect('captured-event', (stage, event) => {

            if (!this.#autohideActive){return Clutter.EVENT_PROPAGATE;}

            if (event.type() === Clutter.EventType.BUTTON_PRESS || 
                event.type() === Clutter.EventType.TOUCH_BEGIN) {
                
                if (!this.#autohideHelper.pointerInside(this.#scrollContainer, event)) {
                    //lazy
                    this.updateVisibilityActiveWindow();
                }
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------disconnect/disable----------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
    disconnectGlobalEventHook(){
        if (this.#globalEventSignal) {
            global.stage.disconnect(this.#globalEventSignal);
            this.#globalEventSignal= 0;
        }
    }

    #destroyUIElements(){
        Main.layoutManager.removeChrome(this.#scrollContainer);
        Main.layoutManager.removeChrome(this.#autohide_detect_container);

        //destroying buttons and container in coreLogic.close()

        if (this.#scrollContainer) {
            this.#scrollContainer.destroy();
            this.#scrollContainer = null;
        }

        if (this.#autohide_detect_container) {
            this.#autohide_detect_container.destroy();
            this.#autohide_detect_container = null;
        }
    }

    disconnectAutohideSignals(){
        if (this.#autohide_leaveSignal) {
            this.#scrollContainer.disconnect(this.#autohide_leaveSignal);
            this.#autohide_leaveSignal = 0;
        }
        if (this.#autohide_showSignal) {
            this.#autohide_detect_container.disconnect(this.#autohide_showSignal);
            this.#autohide_showSignal = 0;
        }
    }

    disconnectWindowDragAndRezizeSignals(){
        const win = this.#oldFocusWindow;
        if (win) {
            if (this.#resizeSignal) {
                win.disconnect(this.#resizeSignal);
                this.#resizeSignal = 0;
            }
            if (this.#positionSignal) {
                win.disconnect(this.#positionSignal);
                this.#positionSignal = 0;
            }
        }
        this.#oldFocusWindow=null; //dont destroy the window!
    }

}