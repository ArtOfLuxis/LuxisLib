import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const seller = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/StoreCostumeSeller.ts")
        const proto = seller.StoreCostumeSeller.prototype;

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "start",
            isStatic: false,
            handler({args, thisArg, callNext}) {
                callNext(...args);
                thisArg.cost = libProperties?.BaseCostumeCost ?? 3000
            }
        });
    })
}