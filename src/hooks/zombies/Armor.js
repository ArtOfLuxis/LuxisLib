import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const armor = ctx.engine.getSystemModule("chunks:///_virtual/Armor.ts")
        const proto = armor.Armor.prototype

        const cc = ctx.engine.getCc()

        const armorKeys = [
            "ColorOffset",
            "Scale",
        ]

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "setProps",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                const newProps = args[0]

                Object.getOwnPropertyNames(newProps).forEach((prop) => {
                    if (armorKeys.includes(prop)) {
                        thisArg.props[prop] = newProps[prop]
                    }
                })
            }
        })


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                const addColor = new cc.Color(0, 0, 0, 255);

                if (thisArg.hurting > 0) {
                    addColor.r += thisArg.hurting * 10;
                    addColor.g += thisArg.hurting * 10;
                    addColor.b += thisArg.hurting * 10;
                }

                if (thisArg.owner?.glittering > 0) {
                    addColor.r = 194;
                    addColor.g = 0;
                    addColor.b = 178;
                }

                let saturation = 1
                let holo = 1

                if (thisArg.owner?.potionInvisible) {
                    holo =
                        libProperties?.ZombieInvisibilityPotionOpacity ?? 0.5
                }

                const offset1 = thisArg.owner?.objdata.ColorOffset
                const offset2 = thisArg.props.ColorOffset

                if (offset1) {
                    addColor.r += offset1.r ?? 0
                    addColor.g += offset1.g ?? 0
                    addColor.b += offset1.b ?? 0

                    saturation += offset1.s ?? 0
                    holo += offset1.holo ?? 0
                }
                if (offset2) {
                    addColor.r += offset2.r ?? 0
                    addColor.g += offset2.g ?? 0
                    addColor.b += offset2.b ?? 0

                    saturation += offset2.s ?? 0
                    holo += offset2.holo ?? 0
                }

                const pass = thisArg.material.passes[0]

                pass.setUniform(pass.getHandle("addColor"), addColor)
                if (holo !== 1) pass.setUniform(pass.getHandle("holo"), holo)
                if (saturation !== 1) pass.setUniform(pass.getHandle("saturation"), saturation)

                thisArg.db.customMaterial = thisArg.material
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "onEnable",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                if (thisArg.props.Scale) {
                    thisArg.node.scale = new thisArg.node.scale.constructor(
                        thisArg.props.Scale, thisArg.props.Scale, thisArg.props.Scale
                    )
                }
            }
        })

    })
}