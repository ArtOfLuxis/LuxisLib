import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const splitPea = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SplitPea.ts");
        const proto = splitPea.SplitPeaPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "AlwaysShootsBack": null,
            "AlwaysShootsFront": null
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemySplit",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)

                if (result === 1 && thisArg.objdataOwn.AlwaysShootsBack) return 3
                if (result === 2 && thisArg.objdataOwn.AlwaysShootsFront) return 3

                return result
            }
        })


    })
}