import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peashooter = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Peashooter.ts")
        const proto = peashooter.PeashooterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxShootAnimationCycles": null,
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

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shotInitialize",
            handler: ({args, thisArg, callNext}) => {
                const proj = args[0]
                const maxShootAnimationCycles = thisArg.objdataOwn?.MaxShootAnimationCycles
                if (!thisArg.fooding && typeof maxShootAnimationCycles === "number") {
                    if ((thisArg.___LuxisLibShootAnimationCycles ??= 0) >= maxShootAnimationCycles) {
                        proj.fade()
                        return
                    }
                    thisArg.___LuxisLibShootAnimationCycles += 1
                }
                callNext(...args)
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "playShootAnm",
            handler: ({args, thisArg, callNext}) => {
                thisArg.___LuxisLibShootAnimationCycles = 0
                callNext(...args)
            }
        })
    })
}