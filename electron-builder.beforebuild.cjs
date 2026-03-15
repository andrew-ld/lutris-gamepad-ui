module.exports = async function beforeBuild(_context) {
  const builderUtil = require("builder-util");
  const originalExec = builderUtil.exec;

  builderUtil.exec = function (file, arguments_, options) {
    if (file.endsWith("/mksquashfs")) {
      const newFile = "mksquashfs";
      const newArguments = [
        ...arguments_,
        "-comp",
        "zstd",
        "-Xcompression-level",
        "7",
        "-b",
        "1M",
      ];
      return originalExec.call(this, newFile, newArguments, options);
    }
    return originalExec.call(this, file, arguments_, options);
  };

  return true;
};
