
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const shineVine = ctx.engine.getSystemModule("chunks:///_virtual/ShineVine.ts")
        const proto = shineVine.ShineVinePlant.prototype

        const plantKeys = {
            "BuffsSunProduction": null,
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
            methodName: "specialPlantUpdate",
            handler: ({thisArg, callOriginal}) => {
                callOriginal()
                const buffsSunProduction = thisArg.objdata.BuffsSunProduction
                if (buffsSunProduction === false) {
                    thisArg.plantInLnC.ShineVineBuffCD = 0
                }
            }
        })

    })
}