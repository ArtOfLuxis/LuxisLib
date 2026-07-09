import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const imitater = ctx.engine.getSystemModule("chunks:///_virtual/Imitater.ts")
        const proto = imitater.ImitaterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntImitate": null,
        })


    })
}