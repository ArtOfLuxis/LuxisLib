import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const shadowPeashooter = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ShadowPeashooter.ts")
        const proto = shadowPeashooter.ShadowPeashooterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxShootAnimationCycles": null,
            "NoUpgradeOnPlantFood": null
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
            methodName: "_shootPeaAnimation",
            handler: ({args, thisArg, callNext}) => {
                thisArg.___LuxisLibShootAnimationCycles = 0

                return callNext(...args)
            },
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot",
            handler: ({args, thisArg, callNext}) => {
                const max = thisArg.objdataOwn?.MaxShootAnimationCycles

                if (!thisArg.fooding && typeof max === "number") {
                    const count = thisArg.___LuxisLibShootAnimationCycles ?? 0

                    if (count >= max) {
                        return
                    }

                    thisArg.___LuxisLibShootAnimationCycles = count + 1
                }

                return callNext(...args)
            }
        })


    })
}