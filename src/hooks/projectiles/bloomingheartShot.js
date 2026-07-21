import {projectileWrapHits} from "./commonShot";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const bloomingheartShot = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/bloomingheartShot.ts")
        const proto = bloomingheartShot.bloomingheartShot.prototype

        projectileWrapHits(ctx, proto)
    })
}