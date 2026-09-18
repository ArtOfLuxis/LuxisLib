import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const duskLobber = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/DuskLobber.ts")
        const proto = duskLobber.DuskLobberPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "CabbageTypeShadow": null,
            "CabbageTypePlantfoodShadow": null,
        })

        ;[
            "_lobAtZombie",
            "_lobAtTomb",
            "_lobAtNode"
        ].forEach(method => {
            ctx.unsafe.hooks.wrapMethod({
                target: proto,
                methodName: method,
                handler: ({args, thisArg, callNext}) => {
                    const shadowProjectile = thisArg._objdataOwn.CabbageTypeShadow
                    const shadowPfProjectile = thisArg._objdataOwn.CabbageTypePlantfoodShadow
                    if (!thisArg.ShadowPowered || (thisArg.fooding && !shadowPfProjectile) || (!thisArg.fooding && !shadowProjectile)) {
                        return callNext(...args)
                    }

                    const type = thisArg.fooding ?
                        ["CabbageTypePlantfood", shadowPfProjectile] :
                        ["CabbageType", shadowProjectile]

                    const old = thisArg._objdataOwn[type[0]]
                    try {
                        thisArg._objdataOwn[type[0]] = type[1]
                        callNext(...args)
                    } finally {
                        thisArg._objdataOwn[type[0]] = old
                    }
                }
            })
        })


    })
}