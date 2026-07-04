
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const redStinger = ctx.engine.getSystemModule("chunks:///_virtual/RedStinger.ts");
        const proto = redStinger.RedStingerPlant.prototype;

        const plantKeys = {
            "SecondStageColumns": [4, 5, 6],
            "ThirdStageColumns": [7, 8, 9],
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                if (value) {
                    Object.entries(plantKeys).forEach(([prop, value]) => {
                        if (thisArg[prop] === undefined) thisArg[prop] = value
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnSquareChange",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal()

                const tile = args[1]
                const column = tile.cIndex + 1;

                if (thisArg.objdata.ThirdStageColumns?.includes(column)) {
                    thisArg.inArea = 2;
                } else if (thisArg.objdata.SecondStageColumns?.includes(column)) {
                    thisArg.inArea = 1;
                } else {
                    thisArg.inArea = 0;
                }
            }
        })

    })
}