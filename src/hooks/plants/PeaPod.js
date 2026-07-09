import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaPod = ctx.engine.getSystemModule("chunks:///_virtual/PeaPod.ts");
        const proto = peaPod.PeaPodPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxPeaHeads": null,
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "replantable",
            handler: ({args, thisArg, callOriginal}) => {
                const maxPeaHeads = thisArg.objdataOwn.MaxPeaHeads
                return callOriginal(...args) &&
                    (typeof maxPeaHeads !== "number" || thisArg.headCount < maxPeaHeads)
            }
        })


    })
}