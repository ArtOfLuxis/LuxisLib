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

        ctx.hooks.wrapMethod({
            target: zombies.zombies,
            methodName: "SpawnRandomZombies",
            handler: async ({ args, thisArg, callOriginal }) => {
                const ids = libProperties.SandboxZombiesIDs
                if (!ids?.length) return callOriginal(...args)

                for (let lane = 0; lane < 5; lane++) {
                    for (let i = 0; i < 3; i++) {
                        const id = ids[Math.floor(Math.random() * ids.length)]

                        if (zombies.zombies.f1BlackList.indexOf(id) !== -1)
                            continue

                        await zombies.zombies.spawnZombieFromLaneByID(lane, id);
                    }
                }
            }
        })

    })
}