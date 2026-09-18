import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const bloomerang = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Bloomerang.ts")
        const proto = bloomerang.BloomerangPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "BoomerangTypePlantfood": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot",
            handler: ({args, thisArg, callNext}) => {
                const pfProjectile = thisArg._objdataOwn.BoomerangTypePlantfood
                if (!thisArg.fooding || !pfProjectile) {
                    return callNext(...args)
                }

                const old = thisArg._objdataOwn.BoomerangType
                try {
                    thisArg._objdataOwn.BoomerangType = pfProjectile
                    callNext(...args)
                } finally {
                    thisArg._objdataOwn.BoomerangType = old
                }
            }
        })


    })
}