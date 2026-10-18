import {wrapObjDataOwnPlant} from "./Plant";


export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const parsnip = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Parsnip.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = parsnip.ParsnipPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "TileRange": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnSquareChange",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)
                if (thisArg.objdataOwn.TileRange) {
                    thisArg.detector = characterManager.Rectangle.createRectangleNodeSide(
                        args[1].node, thisArg.objdataOwn.TileRange * square.Square.SquareWidth, square.Square.SquareHeight
                    )
                }
            }
        })

    })
}