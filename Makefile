EXT_UUID = ubuntunetspeed@ochi12.github.com
EXT_DEST = $(HOME)/.local/share/gnome-shell/extensions/$(EXT_UUID)

install:
	mkdir -p "$(EXT_DEST)"
	cp -r $(EXT_UUID)/* "$(EXT_DEST)"
	gnome-extensions enable "$(EXT_UUID)"

uninstall:
	gnome-extensions disable "$(EXT_UUID)"
	rm -rf "$(EXT_DEST)"

