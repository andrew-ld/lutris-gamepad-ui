module.exports = async function (_context) {
  const builderUtil = require("builder-util");
  const originalExec = builderUtil.exec;

  builderUtil.exec = function (file, args, options) {
    if (file.endsWith("/mksquashfs")) {
      const newFile = "mksquashfs";
      const newArgs = [...args];
      newArgs.push("-comp", "zstd");
      newArgs.push("-Xcompression-level", "7");
      newArgs.push("-b", "1M");
      return originalExec.call(this, newFile, newArgs, options);
    }
    return originalExec.call(this, file, args, options);
  };

  return true;
};
