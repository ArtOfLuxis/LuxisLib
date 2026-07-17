import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const threepeater = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ThreePeater.ts")
        const proto = threepeater.ThreePeaterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "ExtraSidePeas": false,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shootPeaAnimation",
            handler: ({args, thisArg, callNext}) => {
                if (!thisArg.objdataOwn.ExtraSidePeas)
                    return callNext(...args)

                const e = Math.max(1 / thisArg.shootCD, 1)
                thisArg.anmControl.playAnimation("Shoot111", 1, thisArg._cdScale * 0.1, e)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot3",
            handler: ({args, thisArg, callNext}) => {
                if (!thisArg.objdataOwn.ExtraSidePeas)
                    return callNext(...args)

                let [laneDir, vecCords, pea] = args

                if (thisArg.lIndex === 0 && laneDir === 0) {
                    thisArg.scheduleOnce(() => {
                        callNext(1, vecCords, pea)
                    }, 0.1)
                    return
                }

                if (thisArg.lIndex === 4 && laneDir === 2) {
                    thisArg.scheduleOnce(() => {
                        callNext(1, vecCords, pea)
                    }, 0.1)
                    return
                }

                return callNext(laneDir, vecCords, pea)
            }
        })

    })
}