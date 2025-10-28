sh project-meta/copy.sh
cd ~/.local/share/gnome-shell/extensions/minimized-windows-buttons@code-monkey-island.ch/

#rm schemas/gschemas.compiled
glib-compile-schemas schemas/
#gsettings reset-recursively org.gnome.shell.extensions.minimized-windows-buttons@code-monkey-island.ch

gnome-extensions disable minimized-windows-buttons@code-monkey-island.ch
gnome-extensions enable minimized-windows-buttons@code-monkey-island.ch