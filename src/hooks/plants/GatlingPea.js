import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gatlingPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GatlingPea.ts")
        const proto = gatlingPea.GatlingPeaPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "NoUpgradeOnPlantFood": null,
            "SpawnWithPFUpgrade": null
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)
                if (thisArg.objdataOwn.SpawnWithPFUpgrade) {
                    thisArg.upgrade();
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "gunup",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdataOwn.NoUpgradeOnPlantFood === true) {
                    return
                }

                return callNext(...args)
            }
        })


    })
}