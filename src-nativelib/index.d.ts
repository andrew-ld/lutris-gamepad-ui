import { EventEmitter } from "events";

interface FocusEventEmitter extends EventEmitter {
  on(event: "pid-changed", listener: (pid: number) => void): this;
  on(event: "watcher-started", listener: () => void): this;
  on(event: "watcher-stopped", listener: () => void): this;

  off(event: "pid-changed", listener: (pid: number) => void): this;
  off(event: "watcher-started", listener: () => void): this;
  off(event: "watcher-stopped", listener: () => void): this;

  emit(event: "pid-changed", pid: number): boolean;
  emit(event: "watcher-started"): boolean;
  emit(event: "watcher-stopped"): boolean;
}

declare class X11 {
  public readonly focus: FocusEventEmitter;

  public setFocus(pid: number): void;

  public isWatchingFocus(): boolean;
}

declare const x11: X11;
