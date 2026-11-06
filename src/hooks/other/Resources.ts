import {findCustomLevel} from "./JSONs"
import {GPNContext} from "../../tsclasses/api";

export function init(ctx: GPNContext) {
    ctx.events.on("engine:ready", () => {
        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: cc.resources,
            methodName: "load",
            handler: async ({args, callNext}) => {
                const [path, callback] = args

                if (path.startsWith("levels/")) {
                    const levelID = path.replace("levels/", "")
                    const customLevel = await findCustomLevel(ctx, levelID)

                    if (customLevel) {
                        ctx.log.info(`Loaded custom level: ${levelID}`)
                        callback(null, {
                            json: customLevel
                        })

                        return
                    }
                }

                return callNext(...args)
            }
        })
    })
}