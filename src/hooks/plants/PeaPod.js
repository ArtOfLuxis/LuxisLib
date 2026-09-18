import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaPod = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PeaPod.ts");
        const proto = peaPod.PeaPodPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "MaxPeaHeads": null,
            "ToughnessPerHead": null,
            "HeadsPerReplant": null
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

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replant",
            handler: ({args, thisArg, callNext}) => {
                thisArg.headCount += thisArg.objdataOwn.HeadsPerReplant ?? 1;
                const toughnessBoost = thisArg.objdataOwn.ToughnessPerHead ?? 0;
                if (toughnessBoost)
                {
                    if (typeof toughnessBoost === "number") {
                        thisArg.toughness += toughnessBoost;
                        thisArg.health = thisArg.toughness;
                    }
                    else if (typeof toughnessBoost === "object") {
                        thisArg.toughness += toughnessBoost[thisArg.headCount - 2] ?? 0;
                        thisArg.health = thisArg.toughness;
                    }
                }
            }
        })
    })
}