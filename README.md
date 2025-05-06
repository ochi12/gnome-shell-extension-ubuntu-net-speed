# ubuntu-net-speed
A simple extension that shows the current network speed that follow a mobile os like minimal approach.

## How the Minimal Approach Works

If you're a mobile phone user, you've probably seen network speeds displayed at the top of the status bar (similar to Android). You may have wondered why only a single speed is shown, instead of both upload and download speeds (e.g., `⬇ 320Kbps ⬆ 120Kbps`).

It’s actually a neat trick to minimize the clutter in the status bar. In this approach, **the single speed shown is a sum of both the upload and download speeds**. The arrow icon updates based on the values of upload and download speeds. Here's how it works:

### The 4 Possible Scenarios:
1. **Both Upload and Download Are Non-Zero:**
   - Both arrows (⬇ and ⬆) are displayed at full opacity, representing active upload and download speeds.

2. **Download Speed is Zero, but Upload is Non-Zero:**
   - The **up arrow** will be fully opaque, while the **down arrow** will be half opaque to indicate no download activity.

3. **Upload Speed is Zero, but Download is Non-Zero:**
   - The **down arrow** will be fully opaque, while the **up arrow** will be half opaque to indicate no upload activity.

4. **Both Upload and Download Are Zero:**
   - Both arrows are **fully transparent**, indicating no network activity.

This design minimizes space usage while still conveying all necessary information about your current network speeds. The arrows' opacity allows the user to easily distinguish whether upload or download speed is active.

---

### 🔧 Summary of Logic:
- **Full opacity** for active speeds.
- **Half opacity** for inactive speeds.
- **Full transparency** when there’s no activity.



## Requirements
make sure 'make' is installed
#### Install `make`:

- **Ubuntu / Debian**:

  ```bash
  sudo apt install make

## Installation of the Extension
### install
```bash
$ make build
$ make install
```
