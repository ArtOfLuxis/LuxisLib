import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peashooter = ctx.engine.getSystemModule("chunks:///_virtual/Peashooter.ts")
        const proto = peashooter.PeashooterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxShootAnimationCycles": null
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "shotInitialize",
            handler: ({args, thisArg, callOriginal}) => {
                const proj = args[0]
                const maxShootAnimationCycles = thisArg.objdataOwn.MaxShootAnimationCycles
                if (thisArg._foodLeftPeaCount === 0 && typeof maxShootAnimationCycles === "number") {
                    if ((thisArg.___LuxisLibShootAnimationCycles ??= 0) >= maxShootAnimationCycles) {
                        proj.fade()
                        return
                    }
                    thisArg.___LuxisLibShootAnimationCycles += 1
                }
                callOriginal()
            }
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "startShooting",
            handler: ({args, thisArg, callOriginal}) => {
                thisArg.___LuxisLibShootAnimationCycles = 0
                callOriginal()
            }
        })
    })
}