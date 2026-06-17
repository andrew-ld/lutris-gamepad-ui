import argparse
import os.path
import json
import runpy
import shutil
import sys
import typing
import inspect
import traceback
import dataclasses

lutris_bin_path = shutil.which("lutris")
lutris_dir_path = os.path.join(os.path.dirname(lutris_bin_path), os.pardir)

sys.path.insert(0, lutris_dir_path)
sys.argv[0] = lutris_bin_path

import gi

gi.require_version("Gtk", "3.0")

from gi.repository import Gtk
from lutris import settings, sysoptions
from lutris.config import LutrisConfig, make_game_config_id
from lutris.database import categories, games
from lutris.database.games import get_game_by_field
from lutris.game import Game
from lutris.runners import import_runner
from lutris.startup import init_lutris
from lutris.runners import get_installed as get_installed_runners
from lutris.services import get_services
from lutris.util.strings import slugify
from lutris.api import read_api_key
from lutris.services.lutris import LutrisService

try:
    from lutris.util.library_sync import LibrarySyncer
except ImportError:
    LibrarySyncer = None

try:
    from lutris.gui.widgets.utils import get_runtime_icon_path
except ImportError:
    get_runtime_icon_path = None

try:
    from lutris.runners import InvalidRunnerError
except ImportError:
    from lutris.runners import InvalidRunner as InvalidRunnerError

SUBCOMMAND_OUTPUT_HEADER = "lutris-subcommand-output:"

IMAGE_EXTENSIONS = ("jpg", "png", "jpeg", "webp")

INTERNAL_COMMAND_ARGUMENTS = (
    "--list-games",
    "--get-settings",
    "--get-new-game-settings",
    "--update-setting",
    "--list-runners",
    "--add-game",
    "--sync-account",
)


@dataclasses.dataclass
class GamesCategoriesData:
    all_games_categories: dict[str | int, list[int]] = dataclasses.field(
        default_factory=dict
    )
    hidden_category_id: int | None = None
    category_id_to_name: dict[int, str] = dataclasses.field(default_factory=dict)


def _print_subcommand_output(json_serializable: typing.Any):
    data = json.dumps(json_serializable, ensure_ascii=True)
    print("\r\n" + SUBCOMMAND_OUTPUT_HEADER + data, end="\r\n")


def _has_internal_command(argv: list[str]) -> bool:
    return any(argument in INTERNAL_COMMAND_ARGUMENTS for argument in argv)


def _build_internal_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    command_group = parser.add_mutually_exclusive_group(required=True)
    command_group.add_argument("--list-games", action="store_true")
    command_group.add_argument("--get-settings", action="store_true")
    command_group.add_argument("--get-new-game-settings", action="store_true")
    command_group.add_argument(
        "--update-setting",
        nargs=3,
        metavar=("SECTION", "KEY", "VALUE"),
    )
    command_group.add_argument("--list-runners", action="store_true")
    command_group.add_argument("--add-game", metavar="PAYLOAD_JSON")
    command_group.add_argument("--sync-account", action="store_true")
    parser.add_argument("--game", dest="game_identifier")
    parser.add_argument("--runner", dest="runner_slug")
    parser.add_argument("--type", dest="value_type")
    return parser


def get_runtime_icons_for_runners(runners: list[str]) -> dict[str, str]:
    if not runners:
        return {}

    result = {}

    for runner in runners:
        if runner:
            icon_path = None
            if get_runtime_icon_path is not None:
                icon_path = get_runtime_icon_path(runner)
            if icon_path:
                result[runner] = icon_path

    return result


