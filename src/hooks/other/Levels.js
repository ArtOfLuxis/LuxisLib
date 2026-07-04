import {libCustomLevels} from "./JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cc = ctx.engine.getCc()

        ctx.hooks.wrapMethod({
            target: cc.resources,
            methodName: "load",
            handler: ({ args, callOriginal }) => {
                const [path, callback] = args;

                if (path.startsWith("levels/")) {
                    const levelID = path.replace("levels/", "");
                    const customLevel = libCustomLevels.find((level) => level.aliases.includes(levelID))
                    if (customLevel) {
                        ctx.log.info(`Loaded custom level: ${levelID}`);
                        callback(
                            null,
                            { json: { objects: customLevel.objdata.LevelModules } }
                        )

                        return;
                    }
                }

                return callOriginal(...args)
            }
        })
    })
}