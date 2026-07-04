
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const threepeater = ctx.engine.getSystemModule("chunks:///_virtual/ThreePeater.ts");
        const proto = threepeater.ThreePeaterPlant.prototype;

        const plantKeys = {
            "ExtraSidePeas": false,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                if (value) {
                    Object.entries(plantKeys).forEach(([prop, value]) => {
                        if (thisArg[prop] === undefined) thisArg[prop] = value
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "_shootPeaAnimation",
            handler: ({thisArg, callOriginal}) => {
                if (!thisArg.objdata.ExtraSidePeas)
                    return callOriginal()

                const e = Math.max(1 / thisArg.shootCD, 1);
                thisArg.anmControl.playAnimation("Shoot111", 1, thisArg._cdScale * 0.1, e);
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot3",
            handler: ({args, thisArg, callOriginal}) => {
                if (!thisArg.objdata.ExtraSidePeas)
                    return callOriginal(...args)

                let [laneDir, vecCords, pea] = args;

                //lane 0, up pea
                if (thisArg.lIndex === 0 && laneDir === 0) {
                    thisArg.scheduleOnce(() => {
                        callOriginal(1, vecCords, pea);
                    }, 0.1);
                    return;
                }

                //lane 4, down pea
                if (thisArg.lIndex === 4 && laneDir === 2) {
                    thisArg.scheduleOnce(() => {
                        callOriginal(1, vecCords, pea);
                    }, 0.1);
                    return;
                }

                return callOriginal(laneDir, vecCords, pea);
            }
        })

    })
}