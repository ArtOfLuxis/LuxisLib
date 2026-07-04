
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gloomVine = ctx.engine.getSystemModule("chunks:///_virtual/GloomVine.ts");
        const proto = gloomVine.GloomVinePlant.prototype;

        const plantKeys = {
            "DoesntShadowBoost": null,
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
            methodName: "specialPlantUpdateForce",
            handler: ({thisArg, callOriginal}) => {
                if (thisArg.objdata.DoesntShadowBoost !== true) {
                    callOriginal()
                }
            }
        })


    })
}