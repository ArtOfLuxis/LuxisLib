export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const WorldMap = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMap.ts")
        const Plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const Trophies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Trophies.ts")
        const PlayerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const EndlessZoneEntrance = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/EndlessZoneEntrance.ts").EndlessZoneEntrance
        const worldMapDisplayEnum = PlayerProperties.WorldMapSceneDisplayEnum

        const islandDisplayNames = ["level", "plant", "giftBox", "upgrade", "epicPortal"]
        const appearanceNames = ["normal", "minigame", "gargantuar", "zomboss"]

        function makeId(island, i) {
            return island.islandNode.name
        }

        function findEndlessEntrances(worldMap) {
            return worldMap.node.getComponentsInChildren(EndlessZoneEntrance)
        }

        function toEndlessEntry(entrance, i) {
            const position = entrance.node.position
            const id = entrance.node.name || `endless-${i + 1}`

            return {
                id,
                template: entrance.node.name
                    ? {id: entrance.node.name}
                    : {
                        levelIds: entrance.levelsID.slice(),
                        endlessData: worldMapDisplayEnum[entrance.endlessData],
                        isMiniGame: entrance.isMiniGame
                    },
                levels: entrance.levelsID.slice(),
                endlessData: worldMapDisplayEnum[entrance.endlessData],
                isMiniGame: entrance.isMiniGame,
                position: {
                    x: Math.round(position.x * 100) / 100,
                    y: Math.round(position.y * 100) / 100,
                    z: Math.round(position.z * 100) / 100
                },
                siblingIndex: entrance.node.getSiblingIndex()
            }
        }

        function toEntry(island, idByNode, prevPos, prevSiblingIndex, hasParent) {
            const entry = {
                id: idByNode.get(island.islandNode),
                type: islandDisplayNames[island.islandDisplay],
            }
            const isDecoration = island.islandDisplay !== 0
            const useAbsolutePosition = isDecoration || !hasParent

            if (island.islandDisplay === 0) {
                entry.appearance = appearanceNames[island.levelNodeAppearance]
                entry.levels = island.levelJsonsID.slice()
                if (island.levelNodeName) entry.title = island.levelNodeName
                entry.template = island.levelJsonsID.length > 1
                    ? { levelIds: island.levelJsonsID.slice() }
                    : { levelId: island.levelJsonsID[0] }
            } else if (island.islandDisplay === 1) {
                entry.template = { type: "plant", plantDisplayed: island.plantDisplayed }
                entry.plantReward = Plants.plants.getPlantFeature(island.plantDisplayed)?.CODENAME
            } else if (island.islandDisplay === 3) {
                entry.template = { type: "upgrade", upgradeDisplayed: island.upgradeDisplayed }
                entry.upgradeReward = Trophies.UpgradeEnum
                    ? Trophies.UpgradeEnum[island.upgradeDisplayed]
                    : island.upgradeDisplayed
            } else if (island.islandDisplay === 4) {
                entry.template = { type: "epicPortal" }
                entry.portalLevels = island.epicLevelJsonsID.slice()
            } else if (island.islandDisplay === 2) {
                entry.template = { type: "giftBox" }
            }

            const pos = island.islandNode.position
            entry.siblingIndex = island.islandNode.getSiblingIndex()

            if (useAbsolutePosition) {
                entry.position = {
                    x: Math.round(pos.x * 100) / 100,
                    y: Math.round(pos.y * 100) / 100,
                    z: Math.round(pos.z * 100) / 100
                }
            } else {
                const basePos = prevPos ?? pos

                entry.relativePosition = {
                    x: Math.round((pos.x - basePos.x) * 100) / 100,
                    y: Math.round((pos.y - basePos.y) * 100) / 100,
                    z: Math.round((pos.z - basePos.z) * 100) / 100
                }
            }

            return entry
        }

        function dumpWorldMap(worldMap) {
            const islands = worldMap.levelIslands
            const idByNode = new Map()
            islands.forEach((island, i) => idByNode.set(island.islandNode, makeId(island, i)))
            const findByNode = (node) => islands.find((isl) => isl.islandNode === node)

            const parentOf = new Map()
            islands.forEach((island) => {
                const nextMain = findByNode(island.nextIsland)
                if (nextMain && !parentOf.has(nextMain)) parentOf.set(nextMain, island)
                ;(island.otherNextIslands ?? []).forEach((node) => {
                    const branchTarget = findByNode(node)
                    if (branchTarget && !parentOf.has(branchTarget)) parentOf.set(branchTarget, island)
                })
            })

            const startSet = new Set(worldMap.startingLevels ?? [])
            const rootIslands = islands.filter((isl) => isl.levelJsonsID?.some((lvl) => startSet.has(lvl)))

            const mainlineIslands = []
            const mainlineSet = new Set()
            let current = rootIslands[0]
            while (current && !mainlineSet.has(current)) {
                mainlineSet.add(current)
                mainlineIslands.push(current)
                current = findByNode(current.nextIsland)
            }

            const remaining = new Set(islands.filter((isl) => !mainlineSet.has(isl)))
            const outputSet = new Set(mainlineSet)
            const branchIslands = []
            let progressed = true
            while (remaining.size && progressed) {
                progressed = false
                for (const isl of Array.from(remaining)) {
                    const parent = parentOf.get(isl)
                    if (!parent || outputSet.has(parent)) {
                        branchIslands.push(isl)
                        outputSet.add(isl)
                        remaining.delete(isl)
                        progressed = true
                    }
                }
            }
            remaining.forEach((isl) => {
                ctx.log.warn(`Island ${idByNode.get(isl.islandNode)} has no resolvable parent chain — check its position manually`)
                branchIslands.push(isl)
            })

            const explicitChildren = new Map()
            function addChild(source, targetId) {
                if (!explicitChildren.has(source)) explicitChildren.set(source, [])
                explicitChildren.get(source).push(targetId)
            }
            islands.forEach((island) => {
                const mainIdx = mainlineIslands.indexOf(island)
                const nextMain = findByNode(island.nextIsland)
                if (nextMain) {
                    const isImplicitMainlineLink = mainIdx !== -1 && mainlineIslands[mainIdx + 1] === nextMain
                    if (!isImplicitMainlineLink) addChild(island, idByNode.get(nextMain.islandNode))
                }
                ;(island.otherNextIslands ?? []).forEach((node) => {
                    const target = findByNode(node)
                    if (target) addChild(island, idByNode.get(target.islandNode))
                })
            })

            function toEntryWithParent(island) {
                const parent = parentOf.get(island)
                const entry = toEntry(
                    island,
                    idByNode,
                    parent ? parent.islandNode.position : null,
                    parent ? parent.islandNode.getSiblingIndex() : null,
                    !!parent
                )
                const kids = explicitChildren.get(island)
                if (kids?.length) entry.children = kids
                return entry
            }

            const mainline = mainlineIslands.map(toEntryWithParent)
            const branches = branchIslands.map(toEntryWithParent)
            const endless = findEndlessEntrances(worldMap).map(toEndlessEntry)

            const worldKey = PlayerProperties.WorldMapSceneDisplayEnum
                ? PlayerProperties.WorldMapSceneDisplayEnum[worldMap.displayEnum]
                : worldMap.displayEnum

            return {
                [worldKey]: {
                    data: {epicTarget: worldMap.MapProps.EPIC_TARGET},
                    map: {
                        mode: "replace",
                        reuseOriginalPositions: true,
                        mainline,
                        branches
                    },
                    endless: {
                        keepOriginal: false,
                        nodes: endless
                    }
                }
            }
        }

        let currentWorldMap = null

        globalThis.luxisLib = globalThis.luxisLib ?? {}
        globalThis.luxisLib.dumpWorldMap = () => {
            if (!currentWorldMap) {
                console.warn("No WorldMap is currently loaded")
                return null
            }

            try {
                const schema = dumpWorldMap(currentWorldMap)
                console.log(
                    "WorldMap dump:\n",
                    JSON.stringify(schema, null, 2).slice(1, -1)
                )
                return schema
            } catch (e) {
                console.error("Failed to dump worldmap: " + e)
                return null
            }
        }

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "onLoad",
            handler: ({thisArg, callNext, args}) => {
                currentWorldMap = thisArg
                return callNext(...args)
            }
        })
    })
}