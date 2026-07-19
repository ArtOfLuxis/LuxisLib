import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const projectiles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")

        let id = Object.entries(projectiles.ProjectileEnum).length / 2

        libProperties?.ProjectileEnumAdd?.forEach((projectile) => {
            if (!Object.keys(projectiles.ProjectileEnum).includes(projectile)) {
                projectiles.ProjectileEnum[projectile] = id
                projectiles.ProjectileEnum[id] = projectile
                id++
            }
        })

        ctx.events.emit("luxislib:projectile_enum")
    })
}