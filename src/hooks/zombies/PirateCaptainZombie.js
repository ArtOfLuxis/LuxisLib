
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const pirateCaptainZombie =
            ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PirateCaptainZombie.ts")
        const proto = pirateCaptainZombie.PirateCaptainZombie.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "createParrot",
            handler: async ({ args, callNext, thisArg }) => {
                try {
                    await callNext(...args)
                } catch (e) {
                    thisArg.haveParrot = false
                }
            }
        })
    })
}