import {normalSmashOverride} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const endurian = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Endurian.ts")
        const proto = endurian.EndurianPlant.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "normalSmash",
            handler: ({args, thisArg, callNext}) => {
                normalSmashOverride(args, thisArg, callNext)
            }
        })
    })
}