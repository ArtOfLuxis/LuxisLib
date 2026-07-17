import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaPod = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PeaPod.ts");
        const proto = peaPod.PeaPodPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxPeaHeads": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replantable",
            handler: ({args, thisArg, callNext}) => {
                const maxPeaHeads = thisArg.objdataOwn.MaxPeaHeads
                return callNext(...args) &&
                    (typeof maxPeaHeads !== "number" || thisArg.headCount < maxPeaHeads)
            }
        })


    })
}