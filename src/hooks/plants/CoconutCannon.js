import {evaluate} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const coconutCannon = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CoconutCannon.ts");
        const proto = coconutCannon.CoconutCannonPlant.prototype;

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "replant",
            isStatic: false,
            handler({args, thisArg, callNext}) {
                callNext(...args);
                const wallAidOverride = thisArg.objdataOwn.WallnutAidOverride;
                if (wallAidOverride) {
                    thisArg.health = thisArg.toughness * (wallAidOverride.HealPercent ?? 1.0);
                    if (wallAidOverride.RestTimeRestore && thisArg.sleepCD > 0) {
                        thisArg.sleepCD = 0.01;
                    }
                }
            }
        });
    })
}