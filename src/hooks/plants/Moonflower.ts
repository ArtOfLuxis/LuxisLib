import {wrapObjDataOwnPlant} from "./Plant";
import {GPNContext} from "../../tsclasses/api.ts";

export function init(ctx: GPNContext) {
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