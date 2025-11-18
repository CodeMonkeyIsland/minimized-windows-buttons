import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CoreLogic} from './lib/CoreLogic.js';
import {DisplayManager} from './lib/DisplayManager.js';
import {SettingsConnector} from './lib/SettingsConnector.js';


export default class MinimizedButtonsExtension extends Extension {

    #coreLogic=null;
    #displayManager=null;
    #settingsConnector=null;


    enable(){

        this.#coreLogic= new CoreLogic();
        this.#settingsConnector= new SettingsConnector(this.getSettings());
        this.#displayManager = new DisplayManager(this.#coreLogic, this.#settingsConnector);

        this.#coreLogic.setDisplayManager(this.#displayManager);
        this.#settingsConnector.setDisplayManager(this.#displayManager);

        this.#settingsConnector.connect();
        this.#coreLogic.init(); //initialises also displayManager
        
    }


    disable(){

        this.#settingsConnector.disconnect();
        this.#settingsConnector=null;

        this.#coreLogic.close();
        this.#coreLogic=null;
        
        this.#displayManager.close();
        this.#displayManager=null;


    }

} //MinimizedButtonsExtension extends Extension