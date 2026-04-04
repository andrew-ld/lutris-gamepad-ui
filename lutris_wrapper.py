import os.path
import json
import runpy
import shutil
import sys
import time
import typing
from inspect import signature

sys.path.insert(0, os.path.dirname(os.path.abspath(__import__("lutris").__file__)))

import gi

gi.require_version("Gtk", "3.0")

from gi.repository import Gtk
from lutris import settings, sysoptions
from lutris.config import LutrisConfig, make_game_config_id
from lutris.database import categories, games
from lutris.database.games import get_game_by_field
from lutris.gui.widgets.utils import get_runtime_icon_path
from lutris.services.lutris import download_lutris_media
from lutris.runners import import_runner
from lutris.startup import init_lutris
from lutris.runners import get_installed as get_installed_runners
from lutris.util.strings import slugify

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
        sig = signature(source)
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
                name: [format_option(o, vals) for o in meta] for name, meta, vals in sections
            },
            "tabs": [
                {"id": "game_info", "label": "Game info", "kind": "game_info"},
                {
                    "id": "game",
                    "label": "Game options",
                    "kind": "options",
                    "section": "game",
                },
            ],
            "game_info_fields": [
                {"key": "name", "label": "Name", "type": "string"},
                {"key": "sortname", "label": "Sort name", "type": "string"},
                {"key": "runner", "label": "Runner", "type": "choice"},
                {"key": "slug", "label": "Identifier", "type": "string"},
                {"key": "year", "label": "Release year", "type": "string"},
                {"key": "directory", "label": "Directory", "type": "path"},
            ],
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


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ["1", "true", "yes", "on"]
    return bool(value)


def _prepare_slug(name, slug):
    candidate = slugify((slug or "").strip())

    if not candidate:
        candidate = slugify(name)

    if not candidate:
        candidate = "local-game"

    existing = get_game_by_field(candidate, "slug")
    if not existing:
        return candidate

    index = 2
    while True:
        next_candidate = f"{candidate}-{index}"
        if not get_game_by_field(next_candidate, "slug"):
            return next_candidate
        index += 1


def _set_config_section_values(config_section, values):
    for key, value in values.items():
        config_section[key] = value


def create_local_game_main(payload_json):
    init_lutris()

    payload = json.loads(payload_json)
    name = str(payload.get("name", "")).strip()

    if not name:
        raise ValueError("name is required")

    runner_slug = str(payload.get("runner", "")).strip()
    if not runner_slug:
        raise ValueError("runner is required")

    slug = _prepare_slug(name, payload.get("slug"))
    config_id = make_game_config_id(slug)
    sortname = str(payload.get("sortname", "")).strip() or name
    year = payload.get("year")
    directory = str(payload.get("directory", "")).strip()
    options = payload.get("options") or {}

    game_options = options.get("game") or {}
    runner_options = options.get("runner") or {}
    system_options = options.get("system") or {}

    config = LutrisConfig(runner_slug=runner_slug, game_config_id=config_id)

    if directory:
        game_options["directory"] = directory

    _set_config_section_values(config.raw_game_config, game_options)
    _set_config_section_values(config.raw_runner_config, runner_options)
    _set_config_section_values(config.raw_system_config, system_options)
    config.save()

    game_data = {
        "name": name,
        "slug": slug,
        "runner": runner_slug,
        "installed": 1,
        "configpath": config_id,
        "updated": int(time.time()),
    }

    if sortname:
        game_data["sortname"] = sortname

    if year is not None and str(year).strip() != "":
        game_data["year"] = int(str(year).strip())

    if directory:
        game_data["directory"] = directory

    created = games.add_game(**game_data)

    try:
        download_lutris_media(slug)
    except Exception:
        pass

    _print_subcommand_output(
        {
            "status": "success",
            "id": created,
            "slug": slug,
        }
    )


def browse_path_main(path):
    requested_path = path or os.path.expanduser("~")
    absolute_path = os.path.abspath(os.path.expanduser(requested_path))

    if not os.path.exists(absolute_path):
        raise ValueError("path does not exist")

    if os.path.isfile(absolute_path):
        _print_subcommand_output(
            {
                "path": absolute_path,
                "parent": os.path.dirname(absolute_path),
                "entries": [],
            }
        )
        return

    entries = []
    for name in sorted(os.listdir(absolute_path), key=lambda value: value.lower()):
        full_path = os.path.join(absolute_path, name)
        entry_type = "directory" if os.path.isdir(full_path) else "file"
        entries.append({"name": name, "path": full_path, "type": entry_type})

    _print_subcommand_output(
        {
            "path": absolute_path,
            "parent": os.path.dirname(absolute_path),
            "entries": entries,
        }
    )


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

    elif "--create-local-game" in sys.argv:
        payload_json = sys.argv[sys.argv.index("--create-local-game") + 1]
        create_local_game_main(payload_json)

    elif "--browse-path" in sys.argv:
        path = sys.argv[sys.argv.index("--browse-path") + 1]
        browse_path_main(path)

    else:
        lutris_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
