import {wrapObjDataOwnPlant} from "./Plant";


export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaVine = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PeaVine.ts")
        const proto = peaVine.PeaVinePlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "BuffsPeas": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPeashooterUpdate",
            handler: ({args, thisArg, callNext}) => {
                const buffsPeas = thisArg.objdataOwn.BuffsPeas
                if (buffsPeas || typeof buffsPeas !== "boolean") {
                    callNext(...args)
                }
            }
        })

    })
}