import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peanut = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Peanut.ts")
        const proto = peanut.PeanutPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "PeaTypeSemi": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot",
            handler: ({args, thisArg, callNext}) => {
                const peaTypeSemi = thisArg.objdataOwn.PeaTypeSemi

                const originalPea = args[2]
                if (!originalPea && peaTypeSemi && thisArg.hurtStage >= 2) {
                    args[2] = peaTypeSemi
                }

                callNext(...args)
            }
        })


    })
}