import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:zombie_enum", () => {
        const sandBoxZombieCards = ctx.engine.getSystemModule("chunks:///_virtual/SandBoxZombieCards.ts")
        const zombies = ctx.engine.getSystemModule("chunks:///_virtual/Zombies.ts")
        const proto = sandBoxZombieCards.SandBoxZombieCards.prototype

        libProperties.SandboxZombiesIDs = []
        libProperties.SandboxZombies.forEach((zombie) => {
            const zombieEnum = zombies.zombies.getZombieEnumWithPropByZombieTypes(zombie)
            libProperties.SandboxZombiesIDs.push(zombieEnum.z)
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "onMouseScroll",
            handler: ({ args, thisArg, callOriginal }) => {
                const sandboxZombies = libProperties.SandboxZombiesIDs;

                if (sandboxZombies && sandboxZombies.length > 0) {
                    const scroll = args[0].getScrollY() < 0 ? 1 : -1
                    const len = sandboxZombies.length;

                    const current = sandboxZombies.indexOf(thisArg.zombieCards[0].ID)

                    if (current !== -1) {
                        const start = (current + scroll + len) % len;

                        thisArg.zombieCards.forEach((card, i) => {
                            const id = sandboxZombies[(start + i) % len];
                            card.cardGrouper(id, false);
                        });

                        return
                    }
                }

                return callOriginal(...args)
            }
        })


    })
}