import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CoreLogic} from './lib/CoreLogic.js';
import {DisplayManager} from './lib/DisplayManager.js';
import {SettingsConnector} from './lib/SettingsConnector.js';
import {ButtonFactory} from './lib/ButtonFactory.js';


export default class MinimizedButtonsExtension extends Extension {

    #buttonFactory=null;
    #coreLogic=null;
    #displayManager=null;
    #settingsConnector=null;


    enable(){

        this.#buttonFactory=new ButtonFactory();

        this.#coreLogic= new CoreLogic();
        this.#settingsConnector= new SettingsConnector(this.getSettings());
        this.#displayManager = new DisplayManager(this.#coreLogic, this.#settingsConnector);

        this.#coreLogic.setDisplayManager(this.#displayManager);
        this.#settingsConnector.setDisplayManager(this.#displayManager);

        this.#coreLogic.setButtonFactory(this.#buttonFactory);
        this.#displayManager.setButtonFactory(this.#buttonFactory);
        this.#settingsConnector.setButtonFactory(this.#buttonFactory);

        this.#settingsConnector.connect();

        this.#buttonFactory.setSettingsConnector(this.#settingsConnector);
        this.#buttonFactory.init();
        
        this.#coreLogic.init(); //initialises displayManager during init
        
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