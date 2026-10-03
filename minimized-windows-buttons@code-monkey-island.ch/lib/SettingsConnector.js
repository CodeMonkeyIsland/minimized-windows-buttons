/**
 * self-explanatory, needs no imports
 *
 * just 2 real functions: connect & disconnect
 * other classes can access settings, this is for settings-hooks
 *
 */

export class SettingsConnector{

    #settings=null;

    #coreLogic=null;
    #displayManager=null;
    #buttonFactory=null;

    constructor(_settings, _buttonFactory){
        this.#settings=_settings;
        this.#buttonFactory=_buttonFactory;
    }

    setDisplayManager(_displayManager){
        this.#displayManager=_displayManager;
    }

    setCoreLogic(_coreLogic){
        this.#coreLogic=_coreLogic;
    }

    connect(){

        //-----------------------Cover Options-----------------------------------

        this.#settings.connectObject(
            'changed::cover-behaviour',
            () => {
                this.#displayManager.setCoverOption();
                this.#displayManager.setupAutohideDetector();
                this.#displayManager.updateVisibilityActiveWindow();
            },
            this
        );

        this.#settings.connectObject(
            'changed::autohide-container-size',
            () => { 
                this.#displayManager.setAutohideDefaultSize();
            },
            this
        );

        this.#settings.connectObject(
            'changed::leave-space-margin',
            () => { 
                this.#displayManager.setCoverOption();
            },
            this
        );

        //-----------------------Placement-----------------------------------

        this.#settings.connectObject(
            'changed::position-on-screen',
            () => { 
                this.#displayManager.setPosition();
                this.#displayManager.updateVisibilityActiveWindow();
            },
            this
        );

        this.#settings.connectObject(
            'changed::margin-vertical',
            () => {
                this.#displayManager.setPosition();
                this.#displayManager.updateVisibilityActiveWindow();
            },
            this
        );

        this.#settings.connectObject(
            'changed::margin-horizontal',
            () => { 
                this.#displayManager.setPosition();
                this.#displayManager.updateVisibilityActiveWindow();
            },
            this
        );

        this.#settings.connectObject(
            'changed::margin-buttons',
            () => {
                this.#displayManager.setPosition();
                this.#displayManager.updateVisibilityActiveWindow();
            },
            this
        );

        //-----------------------Style-----------------------------------

        this.#settings.connectObject(
            'changed::button-height',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.setPosition();
                this.#displayManager.setScrollcontainerReactivity();
            },
            this
        );

        this.#settings.connectObject(
            'changed::button-width',
            () => {
                this.#buttonFactory.init();
                this.#displayManager.setPosition();
                this.#displayManager.setScrollcontainerReactivity();
            },
            this
        );

        this.#settings.connectObject(
            'changed::icon-height',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::line-height',
            () => {
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::text-color',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::bg-color',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::border-color',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::border-radius',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        this.#settings.connectObject(
            'changed::font-weight',
            () => { 
                this.#buttonFactory.init();
                this.#displayManager.resetAllButtonStyles();
            },
            this
        );

        //-----------------------Misc.-----------------------------------

        this.#settings.connectObject(
            'changed::show-in-overview',
            () => { 
                this.#displayManager.showInOverview=this.#settings.get_boolean('show-in-overview');
            },
            this
        );

        this.#settings.connectObject(
            'changed::per-workspace-buttons',
            () => { 
                this.#coreLogic.perWorkspace_enabled=this.#settings.get_boolean('per-workspace-buttons');
                this.#coreLogic.setWorkspaceButtonVisibility();
            },
            this
        );

        this.#settings.connectObject(
            'changed::snapback',
            () => { 
                this.#coreLogic.snapback_enabled=this.#settings.get_boolean('snapback');
            },
            this
        );

        this.#settings.connectObject(
            'changed::drag-scroll-hack',
            () => { 
                this.#coreLogic.dragScrollHack_enabled=this.#settings.get_boolean('drag-scroll-hack');
            },
            this
        );

        this.#settings.connectObject(
            'changed::global-event-hook',
            () => {
                const isEnabled = this.#settings.get_boolean('global-event-hook');
                if (isEnabled){
                    this.#displayManager.setupGlobalEventHook();
                }else{
                    this.#displayManager.disconnectGlobalEventHook();
                }
            },
            this
        );


    }

    disconnect(){
        this.#settings.disconnectObject(this);
        this.#settings=null;
    }

}