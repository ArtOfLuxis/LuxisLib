
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const character = ctx.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = character.Character.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "followShade",
            handler: ({ thisArg, callOriginal }) => {
                callOriginal();

                const offset = thisArg.objdataOwn?.WorldPositionOffset;
                if (!offset || !thisArg.shade) return

                thisArg.shade.node.worldPosition =
                    thisArg.shade.node.worldPosition.clone().add3f(
                        0,
                        (offset.shade ?? 0) * square.Square.SquareHeight,
                        0
                    )
            }
        })

    })
}