def get_service_cover_path(service: str, slug: str) -> str | None:
    if not service or not slug:
        return None

    services = get_services()

    if service not in services:
        return None

    service_class = services[service]()

    possible_medias = []

    for service_media_class in service_class.medias.values():
        service_media = service_media_class()

        if not service_media.size:
            continue

        width, height = service_media.size

        if height < width:
            continue

        tall_ratio = height / width
        service_media_paths = service_media.get_possible_media_paths(slug)

        if not service_media_paths:
            continue

        possible_medias.extend([(p, tall_ratio) for p in service_media_paths])

    possible_medias.sort(key=lambda m: m[1], reverse=True)

    for possible_media, _ in possible_medias:
        if possible_media and possible_media.exists:
            return possible_media.path

    return None


def get_local_cover_path(slug: str) -> str | None:
    if not slug:
        return None

    for ext in IMAGE_EXTENSIONS:
        path = os.path.join(settings.COVERART_PATH, f"{slug}.{ext}")
        if os.path.exists(path):
            return path

    return None


def get_game_cover_path(game: dict[str, typing.Any]) -> str | None:
    try:
        local_cover_path = get_local_cover_path(game.get("slug"))
        if local_cover_path:
            return local_cover_path
    except:
        traceback.print_exc()

    return get_service_cover_path(game.get("service"), game.get("slug"))


def _get_games_categories() -> GamesCategoriesData:
    all_categories = categories.get_categories()

    try:
        all_games_categories = categories.get_all_games_categories()
    except AttributeError:
        all_games_categories = {}

    hidden_category_id = next(
        (c.get("id") for c in all_categories if c.get("name") == ".hidden"), None
    )

    category_id_to_name = {
        c["id"]: c["name"]
        for c in all_categories
        if c.get("name") != ".hidden" and "id" in c
    }

    return GamesCategoriesData(
        all_games_categories=all_games_categories,
        hidden_category_id=hidden_category_id,
        category_id_to_name=category_id_to_name,
    )


def _enrich_game_cover_path(game: dict[str, typing.Any]) -> None:
    cover_path = get_game_cover_path(game)
    if cover_path:
        game["coverPath"] = cover_path


def _enrich_game_runtime_icon(
    game: dict[str, typing.Any], runtime_icons: dict[str, str]
) -> None:
    runner = game.get("runner")
    if runner and runner in runtime_icons:
        game["runtimeIconPath"] = runtime_icons[runner]


def _enrich_game_categories_and_hidden(
    game: dict[str, typing.Any], categories_data: GamesCategoriesData
) -> None:
    game_id = game.get("id")

    category_ids = categories_data.all_games_categories.get(
        str(game_id), categories_data.all_games_categories.get(game_id, [])
    )

    game_categories = [
        categories_data.category_id_to_name[cid]
        for cid in category_ids
        if cid in categories_data.category_id_to_name
    ]

    game["categories"] = game_categories

    if categories_data.hidden_category_id is not None:
        game["hidden"] = categories_data.hidden_category_id in category_ids


def _enrich_game_data(
    game: dict[str, typing.Any],
    runtime_icons: dict[str, str],
    categories_data: GamesCategoriesData,
) -> None:
    try:
        _enrich_game_cover_path(game)
    except:
        traceback.print_exc()

    try:
        _enrich_game_runtime_icon(game, runtime_icons)
    except:
        traceback.print_exc()

    try:
        _enrich_game_categories_and_hidden(game, categories_data)
    except:
        traceback.print_exc()


def list_games_main():
    result = games.get_games(filters={"installed": 1})
    unique_runners = list({game.get("runner") for game in result if game.get("runner")})

    try:
        runtime_icons = get_runtime_icons_for_runners(unique_runners)
    except:
        traceback.print_exc()
        runtime_icons = {}

    try:
        categories_data = _get_games_categories()
    except:
        traceback.print_exc()
        categories_data = GamesCategoriesData()

    for game in result:
        _enrich_game_data(game, runtime_icons, categories_data)

    _print_subcommand_output(result)


def get_config(game_identifier=None, runner_slug=None, config_level=None):
    if game_identifier:
        game = get_game_by_field(game_identifier, "slug") or get_game_by_field(
            game_identifier, "id"
        )
        if not game:
            return None, None
        return (
            LutrisConfig(runner_slug=game["runner"], game_config_id=game["configpath"]),
            game["runner"],
        )
    if config_level == "game":
        return LutrisConfig(runner_slug=runner_slug, level="game"), runner_slug
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


