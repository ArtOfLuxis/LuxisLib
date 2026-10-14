import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const peaCommando = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PeaCommando.ts")
        const proto = peaCommando.PeaCommandoPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "NoUpgradeOnPlantFood": null,
            "RayChance": 0,
            "BaseRayDamage": null,
            "SpawnWithPFUpgrade": null,
        })

        const nodePools = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const peaCommandoTrooper = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PeaCommandoTrooper.ts")
        const arrayGet = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "createTrooper",
            handler: ({args, thisArg, callNext}) => {
                let trooperNode = nodePools.instantiatePooly(thisArg.trooperPFB);
                trooperNode.parent = thisArg.inLane.prjLayer;
                let trooper = trooperNode.getComponent(peaCommandoTrooper.PeaCommandoTrooper)
                    , target = thisArg.getTarget();
                trooper.switchCostume(thisArg.anmControl.currentCos),
                    trooper.upgraded = thisArg.upgraded,
                    trooper.LeftShot = thisArg.fooding ? thisArg.objdataOwn.ShootCountPlantfood : thisArg.objdataOwn.ShootCount,
                    trooper.Ray = thisArg.fooding ? true : (Math.random() < thisArg.objdataOwn.RayChance),
                    trooper.flyToTarget(target, arrayGet.ValueRange.getRandomFromRange(thisArg.objdataOwn.FlyToTargetTime), thisArg.FlyTime, args[0], thisArg),
                    trooper.readFlyingProgress(),
                    thisArg.Troopers.push(trooper)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_trooperShoot",
            handler: ({args, thisArg, callNext}) => {
                const originalRayDamage = thisArg.objdataOwn.PlantfoodRayDamage;
                if (!thisArg.fooding && thisArg.objdataOwn.BaseRayDamage) {
                    thisArg.objdataOwn.PlantfoodRayDamage = thisArg.objdataOwn.BaseRayDamage;
                }
                let result
                try {
                    result = callNext(...args);
                }
                finally {
                    thisArg.objdataOwn.PlantfoodRayDamage = originalRayDamage;
                    return result;
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)
                if (thisArg.objdataOwn.SpawnWithPFUpgrade) {
                    thisArg.upgrade();
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "upgrade",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.objdataOwn.NoUpgradeOnPlantFood === true) {
                    return
                }

                return callNext(...args)
            }
        })


    })
}