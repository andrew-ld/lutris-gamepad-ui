import json
import runpy
import shutil
import sys
import typing

import gi

gi.require_version('Gtk', '3.0')

from gi.repository import Gtk
from lutris import settings
from lutris.database import categories, games
from lutris.gui.widgets.utils import get_runtime_icon_path


SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:"


def _print_subcommand_output(json_serializable: typing.Any):
    data = json.dumps(json_serializable, ensure_ascii=True)
    print("\r\n" + SUBCOMMAND_OUTPUT_HEADER + data)


def get_coverart_path_main():
    _print_subcommand_output(settings.COVERART_PATH)


def get_runtime_icon_path_main(icon_name: str):
    icon_path = get_runtime_icon_path(icon_name)

    if icon_path is not None:
        _print_subcommand_output(icon_path)
    else:
        sys.exit(1)


def get_all_games_categories_main():
    try:
        all_games_categories = categories.get_all_games_categories()
    except AttributeError:
        all_games_categories = {}

    result = {
        "categories": categories.get_categories(),
        "all_games_categories": all_games_categories
    }

    _print_subcommand_output(result)


def list_games_main():
    _print_subcommand_output(games.get_games(filters={"installed": 1}))


def patch_gtk_dbus_singleton():
    """
    Prevents the Gtk.Application from registering a unique application ID
    on DBus, allowing multiple instances of Lutris applications to run.
    """
    gtk_application_orig_init = Gtk.Application.__init__

    def gtk_application_patched_init(*args, **kwargs):
        if "application_id" in kwargs:
            kwargs["application_id"] = None

        gtk_application_orig_init(*args, **kwargs)

    Gtk.Application.__init__ = gtk_application_patched_init


def lutris_main():
    patch_gtk_dbus_singleton()
    runpy.run_path(shutil.which("lutris"))


def main():
    if "--get-coverart-path" in sys.argv:
        get_coverart_path_main()

    elif "--get-runtime-icon-path" in sys.argv:
        get_runtime_icon_path_main(sys.argv[sys.argv.index("--get-runtime-icon-path") + 1])

    elif "--get-all-games-categories" in sys.argv:
        get_all_games_categories_main()

    elif "--list-games" in sys.argv:
        list_games_main()

    else:
        lutris_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
