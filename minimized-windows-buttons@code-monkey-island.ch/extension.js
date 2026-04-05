import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CoreLogic} from './lib/CoreLogic.js';
import {DisplayManager} from './lib/DisplayManager.js';
import {SettingsConnector} from './lib/SettingsConnector.js';
import {ButtonFactory} from './lib/ButtonFactory.js';


export default class MinimizedButtonsExtension extends Extension {

    #settings=null;
    #buttonFactory=null;

    #coreLogic=null;
    #displayManager=null;
    #settingsConnector=null;

    enable(){
        this.#settings=this.getSettings();
        this.#buttonFactory=new ButtonFactory(this.#settings);
        
        this.#coreLogic= new CoreLogic(this.#settings, this.#buttonFactory);
        this.#settingsConnector= new SettingsConnector(this.#settings, this.#buttonFactory);
        this.#displayManager = new DisplayManager(this.#settings, this.#buttonFactory, this.#coreLogic);

        this.#coreLogic.setDisplayManager(this.#displayManager);
        this.#settingsConnector.setDisplayManager(this.#displayManager);
        this.#settingsConnector.setCoreLogic(this.#coreLogic);

        this.#settingsConnector.connect();
        this.#buttonFactory.init(); //not really a init, more like "reset to new settings"
        this.#coreLogic.init(); //initialises displayManager during init
    }

    disable(){
        this.#coreLogic.close();
        this.#coreLogic=null;

        this.#displayManager.close();
        this.#displayManager=null;

        this.#buttonFactory=null; //needs no close()

        this.#settingsConnector.disconnect();
        this.#settingsConnector=null;

        this.#settings=null;
    }

} //MinimizedButtonsExtension extends Extension