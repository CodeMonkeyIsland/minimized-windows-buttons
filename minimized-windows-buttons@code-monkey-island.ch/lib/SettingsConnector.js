/**
 * self-explanatory, needs no imports
 * talks only to DisplayManager
 */

export class SettingsConnector{

	settings=null;

	#displayManager=null;

    #coverSignal=0;
    #autohideSizeSignal=0;
    #marginVerticalSignal=0;
    #marginHorizontalSignal=0;
    #marginButtonSignal=0;
    #positionSignal=0;
    #perWorkspaceSignal=0;


	constructor(_settings){
		this.settings=_settings;
	}

	setDisplayManager(_displayManager){
		this.#displayManager=_displayManager;
	}

	connect(){
		this.#coverSignal=this.settings.connect('changed::cover-behaviour', () => {
            this.#displayManager.setCoverPosition();
            this.#displayManager.setupAutohideDetector();
            //trigger reset and update in autohide
            this.#displayManager.updateVisibilityActiveWindow();

        });
        
        this.#autohideSizeSignal=this.settings.connect('changed::autohide-container-size', () => {
            this.#displayManager.setAutohideDefaultSize();
        });

        this.#marginVerticalSignal=this.settings.connect('changed::margin-vertical', () => {
            this.#displayManager.setPosition();
            this.#displayManager.updateVisibilityActiveWindow();
        });

        this.#marginHorizontalSignal=this.settings.connect('changed::margin-horizontal', () => {
            this.#displayManager.setPosition();
            this.#displayManager.updateVisibilityActiveWindow();
        });

        this.#marginButtonSignal=this.settings.connect('changed::margin-buttons', () => {
            this.#displayManager.setPosition();
            this.#displayManager.updateVisibilityActiveWindow();
        });

        this.#positionSignal=this.settings.connect('changed::position-on-screen', () => {
            this.#displayManager.setPosition();
            this.#displayManager.updateVisibilityActiveWindow();
        });

        this.#perWorkspaceSignal=this.settings.connect('changed::per-workspace-buttons', () => {
            this.#displayManager.setWorkspaceButtonVisibility();
        });

	}

	disconnect(){
        if (this.#coverSignal) {
            this.settings.disconnect(this.#coverSignal);
            this.#coverSignal = 0;
        }

        if (this.#autohideSizeSignal) {
            this.settings.disconnect(this.#autohideSizeSignal);
            this.#autohideSizeSignal = 0;
        }

        if (this.#marginVerticalSignal) {
            this.settings.disconnect(this.#marginVerticalSignal);
            this.#marginVerticalSignal = 0;
        }

        if (this.#marginHorizontalSignal) {
            this.settings.disconnect(this.#marginHorizontalSignal);
            this.#marginHorizontalSignal = 0;
        }

        if (this.#marginButtonSignal) {
            this.settings.disconnect(this.#marginButtonSignal);
            this.#marginButtonSignal = 0;
        }

        if (this.#positionSignal) {
            this.settings.disconnect(this.#positionSignal);
            this.#positionSignal = 0;
        }

        this.settings=null;

	}
    
}