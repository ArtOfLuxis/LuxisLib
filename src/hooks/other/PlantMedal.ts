import {libProperties} from "./JSONs";
import {GPNContext} from "../../tsclasses/api.ts";

export function init(ctx: GPNContext) {
    ctx.events.on("engine:ready", () => {
        const medaldisplay = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlantMedalDisplayer.ts")
        const playerproperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const medal = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlantMedal.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const displayproto = medaldisplay.PlantMedalDisplayer.prototype
        const proto = medal.PlantMedal.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: displayproto,
            methodName: "onLoad",
            handler({ args, thisArg, callNext}) {
                const stringReplacement = libProperties.MedalBoostPageString

                callNext(...args)

                if (stringReplacement) {
                    thisArg.DescriptionLabel.string = stringReplacement
                } else {
                    const boostAmount = libProperties.MedalBoostAmount ?? 3
                    thisArg.DescriptionLabel.string =
                        "Unlock each plant medal with " +
                        boostAmount.toString() +
                        (boostAmount === 1 ? " boost" : " boosts")
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "unlock",
            handler({ args, thisArg, callNext}) {
                let boostAmount = libProperties.MedalBoostAmount ?? 3

                const features = thisArg.features[thisArg._currentID]
                if (
                    libProperties.MedalBoostAmountSpecific &&
                    libProperties.MedalBoostAmountSpecific[features.CODENAME]
                ) {
                    boostAmount = libProperties.MedalBoostAmountSpecific[features.CODENAME]
                }

                if (!thisArg.isMint) thisArg.pp.boost += (3 - boostAmount)

                callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "readID",
            isStatic: false,
            handler({ args, thisArg, callNext}) {
                let boostAmount = libProperties.MedalBoostAmount ?? 3

                const features = thisArg.features[thisArg._currentID]
                if (
                    libProperties.MedalBoostAmountSpecific &&
                    libProperties.MedalBoostAmountSpecific[features.CODENAME]
                ) {
                    boostAmount = libProperties.MedalBoostAmountSpecific[features.CODENAME]
                }

                callNext(...args)

                if (thisArg.isMint) {
                    const properties = playerproperties.AllPlayerProperties

                    thisArg.plantDB_boost.node.parent.active = false
                    thisArg.boost_progress.node.active = false
                    thisArg.boost_count_label.node.active = false

                    thisArg.unlock_button.node.active =
                        thisArg.medals_required_types.every(((t: any) => {
                            const plantEnum =
                                plants.plants.getPlantEnumWithPropByPlantTypes(args[0]).id
                            return properties.getPlantProgressByID(plantEnum).medal
                        }))
                }
                else {
                    const properties = playerproperties.AllPlayerProperties
                    const boost = properties.getPlantProgressByID(args[0]).boost

                    thisArg.boost_progress.progress = boost / boostAmount
                    thisArg.boost_count_label.string = boost.toString() + "/" + boostAmount.toString()
                    thisArg.unlock_button.node.active = ((boost / boostAmount) >= 1 && !thisArg.pp.medal)
                }
            }
        })
    });
}