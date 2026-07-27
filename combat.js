// Combat resolution engine based on Age of Empires II counter mechanics

export class CombatEngine {
    static resolveCombat(attacker, defender) {
        let log = [];
        log.push(`⚔️ **BATTLE INITIATED** ⚔️`);
        log.push(`Attacker: **${attacker.username}** (${attacker.civ})`);
        log.push(`Defender: **${defender.name}**`);
        log.push(`---`);

        // Clone units
        let attUnits = {
            spearmen: attacker.military.spearmen || 0,
            archers: attacker.military.archers || 0,
            knights: attacker.military.knights || 0,
            champions: attacker.military.champions || 0,
            catapults: attacker.military.catapults || 0
        };

        let defUnits = {
            spearmen: defender.military.spearmen || 0,
            archers: defender.military.archers || 0,
            knights: defender.military.knights || 0,
            champions: defender.military.champions || 0,
            catapults: defender.military.catapults || 0
        };

        log.push(`**Starting Forces:**`);
        log.push(`Attacker: 🔱 ${attUnits.spearmen} Spearmen, 🏹 ${attUnits.archers} Archers, 🐎 ${attUnits.knights} Knights, 🛡️ ${attUnits.champions} Champions, 💥 ${attUnits.catapults} Catapults`);
        log.push(`Defender: 🔱 ${defUnits.spearmen} Spearmen, 🏹 ${defUnits.archers} Archers, 🐎 ${defUnits.knights} Knights, 🛡️ ${defUnits.champions} Champions, 💥 ${defUnits.catapults} Catapults`);
        
        const defenderHasCastle = defender.military.champions > 15 || defender.power > 7500;
        if (defenderHasCastle) {
            log.push(`🏰 **Defender Citadel:** Defender has a fortified Castle NFT! It will rain arrows unless countered by Catapults.`);
        }
        log.push(`---`);

        // Base Stats: HP / ATK
        const stats = {
            spearmen: { hp: 45, atk: 4 },
            archers: { hp: 35, atk: 5 },
            knights: { hp: 100, atk: 12 },
            champions: { hp: 70, atk: 13 },
            catapults: { hp: 80, atk: 25 }
        };

        let attModifiers = { spearmen: { hp: 1, atk: 1 }, archers: { hp: 1, atk: 1 }, knights: { hp: 1, atk: 1 }, champions: { hp: 1, atk: 1 }, catapults: { hp: 1, atk: 1 } };
        let defModifiers = { spearmen: { hp: 1, atk: 1 }, archers: { hp: 1, atk: 1 }, knights: { hp: 1, atk: 1 }, champions: { hp: 1, atk: 1 }, catapults: { hp: 1, atk: 1 } };

        // Apply Attacker Civ Advantages
        if (attacker.civ === "Britons") {
            attModifiers.archers.atk *= 1.15; // Archer ATK +15%
            log.push(`🏹 Briton Advantage: Archers receive +15% damage!`);
        } else if (attacker.civ === "Mongols") {
            attModifiers.knights.atk *= 1.15; // Cavalry ATK +15%
            log.push(`🐎 Mongol Advantage: Knights receive +15% damage!`);
        } else if (attacker.civ === "Franks") {
            attModifiers.knights.hp *= 1.20; // Cavalry HP +20%
            log.push(`🛡️ Frankish Advantage: Knights receive +20% HP!`);
        } else if (attacker.civ === "Teutons") {
            attModifiers.champions.hp *= 1.10; // Infantry Armor +10% HP boost
            log.push(`⚔️ Teuton Advantage: Champions receive +10% HP!`);
        } else if (attacker.civ === "Huns") {
            // Huns: Stable units cost -15% & Cavalry take 10% less damage in raids
            attModifiers.knights.hp *= 1.11; // Effective 10% damage reduction translates to 11% HP boost
            log.push(`🏹 Hunnic Advantage: Cavalry units take 10% less damage!`);
        }

        // Apply Blacksmith Upgrade NFTs
        if (attacker.upgrades && attacker.upgrades.fletching) {
            attModifiers.archers.atk += 0.2;
            log.push(`🔥 Attacker Blacksmith (Fletching): +20% Archer damage!`);
        }
        if (attacker.upgrades && attacker.upgrades.ironCasting) {
            attModifiers.knights.atk += 0.2;
            attModifiers.champions.atk += 0.2;
            log.push(`⚔️ Attacker Blacksmith (Iron Casting): +20% Melee damage!`);
        }

        // Apply Attacker military health state values:
        // Scale unit HP/ATK base effectiveness proportional to militaryHP percent
        const mHP = attacker.militaryHP || { spearmen: 100, archers: 100, knights: 100, champions: 100, catapults: 100 };
        log.push(`\n**Attacker Regiment Health Status:**`);
        log.push(`🔱 Spearmen HP: ${mHP.spearmen}%, 🏹 Archers HP: ${mHP.archers}%, 🐎 Knights HP: ${mHP.knights}%, 🛡️ Champions HP: ${mHP.champions}%, 💥 Catapults HP: ${mHP.catapults}%`);

        let round = 1;
        let combatEnded = false;

        while (round <= 5 && !combatEnded) {
            let attTotal = attUnits.spearmen + attUnits.archers + attUnits.knights + attUnits.champions + attUnits.catapults;
            let defTotal = defUnits.spearmen + defUnits.archers + defUnits.knights + defUnits.champions + defUnits.catapults;

            if (attTotal === 0 || defTotal === 0) {
                combatEnded = true;
                break;
            }

            log.push(`\n**ROUND ${round}**`);

            // 1. Resolve Castle Defense Damage
            if (defenderHasCastle) {
                const blockedDmg = attUnits.catapults * 50;
                // Byzantines Castle deals 20% more arrow fire
                let baseCastleDmg = defender.civ === "Byzantines" ? 240 : 200;
                const castleDmg = Math.max(0, baseCastleDmg - blockedDmg);
                if (castleDmg > 0) {
                    log.push(`🏰 Castle Arrows fire: Deals **${castleDmg}** damage to Attacker forces (Blocked ${blockedDmg} by Catapults)`);
                    let lostUnits = Math.floor(castleDmg / 70);
                    for (let i = 0; i < lostUnits; i++) {
                        if (attUnits.spearmen > 0) attUnits.spearmen--;
                        else if (attUnits.archers > 0) attUnits.archers--;
                        else if (attUnits.knights > 0) attUnits.knights--;
                        else if (attUnits.champions > 0) attUnits.champions--;
                    }
                } else {
                    log.push(`🏰 Castle Arrows neutralized! Catapults have pinned down the Citadel defenses.`);
                }
            }

            // Attacker Damage output scaled by state military HP
            let attSpearDmg = attUnits.spearmen * stats.spearmen.atk * attModifiers.spearmen.atk * (mHP.spearmen / 100);
            if (defUnits.knights > 0) {
                attSpearDmg *= 3.0; // Spearmen beat Knights
                log.push(`🔸 Attacker Spearmen pierce Defender Knights (3x counter damage)`);
            }
            
            let attArcherDmg = attUnits.archers * stats.archers.atk * attModifiers.archers.atk * (mHP.archers / 100);
            if (defUnits.spearmen > 0) {
                attArcherDmg *= 2.0; // Archers beat Spearmen
                log.push(`🔸 Attacker Archers rain arrows on Defender Spearmen (2x counter damage)`);
            }

            let attKnightDmg = attUnits.knights * stats.knights.atk * attModifiers.knights.atk * (mHP.knights / 100);
            if (defUnits.archers > 0) {
                attKnightDmg *= 2.5; // Knights beat Archers
                log.push(`🔸 Attacker Knights trample Defender Archers (2.5x counter damage)`);
            }
            if (defUnits.catapults > 0) {
                attKnightDmg *= 3.0; // Knights beat Catapults
                log.push(`🔸 Attacker Knights trample Defender Catapults (3x trample damage)`);
            }

            let attChampDmg = attUnits.champions * stats.champions.atk * attModifiers.champions.atk * (mHP.champions / 100);
            if (defUnits.spearmen > 0) {
                attChampDmg *= 1.5;
            }

            let attCatapultDmg = attUnits.catapults * stats.catapults.atk * attModifiers.catapults.atk * (mHP.catapults / 100);
            if (defenderHasCastle) {
                // Teutons: Castles Attack +15% means catapults deal slightly less ratio, but Byzantines castle has +20% HP
                let siegeRatio = defender.civ === "Byzantines" ? 3.3 : 4.0;
                attCatapultDmg *= siegeRatio;
                log.push(`💥 Attacker Catapults bombard Defender Citadel (${siegeRatio}x siege damage!)`);
            }

            let attDmg = attSpearDmg + attArcherDmg + attKnightDmg + attChampDmg + attCatapultDmg;

            // Defender Damage output
            let defSpearDmg = defUnits.spearmen * stats.spearmen.atk * defModifiers.spearmen.atk;
            if (attUnits.knights > 0) {
                defSpearDmg *= 3.0;
                log.push(`🔹 Defender Spearmen pierce Attacker Knights (3x counter damage)`);
            }

            let defArcherDmg = defUnits.archers * stats.archers.atk * defModifiers.archers.atk;
            if (attUnits.spearmen > 0) {
                defArcherDmg *= 2.0;
                log.push(`🔹 Defender Archers rain arrows on Attacker Spearmen (2x counter damage)`);
            }

            let defKnightDmg = defUnits.knights * stats.knights.atk * defModifiers.knights.atk;
            if (attUnits.archers > 0) {
                defKnightDmg *= 2.5;
                log.push(`🔹 Defender Knights trample Attacker Archers (2.5x counter damage)`);
            }
            if (attUnits.catapults > 0) {
                defKnightDmg *= 3.0;
                log.push(`🔹 Defender Knights trample Attacker Catapults (3x trample damage)`);
            }

            let defChampDmg = defUnits.champions * stats.champions.atk * defModifiers.champions.atk;
            if (attUnits.spearmen > 0) {
                defChampDmg *= 1.5;
            }

            let defCatapultDmg = defUnits.catapults * stats.catapults.atk * defModifiers.catapults.atk;

            let defDmg = defSpearDmg + defArcherDmg + defKnightDmg + defChampDmg + defCatapultDmg;

            // Apply casualties
            let defCasualties = Math.floor(attDmg / 70);
            let attCasualties = Math.floor(defDmg / 70);

            let defTotalUnits = defUnits.spearmen + defUnits.archers + defUnits.knights + defUnits.champions + defUnits.catapults;
            if (defTotalUnits > 0) {
                let ratio = defCasualties / defTotalUnits;
                let lostSpear = Math.min(defUnits.spearmen, Math.round(defUnits.spearmen * ratio));
                let lostArcher = Math.min(defUnits.archers, Math.round(defUnits.archers * ratio));
                let lostKnight = Math.min(defUnits.knights, Math.round(defUnits.knights * ratio));
                let lostChamp = Math.min(defUnits.champions, Math.round(defUnits.champions * ratio));
                let lostCatapult = Math.min(defUnits.catapults, Math.round(defUnits.catapults * ratio));

                if (lostSpear + lostArcher + lostKnight + lostChamp + lostCatapult === 0 && defCasualties > 0) {
                    if (defUnits.spearmen > 0) defUnits.spearmen--;
                    else if (defUnits.archers > 0) defUnits.archers--;
                    else if (defUnits.knights > 0) defUnits.knights--;
                    else if (defUnits.champions > 0) defUnits.champions--;
                    else if (defUnits.catapults > 0) defUnits.catapults--;
                } else {
                    defUnits.spearmen -= lostSpear;
                    defUnits.archers -= lostArcher;
                    defUnits.knights -= lostKnight;
                    defUnits.champions -= lostChamp;
                    defUnits.catapults -= lostCatapult;
                }
            }

            let attTotalUnits = attUnits.spearmen + attUnits.archers + attUnits.knights + attUnits.champions + attUnits.catapults;
            if (attTotalUnits > 0) {
                let ratio = attCasualties / attTotalUnits;
                let lostSpear = Math.min(attUnits.spearmen, Math.round(attUnits.spearmen * ratio));
                let lostArcher = Math.min(attUnits.archers, Math.round(attUnits.archers * ratio));
                let lostKnight = Math.min(attUnits.knights, Math.round(attUnits.knights * ratio));
                let lostChamp = Math.min(attUnits.champions, Math.round(attUnits.champions * ratio));
                let lostCatapult = Math.min(attUnits.catapults, Math.round(attUnits.catapults * ratio));

                if (lostSpear + lostArcher + lostKnight + lostChamp + lostCatapult === 0 && attCasualties > 0) {
                    if (attUnits.spearmen > 0) attUnits.spearmen--;
                    else if (attUnits.archers > 0) attUnits.archers--;
                    else if (attUnits.knights > 0) attUnits.knights--;
                    else if (attUnits.champions > 0) attUnits.champions--;
                    else if (attUnits.catapults > 0) attUnits.catapults--;
                } else {
                    attUnits.spearmen -= lostSpear;
                    attUnits.archers -= lostArcher;
                    attUnits.knights -= lostKnight;
                    attUnits.champions -= lostChamp;
                    attUnits.catapults -= lostCatapult;
                }
            }

            log.push(`💥 Attacker deals **${Math.floor(attDmg)}** total damage.`);
            log.push(`💥 Defender deals **${Math.floor(defDmg)}** total damage.`);
            round++;
        }

        let attRemaining = attUnits.spearmen + attUnits.archers + attUnits.knights + attUnits.champions + attUnits.catapults;
        let defRemaining = defUnits.spearmen + defUnits.archers + defUnits.knights + defUnits.champions + defUnits.catapults;

        let winner = "Draw";
        let loot = { food: 0, wood: 0, gold: 0, stone: 0 };
        let points = 0;

        log.push(`\n---`);
        log.push(`**COMBAT RESOLUTION**`);

        if (attRemaining > defRemaining) {
            winner = "Attacker";
            log.push(`🎉 **Victory for the Attacker!**`);
            const rate = 0.15 + Math.random() * 0.1;
            loot.food = Math.floor((defender.resources.food || 0) * rate);
            loot.wood = Math.floor((defender.resources.wood || 0) * rate);
            loot.gold = Math.floor((defender.resources.gold || 0) * rate);
            loot.stone = Math.floor((defender.resources.stone || 0) * rate);

            log.push(`💰 **Resources Looted:** 🍖 Food: ${loot.food}, 🪵 Wood: ${loot.wood}, 🪙 Gold: ${loot.gold}, 🪨 Stone: ${loot.stone}`);
            points = 250;
        } else if (defRemaining > attRemaining) {
            winner = "Defender";
            log.push(`💀 **Defeat! The Defender successfully repelled your forces.**`);
            points = -100;
        } else {
            log.push(`🤝 **A bloody draw! Both sides suffered complete mutual destruction.**`);
            points = 25;
        }

        let attLosses = {
            spearmen: (attacker.military.spearmen || 0) - attUnits.spearmen,
            archers: (attacker.military.archers || 0) - attUnits.archers,
            knights: (attacker.military.knights || 0) - attUnits.knights,
            champions: (attacker.military.champions || 0) - attUnits.champions,
            catapults: (attacker.military.catapults || 0) - attUnits.catapults
        };

        let defLosses = {
            spearmen: (defender.military.spearmen || 0) - defUnits.spearmen,
            archers: (defender.military.archers || 0) - defUnits.archers,
            knights: (defender.military.knights || 0) - defUnits.knights,
            champions: (defender.military.champions || 0) - defUnits.champions,
            catapults: (defender.military.catapults || 0) - defUnits.catapults
        };

        log.push(`\n**Casualties Report:**`);
        log.push(`Attacker Losses: 🔱 ${attLosses.spearmen} Spearmen, ${attLosses.archers} Archers, ${attLosses.knights} Knights, ${attLosses.champions} Champions, ${attLosses.catapults} Catapults`);
        log.push(`Defender Losses: 🛡️ ${defLosses.spearmen} Spearmen, ${defLosses.archers} Archers, ${defLosses.knights} Knights, ${defLosses.champions} Champions, ${defLosses.catapults} Catapults`);

        let pillagedNFT = null;
        if (winner === "Attacker" && Math.random() < 0.20) {
            pillagedNFT = { name: "Pillaged War Chest (Upgrade)", perk: "+100 Gold bonus & +5% military base speed" };
            log.push(`🎁 **EXTRA NFT LOOTED:** ${pillagedNFT.name} (${pillagedNFT.perk})`);
        }

        return {
            winner: winner,
            log: log,
            loot: loot,
            points: points,
            remainingMilitary: attUnits,
            pillagedNFT: pillagedNFT,
            defenderRemainingMilitary: defUnits
        };
    }
}
export default CombatEngine;
