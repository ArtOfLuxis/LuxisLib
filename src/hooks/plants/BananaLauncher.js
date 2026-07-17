import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const bananaLauncher = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/BananaLauncher.ts")
        const zombiePool = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const projectile = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const character = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const proto = bananaLauncher.BananaLauncherPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "BananasPerPFAnimation": null,
            "MaxPFAnimationCycles": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "animationListener",
            handler: ({args, thisArg, callNext}) => {
                const animation = args[0]
                const maxCycles = thisArg._objdataOwn.MaxPFAnimationCycles

                if (animation.name !== "drop" || !maxCycles) return callNext(...args)

                const currentCycles = thisArg.___LuxisLibBananaPFCycles ?? 0
                if (currentCycles >= maxCycles.amount) {
                    if (maxCycles.forceEndFooding)
                        thisArg.anmControl.playAnimation("foodEnd", 1)
                    return
                }
                thisArg.___LuxisLibBananaPFCycles = currentCycles + 1

                if (typeof thisArg._objdataOwn.BananasPerPFAnimation !== "number") return callNext(...args)

                for (let i = 0; i < thisArg._objdataOwn.BananasPerPFAnimation; i++) {
                    let target = zombiePool.ZombiePool.inLawnPool()
                        .sort(() => Math.random() - 0.5)
                        .find(z => !thisArg.foodedLnC.includes(z.inLnC))
                        ?.inLnC;

                    target ??=
                        square.Square.getAllLnC()
                            .sort(() => Math.random() - 0.5)
                            .find(lnc => !thisArg.foodedLnC.includes(lnc))

                    target ??= square.Square.getRandomLnC()

                    projectile.ProjectileShootingFunctions.throwOneBananaOnNode(
                        thisArg._objdataOwn.BananaType,
                        target.plantPoint,
                        1000,
                        target.inLane.prjLayer,
                        12,
                        character.CharacterType.zombie,
                        thisArg.MintBoosted
                    )
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantFoodEnd",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)
                thisArg.___LuxisLibBananaPFCycles = 0
            }
        })


    })
}