import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gloomVine = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GloomVine.ts");
        const proto = gloomVine.GloomVinePlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntShadowBoost": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdateForce",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdataOwn.DoesntShadowBoost !== true) {
                    callNext(...args)
                }
            }
        })


    })
}