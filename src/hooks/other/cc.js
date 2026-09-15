
export function init(ctx) {
    ctx.events.on("engine:ready", async () => {
        const cc = ctx.unsafe.engine.getCc()

        const maxDeltaTime = async () =>
            1 / (await ctx.settings.get("deltaTimeThreshold") ?? 0)

        ctx.unsafe.hooks.wrapMethod({
            target: cc.director,
            methodName: "tick",
            handler: async ({args, thisArg, callNext}) => {
                if (typeof args[0] === "number") {
                    args[0] = Math.min(args[0], await maxDeltaTime())
                }

                return callNext(...args)
            }
        })
    })
}