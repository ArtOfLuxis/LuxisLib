import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const nightshade = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NightShade.ts")
        const proto = nightshade.NightShadePlant.prototype;

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replant",
            isStatic: false,
            handler({args, thisArg, callNext}) {
                callNext(...args);
                const wallAidOverride = thisArg.objdataOwn.WallnutAidOverride;
                if (wallAidOverride) {
                    thisArg.health = thisArg.toughness * (wallAidOverride.HealPercent ?? 1.0);
                    if (wallAidOverride.NightshadeLeafRestore) {
                        thisArg.leftPRJCount = thisArg.objdataOwn.MaxProjectiles;
                        thisArg.setPRJSlots();
                    }
                }
            }
        });
    })
}