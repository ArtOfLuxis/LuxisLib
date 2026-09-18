import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const vamp = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Vamporcini.ts")
        const proto = vamp.VamporciniPlant.prototype;

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replant",
            isStatic: false,
            handler({args, thisArg, callNext}) {
                callNext(...args);
                const wallAidOverride = thisArg.objdataOwn.WallnutAidOverride;
                if (wallAidOverride) {
                    thisArg.health = thisArg.toughness * (wallAidOverride.HealPercent ?? 1.0);
                    if (wallAidOverride.VamporciniAbsorbRestore) {
                        thisArg.absorbStartable = true;
                        if (thisArg.absorbing) thisArg.absorbEnd();
                    }
                }
            }
        });
    })
}