import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const zombies = ctx.engine.getSystemModule("chunks:///_virtual/Zombies.ts")

        let id = zombies.ZombieEnum.zombieAmount

        delete zombies.ZombieEnum[zombies.ZombieEnum.zombieAmount]
        delete zombies.ZombieEnum.zombieAmount

        libProperties.ZombieEnumAdd.forEach((zombie) => {
            if (!Object.keys(zombies.ZombieEnum).includes(zombie)) {
                zombies.ZombieEnum[zombie] = id
                zombies.ZombieEnum[id] = zombie
                id++
            }
        })

        zombies.ZombieEnum["zombieAmount"] = id
        zombies.ZombieEnum[id] = "zombieAmount"

        ctx.events.emit("luxislib:zombie_enum")

    })
}