import os.path
import json
import runpy
import shutil
import sys
import typing
import inspect

lutris_bin_path = shutil.which("lutris")
lutris_dir_path = os.path.join(os.path.dirname(lutris_bin_path), os.pardir)

sys.path.insert(0, lutris_dir_path)
sys.argv[0] = lutris_bin_path

import gi

gi.require_version("Gtk", "3.0")

from gi.repository import Gtk
from lutris import settings, sysoptions
from lutris.config import LutrisConfig
from lutris.database import categories, games
from lutris.database.games import get_game_by_field
from lutris.gui.widgets.utils import get_runtime_icon_path
from lutris.runners import import_runner
from lutris.startup import init_lutris
from lutris.runners import get_installed as get_installed_runners

try:
    from lutris.runners import InvalidRunnerError
except ImportError:
    from lutris.runners import InvalidRunner as InvalidRunnerError

SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:"


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
        "all_games_categories": all_games_categories,
    }

    _print_subcommand_output(result)


def list_games_main():
    _print_subcommand_output(games.get_games(filters={"installed": 1}))


def get_config(game_slug=None, runner_slug=None):
    if game_slug:
        game = get_game_by_field(game_slug, "slug") or get_game_by_field(
            game_slug, "id"
        )
        if not game:
            return None, None
        return (
            LutrisConfig(runner_slug=game["runner"], game_config_id=game["configpath"]),
            game["runner"],
        )
    return LutrisConfig(runner_slug=runner_slug), runner_slug


def normalize_choice(item):
    if isinstance(item, str):
        return (item, item)
    if hasattr(item, "__iter__"):
        items = list(item)
        label = str(items[0]) if items else ""
        value = str(items[1]) if len(items) > 1 else label
        return (label, value)
    return (str(item), str(item))


def resolve_choices(source, key):
    if not source:
        return []
    if callable(source):
        sig = inspect.signature(source)
        items = source(key) if sig.parameters else source()
    else:
        items = source
    return [normalize_choice(i) for i in items]


def is_available(opt):
    return not any(
        opt.get(k) and callable(opt[k]) and not opt[k]()
        for k in ["available", "condition"]
    )


def format_option(opt, values):
    key = opt["option"]
    default_val = opt.get("default")
    if callable(default_val):
        try:
            default_val = default_val()
        except Exception:
            default_val = str(default_val)
    return {
        "key": key,
        "label": opt.get("label"),
        "help": opt.get("help"),
        "type": opt.get("type"),
        "value": values.get(key),
        "default": default_val,
        "choices": (
            resolve_choices(opt.get("choices"), key) if "choices" in opt else None
        ),
        "advanced": opt.get("advanced", False),
    }


def get_settings_main(game_slug=None, runner_slug=None):
    init_lutris()
    game_name = None
    if game_slug:
        game = get_game_by_field(game_slug, "slug") or get_game_by_field(
            game_slug, "id"
        )
        if game:
            game_name = game["name"]

    config, r_slug = get_config(game_slug, runner_slug)
    if not config:
        _print_subcommand_output({})
        return

    runner = None
    if r_slug:
        try:
            runner = import_runner(r_slug)()
        except InvalidRunnerError:
            pass

    sections = [
        (
            "system",
            (
                sysoptions.with_runner_overrides(r_slug)
                if r_slug
                else sysoptions.system_options
            ),
            config.system_config,
        )
    ]
    if runner:
        sections.append(("runner", runner.get_runner_options(), config.runner_config))
        sections.append(("game", runner.game_options, config.game_config))

    _print_subcommand_output(
        {
            "settings": {
                name: [format_option(o, vals) for o in meta if is_available(o)]
                for name, meta, vals in sections
            },
            "runner_slug": r_slug,
            "game_name": game_name,
        }
    )


def update_setting_main(
    section, key, value, value_type=None, game_slug=None, runner_slug=None
):
    init_lutris()
    config, _ = get_config(game_slug, runner_slug)
    if not config:
        sys.exit(1)

    target_attr = f"{config.level}_level"
    target = getattr(config, target_attr)

    if section == "runner" and config.runner_slug:
        section = config.runner_slug

    if section not in target:
        target[section] = {}

    if value_type == "bool":
        value = value.lower() == "true"
    elif value_type == "int":
        value = int(value)

    target[section][key] = value
    config.save()
    _print_subcommand_output({"status": "success"})


def list_runners_main():
    installed_runners = get_installed_runners()
    result = [{"name": r.name, "human_name": r.human_name} for r in installed_runners]
    _print_subcommand_output({"runners": result})


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
        get_runtime_icon_path_main(
            sys.argv[sys.argv.index("--get-runtime-icon-path") + 1]
        )

    elif "--get-all-games-categories" in sys.argv:
        get_all_games_categories_main()

    elif "--list-games" in sys.argv:
        list_games_main()

    elif "--get-settings" in sys.argv:
        game_slug = None
        runner_slug = None
        if "--game" in sys.argv:
            game_slug = sys.argv[sys.argv.index("--game") + 1]
        if "--runner" in sys.argv:
            runner_slug = sys.argv[sys.argv.index("--runner") + 1]
        get_settings_main(game_slug=game_slug, runner_slug=runner_slug)

    elif "--update-setting" in sys.argv:
        idx = sys.argv.index("--update-setting")
        section = sys.argv[idx + 1]
        key = sys.argv[idx + 2]
        value = sys.argv[idx + 3]
        game_slug = None
        runner_slug = None
        value_type = None
        if "--game" in sys.argv:
            game_slug = sys.argv[sys.argv.index("--game") + 1]
        if "--runner" in sys.argv:
            runner_slug = sys.argv[sys.argv.index("--runner") + 1]
        if "--type" in sys.argv:
            value_type = sys.argv[sys.argv.index("--type") + 1]
        update_setting_main(
            section,
            key,
            value,
            value_type=value_type,
            game_slug=game_slug,
            runner_slug=runner_slug,
        )

    elif "--list-runners" in sys.argv:
        list_runners_main()

    else:
        lutris_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
