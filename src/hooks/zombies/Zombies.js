import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("properties", () => {
        const zombies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombies.ts")

        globalThis.luxisLib ??= {}
        globalThis.luxisLib.dumpZombieEnum = () => zombies.ZombieEnum
        globalThis.luxisLib.dumpZombieFeatures = () => zombies.zombies.zombieRes.ZombieFeatures

        let id = zombies.ZombieEnum.zombieAmount

        delete zombies.ZombieEnum[zombies.ZombieEnum.zombieAmount]
        delete zombies.ZombieEnum.zombieAmount

        libProperties?.ZombieEnumAdd?.forEach((zombie) => {
            if (!Object.keys(zombies.ZombieEnum).includes(zombie)) {
                zombies.ZombieEnum[zombie] = id
                zombies.ZombieEnum[id] = zombie
                id++
            }
        })

        zombies.ZombieEnum["zombieAmount"] = id
        zombies.ZombieEnum[id] = "zombieAmount"

        ctx.events.emit("zombie_enum")

        ctx.unsafe.hooks.wrapMethod({
            target: zombies.zombies,
            methodName: "SpawnRandomZombies",
            handler: async ({ args, thisArg, callNext }) => {
                const ids = libProperties.SandboxZombiesIDs
                if (!ids?.length) return callNext(...args)

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