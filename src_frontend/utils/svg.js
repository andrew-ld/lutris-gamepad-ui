export function renderSvgToDataURL(svgString, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, width, height);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    });

    img.addEventListener("error", (error) => {
      reject(error);
    });

    img.src = svgString;
  });
}
