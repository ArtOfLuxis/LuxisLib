import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:zombie_enum", () => {
        const sandBoxZombieCards = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SandBoxZombieCards.ts")
        const zombies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombies.ts")
        const proto = sandBoxZombieCards.SandBoxZombieCards.prototype

        libProperties.SandboxZombiesIDs = []
        libProperties.SandboxZombies.forEach((zombie) => {
            const zombieEnum = zombies.zombies.getZombieEnumByCodename(zombie)
            libProperties.SandboxZombiesIDs.push(zombieEnum)
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onMouseScroll",
            handler: ({ args, thisArg, callNext }) => {
                const sandboxZombies = libProperties?.SandboxZombiesIDs

                if (!sandboxZombies || sandboxZombies.length === 0) {
                    return callNext(...args)
                }

                const len = sandboxZombies.length
                const scroll = args[0].getScrollY() < 0 ? 1 : -1

                if (thisArg.___sandboxIndex == null) {
                    const current = sandboxZombies.indexOf(thisArg.zombieCards[0].ID)
                    if (current === -1) {
                        return callNext(...args)
                    }

                    thisArg.___sandboxIndex = current
                }

                thisArg.___sandboxIndex =
                    (thisArg.___sandboxIndex + scroll + len) % len

                const start = thisArg.___sandboxIndex

                thisArg.zombieCards.forEach((card, i) => {
                    card.cardGrouper(
                        sandboxZombies[(start + i) % len],
                        false
                    )
                })
            }
        })


    })
}