import { FontConfigExtension, FontFamily, FontStyle, FontWeight, type FontConfig } from "@blocksuite/blocks";

const interUrl = new URL("../../node_modules/@toeverything/theme/fonts/inter/Inter-VariableFont_slnt,wght.ttf", import.meta.url).href;
const kalamLightUrl = new URL("../../node_modules/@toeverything/theme/fonts/kalam/Kalam-Light.ttf", import.meta.url).href;
const kalamRegularUrl = new URL("../../node_modules/@toeverything/theme/fonts/kalam/Kalam-Regular.ttf", import.meta.url).href;
const kalamBoldUrl = new URL("../../node_modules/@toeverything/theme/fonts/kalam/Kalam-Bold.ttf", import.meta.url).href;

// BlockSuite строит список начертаний по отдельным FontFace, а не диапазону веса CSS
const canvasFonts: FontConfig[] = [
  ...[FontWeight.Light, FontWeight.Regular, FontWeight.SemiBold].map((weight) => ({
    font: FontFamily.Inter, url: interUrl, weight, style: FontStyle.Normal,
  })),
  { font: FontFamily.Kalam, url: kalamLightUrl, weight: FontWeight.Light, style: FontStyle.Normal },
  { font: FontFamily.Kalam, url: kalamRegularUrl, weight: FontWeight.Regular, style: FontStyle.Normal },
  { font: FontFamily.Kalam, url: kalamBoldUrl, weight: FontWeight.SemiBold, style: FontStyle.Normal },
];

export const canvasFontsExtension = FontConfigExtension(canvasFonts);
