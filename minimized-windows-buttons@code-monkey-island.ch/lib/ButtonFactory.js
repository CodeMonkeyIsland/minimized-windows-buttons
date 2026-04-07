/**
 * Makes and changes Buttons
 * no hooks/signals are to be saved here, doing that in coreLogic
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';



export class ButtonFactory{

    //setting them on init now
    #buttonWidth=0;
	#buttonHeight=0;
    #iconHeight=0;
    #lineHeight=0;

    #text_color='';
    #bg_color='';
    #border_color='';

    #border_radius=0;
    #font_weight=0;

	settings=null;

	constructor(_settings){
        this.settings=_settings;
    }

    //not really an init, more a reset to settings.
    init(){
        this.#buttonWidth=this.settings.get_int('button-width');
        this.#buttonHeight=this.settings.get_int('button-height');
        this.#iconHeight=this.settings.get_int('icon-height');
        this.#lineHeight=this.settings.get_int('line-height');

        this.#text_color=this.settings.get_string('text-color');
        this.#bg_color=this.settings.get_string('bg-color');
        this.#border_color=this.settings.get_string('border-color');

        this.#border_radius=this.settings.get_int('border-radius');
        this.#font_weight=this.settings.get_int('font-weight');
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

    makePlaceholderButton(){
        let gicon = new Gio.ThemedIcon({ name: 'application-x-executable' });
        let icon = new St.Icon({ gicon, style_class: 'button-icon' });

        let label = new St.Label({
            style_class: 'minimized-button-label',
            text: 'bla',
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

        button.set_opacity(0);

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
                        'color: '+this.#text_color+';'+
                        'font-weight: '+this.#font_weight);

        styleString = styleString+ 'background-color: '+this.#bg_color+';';
        styleString = styleString+ 'border-color: '+this.#border_color+';';
        styleString = styleString+ 'border-width: 1px; ';
        styleString = styleString+ 'border-radius: '+this.#border_radius+'px; ';

        let buttonMargin=this.settings.get_int('margin-buttons');
        if (this.settings.get_string('position-on-screen') == 'top' ||
            this.settings.get_string('position-on-screen') == 'bottom'){
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