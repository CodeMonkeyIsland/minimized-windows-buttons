#!/bin/bash

cd minimized-windows-buttons@code-monkey-island.ch
glib-compile-schemas schemas/
cd ..

sh project-meta/copy.sh
#cd ~/.local/share/gnome-shell/extensions/minimized-windows-buttons@code-monkey-island.ch/
#rm schemas/gschemas.compiled


gnome-extensions disable minimized-windows-buttons@code-monkey-island.ch
gnome-extensions enable minimized-windows-buttons@code-monkey-island.ch