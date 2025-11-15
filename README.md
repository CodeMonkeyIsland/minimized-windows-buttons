<h2><b>Minimized Windows Buttons</b></h2>

<p>
A GNOME Shell extension that displays accessible buttons along the screen edge for all minimized windows.
Includes a gnome-extension-settings-page, that lets you customise it.
</p>

<h3>Features & Settings</h3>
<ul>
    <li><b>Position</b>: top, bottom, left, or right edge of the screen</li>
    <li><b>Show in Overview</b>: optionally show the buttons inside the Activities Overview</li>
    <li><b>Per-workspace Buttons</b>: show only windows from the current workspace or all workspaces</li>
    <li><b>Cover Behaviour</b>:
        <ul>
            <li><b>front</b>: buttons stay on top of windows</li>
            <li><b>leave space</b>: adjusts the workarea so maximized windows avoid covering the buttons</li>
            <li><b>autohide</b>: buttons hide when the active window overlaps them; move the cursor to the screen edge to reveal</li>
            <li><b>autohide always</b>: buttons hide whenever the cursor leaves the button-container; reveal by setting the cursor to the screen edge</li>
        </ul>
    </li>
    <li><b>Margins</b>: spacing between buttons and between the container and the screen edge</li>
</ul>

<h3>Known Issues</h3>
<ul>
    <li>After reloading the extension (turning it off and on), an Overview toggle is required to make it work again. A new login works as well.</li>
    <li><b>Touch support (experimental)</b>:
        <ul>
            <li>Autohide does not trigger correctly because leave events are not detected.</li>
            <li>Scrolling with touch on the button container does not work.</li>
            <li>apart from that actually working pretty well. depending on your settings and setup, it might work.</li>
        </ul>
    </li>
</ul>





















<p><b>Minimized Windows Buttons</b></p>
<p>Gnome shell extension making buttons on the edge of the screen for minimized windows.</p>
<br>
<p>includes Settings for customisation:<br>
	- position: top, bottom, left right<br>
	- Show in Overview: show the buttons or overview or not<br>
	- Per Workspace Buttons: Show all buttons, or only those belonging to the current workspace.<br>
	- Cover behaviour:
	&nbsp;&nbsp;&nbsp;&nbsp;front: Buttons cover windows<br>
	&nbsp;&nbsp;&nbsp;&nbsp;leave space: Workarea gets adjusted, so maximize doesnt cover Buttons. Else like front<br>
	&nbsp;&nbsp;&nbsp;&nbsp;autohide: Buttons get hidden, when active Window covers them. Put Cursor to the edge of the monitor to show.<br>
	&nbsp;&nbsp;&nbsp;&nbsp;autohide always: Buttons get hidden, when the cursor leaves the Button-container. Put Cursor to the edge of the monitor to show.<br>
	- margins: margins between buttons and between buttons and screen edge<br>
</p>

<p>
	Open issues<br>
	- on Extension turn off/on again: need to go to overview to make it work again. (or or after new login, things are fine, too)<br>
	- touch support is considered experimental:<br>
	&nbsp;&nbsp;&nbsp;&nbsp;- autohide: leave event not triggered, buttons stay visible until you resize/drag the active window<br>
	&nbsp;&nbsp;&nbsp;&nbsp;- touch-scroll on the button-container doesnt work<br>
</p>
