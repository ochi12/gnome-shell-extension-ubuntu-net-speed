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
  QuickToggle,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";

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

const UbuntuNetSpeed = GObject.registerClass(
  class UbuntuNetSpeed extends SystemIndicator {
    constructor(Me) {
      super();
      this._path = Me.path;
      this._icon_theme = new St.IconTheme();

      this._gicon_arrows = this._get_gicon(IconName.Arrows);
      this._gicon_arrows_none = this._get_gicon(IconName.ArrowsNone);
      this._gicon_arrows_up_none = this._get_gicon(IconName.ArrowsUpNone);
      this._gicon_arrows_down_none = this._get_gicon(IconName.ArrowsDownNone);
      this._indicator = this._addIndicator();
      this._indicator.gicon = this._gicon_arrows_none;
      this._indicator.add_style_class_name("ubuntu-netspeed-indicator");

      this._label = new St.Label({
        text: "...",
        y_align: Clutter.ActorAlign.CENTER,
      });

      this.add_child(this._label);
    }
    _get_gicon(name) {
      let gicon = this._icon_theme.has_icon(name)
        ? Gio.ThemedIcon.new(name)
        : Gio.icon_new_for_string(`${this._path}${Path.Actions}${name}.svg`);
      return gicon;
    }
    update(speed) {
      let netSpeed = speed.Download + speed.Upload;

      if (speed.Upload === 0 && speed.Download === 0) {
        this._indicator.gicon = this._gicon_arrows_none;
      } else if (speed.Upload === 0) {
        this._indicator.gicon = this._gicon_arrows_up_none;
      } else if (speed.Download === 0) {
        this._indicator.gicon = this._gicon_arrows_down_none;
      } else {
        this._indicator.gicon = this._gicon_arrows;
      }

      this._label.set_text(this._format(netSpeed));
    }
    _format(speed) {
      let i = 0;
      while (speed >= 1000 && i < ByteUnits.length - 1) {
        speed /= 1000;
        i++;
      }

      const accuracy =
        speed > 100 || speed - 0 < 0.01 ? 0 : speed >= 10 ? 1 : 2;

      return `${speed.toFixed(accuracy)} ${ByteUnits[i]}`;
    }

    destroy() {
      this._label.destroy();
      this._label = null;

      this._indicator = null;
      this._gicon_arrows = null;
      this._gicon_arrows_none = null;
      this._gicon_arrows_up_none = null;
      this._gicon_arrows_down_none = null;

      super.destroy();
    }
  },
);

export default class UbuntuNetSpeedExtension extends Extension {
  enable() {
    this._net_indicator = new UbuntuNetSpeed(this);
    Main.panel.statusArea.quickSettings.addExternalIndicator(
      this._net_indicator,
    );

    this._decoder = new TextDecoder();
    this._lastNetBytes = { Download: 0, Upload: 0 };

    this._positionFixer = null;
    this._refreshTimeout = null;

    this._networkMonitor = Gio.NetworkMonitor.get_default();

    if (this._networkMonitor.get_network_available()) {
      this._positionFixer = this._startPositionFixer();
      this._refreshTimeout = this._startRefreshTimeout();
    } else {
      this._net_indicator.visible = false;
    }

    this._networkChangeId = this._networkMonitor.connect(
      "network-changed",
      () => {
        const online = this._networkMonitor.get_network_available();
        this._net_indicator.visible = online;

        if (online && this._refreshTimeout === null) {
          this._refreshTimeout = this._startRefreshTimeout();
          this._positionFixer = this._startPositionFixer();
        } else if (!online && this._refreshTimeout !== null) {
          GLib.source_remove(this._refreshTimeout);
          this._refreshTimeout = null;
        }
      },
    );
  }

  _startRefreshTimeout() {
    return GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      SAMPLING_INTERVAL_SECONDS,
      () => {
        let speed = this._getNetSpeedSpeed();
        this._net_indicator.update(speed);
        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  _startPositionFixer() {
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
      let container = Main.panel.statusArea.quickSettings._indicators;
      if (
        container.contains(this._net_indicator) &&
        container.get_children().indexOf(this._net_indicator) !== 0
      ) {
        container.set_child_at_index(this._net_indicator, 0);
      }
      return GLib.SOURCE_CONTINUE;
    });
  }

  disable() {
    this._net_indicator.destroy();
    this._net_indicator = null;

    if (this._refreshTimeout !== null) {
      GLib.source_remove(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    this._decoder = null;
    this._lastNetBytes = null;

    if (this._positionFixer !== null) {
      GLib.source_remove(this._positionFixer);
      this._positionFixer = null;
    }

    this._networkMonitor.disconnect(this._networkChangeId);
    this._networkChangeId = null;
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
