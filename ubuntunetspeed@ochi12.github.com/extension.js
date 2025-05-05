/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

// add more prefixes
const networkIfacePrefixes = [
  "lo", // Loopback interface
  "veth", // Virtual Ethernet pair
  "virbr", // Virtual bridge
  "tap", // Tap device (TUN/TAP)
  "tun", // Tun device (VPNs)
  "br", // Bridge interface
  "docker", // Docker bridge
  "wlx", // Wireless interfaces
  "wlan", // Wireless interfaces (alternative name)
  "enp", // Predictable Ethernet name
  "ens", // Predictable Ethernet name
  "macvtap", // MacVTap virtual NIC
  "vmnet", // VMware interfaces
  "vnet", // KVM/QEMU guest interface
  "ifb", // Intermediate Functional Block (traffic control)
  "gretap", // GRE tap (GRE tunnel)
  "ip6tnl", // IPv6 tunnel (IPv6 over IPv4)
  "sit", // Simple Internet Transition (IPv6 over IPv4 tunnel)
  "gre", // Generic Routing Encapsulation tunnel
  "bond", // Bonded interface
  "team", // Team interface (alternative to bonding)
  "ib", // InfiniBand interface
  "ovs", // Open vSwitch interface
  "eno", // Modern predictable interface name
  "ens", // Modern predictable interface name
  "enp", // Modern predictable interface name
];

const ByteUnits = [
  "bps",
  "kbps",
  "Mbps",
  "Gbps",
  "Tbps",
  "Pbps",
  "Ebps",
  "Zbps",
  "Ybps",
];

const SAMPLING_INTERVAL_SECONDS = 3;

const IconName = {
  Arrows: "vertical-arrows-symbolic",
  ArrowsNone: "vertical-arrows-none-symbolic",
  ArrowsUpNone: "vertical-arrows-up-none-symbolic",
  ArrowsDownNone: "vertical-arrows-down-none-symbolic",
};

const Path = {
  Actions: "/icons/hicolor/scalable/actions/",
  SpeedSource: "/proc/net/dev",
};

const isVirtualInterface = (name) => {
  return networkIfacePrefixes.some((prefix) => {
    return name.startsWith(prefix);
  });
};

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init(Me) {
      super._init(0.0, _("My Shiny Indicator"));

      let icon_theme = new St.IconTheme();

      this._gicon_arrows = icon_theme.has_icon(IconName.Arrows)
        ? Gio.ThemedIcon.new(IconName.Arrows)
        : Gio.icon_new_for_string(
            `${Me.path}${Path.Actions}${IconName.Arrows}.svg`,
          );

      this._gicon_arrows_none = icon_theme.has_icon(IconName.ArrowsNone)
        ? Gio.ThemedIcon.new(IconName.ArrowsNone)
        : Gio.icon_new_for_string(
            `${Me.path}${Path.Actions}${IconName.ArrowsNone}.svg`,
          );

      this._gicon_arrows_up_none = icon_theme.has_icon(IconName.ArrowsUpNone)
        ? Gio.ThemedIcon.new(IconName.ArrowsUpNone)
        : Gio.icon_new_for_string(
            `${Me.path}${Path.Actions}${IconName.ArrowsUpNone}.svg`,
          );

      this._gicon_arrows_down_none = icon_theme.has_icon(
        IconName.ArrowsDownNone,
      )
        ? Gio.ThemedIcon.new(IconName.ArrowsDownNone)
        : Gio.icon_new_for_string(
            `${Me.path}${Path.Actions}${IconName.ArrowsDownNone}.svg`,
          );

      let box = new St.BoxLayout({
        vertical: false,
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: false,
      });

      this._label = new St.Label({
        text: "0 bps",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this._icon = new St.Icon({
        gicon: this._gicon_arrows_none,
        style_class: "system-status-icon",
      });
      this._icon.set_style("padding: 0; margin: 0 2px 0 0");

      box.add_child(this._icon);
      box.add_child(this._label);

      this.add_child(box);

      this.connect("button-press-event", () => {
        const quickSettings = Main.panel.statusArea.quickSettings;
        if (quickSettings) {
          quickSettings.menu.open();
        }
      });
    }
    _formatSpeed(speed) {
      let i = 0;
      while (speed >= 1000 && i < ByteUnits.length - 1) {
        speed /= 1000;
        i++;
      }

      const accuracy =
        speed > 100 || speed - 0 < 0.01 ? 0 : speed >= 10 ? 1 : 2;

      return `${speed.toFixed(accuracy)} ${ByteUnits[i]}`;
    }

    updateSpeedLabel(speed) {
      let netSpeed = speed.Download + speed.Upload;
      console.log(
        `UP: ${speed.Upload} DOWN: ${speed.Download} Net: ${netSpeed}`,
      );
      if (speed.Download === 0 && speed.Upload === 0) {
        this._icon.set_gicon(this._gicon_arrows_none);
      } else if (speed.Upload === 0) {
        this._icon.set_gicon(this._gicon_arrows_up_none);
      } else if (speed.Download === 0) {
        this._icon.set_gicon(this._gicon_arrows_down_none);
      } else {
        this._icon.set_gicon(this._gicon_arrows);
      }

      this._label.set_text(this._formatSpeed(netSpeed));
    }
  },
);

