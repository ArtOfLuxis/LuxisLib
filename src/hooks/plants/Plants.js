import {evaluate} from "../../modules/JSONActionsSystem.js";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const projectiles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")
        const proto = plants.Plants.prototype

        plants.plants.SpecificPlantMintDuration = {}

        ctx.unsafe.hooks.wrapMethod({
            target: plants.plants,
            methodName: "loadPlantsInCard",
            handler: ({ args, thisArg, callNext }) => {
                const plantId = args[0]
                const disabledOnly = args[1] === true

                const plantLoad = Promise.resolve(callNext(...args))

                if (disabledOnly) {
                    return plantLoad
                }

                const plantProps = thisArg.getPlantProps(plantId)
                const projectileTypes = plantProps?.LoadProjectilesWithPlant
                if (!projectileTypes || projectileTypes.length === 0) {
                    return plantLoad
                }

                const projectileLoads = projectileTypes.map(type => {
                    if (typeof type !== "string" || type.length === 0) {
                        return Promise.resolve()
                    }

                    if (typeof projectiles.ProjectileEnum[type] !== "number") {
                        console.warn(`Unknown projectile: ${type}`)
                        return Promise.resolve()
                    }

                    return projectiles.projectileRes
                        .loadProjectile(type)
                        .catch((error) => {
                            console.warn(`Failed to load ${type}`, error)
                        })
                })

                return Promise.all([
                    plantLoad,
                    Promise.all(projectileLoads),
                ]).then(([plant]) => plant)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({ args, callNext }) => {
                callNext(...args)

                const deltaTime = args[0]
                const durations = plants.plants.SpecificPlantMintDuration

                for (const [plant, time] of Object.entries(durations)) {
                    const newTime = time - deltaTime

                    if (newTime <= 0) {
                        delete durations[plant]
                    } else {
                        durations[plant] = newTime
                    }
                }
            }
        })
    })
}