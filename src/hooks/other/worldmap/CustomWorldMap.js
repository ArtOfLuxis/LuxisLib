import {libWorldmapProperties} from "../JSONs.js"

export function init(ctx) {
    ctx.events.on("worldmap-properties", () => {
        const WorldMap = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMap.ts")
        const Plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const Trophies = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Trophies.ts")
        const PlayerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const cc = ctx.unsafe.engine.getCc()

        const islandDisplayNames = ["level", "plant", "giftBox", "upgrade", "epicPortal"]
        const appearanceNames = ["normal", "minigame", "gargantuar", "zomboss"]
        const appearanceValues = Object.fromEntries(appearanceNames.map((name, i) => [name, i]))

        const guardedIslandPrototypes = new WeakSet()

        function installIslandBehaviorGuard(island) {
            const prototype = Object.getPrototypeOf(island)

            if (guardedIslandPrototypes.has(prototype)) return

            for (const methodName of ["start", "laterStart", "unlock", "pushPath", "showPlant"]) {
                ctx.unsafe.hooks.wrapMethod({
                    target: prototype,
                    methodName,
                    handler: ({args, thisArg, callNext}) => {
                        if (thisArg.___luxisLibWorldmapLocked) return
                        return callNext(...args)
                    }
                })
            }

            guardedIslandPrototypes.add(prototype)
        }

        function getType(island) {
            return islandDisplayNames[island.islandDisplay]
        }

        function getPlantCodename(island) {
            return Plants.plants.getPlantFeature(island.plantDisplayed)?.CODENAME
        }

        function getUpgradeCodename(island) {
            return Trophies.UpgradeEnum[island.upgradeDisplayed]
        }

        function getTemplateId(island) {
            return island.islandNode.name
        }

        function matchesTemplate(island, selector) {
            if (typeof selector === "string") {
                return getTemplateId(island) === selector ||
                    island.customId === selector ||
                    island.levelJsonsID.includes(selector) ||
                    island.epicLevelJsonsID.includes(selector)
            }

            if (selector.id !== undefined &&
                getTemplateId(island) !== selector.id &&
                island.id !== selector.id) return false

            if (selector.customId !== undefined &&
                island.customId !== selector.customId &&
                getTemplateId(island) !== selector.customId) return false

            if (selector.type !== undefined && getType(island) !== selector.type) return false

            if (selector.appearance !== undefined &&
                (getType(island) !== "level" ||
                    appearanceNames[island.levelNodeAppearance] !== selector.appearance)) return false

            const levels = island.levelJsonsID ?? island.levelsID ?? []
            const portalLevels = island.epicLevelJsonsID ?? []

            if (selector.levelId !== undefined && !levels.includes(selector.levelId)) return false

            if (selector.levelIds !== undefined) {
                const ids = Array.isArray(selector.levelIds) ? selector.levelIds : [selector.levelIds]
                if (!ids.every(id => levels.includes(id))) return false
            }

            if (selector.portalLevelId !== undefined &&
                !portalLevels.includes(selector.portalLevelId)) return false

            if (selector.portalLevelIds !== undefined) {
                const ids = Array.isArray(selector.portalLevelIds)
                    ? selector.portalLevelIds
                    : [selector.portalLevelIds]
                if (!ids.every(id => portalLevels.includes(id))) return false
            }

            if (selector.plantDisplayed !== undefined) {
                const plantId = typeof selector.plantDisplayed === "string"
                    ? Plants.plants.getPlantEnumByCodename(selector.plantDisplayed)
                    : selector.plantDisplayed

                if (island.plantDisplayed !== plantId &&
                    getPlantCodename(island) !== selector.plantDisplayed) return false
            }

            if (selector.upgradeDisplayed !== undefined) {
                const upgradeId = typeof selector.upgradeDisplayed === "string"
                    ? Trophies.UpgradeEnum?.[selector.upgradeDisplayed]
                    : selector.upgradeDisplayed

                if (island.upgradeDisplayed !== upgradeId &&
                    getUpgradeCodename(island) !== selector.upgradeDisplayed) return false
            }

            if (
                selector.type === undefined &&
                selector.appearance === undefined &&
                selector.levelId === undefined &&
                selector.levelIds === undefined &&
                selector.portalLevelId === undefined &&
                selector.portalLevelIds === undefined &&
                selector.plantDisplayed === undefined &&
                selector.upgradeDisplayed === undefined &&
                selector.id === undefined &&
                selector.customId === undefined
            ) {
                return false
            }

            return true
        }

        function getNodePath(root, target) {
            const path = []
            let current = target

            while (current && current !== root) {
                path.unshift(current.name)
                current = current.parent
            }

            return current === root ? path : null
        }

        function resolveNodePath(root, path) {
            let current = root

            for (const name of path) {
                current = current.children.find(child => child.name === name)
                if (!current) return null
            }

            return current
        }

        function containsNode(root, target) {
            let current = target

            while (current) {
                if (current === root) return true
                current = current.parent
            }

            return false
        }

        function cloneIsland(template) {
            const componentNode = cc.instantiate(template.node)
            componentNode.active = false

            const island = componentNode.getComponent(template.constructor)

            if (!island) {
                componentNode.destroy()
                return null
            }

            installIslandBehaviorGuard(island)
            island.___luxisLibWorldmapLocked = true

            const path = getNodePath(template.node, template.islandNode)
            let islandNode

            if (path !== null) {
                islandNode = resolveNodePath(componentNode, path)
            } else {
                islandNode = cc.instantiate(template.islandNode)
                islandNode.active = false
                islandNode.parent = template.islandNode.parent
            }

            componentNode.parent = template.node.parent
            island.islandNode = islandNode

            island.___luxisLibClonedComponentNode = componentNode
            island.___luxisLibClonedIslandNode = path === null ? islandNode : null

            return island
        }

        function findOriginalMainline(islands, startingLevels) {
            const findByNode = node => islands.find(island => island.islandNode === node)
            const starts = new Set(startingLevels ?? [])
            const roots = islands.filter(island =>
                island.levelJsonsID?.some(id => starts.has(id))
            )

            const result = []
            const visited = new Set()
            let current = roots[0] ?? islands[0]

            while (current && !visited.has(current)) {
                visited.add(current)
                result.push(current)
                current = findByNode(current.nextIsland)
            }

            return result
        }

        function resolvePlant(value) {
            return typeof value === "string"
                ? Plants.plants.getPlantEnumByCodename(value)
                : value
        }

        function resolveUpgrade(value) {
            return typeof value === "string"
                ? Trophies.UpgradeEnum[value]
                : value
        }

        function hideIslandArt(root) {
            const nodes = [root]

            while (nodes.length) {
                const node = nodes.pop()

                node.getComponents(cc.internal.ArmatureDisplay).forEach(component => {
                    component.enabled = false
                })

                nodes.push(...node.children)
            }
        }

        ctx.unsafe.hooks.wrapMethod({
            target: WorldMap.WorldMap.prototype,
            methodName: "init",
            handler: async ({args, thisArg, callNext}) => {
                if (thisArg.___luxisLibWorldmapReplacementApplied) {
                    return callNext(...args)
                }

                const worldKey = PlayerProperties.WorldMapSceneDisplayEnum
                    ? PlayerProperties.WorldMapSceneDisplayEnum[thisArg.displayEnum]
                    : thisArg.displayEnum

                const worldPatch = libWorldmapProperties.worlds?.[worldKey]
                const map = worldPatch?.map

                if (map?.mode !== "replace") {
                    return callNext(...args)
                }

                const originalIslands = thisArg.levelIslands.slice()

                if (!originalIslands.length) {
                    ctx.log.warn(`Cannot replace worldmap ${worldKey}: no original islands are available`)
                    return callNext(...args)
                }

                const blockedIslands = new Set(originalIslands)

                originalIslands.forEach(island => {
                    installIslandBehaviorGuard(island)
                    island.___luxisLibWorldmapLocked = true
                })

                function releaseIslandBehavior() {
                    blockedIslands.forEach(island => {
                        delete island.___luxisLibWorldmapLocked
                    })
                }

                const originalStates = new Map(originalIslands.map(island => [
                    island,
                    {
                        x: island.islandNode.position.x,
                        y: island.islandNode.position.y,
                        positionZ: island.islandNode.position.z,
                        siblingIndex: island.islandNode.getSiblingIndex()
                    }
                ]))

                const originalMainline = findOriginalMainline(
                    originalIslands,
                    thisArg.startingLevels
                )

                const mainline = map.mainline ?? []
                const branches = map.branches ?? []
                const entries = [...mainline, ...branches]
                const usedTemplates = new Set()
                const plans = []

                function pickTemplate(entry) {
                    const all = originalIslands
                    let matches = []

                    if (entry.template !== undefined) {
                        matches = all.filter(island => matchesTemplate(island, entry.template))

                        if (!matches.length) {
                            ctx.log.warn(`No template matched for worldmap island "${entry.id}"`)
                        }
                    }

                    if (!matches.length) {
                        matches = all.filter(island =>
                            getType(island) === entry.type &&
                            (entry.type !== "level" ||
                                entry.appearance === undefined ||
                                appearanceNames[island.levelNodeAppearance] === entry.appearance)
                        )
                    }

                    if (!matches.length) {
                        matches = all.filter(island => getType(island) === entry.type)
                    }

                    if (!matches.length) matches = all

                    const unused = matches.find(island => !usedTemplates.has(island))
                    const source = unused ?? matches[0]

                    if (!source) return null

                    if (unused) {
                        usedTemplates.add(source)
                        return {island: source, source}
                    }

                    const clone = cloneIsland(source)

                    if (!clone) return null

                    return {island: clone, source}
                }

                for (const entry of entries) {
                    const plan = pickTemplate(entry)

                    if (!plan) {
                        ctx.log.warn(`Could not create worldmap island "${entry.id}"`)
                        releaseIslandBehavior()
                        return callNext(...args)
                    }

                    blockedIslands.add(plan.island)
                    plan.island.___luxisLibWorldmapLocked = true
                    plans.push({...plan, entry})
                }

                const planById = new Map(plans.map(plan => [plan.entry.id, plan]))
                const parentById = new Map()
                const mainlineIndex = new Map(mainline.map((entry, i) => [entry.id, i]))

                for (let i = 1; i < mainline.length; i++) {
                    if (!parentById.has(mainline[i].id)) {
                        parentById.set(mainline[i].id, mainline[i - 1])
                    }
                }

                for (const entry of entries) {
                    for (const childId of entry.children ?? []) {
                        if (planById.has(childId) && !parentById.has(childId)) {
                            parentById.set(childId, entry)
                        }
                    }
                }

                const layout = map.autoLayout ?? {}
                const baseX = layout.baseX ?? 0
                const baseY = layout.baseY ?? 0
                const xStep = layout.xStep ?? 250
                const yStep = layout.yStep ?? 180
                const branchXStep = layout.branchXStep ?? 200
                const branchYStep = layout.branchYStep ?? 140
                const ySmoothness = layout.ySmoothness ?? 4
                const resolvedPositions = new Map()
                const resolving = new Set()

                function resolvePosition(entry) {
                    if (resolvedPositions.has(entry.id)) {
                        return resolvedPositions.get(entry.id)
                    }

                    const source = planById.get(entry.id).source
                    const sourceState = originalStates.get(source)
                    const originalSiblingIndex = sourceState?.siblingIndex ?? 0

                    if (resolving.has(entry.id)) {
                        return {x: baseX, y: baseY, z: originalSiblingIndex}
                    }

                    resolving.add(entry.id)

                    let result

                    if (entry.position) {
                        result = {
                            x: entry.position.x,
                            y: entry.position.y,
                            z: Math.round(entry.position.z ?? originalSiblingIndex)
                        }
                    } else if (entry.relativePosition) {
                        const parent = parentById.get(entry.id)
                        const parentPosition = parent ? resolvePosition(parent) : {x: 0, y: 0, z: 0}

                        result = {
                            x: parentPosition.x + entry.relativePosition.x,
                            y: parentPosition.y + entry.relativePosition.y,
                            z: Math.round(parentPosition.z + (entry.relativePosition.z ?? 0))
                        }
                    } else {
                        const index = mainlineIndex.get(entry.id)

                        if (map.reuseOriginalPositions && index !== undefined && originalMainline[index]) {
                            const original = originalStates.get(originalMainline[index])

                            result = {
                                x: original.x,
                                y: original.y,
                                z: original.siblingIndex
                            }
                        } else if (index !== undefined) {
                            result = {
                                x: baseX + index * xStep,
                                y: Math.round((baseY + Math.sin(index * Math.PI * 2 / ySmoothness) * yStep) * 100) / 100,
                                z: index
                            }
                        } else {
                            const parent = parentById.get(entry.id)
                            const parentPosition = parent ? resolvePosition(parent) : null
                            const siblings = parent?.children ?? []
                            const childIndex = siblings.indexOf(entry.id) + 1

                            result = parentPosition
                                ? {
                                    x: parentPosition.x + branchXStep,
                                    y: parentPosition.y - branchYStep * childIndex,
                                    z: parentPosition.z + childIndex
                                }
                                : {
                                    x: baseX + entries.indexOf(entry) * xStep,
                                    y: baseY,
                                    z: entries.indexOf(entry)
                                }
                        }
                    }

                    resolving.delete(entry.id)
                    resolvedPositions.set(entry.id, result)
                    return result
                }

                for (const entry of entries) resolvePosition(entry)

                const nodeById = new Map()

                for (const plan of plans) {
                    const {island, source, entry} = plan

                    island.islandNode.name = entry.id
                    island.islandNode.active = true
                    island.islandDisplay = WorldMap.islandDisplayEnum[entry.type]

                    if (entry.type === "level") {
                        island.levelNodeAppearance = appearanceValues[entry.appearance ?? "normal"]
                        island.levelJsonsID = (entry.levels ?? []).slice()
                        island.levelNodeName = entry.title ?? ""
                        island.zombossHeadPFB = entry.appearance === "zomboss"
                            ? source.zombossHeadPFB
                            : null
                    } else {
                        island.levelJsonsID = []
                        island.levelNodeName = ""
                        island.zombossHeadPFB = null
                    }

                    island.epicLevelJsonsID = (entry.portalLevels ?? []).slice()

                    if (entry.type === "plant") {
                        island.plantDisplayed = resolvePlant(entry.plantReward)
                    }

                    if (entry.type === "upgrade") {
                        island.upgradeDisplayed = resolveUpgrade(entry.upgradeReward)
                    }

                    const nextIndex = mainlineIndex.get(entry.id)
                    const nextEntry = nextIndex === undefined ? null : mainline[nextIndex + 1]

                    island.nextIsland = nextEntry
                        ? planById.get(nextEntry.id).island.islandNode
                        : null

                    island.otherNextIslands = (entry.children ?? [])
                        .filter(id => id !== nextEntry?.id && planById.has(id))
                        .map(id => planById.get(id).island.islandNode)

                    island.affectsMaxX = true
                    island.displayedIslandDBs = []
                    island._inWorldMap = undefined
                    island._levelNode = undefined
                    island._levelNodeDB = undefined
                    island._epicPortalDB = undefined
                    island._giftbox = undefined
                    island._plantOnDisplay = undefined
                    island._upgradeOnDisplay = undefined
                    island._plantIcon = undefined
                    island._pathDBs = []
                    island._unlocked = false
                    island._finished = false
                    island._willPush = false

                    const position = resolvePosition(entry)
                    const nodePosition = island.islandNode.position

                    island.islandNode.setPosition(
                        new cc.Vec3(position.x, position.y, nodePosition.z)
                    )

                    plan.siblingIndex = position.z
                    nodeById.set(entry.id, island.islandNode)
                }

                for (const island of originalIslands) {
                    if (!usedTemplates.has(island)) {
                        island.islandNode.active = false
                    }
                }

                thisArg.levelIslands = plans.map(plan => plan.island)

                plans
                    .sort((a, b) => a.siblingIndex - b.siblingIndex)
                    .forEach(plan => {
                        plan.island.islandNode.setSiblingIndex(plan.siblingIndex)
                    })

                for (const plan of plans) {
                    const island = plan.island

                    if (island.___luxisLibClonedComponentNode) {
                        island.___luxisLibClonedComponentNode.active = true
                    }

                    if (island.___luxisLibClonedIslandNode) {
                        island.___luxisLibClonedIslandNode.active = true
                    }

                    delete island.___luxisLibClonedComponentNode
                    delete island.___luxisLibClonedIslandNode
                }

                if (worldPatch.data) {
                    const data = worldPatch.data

                    if (data.epicTarget !== undefined) thisArg.MapProps.EPIC_TARGET = data.epicTarget
                    if (data.intro !== undefined) thisArg.MapProps.INTRO = data.intro
                    if (data.levels !== undefined) thisArg.MapProps.LEVELS = data.levels.slice()
                    if (data.plants !== undefined) thisArg.MapProps.PLANTS = data.plants.slice()
                    if (data.startingLevels !== undefined) thisArg.startingLevels = data.startingLevels.slice()
                }

                const replacementNodes = plans.flatMap(({island}) => [
                    island.node,
                    island.islandNode
                ])

                thisArg.islandParent.children.forEach(node => {
                    if (!replacementNodes.some(target => containsNode(node, target))) {
                        hideIslandArt(node)
                    }
                })

                thisArg.___luxisLibWorldmapReplacementApplied = true

                releaseIslandBehavior()
                return callNext(...args)
            }
        })
    })
}