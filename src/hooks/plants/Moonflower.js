import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const moonflower = ctx.engine.getSystemModule("chunks:///_virtual/Moonflower.ts")
        const proto = moonflower.MoonflowerPlant.prototype

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