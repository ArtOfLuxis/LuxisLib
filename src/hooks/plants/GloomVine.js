import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gloomVine = ctx.engine.getSystemModule("chunks:///_virtual/GloomVine.ts");
        const proto = gloomVine.GloomVinePlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntShadowBoost": null,
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdateForce",
            handler: ({args, thisArg, callOriginal}) => {
                if (thisArg.objdataOwn.DoesntShadowBoost !== true) {
                    callOriginal(...args)
                }
            }
        })


    })
}