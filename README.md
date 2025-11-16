<h2><b>Minimized Windows Buttons</b></h2>

<p>
A GNOME Shell extension that displays buttons along the screen edge for minimized windows. Click on them to reopen the window.<br>
Includes a gnome-extensions-settings-page, that lets you customise it.
</p>

<h3>Features & Settings</h3>
<ul>
    <li><b>Position</b>: top, bottom, left or right edge of the screen</li>
    <li><b>Show in Overview</b>: optionally show the buttons inside the Activities Overview</li>
    <li><b>Per-workspace Buttons</b>: show only windows from the current workspace or all workspaces. Windows always open in the current workspace</li>
    <li><b>Cover Behaviour</b>:
        <ul>
            <li><b>front</b>: buttons stay on top of windows</li>
            <li><b>leave space</b>: adjusts the workarea so maximized windows avoid covering the buttons. Else behaves like front.</li>
            <li><b>autohide</b>: buttons hide when the active window overlaps them; move the cursor to the screen edge to reveal when covered. </li>
            <li><b>autohide always</b>: buttons hide whenever the cursor leaves the button-container; reveal by setting the cursor to the screen edge</li>
        </ul>
    </li>
    <li><b>Margins</b>: spacing between buttons and between the container and the screen edges</li>
</ul>

<h3>Known Issues</h3>
<ul>
    <li>After reloading the extension (turning it off and on), the focused window at the that time isn't detected. Autohide works only after you change focus to another window.</li>
    <li><b>Touch support (experimental)</b>:
        <ul>
            <li>Autohide does not trigger correctly because leave events are not detected. Still works fine, when you move or resize the active window. auto-show (move cursor to the edge) works ok here on debian 13 gnome 48. adjust the size of the detection zone on settings. For nicely calibrated touch, size 1 works for me.</li>
            <li>Touch-scroll on the button container does not work.</li>
            <li>apart from that actually working pretty well. depending on your settings and setup, it might work for you.</li>
        </ul>
    </li>
</ul>