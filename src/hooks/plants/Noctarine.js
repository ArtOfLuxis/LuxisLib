import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const noctarine = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Noctarine.ts")
        const proto = noctarine.NoctarinePlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntShadowBoost": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "explode",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                if (thisArg.objdataOwn.DoesntShadowBoost === true) {
                    thisArg.inLnC.get3x3().forEach(function (LnC) {
                        LnC.shadowCD = 0
                    });
                }
            }
        })


    })
}