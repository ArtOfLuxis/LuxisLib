import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const shineVine = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ShineVine.ts")
        const proto = shineVine.ShineVinePlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "BuffsSunProduction": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdate",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)
                const buffsSunProduction = thisArg.objdataOwn.BuffsSunProduction
                if (buffsSunProduction === false) {
                    thisArg.plantInLnC.ShineVineBuffCD = 0
                }
            }
        })

    })
}