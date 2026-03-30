const X11_LIBRARY_NAME = ["libX11.so.6", "libX11.so"];

function configureKoffiX11(koffi) {
  koffi.alias("Window", "uint64");
  koffi.alias("Atom", "uint64");
  koffi.alias("Bool", "int");
  koffi.alias("Status", "int");
  koffi.pointer("Display", koffi.opaque());
}

function bindX11(lib) {
  return {
    None: 0n,
    AnyPropertyType: 0n,
    False: 0,
    True: 1,

    XA_CARDINAL: 6n,

    PropModeReplace: 0,

    XOpenDisplay: lib.func("Display* XOpenDisplay(const char* display_name)"),
    XCloseDisplay: lib.func("int XCloseDisplay(Display* display)"),
    XDefaultRootWindow: lib.func("Window XDefaultRootWindow(Display* display)"),
    XInternAtom: lib.func(
      "Atom XInternAtom(Display* display, const char* atom_name, Bool only_if_exists)",
    ),
    XFlush: lib.func("int XFlush(Display* display)"),
    XFree: lib.func("int XFree(void* data)"),

    XGetWindowProperty: lib.func(
      "int XGetWindowProperty(Display* dpy, Window w, Atom property, int64 offset, int64 length, Bool delete, Atom req_type, " +
        "void* actual_type_return, void* actual_format_return, void* nitems_return, " +
        "void* bytes_after_return, void* prop_return)",
    ),

    XChangeProperty: lib.func(
      "int XChangeProperty(Display* dpy, Window w, Atom property, Atom type, int format, int mode, const void* data, int nelements)",
    ),
  };
}

module.exports = { bindX11, configureKoffiX11, X11_LIBRARY_NAME };
