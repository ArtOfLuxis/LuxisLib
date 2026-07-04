
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaVine = ctx.engine.getSystemModule("chunks:///_virtual/PeaVine.ts")
        const proto = peaVine.PeaVinePlant.prototype

        const plantKeys = {
            "BuffsPeas": null,
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
            methodName: "specialPeashooterUpdate",
            handler: ({thisArg, callOriginal}) => {
                const buffsPeas = thisArg.objdata.BuffsPeas
                if (buffsPeas || buffsPeas === undefined) {
                    callOriginal()
                }
            }
        })

    })
}