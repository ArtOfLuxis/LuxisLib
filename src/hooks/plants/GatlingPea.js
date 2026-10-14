import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gatlingPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GatlingPea.ts")
        const proto = gatlingPea.GatlingPeaPlant.prototype
        const cc = ctx.unsafe.engine.getCc()
        const Vec2 = cc.Vec2

        wrapObjDataOwnPlant(ctx, proto, {
            "NoUpgradeOnPlantFood": null,
            "SpawnWithPFUpgrade": null,
            "GunDirections": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)
                if (thisArg.objdataOwn.SpawnWithPFUpgrade) {
                    thisArg.upgrade();
                }
                if (Array.isArray((thisArg.objdataOwn.GunDirections ?? 0))) {
                    thisArg.gunsDirections = []
                    thisArg.objdataOwn.GunDirections.forEach(function(direction) {
                        thisArg.gunsDirections.push(new Vec2(direction.x ?? 1, direction.y ?? 0))
                    })
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