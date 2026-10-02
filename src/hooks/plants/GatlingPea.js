import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gatlingPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GatlingPea.ts")
        const proto = gatlingPea.GatlingPeaPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "NoUpgradeOnPlantFood": null,
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