<h2><b>Minimized Windows Buttons</b></h2>

<p>
A GNOME Shell extension that displays buttons along the screen edge for each minimized window. Click on them to reopen the window.<br><br>
Includes a settings-page, that lets you customise it:
</p>

<h3>Features & Settings</h3>
<ul>
    <li><b>Position</b>: top, bottom, left or right edge of the screen</li>
    <li><b>Show in Overview</b>: optionally show the buttons inside the Activities Overview</li>
    <li><b>Per-workspace Buttons</b>: show only windows from the current workspace or all workspaces.</li>
    <li><b>Cover Behaviour</b>:
        <ul>
            <li><b>front</b>: buttons stay in front of windows</li>
            <li><b>leave space</b>: adjusts the workarea so maximized windows avoid covering the buttons. Else behaves like front.</li>
            <li><b>autohide</b>: buttons hide when the focussed window overlaps them; move the cursor to the screen edge to reveal when covered. </li>
            <li><b>autohide always</b>: buttons hide whenever the cursor leaves the button-container; reveal by setting the cursor to the screen edge</li>
        </ul>
    </li>
    <li><b>Margins</b>: spacing between buttons and between the container and the screen edges</li>
    <li><b>Button style</b>: choose colors and sizes of components</li>
    <li><b>DnD</b>: set drag and drop behaviour.</li>
    <li><b>Touch support</b>: Usable on touch-only devices if some settings are set:</li>
    <ul>
        <li>drag-scroll-hack (Misc.): enable the drag-scroll-hack to use button-drag to control scroll, because touch scroll event on button-container is not working. I feel like this really shouldnt work as smooth as it does, but it does. Maybe just on my hardware? Needs calibration settings?</li>
        <li>autohide global event hook (Misc.): this is insanity! But im not getting leave-events with touch. Its working pretty smooth, but still, only enable this for autohide on touch-only-devices.</li>
        <li>autohide detect container (Cover Options): set to appropriate size. Size 1 works for me with a pen and good calibration, but otherwise consider a bigger size</li>
        <li>snapback(Misc.): enable snapback, so windows will snap back into position instead of opening when dropped outside the container</li>
    </ul>
</ul>

<h3>Known Issues</h3>
<ul>
    <li>Changing Screen orientation: this would need a "stick to smaller/bigger edge, prefer top/left", etc. option for some touch devices</li>
    <li><b>Compatibility:</b> using this together with just perfection, dash to dock and v-shell. Trying to play nice, but:</li>
    <ul>
        <li>fighting dash to dock for window open and close animations</li>
        <li>think im triggering an error in another extension with something else. Cant really replicate right now, need to investigate further</li>
        <li>setting dock and buttons to the same edge is actually working now (use Placement/Margins to leave space for the dock)</li>
    </ul>
</ul>