import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("properties", () => {
        const zombies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombies.ts")

        const enumTable = zombies.ZombieEnum
        const features = zombies.zombies.zombieRes?.ZombieFeatures

        if (!Array.isArray(features)) {
            return
        }

        globalThis.luxisLib ??= {}
        globalThis.luxisLib.dumpZombieEnum = () => enumTable
        globalThis.luxisLib.dumpZombieFeatures = () => features

        const oldAmount = enumTable.zombieAmount

        delete enumTable[oldAmount]
        delete enumTable.zombieAmount

        for (const typeName of libProperties.ZombieEnumAdd ?? []) {
            console.log(typeName)
            if (
                typeof typeName !== "string" ||
                enumTable[typeName] !== undefined
            ) {
                continue
            }


            const typeData = zombies.zombies.getZombieType(typeName)
            const featureName = typeData?.ZombieBasedOn

            const featureID = features.findIndex(
                (feature) => feature?.CODENAME === featureName
            )

            console.log(typeData, featureName, featureID)

            if (featureID === -1) {
                console.warn("[Luxis Lib] ZombieBasedOn feature not found:", typeName, featureName)
                continue
            }

            enumTable[typeName] = featureID
            enumTable[featureID] = typeName
        }

        enumTable.zombieAmount = features.length

        libProperties.SandboxZombiesIDs =
            (libProperties.SandboxZombies ?? [])
                .map(typeName => enumTable[typeName])
                .filter(id => Number.isInteger(id))

        console.log(libProperties.SandboxZombiesIDs)

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