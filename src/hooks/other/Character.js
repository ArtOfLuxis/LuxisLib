
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const character = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = character.Character.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "followShade",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

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