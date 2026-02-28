/**
 * Makes Buttons
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';



export class ButtonFactory{

	#buttonWidth=150;
	#buttonHeight=35;

	#settingsConnector=null;

	setSettingsConnector(_settingsConnector){
		this.#settingsConnector=_settingsConnector;
	}

    init(){
        this.#buttonWidth=this.#settingsConnector.settings.get_int('button-width');
        this.#buttonHeight=this.#settingsConnector.settings.get_int('button-height');
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