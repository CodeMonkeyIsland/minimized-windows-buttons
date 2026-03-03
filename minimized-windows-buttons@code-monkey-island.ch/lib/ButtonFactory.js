/**
 * Makes and changes Buttons
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';



export class ButtonFactory{

    //setting them on init now, set them here to 0? not set it at all?
	#buttonWidth=0;
	#buttonHeight=0;
    #iconHeight=0;
    #lineHeight=0;

    //waaaay too many vars and hooks. make 12 to 3 in prefs, have additional rgba var in schema->string?
    #text_color_r=0;
    #text_color_g=0;
    #text_color_b=0;
    #text_color_a=0.0;
    #bg_color_r=0;
    #bg_color_g=0;
    #bg_color_b=0;
    #bg_color_a=0.0;
    #border_color_r=0;
    #border_color_g=0;
    #border_color_b=0;
    #border_color_a=0.0;

    #border_radius=0;
    #font_weight=0;

	#settingsConnector=null;

	setSettingsConnector(_settingsConnector){
		this.#settingsConnector=_settingsConnector;
	}

    init(){
        this.#buttonWidth=this.#settingsConnector.settings.get_int('button-width');
        this.#buttonHeight=this.#settingsConnector.settings.get_int('button-height');
        this.#iconHeight=this.#settingsConnector.settings.get_int('icon-height');
        this.#lineHeight=this.#settingsConnector.settings.get_int('line-height');

        this.#text_color_r=this.#settingsConnector.settings.get_int('text-color-r');
        this.#text_color_g=this.#settingsConnector.settings.get_int('text-color-g');
        this.#text_color_b=this.#settingsConnector.settings.get_int('text-color-b');
        this.#text_color_a=this.#settingsConnector.settings.get_double('text-color-a');

        this.#bg_color_r=this.#settingsConnector.settings.get_int('bg-color-r');
        this.#bg_color_g=this.#settingsConnector.settings.get_int('bg-color-g');
        this.#bg_color_b=this.#settingsConnector.settings.get_int('bg-color-b');
        this.#bg_color_a=this.#settingsConnector.settings.get_double('bg-color-a');

        this.#border_color_r=this.#settingsConnector.settings.get_int('border-color-r');
        this.#border_color_g=this.#settingsConnector.settings.get_int('border-color-g');
        this.#border_color_b=this.#settingsConnector.settings.get_int('border-color-b');
        this.#border_color_a=this.#settingsConnector.settings.get_double('border-color-a');

        this.#border_radius=this.#settingsConnector.settings.get_int('border-radius');
        this.#font_weight=this.#settingsConnector.settings.get_int('font-weight');
        this.#font_weight=Math.round(this.#font_weight / 100) * 100;

    }

	getButtonWidth(){
		return this.#buttonWidth;
	}

	getButtonHeight(){
		return this.#buttonHeight;
	}

	makeButton(metaWindow){
		let gicon = this.#getWindowGicon(metaWindow);
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

        const button=new St.Button({
            style_class: 'minimized-button',
            child: content,
            x_expand: false,
            y_expand:false,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START
        });

        this.styleButton(button);

        return button;
	} 
 
    styleButton(btn){
        let styleString='';
        btn.width=this.#buttonWidth;
        btn.height=this.#buttonHeight;

        let icon=btn.get_child_at_index(0).get_child_at_index(0);
        let label=btn.get_child_at_index(0).get_child_at_index(1);

        icon.icon_size=this.#iconHeight;
        label.set_style('font-size: '+this.#lineHeight+'px;'+ 
                        'color: rgba('+this.#text_color_r+','+this.#text_color_g+','+this.#text_color_b+','+this.#text_color_a+'); '+
                        'font-weight: '+this.#font_weight);

        styleString = styleString+ 'background-color: rgba('+this.#bg_color_r+','+this.#bg_color_g+','+this.#bg_color_b+','+this.#bg_color_a+'); ';

        styleString = styleString+ 'border-color: rgba('+this.#border_color_r+','+this.#border_color_g+','+this.#border_color_b+','+this.#border_color_a+'); ';
        styleString = styleString+ 'border-width: 1px; ';
        styleString = styleString+ 'border-radius: '+this.#border_radius+'px; ';

        let buttonMargin=this.#settingsConnector.settings.get_int('margin-buttons');
        if (this.#settingsConnector.settings.get_string('position-on-screen') == 'top' ||
            this.#settingsConnector.settings.get_string('position-on-screen') == 'bottom'){
            styleString=styleString+'margin-right: '+buttonMargin+'px; margin-bottom: 0px;';
        }else{
            styleString=styleString+'margin-bottom: '+buttonMargin+'px; margin-right: 0px;';
        }
        btn.set_style(styleString);
    }

	#getWindowGicon(metaWindow) {
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
}