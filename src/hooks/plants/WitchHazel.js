import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const witchHazel = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WizardHazel.ts")
        const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")
        const proto = witchHazel.WitchHazelPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "NormalTransformPlantList": null,
            "NormalTransformPlantListMint": null,
            "PFTransformPlantList": null,
            "PFTransformPlantListMint": null,
        })

        let pendingTransformList = null

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_magic",
            handler: ({ args, thisArg, callNext }) => {
                const mint = thisArg.MintBoosted
                pendingTransformList = thisArg.fooding
                    ? (mint ?
                        thisArg.objdataOwn.PFTransformPlantListMint :
                        thisArg.objdataOwn.PFTransformPlantList)
                    : (mint ?
                        thisArg.objdataOwn.NormalTransformPlantListMint :
                        thisArg.objdataOwn.NormalTransformPlantList)
                try {
                    return callNext(...args)
                } finally {
                    pendingTransformList = null
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: zombie.Zombie.prototype,
            methodName: "turnIntoSporeShroom",
            handler: ({ args, thisArg, callNext }) => {
                if (pendingTransformList && pendingTransformList.length) {
                    const validType = pendingTransformList.find((type) =>
                        thisArg.inLnC?.putPlantTypeAvailable(false, type, true, true)
                    )


                    if (validType) {
                        return callNext(validType)
                    }
                }
                return callNext(...args)
            }
        })
    })
}