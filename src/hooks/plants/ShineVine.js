import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const shineVine = ctx.engine.getSystemModule("chunks:///_virtual/ShineVine.ts")
        const proto = shineVine.ShineVinePlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "BuffsSunProduction": null,
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdate",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)
                const buffsSunProduction = thisArg.objdataOwn.BuffsSunProduction
                if (buffsSunProduction === false) {
                    thisArg.plantInLnC.ShineVineBuffCD = 0
                }
            }
        })

    })
}