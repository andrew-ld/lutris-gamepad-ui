import runpy
import shutil
import sys

import gi

gi.require_version('Gtk', '3.0')

from gi.repository import Gtk

gtk_application_orig_init = Gtk.Application.__init__

def gtk_application_patched_init(*args, **kwargs):
    if "application_id" in kwargs:
        kwargs["application_id"] = None

    gtk_application_orig_init(*args, **kwargs)

Gtk.Application.__init__ = gtk_application_patched_init

runpy.run_path(shutil.which("lutris"))

sys.exit(0)
