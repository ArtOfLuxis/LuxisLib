import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const gloomShroom = ctx.engine.getSystemModule("chunks:///_virtual/GloomShroom.ts");
        const proto = gloomShroom.GloomShroomPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntShadowBoost": null,
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdateForce",
            handler: ({ thisArg, args, callOriginal }) => {
                if (thisArg.objdataOwn.DoesntShadowBoost !== true) {
                    return callOriginal(...args)
                }

                const e = args[0];

                if (thisArg.bubbleCountDown > 0 && !thisArg.sheepend) {
                    thisArg.bubbleCountDown -= e;

                    if (thisArg.fooding) {
                        thisArg.push();
                    }

                    const mintFactor =
                        thisArg.MintBoosted && thisArg.objdataOwn.MintDamageFactor > 0
                            ? thisArg.objdataOwn.MintDamageFactor
                            : 1;

                    const baseDPS = thisArg.fooding
                        ? thisArg._objdataOwn.DPSPlantfood
                        : thisArg._objdataOwn.DPS;

                    let DPS = mintFactor * baseDPS * e;

                    if (thisArg._dmgScale) {
                        DPS *= thisArg._dmgScale;
                    }

                    thisArg.detectEnemies(DPS)
                }

                if (thisArg.dragging > 0) {
                    thisArg.dragging -= e;
                    thisArg.drag();
                }
            }
        })
    })
}