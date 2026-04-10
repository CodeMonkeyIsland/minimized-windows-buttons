/**
 * little helper for DisplayManager autohide functions
 * just for reducing LOC in DisplayManager, make it more readable
 *
 * functions of the same name in DisplayManager get piped here
 *
 * object gets construced during DisplayManager.init(), nulled at DM.close()
 * only one object, like a singleton. (but not enforcing it)
 *
 * no hooks saved here, settings-connected and hooked vars get passed
 * down in the piping functions as needed.
 *
 * this means: for now, no signals are to be set here -> public signal setters in piping section of DM
 *
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';


export default class DisplayManager_AutohideHelper{

    constructor(){
        //do nothing, pass down everything needed in function calls
    }

    updateVisibilityActiveWindow(_scrollContainer, _autohide_active, _autohide_always) {

        if (!_scrollContainer || !_scrollContainer.get_parent()){return;};

        if (_autohide_active){
            if (_autohide_always){
                _scrollContainer.hide();
            }else{
                if (this.#isContainerCoveredByActiveWindow(_scrollContainer)) {
                    _scrollContainer.hide();
                }else{
                    _scrollContainer.show();
                }
            }
        }else{
            _scrollContainer.show();
        }
    }

    #isContainerCoveredByActiveWindow(_scrollContainer) {
        if (!_scrollContainer || !_scrollContainer.get_parent()) {return false;}

        let activeWin = this.#getFocusWindow();
        if (!activeWin) {
            return false;
        }

        let [x, y] = _scrollContainer.get_transformed_position();
        let containerRect = {
            x1: x,
            y1: y,
            x2: x + _scrollContainer.width,
            y2: y + _scrollContainer.height,
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

    //not accouting for margins. setting to screen edge
    setAutohideDefaultSize(_settings, _autohideDetectContainer){
        let containerSize=_settings.get_int('autohide-container-size');
        switch (_settings.get_string('position-on-screen')){
            case 'top':
                _autohideDetectContainer.set_position(0, Main.panel.height);
                _autohideDetectContainer.width=Main.layoutManager.primaryMonitor.width;
                _autohideDetectContainer.height=containerSize;
                break;
            case 'bottom':
                _autohideDetectContainer.set_position(0, Main.layoutManager.primaryMonitor.height-containerSize);
                _autohideDetectContainer.width=Main.layoutManager.primaryMonitor.width;
                _autohideDetectContainer.height=containerSize;
                break;
            case 'left':
                _autohideDetectContainer.set_position(0, Main.panel.height);
                _autohideDetectContainer.width=containerSize;
                _autohideDetectContainer.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
            case 'right':
                _autohideDetectContainer.set_position(Main.layoutManager.primaryMonitor.width-containerSize, Main.panel.height);
                _autohideDetectContainer.width=containerSize;
                _autohideDetectContainer.height=Main.layoutManager.primaryMonitor.height-Main.panel.height;
                break;
        }
    }

    focusWindowChange(_displayManager, _autohideActive){
        if (_autohideActive){
            //the newly focussed window
            let win = this.#getFocusWindow();

            if (!win) {
                return false;
            }

            _displayManager.disconnectWindowDragAndRezizeSignals();

            _displayManager.setResizeSignal(
                win.connect('size-changed', () => {
                    //going back here bacause lazyness
                    _displayManager.updateVisibilityActiveWindow();
                })
            );

            _displayManager.setPositionSignal(
                win.connect('position-changed', () => {
                    //going back here bacause lazyness
                    _displayManager.updateVisibilityActiveWindow();
                })
            );

            //do i also need a signal on destroy()? --> cleaning that up in coreLogic

            _displayManager.setOldFocusWindow(win);

            //going back here bacause lazyness
             _displayManager.updateVisibilityActiveWindow();
        }
    }

    //this is a hover detect container. show buttons on hover! (wrong name)
    setupAutohideDetector(_displayManager, _scrollContainer, _autohide_detect_container, _autohideActive, _settings){

        //lazy
        _displayManager.disconnectAutohideSignals();

        if (_autohide_detect_container.get_parent()) {
            Main.layoutManager.removeChrome(_autohide_detect_container);
        }
        Main.layoutManager.addChrome(_autohide_detect_container, {
                affectsInputRegion: false,
                trackFullscreen: true,
                affectsStruts: false
        });

        if (_autohideActive){

            //lazy
            _displayManager.setAutohideDefaultSize();

            _autohide_detect_container.show();
            _autohide_detect_container.queue_relayout();


            _displayManager.set_Autohide_Show_Signal(_autohide_detect_container.connect('enter-event', () => {
                _scrollContainer.show();
            }));


            if (_settings.get_string('cover-behaviour') == "autohide"){
                //lazy
                _displayManager.updateVisibilityActiveWindow();
                _displayManager.set_Autohide_Leave_Signal(_scrollContainer.connect('leave-event', (actor, event) => {
                    if (!this.pointerInside(_scrollContainer, event)) {
                        //lazy
                        _displayManager.updateVisibilityActiveWindow();
                     }
                }));

            }else if (_settings.get_string('cover-behaviour') == "autohide always"){
                _scrollContainer.hide();
                _displayManager.set_Autohide_Leave_Signal(_scrollContainer.connect('leave-event', (actor, event) => {
                    if (!this.pointerInside(_scrollContainer, event)) {
                        _scrollContainer.hide();
                     }
                }));
            }

        }else{
            _autohide_detect_container.hide();
        }

        _autohide_detect_container.queue_relayout();
    }

    //should really decide on some general policy
    //on what coords to use everywhere...
    pointerInside(actor, event) {

        const [x, y] = event.get_coords();
        let [success, localX, localY] = actor.transform_stage_point(x, y);
        if (!success) {return false;}

        let box = actor.get_allocation_box();
        return localX >= 0 &&
                localX <= (box.x2 - box.x1) &&
                localY >= 0 &&
                localY <= (box.y2 - box.y1);
    }

    #getFocusWindow(){

        //fails on a new window
        let win = global.display.get_focus_window();

        if (!win){
            const workspace = global.workspace_manager.get_active_workspace();
            const windows = workspace.list_windows();
            if (windows.length === 0) {
                console.log('[Minimized Windows Buttons] getFocusWindow: No windows in current workspace!');
                return null;
            };
            win=windows.sort((a, b) => b.get_user_time() - a.get_user_time())[0];
        }

        return win;
    }

}
