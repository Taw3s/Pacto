import { Config } from "@remotion/cli/config";

// Sprites and screenshots are pixel-exact PNGs: keep them lossless until the final encode.
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(16);
if (process.env.CHROMIUM_PATH) Config.setBrowserExecutable(process.env.CHROMIUM_PATH);
