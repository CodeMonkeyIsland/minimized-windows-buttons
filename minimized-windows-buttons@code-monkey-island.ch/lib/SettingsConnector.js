/**
 * self-explanatory, needs no imports
 * 
 * talks only to DisplayManager and ButtonFactory
 */

export class SettingsConnector{

    settings=null;

    #displayManager=null;
    #buttonFactory=null;

    #coverSignal=0;
    #autohideSizeSignal=0;
    #marginVerticalSignal=0;
    #marginHorizontalSignal=0;
    #marginButtonSignal=0;
    #positionSignal=0;
    #perWorkspaceSignal=0;
    #buttonHeightSignal=0;
    #buttonWidthSignal=0;
    #iconHeightSignal=0;
    #lineHeightSignal=0;

    //one signal per var would really do. should introduce some kind of checksum var.
    #text_color_r_Signal=0;
    #text_color_g_Signal=0;
    #text_color_b_Signal=0;
    #text_color_a_Signal=0;
    #bg_color_r_Signal=0;
    #bg_color_g_Signal=0;
    #bg_color_b_Signal=0;
    #bg_color_a_Signal=0;
    #border_color_r_Signal=0;
    #border_color_g_Signal=0;
    #border_color_b_Signal=0;
    #border_color_a_Signal=0;

    #border_radius_Signal=0;
    #font_weight_Signal=0;
    #leave_space_margin_Signal=0;

	constructor(_settings){
		this.settings=_settings;
	}

	setDisplayManager(_displayManager){
		this.#displayManager=_displayManager;
	}

    setButtonFactory(_buttonFactory){
        this.#buttonFactory=_buttonFactory;
    }

	connect(){
		this.#coverSignal=this.settings.connect('changed::cover-behaviour', () => {
            this.#displayManager.setCoverOption();
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

        this.#buttonHeightSignal=this.settings.connect('changed::button-height', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
            this.#displayManager.setScrollcontainerReactivity();
        });

        this.#buttonWidthSignal=this.settings.connect('changed::button-width', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
            this.#displayManager.setScrollcontainerReactivity();
        });

        this.#buttonWidthSignal=this.settings.connect('changed::icon-height', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#buttonWidthSignal=this.settings.connect('changed::line-height', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });


        this.#text_color_r_Signal=this.settings.connect('changed::text-color-r', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#text_color_g_Signal=this.settings.connect('changed::text-color-g', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#text_color_b_Signal=this.settings.connect('changed::text-color-b', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#text_color_a_Signal=this.settings.connect('changed::text-color-a', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#bg_color_r_Signal=this.settings.connect('changed::bg-color-r', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#bg_color_g_Signal=this.settings.connect('changed::bg-color-g', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#bg_color_b_Signal=this.settings.connect('changed::bg-color-b', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#bg_color_a_Signal=this.settings.connect('changed::bg-color-a', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#border_color_r_Signal=this.settings.connect('changed::border-color-r', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#border_color_g_Signal=this.settings.connect('changed::border-color-g', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#border_color_b_Signal=this.settings.connect('changed::border-color-b', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });
        this.#border_color_a_Signal=this.settings.connect('changed::border-color-a', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#border_radius_Signal=this.settings.connect('changed::border-radius', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#font_weight_Signal=this.settings.connect('changed::font-weight', () => {
            this.#buttonFactory.init();
            this.#displayManager.setPosition();
        });

        this.#leave_space_margin_Signal=this.settings.connect('changed::leave-space-margin', () => {
            this.#displayManager.setCoverOption();
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

        if (this.#buttonHeightSignal) {
            this.settings.disconnect(this.#buttonHeightSignal);
            this.#buttonHeightSignal = 0;
        }

        if (this.#buttonWidthSignal) {
            this.settings.disconnect(this.#buttonWidthSignal);
            this.#buttonWidthSignal = 0;
        }

        if (this.#iconHeightSignal) {
            this.settings.disconnect(this.#iconHeightSignal);
            this.#iconHeightSignal = 0;
        }

        if (this.#lineHeightSignal) {
            this.settings.disconnect(this.#lineHeightSignal);
            this.#lineHeightSignal = 0;
        }


        if (this.#text_color_r_Signal) {
            this.settings.disconnect(this.#text_color_r_Signal);
            this.#text_color_r_Signal = 0;
        }
        if (this.#text_color_g_Signal) {
            this.settings.disconnect(this.#text_color_g_Signal);
            this.#text_color_g_Signal = 0;
        }
        if (this.#text_color_b_Signal) {
            this.settings.disconnect(this.#text_color_b_Signal);
            this.#text_color_b_Signal = 0;
        }
        if (this.#text_color_a_Signal) {
            this.settings.disconnect(this.#text_color_a_Signal);
            this.#text_color_a_Signal = 0;
        }

        if (this.#bg_color_r_Signal) {
            this.settings.disconnect(this.#bg_color_r_Signal);
            this.#bg_color_r_Signal = 0;
        }
        if (this.#bg_color_g_Signal) {
            this.settings.disconnect(this.#bg_color_g_Signal);
            this.#bg_color_g_Signal = 0;
        }
        if (this.#bg_color_b_Signal) {
            this.settings.disconnect(this.#bg_color_b_Signal);
            this.#bg_color_b_Signal = 0;
        }
        if (this.#bg_color_a_Signal) {
            this.settings.disconnect(this.#bg_color_a_Signal);
            this.#bg_color_a_Signal = 0;
        }

        if (this.#border_color_r_Signal) {
            this.settings.disconnect(this.#border_color_r_Signal);
            this.#border_color_r_Signal = 0;
        }
        if (this.#border_color_g_Signal) {
            this.settings.disconnect(this.#border_color_g_Signal);
            this.#border_color_g_Signal = 0;
        }
        if (this.#border_color_b_Signal) {
            this.settings.disconnect(this.#border_color_b_Signal);
            this.#border_color_b_Signal = 0;
        }
        if (this.#border_color_a_Signal) {
            this.settings.disconnect(this.#border_color_a_Signal);
            this.#border_color_a_Signal = 0;
        }

        if (this.#border_radius_Signal) {
            this.settings.disconnect(this.#border_radius_Signal);
            this.#border_radius_Signal = 0;
        }

        if (this.#font_weight_Signal) {
            this.settings.disconnect(this.#font_weight_Signal);
            this.#font_weight_Signal = 0;
        }

         if (this.#leave_space_margin_Signal) {
            this.settings.disconnect(this.#leave_space_margin_Signal);
            this.#leave_space_margin_Signal = 0;
        }

        this.settings=null;

	}
    
}