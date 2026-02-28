/**
 * Here, all graphical things are done
 * this class talks with ButtonFactory, SettingsConnector and CoreLogic
 */
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export class DisplayManager{

    #coreLogic=null;
    #settingsConnector=null;
    #buttonFactory=null;

    #workspaceSignal=0;
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

    #useScrollPiping=false;
    #autohideActive=false;
    #autohide_always=false;

    #leaveSpaceContainer=null;

	constructor(_coreLogic, _settingsConnector){
		this.#coreLogic=_coreLogic;
		this.#settingsConnector=_settingsConnector;
	}

	init(){

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


		this.#workspaceSignal = global.workspace_manager.connect(
            'active-workspace-changed',
            () => this.setWorkspaceButtonVisibility()
        );

        //decide what to do inside the function, calling it at any cover-behaviour
        this.#focusSignal = global.display.connect('notify::focus-window', () => this.focusWindowChange() );

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

        this.setCoverOption();

        this.setPosition();

        this.#overviewShowSignal=Main.overview.connect('showing', () => this.setOverviewVisibility());
        this.#overviewHideSignal=Main.overview.connect('hiding', () => this.setOverviewVisibility());
        this.setOverviewVisibility();

	}

    setButtonFactory(_buttonFactory){
        this.#buttonFactory=_buttonFactory;
    }

	close(){

        this.#disconnectAutohideSignals();
        this.#disconnectWindowDragAndRezizeSignals();

        if (this.#workspaceSignal) {
            global.workspace_manager.disconnect(this.#workspaceSignal);
            this.#workspaceSignal = 0;
        }

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

        this.#settingsConnector=null;
        this.#coreLogic=null;

	}

//---------------------------------------------------------------------------------------------------------------------
//---------------------------------------setPosition/ set Cover position-----------------------------------------------
//---------------------------------------------------------------------------------------------------------------------

    setPosition(){
        let position = this.#settingsConnector.settings.get_string('position-on-screen');
        let verticalMargin=this.#settingsConnector.settings.get_int('margin-vertical');
        let horizontalMargin=this.#settingsConnector.settings.get_int('margin-horizontal');

        let scrollContainerHeight=0;
        let scrollContainerWidth=0;

        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;

        let xPos=0;
        let yPos=0;

        switch (position){
            case 'top':
                this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.HORIZONTAL}));
                xPos=0;
                yPos=topPanel.height+verticalMargin;
                scrollContainerHeight=this.#buttonFactory.getButtonHeight();
                scrollContainerWidth=monitor.width;
                this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL}));
                this.#scrollContainer.set_style('padding: 0px '+horizontalMargin+'px 0px '+horizontalMargin+'px;');
                this.#useScrollPiping=true;
                break;
            case 'bottom':
                this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.HORIZONTAL}));
                xPos=0;
                yPos=monitor.height - this.#buttonFactory.getButtonHeight() - verticalMargin;
                scrollContainerHeight=this.#buttonFactory.getButtonHeight();
                scrollContainerWidth=monitor.width;
                this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL}));
                this.#scrollContainer.set_style('padding: 0px '+horizontalMargin+'px 0px '+horizontalMargin+'px;');
                this.#useScrollPiping=true;
                break;
            case 'left':
                this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}));
                xPos=horizontalMargin;
                yPos=topPanel.height;
                scrollContainerHeight=monitor.height-topPanel.height;
                scrollContainerWidth=this.#buttonFactory.getButtonWidth();
                this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL}));
                this.#scrollContainer.set_style('padding: '+verticalMargin+'px 0px '+verticalMargin+'px 0px;');
                this.#useScrollPiping=false;
                break;
            case 'right':
                this.#scrollContainer.set_layout_manager(new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}));
                xPos=monitor.width-this.#buttonFactory.getButtonWidth()-horizontalMargin;
                yPos=topPanel.height;
                scrollContainerHeight=monitor.height-topPanel.height;
                scrollContainerWidth=this.#buttonFactory.getButtonWidth();
                this.#coreLogic.container.set_layout_manager(new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL}));
                this.#scrollContainer.set_style('padding: '+verticalMargin+'px 0px '+verticalMargin+'px 0px;');
                this.#useScrollPiping=false;
                break;
        }
        this.#scrollContainer.set_policy(St.PolicyType.NEVER, St.PolicyType.NEVER); //just scrollbar, not ablility to scroll
        this.#scrollContainer.set_position(xPos, yPos);
        this.#scrollContainer.width=scrollContainerWidth;
        this.#scrollContainer.height=scrollContainerHeight;

        this.#scrollContainer.queue_relayout();

        for (const child of this.#coreLogic.container.get_children()) {
            this.#buttonFactory.styleButton(child);
        }

        this.setupAutohideDetector();

        if(this.#settingsConnector.settings.get_string('cover-behaviour')=='leave space'){
            this.#setupLeaveSpaceContainer();
        }

    }


    //set according to cover option
    setCoverOption(){

        if (this.#scrollContainer.get_parent()) {
            Main.layoutManager.removeChrome(this.#scrollContainer);
        }

        let affectInput=false; //set it to properly init?

        switch (this.#settingsConnector.settings.get_string('cover-behaviour')){

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

    #setupLeaveSpaceContainer(){
        this.destroyLeaveSpaceContainer();
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

        const [sc_width, sc_height] = this.#scrollContainer.get_size();

        let verticalMargin=this.#settingsConnector.settings.get_int('margin-vertical');
        let horizontalMargin=this.#settingsConnector.settings.get_int('margin-horizontal');

        let position = this.#settingsConnector.settings.get_string('position-on-screen');
        let monitor=Main.layoutManager.primaryMonitor;
        let topPanel=Main.panel;

        //have a settings entry for this
        let borderSpace=3;

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
    }

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------autohide--------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
    focusWindowChange(){ 
        if (this.#autohideActive){
            let win = global.display.get_focus_window();
            if (!win) {
                console.log('no window');
                return false;
            }
            this.#disconnectWindowDragAndRezizeSignals();
            this.#resizeSignal = win.connect('size-changed', () => {
                this.updateVisibilityActiveWindow();
            });

            this.#positionSignal = win.connect('position-changed', () => {
                this.updateVisibilityActiveWindow();
            });
            this.#oldFocusWindow=win;
            this.updateVisibilityActiveWindow();
        }
    }


    updateVisibilityActiveWindow() {

        if (!this.#scrollContainer){return};

        if (this.#autohideActive){
            if (this.#autohide_always){
                this.#scrollContainer.hide();
            }else{
                if (this.#isContainerCoveredByActiveWindow()) {
                    this.#scrollContainer.hide();
                }else{
                    this.#scrollContainer.show();
                }
            }
        }else{
            this.#scrollContainer.show();
        }
    }

    //this is a hover detect container. show buttons on hover! (wrong name)
    setupAutohideDetector(){

        this.#disconnectAutohideSignals();

        if (this.#autohide_detect_container.get_parent()) {
            Main.layoutManager.removeChrome(this.#autohide_detect_container);
        }
        Main.layoutManager.addChrome(this.#autohide_detect_container, {
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
        });

        if (this.#autohideActive){

            this.setAutohideDefaultSize();
            this.#autohide_detect_container.show();
            this.#autohide_detect_container.queue_relayout();

            this.#autohide_showSignal=this.#autohide_detect_container.connect('enter-event', () => {
                this.#scrollContainer.show();
            });

            if (this.#settingsConnector.settings.get_string('cover-behaviour') == "autohide"){
                this.updateVisibilityActiveWindow();
                this.#autohide_leaveSignal=this.#scrollContainer.connect('leave-event', () => {
                        if (!this.#pointerInside(this.#scrollContainer)) {
                            this.updateVisibilityActiveWindow();
                        }
                });
            }else if (this.#settingsConnector.settings.get_string('cover-behaviour') == "autohide always"){
                this.#scrollContainer.hide();
                this.#autohide_leaveSignal=this.#scrollContainer.connect('leave-event', () => {
                        if (!this.#pointerInside(this.#scrollContainer)) {
                            this.#scrollContainer.hide();
                        }
                });
            }

        }else{
            this.#autohide_detect_container.hide();
        }
        this.#autohide_detect_container.queue_relayout();
    }

    #pointerInside(actor) {
        const [x, y] = global.get_pointer();
        const box = actor.get_allocation_box();
        return x >= box.x1 && 
                x <= box.x2 && 
                y >= box.y1 && 
                y <= box.y2;
    }

    setAutohideDefaultSize(){
        let containerSize=this.#settingsConnector.settings.get_int('autohide-container-size');//5;
        switch (this.#settingsConnector.settings.get_string('position-on-screen')){
            case 'top':
                this.#autohide_detect_container.set_position(0, Main.panel.height);
                this.#autohide_detect_container.width=Main.layoutManager.primaryMonitor.width;
                this.#autohide_detect_container.height=containerSize;
                break;
            case 'bottom':
                this.#autohide_detect_container.set_position(0, Main.layoutManager.primaryMonitor.height-containerSize);
                this.#autohide_detect_container.width=Main.layoutManager.primaryMonitor.width;
                this.#autohide_detect_container.height=containerSize;
                break;
            case 'left':
                this.#autohide_detect_container.set_position(0, Main.panel.height);
                this.#autohide_detect_container.width=containerSize;
                this.#autohide_detect_container.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
            case 'right':
                this.#autohide_detect_container.set_position(Main.layoutManager.primaryMonitor.width-containerSize, Main.panel.height);
                this.#autohide_detect_container.width=containerSize;
                this.#autohide_detect_container.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
        }
    }


    #isContainerCoveredByActiveWindow() {
        if (!this.#scrollContainer) {return false;}

        let activeWin = global.display.get_focus_window();
        if (!activeWin) {
            console.log('no active window');
            return false;
        }

        let [x, y] = this.#scrollContainer.get_transformed_position();
        let containerRect = {
            x1: x,
            y1: y,
            x2: x + this.#scrollContainer.width,
            y2: y + this.#scrollContainer.height,
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

//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------Rest------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------

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
        let showInOverview = this.#settingsConnector.settings.get_boolean('show-in-overview');
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

    //this is the only one using coreLogic vars!?
    setWorkspaceButtonVisibility(){
        if (this.#settingsConnector.settings.get_boolean('per-workspace-buttons')){
            let currentWorkspaceNr=global.workspace_manager.get_active_workspace().index();
            for (let [metaWindow, btn] of this.#coreLogic._windowButtons) {
                let windowWorkspaceNr = this.#coreLogic._windowWorkspaces.get(metaWindow);
                if (windowWorkspaceNr==currentWorkspaceNr){
                    btn.visible=true;
                }else{
                    btn.visible=false;
                }
            }
        }else{
            for (let [metaWindow, btn] of this.#coreLogic._windowButtons) {
                btn.visible=true;
            }
        }
    }


    setScrollcontainerReactivity(){
        if (this.#autohideActive){
            this.#scrollContainer.reactive=true;
        }else{ //front and leave-space
            if (this.#settingsConnector.settings.get_string('position-on-screen') == 'top' ||
                this.#settingsConnector.settings.get_string('position-on-screen') == 'bottom'){
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


//---------------------------------------------------------------------------------------------------------------------
//-----------------------------------------disconnect/disable----------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
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

    #disconnectAutohideSignals(){
        if (this.#autohide_leaveSignal) {
            this.#scrollContainer.disconnect(this.#autohide_leaveSignal);
            this.#autohide_leaveSignal = 0;
        }
        if (this.#autohide_showSignal) {

            this.#autohide_detect_container.disconnect(this.#autohide_showSignal);
            this.#autohide_showSignal = 0;
        }
    }

    #disconnectWindowDragAndRezizeSignals(){
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