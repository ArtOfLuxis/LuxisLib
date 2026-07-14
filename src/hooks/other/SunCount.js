import { libProperties } from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const sunCount = ctx.engine.getSystemModule("chunks:///_virtual/SunCount.ts")
        const levelController = ctx.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const proto = sunCount.SunCount.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "SunAdd",
            handler: ({ args, thisArg, callOriginal }) => {
                let [amount = 0, updateTarget = true] = args

                const maxSun =
                    levelController.LevelPlay.component?.MaxSunAmount ??
                    libProperties?.MaxSunAmount ??
                    9900;

                thisArg.CurrentValue = Math.min(thisArg.CurrentValue + amount, maxSun)
                thisArg.JudgeCardAffordable()

                if (updateTarget) {
                    thisArg.TargetValue = thisArg.CurrentValue
                }
            }
        });
    });
}