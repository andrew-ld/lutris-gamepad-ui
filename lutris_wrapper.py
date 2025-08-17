import json
import runpy
import shutil
import sys

import gi

gi.require_version('Gtk', '3.0')

from gi.repository import Gtk
from lutris import settings
from lutris.database import categories


def get_coverart_path_main():
    print(settings.COVERART_PATH)


def get_all_games_categories_main():
    result = {
        "categories": categories.get_categories(),
        "all_games_categories": categories.get_all_games_categories()
    }

    print(json.dumps(result))


def lutris_main():
    gtk_application_orig_init = Gtk.Application.__init__

    def gtk_application_patched_init(*args, **kwargs):
        if "application_id" in kwargs:
            kwargs["application_id"] = None

        gtk_application_orig_init(*args, **kwargs)

    Gtk.Application.__init__ = gtk_application_patched_init

    runpy.run_path(shutil.which("lutris"))


def main():
    if "--get-coverart-path" in sys.argv:
        get_coverart_path_main()

    elif "--get-all-games-categories" in sys.argv:
        get_all_games_categories_main()

    else:
        lutris_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
