
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const noctarine = ctx.engine.getSystemModule("chunks:///_virtual/Noctarine.ts");
        const proto = noctarine.NoctarinePlant.prototype;

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
            methodName: "explode",
            handler: ({thisArg, callOriginal}) => {
                callOriginal()

                if (thisArg.objdata.DoesntShadowBoost === true) {
                    console.log(thisArg.inLnC)
                    thisArg.inLnC.get3x3().forEach(function (LnC) {
                        LnC.shadowCD = 0
                    });
                }
            }
        })


    })
}