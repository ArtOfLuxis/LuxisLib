import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const redStinger = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/RedStinger.ts");
        const proto = redStinger.RedStingerPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "SecondStageColumns": [4, 5, 6],
            "ThirdStageColumns": [7, 8, 9],
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnSquareChange",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const tile = args[1]
                const column = tile.cIndex + 1;

                if (thisArg.objdataOwn.ThirdStageColumns?.includes(column)) {
                    thisArg.inArea = 2;
                } else if (thisArg.objdataOwn.SecondStageColumns?.includes(column)) {
                    thisArg.inArea = 1;
                } else {
                    thisArg.inArea = 0;
                }
            }
        })

    })
}