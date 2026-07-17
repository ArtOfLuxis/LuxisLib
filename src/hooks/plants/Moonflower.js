import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const moonflower = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Moonflower.ts")
        const proto = moonflower.MoonflowerPlant.prototype

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