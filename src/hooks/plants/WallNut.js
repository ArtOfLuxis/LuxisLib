import {normalSmashOverride, wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const wallnut = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WallNut.ts")
        const proto = wallnut.WallNutPlant.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "normalSmash",
            handler: ({args, thisArg, callNext}) => {
                normalSmashOverride(args, thisArg, callNext)
            }
        })
    })
}