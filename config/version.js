// BIST Radar Pro - merkezi sürüm bilgisi
export const APP_NAME = "BIST Radar Pro";
export const APP_VERSION = "17.0.1";
export const APP_LABEL = `${APP_NAME} v${APP_VERSION}`;

if (typeof window !== "undefined") {
  window.BRP_VERSION = APP_VERSION;
  window.BRP_APP_LABEL = APP_LABEL;
}
