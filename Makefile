EXT_UUID = ubuntunetspeed@ochi12.github.com
EXT_DEST = $(HOME)/.local/share/gnome-shell/extensions/

install:
	cp -r $(EXT_UUID)/ "$(EXT_DEST)"

uninstall:
	rm -rf "$(EXT_DEST)"

