import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const noctarine = ctx.engine.getSystemModule("chunks:///_virtual/Noctarine.ts");
        const proto = noctarine.NoctarinePlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntShadowBoost": null,
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "explode",
            handler: ({thisArg, callOriginal}) => {
                callOriginal()

                if (thisArg.objdataOwn.DoesntShadowBoost === true) {
                    thisArg.inLnC.get3x3().forEach(function (LnC) {
                        LnC.shadowCD = 0
                    });
                }
            }
        })


    })
}