export default class UbuntuNetSpeedExtension extends Extension {
  enable() {
    this._indicator = new Indicator(this);
    Main.panel.addToStatusArea(this.uuid, this._indicator, 0);

    this._decoder = new TextDecoder();
    this._lastNetBytes = { Download: 0, Upload: 0 };

    this._refreshTimeout = null;
    this._refreshTimeout = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      SAMPLING_INTERVAL_SECONDS,
      () => {
        this._indicator.updateSpeedLabel(this._getNetSpeedSpeed());
        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  disable() {
    if (this._indicator != null) {
      this._indicator.destroy();
      this._indicator = null;
    }

    if (this._refreshTimeout != null) {
      GLib.source_remove(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    this._decoder = null;
    this._lastNetBytes = null;
  }

  _getNetSpeedSpeed() {
    const speed = { Download: 0, Upload: 0 };

    try {
      //taping the Speed Source ~ lame joke to tapping the Speed Force
      const speedSource = Gio.File.new_for_path(Path.SpeedSource);
      const [, content] = speedSource.load_contents(null);

      const fields = this._decoder
        .decode(content)
        .split("\n")
        .map((line) => {
          // clean up lines and return as array using non word as delimeter
          return line.trim().split(/\W+/);
        })
        .filter((fields) => fields.length > 2)
        .map((field) => {
          // format the fields to handle it properly later
          return {
            name: field[0],
            download: Number.parseInt(field[1]),
            upload: Number.parseInt(field[9]),
          };
        })
        .filter(({ name, download, upload }) => {
          // remove invalid field member
          return !(
            isNaN(download) ||
            isNaN(upload) ||
            isVirtualInterface(name)
          );
        });

      const netBytes = fields.reduce(
        (acc, { download, upload }) => {
          return {
            Download: acc.Download + download,
            Upload: acc.Upload + upload,
          };
        },
        { Upload: 0, Download: 0 },
      );

      if (this._lastNetBytes.Upload === 0) {
        this._lastNetBytes.Upload = netBytes.Upload;
      }

      if (this._lastNetBytes.Download === 0) {
        this._lastNetBytes.Download = netBytes.Download;
      }

      speed.Download =
        (netBytes.Download - this._lastNetBytes.Download) /
        SAMPLING_INTERVAL_SECONDS;
      speed.Upload =
        (netBytes.Upload - this._lastNetBytes.Upload) /
        SAMPLING_INTERVAL_SECONDS;

      this._lastNetBytes = netBytes;
    } catch (e) {
      console.error(e);
    }

    return speed;
  }
}
