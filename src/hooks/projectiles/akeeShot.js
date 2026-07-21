import {projectileWrapHits} from "./commonShot";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const akeeShot = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/akeeShot.ts")
        const proto = akeeShot.akeeShot.prototype

        projectileWrapHits(ctx, proto)
    })
}