#include <X11/Xatom.h>
#include <X11/Xlib.h>
#include <atomic>
#include <chrono>
#include <iostream>
#include <memory>
#include <napi.h>
#include <ostream>
#include <thread>

namespace NativeLib {

struct XDeleter {
  void operator()(void *p) {
    if (p) {
      XFree(p);
    }
  }
};
template <typename T> using XFreePtr = std::unique_ptr<T, XDeleter>;

struct DisplayDeleter {
  void operator()(Display *d) {
    if (d) {
      XCloseDisplay(d);
    }
  }
};
using DisplayPtr = std::unique_ptr<Display, DisplayDeleter>;

long getWindowPID(Display *display, const Window &window) {
  if (!display || window == None) {
    return 0;
  }

  Atom pid_atom = XInternAtom(display, "_NET_WM_PID", True);
  if (pid_atom == None) {
    return 0;
  }

  Atom actual_type;
  int actual_format;
  unsigned long nitems, bytes_after;
  unsigned char *prop_data = nullptr;

  if (XGetWindowProperty(display, window, pid_atom, 0, 1, False, XA_CARDINAL,
                         &actual_type, &actual_format, &nitems, &bytes_after,
                         &prop_data) != Success) {
    return 0;
  }

  XFreePtr<unsigned char> prop(prop_data);

  if (prop && actual_type == XA_CARDINAL && actual_format == 32 && nitems > 0) {
    return *((long *)prop.get());
  }

  return 0;
}

Window findWindowByPID(Display *display, const Window &current_window,
                       const long target_pid) {
  if (getWindowPID(display, current_window) == target_pid) {
    return current_window;
  }

  Window root_return, parent_return;
  Window *children_data = nullptr;
  unsigned int nchildren;

  if (XQueryTree(display, current_window, &root_return, &parent_return,
                 &children_data, &nchildren) == 0 ||
      !children_data) {
    return 0;
  }

  XFreePtr<Window> children(children_data);

  for (unsigned int i = 0; i < nchildren; i++) {
    Window found = findWindowByPID(display, children.get()[i], target_pid);
    if (found != 0) {
      return found;
    }
  }

  return 0;
}

void sendNetActiveWindowMessage(Display *display,
                                const Window &window_to_activate) {
  XEvent event;
  event.xclient.type = ClientMessage;
  event.xclient.serial = 0;
  event.xclient.send_event = True;
  event.xclient.display = display;
  event.xclient.window = window_to_activate;
  event.xclient.message_type =
      XInternAtom(display, "_NET_ACTIVE_WINDOW", False);
  event.xclient.format = 32;
  event.xclient.data.l[0] = 1;
  event.xclient.data.l[1] = CurrentTime;
  event.xclient.data.l[2] = 0;
  event.xclient.data.l[3] = 0;
  event.xclient.data.l[4] = 0;

  XSendEvent(display, DefaultRootWindow(display), False,
             SubstructureRedirectMask | SubstructureNotifyMask, &event);
}

class FocusWatcher {
public:
  void start(Napi::Function cb) {
    if (m_is_watching)
      return;

    m_tsfn = Napi::ThreadSafeFunction::New(cb.Env(), cb, "Focus Watcher", 0, 1);
    m_stop_flag = false;
    m_worker_thread = std::thread(&FocusWatcher::watcherLoop, this);
    m_is_watching = true;
  }

  void stop() {
    if (!m_is_watching)
      return;

    m_stop_flag = true;
    if (m_worker_thread.joinable()) {
      m_worker_thread.join();
    }
    m_is_watching = false;
    m_tsfn.Release();
  }

private:
  void watcherLoop() {
    DisplayPtr display(XOpenDisplay(nullptr));
    if (!display) {
      std::cerr << "FocusWatcher: FATAL - Cannot open X11 display in "
                   "background thread. Thread exiting."
                << std::endl;
      return;
    }

    long last_pid = -1;
    while (!m_stop_flag) {
      Window focused_window;
      int revert_to;
      XGetInputFocus(display.get(), &focused_window, &revert_to);
      long current_pid = getWindowPID(display.get(), focused_window);

      if (current_pid != 0 && current_pid != last_pid) {
        last_pid = current_pid;

        auto pid_copy = last_pid;
        m_tsfn.NonBlockingCall(
            [pid_copy](Napi::Env env, Napi::Function jsCallback) {
              jsCallback.Call({Napi::Number::New(env, pid_copy)});
            });
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
  }

  std::atomic<bool> m_stop_flag{false};
  bool m_is_watching{false};
  std::thread m_worker_thread;
  Napi::ThreadSafeFunction m_tsfn;
};

static FocusWatcher g_watcher;

Napi::Value FocusWatcher_Start(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "A callback function is required.")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  g_watcher.start(info[0].As<Napi::Function>());
  return env.Undefined();
}

Napi::Value FocusWatcher_Stop(const Napi::CallbackInfo &info) {
  g_watcher.stop();
  return info.Env().Undefined();
}

Napi::Value FocusWatcher_SetFocus(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "A PID (number) is required.")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  const long pid_to_focus = info[0].As<Napi::Number>().Int64Value();

  DisplayPtr display(XOpenDisplay(nullptr));
  if (!display) {
    Napi::Error::New(env, "Failed to open X11 display.")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  Window root = DefaultRootWindow(display.get());
  Window target_window = findWindowByPID(display.get(), root, pid_to_focus);
  if (target_window != 0) {
    sendNetActiveWindowMessage(display.get(), target_window);
    XFlush(display.get());
  }
  return env.Undefined();
}

} // namespace NativeLib

Napi::Object Init(Napi::Env env, Napi::Object exports) {

  exports.Set("focusWatcher_start",
              Napi::Function::New(env, NativeLib::FocusWatcher_Start));
  exports.Set("focusWatcher_stop",
              Napi::Function::New(env, NativeLib::FocusWatcher_Stop));
  exports.Set("focusWatcher_setFocus",
              Napi::Function::New(env, NativeLib::FocusWatcher_SetFocus));
  return exports;
}

NODE_API_MODULE(nativelib, Init)
