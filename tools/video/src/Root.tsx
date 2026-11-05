import { Composition } from "remotion";
import "./fonts.css";
import { DURATION, FPS, Presentation } from "./Video";

export function Root() {
  return (
    <>
      <Composition id="Apoiase" component={Presentation} durationInFrames={DURATION.support} fps={FPS} width={1920} height={1080} defaultProps={{ format: "h" as const, support: true }} />
      <Composition id="WhatsApp" component={Presentation} durationInFrames={DURATION.plain} fps={FPS} width={1080} height={1920} defaultProps={{ format: "v" as const, support: false }} />
    </>
  );
}
