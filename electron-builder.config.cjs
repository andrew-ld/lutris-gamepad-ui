const fs = require("fs");
const path = require("path");

const localeDir = path.join(__dirname, "src_frontend/locale");
const localeFiles = fs.existsSync(localeDir) ? fs.readdirSync(localeDir) : [];

const electronLanguages = localeFiles
    .filter((f) => f.startsWith("locale.") && f.endsWith(".json"))
    .map((f) => f.split(".")[1]);

electronLanguages.push("en-US")

module.exports = {
    appId: 'com.electron.${name}',
    productName: 'lutris gamepad ui',
    electronLanguages: electronLanguages,
    files: [
        'dist/**/*',
        'electron.cjs',
        'electron_preload.cjs',
        'package.json',
        'lutris_wrapper.sh',
        'lutris_wrapper.py',
        'src_backend/**/*',
        '!node_modules/**/{test,tests,example,examples,doc,docs}/**/*'
    ],
    asarUnpack: ['lutris_wrapper.sh', 'lutris_wrapper.py', 'electron_preload.cjs'],
    directories: { output: 'release' },
    linux: {
        target: 'AppImage',
        category: 'game',
        icon: 'src_frontend/resources/icon.svg'
    }
}
