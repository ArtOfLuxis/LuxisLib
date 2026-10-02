import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const slingPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SlingPea.ts")
        const proto = slingPea.SlingPeaPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "NoUpgradeOnPlantFood": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "upgrade",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdataOwn.NoUpgradeOnPlantFood === true) {
                    return
                }

                return callNext(...args)
            }
        })


    })
}