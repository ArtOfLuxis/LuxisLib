
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const sunbombExplosion = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/sunbombExplosion.ts")

        ctx.unsafe.hooks.wrapMethod({
            target: sunbombExplosion.sunbombExplosion.prototype,
            methodName: "animationListener",
            handler: ({ args, thisArg, callNext }) => {

                thisArg.sunbombProps ??= {}

                thisArg.sunbombProps.PlantBombExplosionRadius ??= 30
                thisArg.sunbombProps.ZombieBombExplosionRadius ??= 80
                thisArg.sunbombProps.PlantDamage ??= 500
                thisArg.sunbombProps.ZombieDamage ??= 500

                return callNext(...args)
            }
        })
    })
}