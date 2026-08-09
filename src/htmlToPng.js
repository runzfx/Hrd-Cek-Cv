export async function downloadNodeAsPng(node, filename, { backgroundColor = "#15131e" } = {}) {
  if (!node) return;
  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(node, {
    backgroundColor,
    scale: 2,
    useCORS: true,
  });

  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}
