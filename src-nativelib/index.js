import { EventEmitter } from "events";
import bindings from "bindings";
const nativeAddon = bindings("nativelib");

class X11 {
  constructor() {
    /**
     * Emitter for focus-related events.
     * @type {EventEmitter}
     */
    this.focus = new EventEmitter();

    this._isWatchingFocus = false;

    this._nativeFocusCallback = (pid) => {
      this.focus.emit("pid-changed", pid);
    };

    this.focus.on("newListener", (event) => {
      if (event === "pid-changed" && !this._isWatchingFocus) {
        this._startFocusWatcher();
      }
    });

    this.focus.on("removeListener", (event) => {
      if (
        event === "pid-changed" &&
        this.focus.listenerCount("pid-changed") === 0
      ) {
        this._stopFocusWatcher();
      }
    });
  }

  /**
   * @private
   * Starts the underlying native C++ focus watcher thread.
   */
  _startFocusWatcher() {
    if (this._isWatchingFocus) return;

    console.log("[Native] Starting focus watcher...");
    nativeAddon.focusWatcher_start(this._nativeFocusCallback);
    this._isWatchingFocus = true;
    this.focus.emit("watcher-started");
  }

  /**
   * @private
   * Stops the underlying native C++ focus watcher thread.
   */
  _stopFocusWatcher() {
    if (!this._isWatchingFocus) return;

    console.log("[Native] Stopping focus watcher...");
    nativeAddon.focusWatcher_stop();
    this._isWatchingFocus = false;
    this.focus.emit("watcher-stopped");
  }

  /**
   * Checks if the focus watcher thread is currently active.
   * @returns {boolean}
   */
  isWatchingFocus() {
    return this._isWatchingFocus;
  }

  /**
   * Commands X11 to set the focused window to the one with the given PID.
   * @param {number} pid The process ID of the window to focus.
   */
  setFocus(pid) {
    if (typeof pid !== "number" || pid <= 0) {
      throw new Error("A valid PID (positive number) is required.");
    }
    nativeAddon.focusWatcher_setFocus(pid);
  }
}

export const x11 = new X11();
