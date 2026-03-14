import json
import runpy
import shutil
import sys
import typing

import gi

gi.require_version('Gtk', '3.0')

from gi.repository import Gtk
from lutris import settings
from lutris.config import LutrisConfig
from lutris.database import categories, games
from lutris.gui.widgets.utils import get_runtime_icon_path
from lutris.util.wine.proton import is_proton_version
from lutris.util.wine.wine import GE_PROTON_LATEST, get_installed_wine_versions


SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:"
SUPPORTED_LUTRIS_BOOL_SETTINGS = {"dxvk", "d3d_extras", "esync", "fsync"}


def _print_subcommand_output(json_serializable: typing.Any):
    data = json.dumps(json_serializable, ensure_ascii=True)
    print("\r\n" + SUBCOMMAND_OUTPUT_HEADER + data, end="\r\n")


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


def _format_proton_version_label(version: str):
    if version == GE_PROTON_LATEST:
        return "GE-Proton (Latest)"

    return version


def _get_available_proton_versions():
    versions = []

    for version in get_installed_wine_versions():
        if version == GE_PROTON_LATEST or is_proton_version(version):
            versions.append(version)

    return versions


def _get_proton_version_options(current_version: typing.Optional[str] = None):
    options = [
        {
            "label": _format_proton_version_label(version),
            "value": version,
        }
        for version in _get_available_proton_versions()
    ]

    if current_version and not any(option["value"] == current_version for option in options):
        options.insert(0, {"label": current_version, "value": current_version})

    return options


def _get_lutris_config_payload(config: LutrisConfig):
    return {
        "protonVersion": config.runner_config.get("version") or GE_PROTON_LATEST,
        "availableProtonVersions": _get_proton_version_options(
            config.runner_config.get("version") or GE_PROTON_LATEST
        ),
        "dxvkEnabled": bool(config.runner_config.get("dxvk")),
        "d3dExtrasEnabled": bool(config.runner_config.get("d3d_extras")),
        "esyncEnabled": bool(config.runner_config.get("esync")),
        "fsyncEnabled": bool(config.runner_config.get("fsync")),
    }


def get_lutris_config_main():
    config = LutrisConfig(runner_slug="wine")
    _print_subcommand_output(_get_lutris_config_payload(config))


def set_lutris_proton_version_main(version: str):
    if version not in _get_available_proton_versions():
        raise ValueError(f"Invalid Lutris proton version: {version}")

    config = LutrisConfig(runner_slug="wine")
    config.raw_runner_config["version"] = version
    config.save()

    _print_subcommand_output(_get_lutris_config_payload(config))


def set_lutris_bool_setting_main(key: str, value_json: str):
    if key not in SUPPORTED_LUTRIS_BOOL_SETTINGS:
        raise ValueError(f"Invalid Lutris boolean setting: {key}")

    value = json.loads(value_json)
    if not isinstance(value, bool):
        raise ValueError(f"Invalid value for Lutris boolean setting '{key}': {value}")

    config = LutrisConfig(runner_slug="wine")
    config.raw_runner_config[key] = value
    config.save()

    _print_subcommand_output(_get_lutris_config_payload(config))


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

    elif "--get-lutris-config" in sys.argv:
        get_lutris_config_main()

    elif "--set-lutris-proton-version" in sys.argv:
        set_lutris_proton_version_main(sys.argv[sys.argv.index("--set-lutris-proton-version") + 1])

    elif "--set-lutris-bool-setting" in sys.argv:
        index = sys.argv.index("--set-lutris-bool-setting")
        set_lutris_bool_setting_main(sys.argv[index + 1], sys.argv[index + 2])

    else:
        lutris_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