def get_settings_main(game_identifier=None, runner_slug=None, config_level=None):
    init_lutris()
    game_name = None
    if game_identifier:
        game = get_game_by_field(game_identifier, "slug") or get_game_by_field(
            game_identifier, "id"
        )
        if game:
            game_name = game["name"]

    config, r_slug = get_config(game_identifier, runner_slug, config_level)
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
    section, key, value, value_type=None, game_identifier=None, runner_slug=None
):
    init_lutris()
    config, _ = get_config(game_identifier, runner_slug)
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


def apply_settings_payload(config, settings_payload):
    target_attr = f"{config.level}_level"
    target = getattr(config, target_attr)

    for section, options in settings_payload.items():
        if section not in ["system", "runner", "game"] or not isinstance(options, dict):
            continue

        target_section = config.runner_slug if section == "runner" else section
        if target_section not in target:
            target[target_section] = {}

        for key, value in options.items():
            if key:
                target[target_section][key] = value


def add_game_main(payload_json):
    init_lutris()
    payload = json.loads(payload_json)
    name = str(payload.get("name") or "").strip()
    runner_slug = payload.get("runner")

    if not name or not runner_slug:
        sys.exit(1)

    import_runner(runner_slug)

    game_slug = slugify(name)
    config = LutrisConfig(runner_slug=runner_slug, level="game")
    config.game_config_id = make_game_config_id(game_slug)
    apply_settings_payload(config, payload.get("settings") or {})

    game = Game()
    game.name = name
    game.sortname = str(payload.get("sortname") or "")
    game.slug = game_slug
    game.runner_name = runner_slug
    game.is_installed = True

    year = payload.get("year")
    if year is not None and str(year).strip():
        game.year = int(year)
    else:
        game.year = None

    game.config = config
    if "icon" not in game.custom_images:
        game.runner.extract_icon(game_slug)
    game.save()

    _print_subcommand_output(
        {
            "status": "success",
            "game_id": game.id,
            "slug": game.slug,
            "name": game.name,
        }
    )


def list_runners_main():
    installed_runners = get_installed_runners()
    result = [{"name": r.name, "human_name": r.human_name} for r in installed_runners]
    _print_subcommand_output({"runners": result})


def sync_account_main():
    init_lutris()
    credentials = read_api_key()

    if not credentials:
        _print_subcommand_output({"status": "not_connected"})
        return

    if LibrarySyncer is not None:
        LibrarySyncer().sync_local_library()

    service = LutrisService()
    lutris_games = service.load()

    _print_subcommand_output(
        {
            "status": "success",
            "synced_count": len(lutris_games) if lutris_games else 0,
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
    argv = sys.argv[1:]
    if not _has_internal_command(argv):
        lutris_main()
        sys.exit(0)

    parser = _build_internal_argument_parser()
    arguments, _ = parser.parse_known_args(argv)

    if arguments.list_games:
        list_games_main()

    elif arguments.get_settings:
        get_settings_main(
            game_identifier=arguments.game_identifier,
            runner_slug=arguments.runner_slug,
        )

    elif arguments.get_new_game_settings:
        get_settings_main(runner_slug=arguments.runner_slug, config_level="game")

    elif arguments.update_setting:
        section, key, value = arguments.update_setting
        update_setting_main(
            section,
            key,
            value,
            value_type=arguments.value_type,
            game_identifier=arguments.game_identifier,
            runner_slug=arguments.runner_slug,
        )

    elif arguments.list_runners:
        list_runners_main()

    elif arguments.add_game is not None:
        add_game_main(arguments.add_game)

    elif arguments.sync_account:
        sync_account_main()

    sys.exit(0)


if __name__ == "__main__":
    main()
