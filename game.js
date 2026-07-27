// Main Game Logic, State Management, and UI Binding
import { LeaderboardManager } from './leaderboard.js';
import { CombatEngine } from './combat.js';
import { MarketplaceManager } from './marketplace.js';

class GameController {
    constructor() {
        this.leaderboard = new LeaderboardManager();
        this.marketplace = new MarketplaceManager(this.leaderboard);
        this.state = this.getInitialState();
        this.tickInterval = null;
        this.activeTab = "town-center";
        this.selectedTarget = null; // Currently selected map target

        this.init();
    }

    getInitialState() {
        const stored = localStorage.getItem("ages_idle_player_state");
        if (stored) {
            const parsed = JSON.parse(stored);
            
            // Set up default ecosystem properties if missing
            if (!parsed.ecosystem) {
                parsed.ecosystem = {
                    totalSupply: 1000000,
                    totalPool: 100000,
                    remainingPool: 100000,
                    marketCap: 5000,
                    tokenPrice: 0.005,
                    daysSimulated: 0,
                    regTime: Date.now()
                };
            }
            if (!parsed.currentAge) {
                parsed.currentAge = "Dark Age";
                parsed.ageLevel = 1;
                parsed.ageUpgradeProgress = { active: false, targetAge: "", targetLevel: 0, startTime: 0, endTime: 0 };
            }
            if (parsed.nfts.blacksmith === undefined) parsed.nfts.blacksmith = false;
            if (parsed.nfts.university === undefined) parsed.nfts.university = false;
            if (parsed.nfts.market === undefined) parsed.nfts.market = false;
            if (parsed.military.catapults === undefined) parsed.military.catapults = 0;
            if (parsed.allies === undefined) parsed.allies = [];
            
            // Building integrity & Military HP tracking
            if (!parsed.buildingHP) {
                parsed.buildingHP = {
                    mill: 600,
                    lumberCamp: 600,
                    miningCamp: 600,
                    barracks: 1000,
                    blacksmith: 1000,
                    market: 1200,
                    archeryRange: 1000,
                    stable: 1200,
                    university: 1400,
                    castle: 4800
                };
            }
            if (!parsed.militaryHP) {
                parsed.militaryHP = {
                    spearmen: 100,
                    archers: 100,
                    knights: 100,
                    champions: 100,
                    catapults: 100
                };
            }

            // Convert old villager HP to individual list if missing
            if (!parsed.villagerList) {
                const count = parsed.nfts.villagers || 5;
                parsed.villagerList = [];
                const jobs = parsed.villagerJobs || { food: 2, wood: 2, gold: 1, stone: 0 };
                
                let woodAssigned = jobs.wood;
                let foodAssigned = jobs.food;
                let goldAssigned = jobs.gold;
                let stoneAssigned = jobs.stone;

                for (let i = 1; i <= count; i++) {
                    let role = "idle";
                    if (woodAssigned > 0) { role = "wood"; woodAssigned--; }
                    else if (foodAssigned > 0) { role = "food"; foodAssigned--; }
                    else if (goldAssigned > 0) { role = "gold"; goldAssigned--; }
                    else if (stoneAssigned > 0) { role = "stone"; stoneAssigned--; }

                    const specs = ["Food", "Wood", "Gold", "Stone", "General"];
                    const spec = specs[(i - 1) % specs.length];
                    parsed.villagerList.push({
                        id: 1000 + i,
                        name: `Worker #${1000 + i}`,
                        hp: 100,
                        maxHp: 100,
                        specialty: spec,
                        role: role
                    });
                }
            }
            return parsed;
        }
        
        // Brand new state
        const initialList = [
            { id: 1001, name: "Worker #1001", hp: 100, maxHp: 100, specialty: "Wood", role: "wood" },
            { id: 1002, name: "Worker #1002", hp: 100, maxHp: 100, specialty: "Food", role: "food" },
            { id: 1003, name: "Worker #1003", hp: 100, maxHp: 100, specialty: "Gold", role: "gold" },
            { id: 1004, name: "Worker #1004", hp: 100, maxHp: 100, specialty: "Stone", role: "stone" },
            { id: 1005, name: "Worker #1005", hp: 100, maxHp: 100, specialty: "General", role: "idle" }
        ];

        return {
            username: "",
            civ: "",
            civPerk: "",
            registered: false,
            resources: { food: 500, wood: 500, gold: 300, stone: 100 },
            agesToken: 10,
            nfts: {
                villagers: 5,
                barracks: false,
                archeryRange: false,
                stable: false,
                castle: false,
                mill: 1,
                lumberCamp: 1,
                miningCamp: 1,
                blacksmith: false,
                university: false,
                market: false
            },
            villagerJobs: { food: 1, wood: 1, gold: 1, stone: 1 },
            military: { spearmen: 0, archers: 0, knights: 0, champions: 0, catapults: 0 },
            upgrades: {
                doubleBitAxe: false,
                horseCollar: false,
                goldMining: false,
                stoneMining: false,
                fletching: false,
                ironCasting: false
            },
            combatPoints: 1000,
            combatLogs: [],
            currentAge: "Dark Age",
            ageLevel: 1,
            ageUpgradeProgress: {
                active: false,
                targetAge: "",
                targetLevel: 0,
                startTime: 0,
                endTime: 0
            },
            ecosystem: {
                totalSupply: 1000000,
                totalPool: 100000,
                remainingPool: 100000,
                marketCap: 5000,
                tokenPrice: 0.005,
                daysSimulated: 0,
                regTime: Date.now()
            },
            allies: [],
            buildingHP: {
                mill: 600,
                lumberCamp: 600,
                miningCamp: 600,
                barracks: 1000,
                blacksmith: 1000,
                market: 1200,
                archeryRange: 1000,
                stable: 1200,
                university: 1400,
                castle: 4800
            },
            militaryHP: {
                spearmen: 100,
                archers: 100,
                knights: 100,
                champions: 100,
                catapults: 100
            },
            villagerList: initialList
        };
    }

    saveState() {
        this.state.nfts.villagers = this.state.villagerList.length;
        localStorage.setItem("ages_idle_player_state", JSON.stringify(this.state));
    }

    resetState() {
        localStorage.removeItem("ages_idle_player_state");
        localStorage.removeItem("ages_active_rentals");
        localStorage.removeItem("ages_player_listings");
        localStorage.removeItem("ages_idle_leaderboard");
        window.location.reload();
    }

    init() {
        this.bindEvents();
        this.updateUI();

        if (this.state.registered) {
            this.startLoop();
        }
    }

    startLoop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.tickInterval = setInterval(() => this.tick(), 1000);
    }

    tick() {
        if (!this.state.registered) return;

        this.updateTokenPrice();

        const rentBenefits = this.marketplace.getRentBenefits();
        const rates = this.getGatherRates(rentBenefits);
        const storageLimit = this.getStorageLimit();

        this.state.resources.food = Math.min(storageLimit, this.state.resources.food + (rates.food / 60));
        this.state.resources.wood = Math.min(storageLimit, this.state.resources.wood + (rates.wood / 60));
        this.state.resources.gold = Math.min(storageLimit, this.state.resources.gold + (rates.gold / 60));
        this.state.resources.stone = Math.min(storageLimit, this.state.resources.stone + (rates.stone / 60));

        this.toggleStorageFullAlerts(storageLimit);
        this.updateAgeResearchTick();

        this.leaderboard.updateNPCTick();
        this.marketplace.updateMarketplaceTick(this.state);

        this.saveState();
        this.updateResourceUI(rates);
        
        if (this.activeTab === "town-center") {
            this.renderTownCenter();
        } else if (this.activeTab === "manage-villagers") {
            this.renderManageVillagers();
        } else if (this.activeTab === "economic-buildings") {
            this.renderEconomicBuildings();
        } else if (this.activeTab === "military") {
            this.renderMilitary();
        } else if (this.activeTab === "nft-shop") {
            this.renderShop();
        } else if (this.activeTab === "leaderboard") {
            this.renderLeaderboard();
        } else if (this.activeTab === "marketplace") {
            this.renderMarketplace();
        }
    }

    getStorageLimit() {
        if (this.state.ageLevel === 1) return 2000;
        if (this.state.ageLevel === 2) return 10000;
        if (this.state.ageLevel === 3) return 50000;
        if (this.state.ageLevel === 4) return 250000;
        return 2000;
    }

    getMaxBuildingHP(key) {
        let base = {
            mill: 600,
            lumberCamp: 600,
            miningCamp: 600,
            barracks: 1000,
            blacksmith: 1000,
            market: 1200,
            archeryRange: 1000,
            stable: 1200,
            university: 1400,
            castle: 4800
        };
        let val = base[key] || 1000;
        if (this.state.civ === "Byzantines") {
            val = Math.floor(val * 1.2);
        }
        return val;
    }

    toggleStorageFullAlerts(limit) {
        this.toggleAlert("alert-food-full", this.state.resources.food >= limit);
        this.toggleAlert("alert-wood-full", this.state.resources.wood >= limit);
        this.toggleAlert("alert-gold-full", this.state.resources.gold >= limit);
        this.toggleAlert("alert-stone-full", this.state.resources.stone >= limit);
    }

    toggleAlert(elemId, active) {
        const elem = document.getElementById(elemId);
        if (elem) {
            if (active) elem.classList.remove("hidden");
            else elem.classList.add("hidden");
        }
    }

    updateTokenPrice() {
        const dayDuration = 24 * 3600;
        const realTimeElapsed = (Date.now() - this.state.ecosystem.regTime) / 1000;
        const simulatedDays = this.state.ecosystem.daysSimulated + (realTimeElapsed / dayDuration);
        
        const growthFactor = Math.min(1.0, simulatedDays / 30);
        this.state.ecosystem.marketCap = Math.floor(5000 + (5000 * growthFactor));
        this.state.ecosystem.tokenPrice = this.state.ecosystem.marketCap / this.state.ecosystem.totalSupply;
    }

    simulateDayPassed() {
        this.state.ecosystem.daysSimulated += 1;
        this.updateTokenPrice();
        this.saveState();
        this.updateUI();
        alert(`📅 Time Warp: Simulated 1 day passed! Market Cap increased to $${this.state.ecosystem.marketCap} (Token Price: $${this.state.ecosystem.tokenPrice.toFixed(4)})`);
    }

    getGatherRates(rentBenefits) {
        const baseSpeed = 3; 

        let foodMult = (this.state.upgrades.horseCollar ? 1.25 : 1.0) * rentBenefits.foodBonus;
        let woodMult = (this.state.upgrades.doubleBitAxe ? 1.25 : 1.0) * rentBenefits.woodBonus;
        let goldMult = (this.state.upgrades.goldMining ? 1.25 : 1.0) * rentBenefits.goldBonus;
        let stoneMult = (this.state.upgrades.stoneMining ? 1.25 : 1.0) * rentBenefits.defenseBonus;

        if (this.state.nfts.university) {
            const maxU = this.getMaxBuildingHP("university");
            const integrity = (this.state.buildingHP.university || maxU) / maxU;
            foodMult *= (1 + 0.15 * integrity);
            woodMult *= (1 + 0.15 * integrity);
            goldMult *= (1 + 0.15 * integrity);
            stoneMult *= (1 + 0.15 * integrity);
        }

        if (this.state.civ === "Britons") woodMult *= 1.10;
        if (this.state.civ === "Franks") foodMult *= 1.10;
        if (this.state.civ === "Mongols") goldMult *= 1.10;
        if (this.state.civ === "Byzantines") stoneMult *= 1.10;
        if (this.state.civ === "Teutons") foodMult *= 1.10;
        if (this.state.civ === "Huns") woodMult *= 1.15;

        // Calculate active individual villager extraction contributions
        let vFood = 0;
        let vWood = 0;
        let vGold = 0;
        let vStone = 0;

        this.state.villagerList.forEach(worker => {
            const integrity = worker.hp / 100;
            let efficiency = 1.0;

            if (worker.role === "food") {
                if (worker.specialty === "Food") efficiency = 1.15; // Specialty boost
                vFood += baseSpeed * foodMult * efficiency * integrity;
            } else if (worker.role === "wood") {
                if (worker.specialty === "Wood") efficiency = 1.15;
                vWood += baseSpeed * woodMult * efficiency * integrity;
            } else if (worker.role === "gold") {
                if (worker.specialty === "Gold") efficiency = 1.15;
                vGold += baseSpeed * goldMult * efficiency * integrity;
            } else if (worker.role === "stone") {
                if (worker.specialty === "Stone") efficiency = 1.15;
                vStone += baseSpeed * stoneMult * efficiency * integrity;
            }
        });

        const millMax = this.getMaxBuildingHP("mill");
        const millIntegrity = (this.state.buildingHP.mill || millMax) / millMax;
        const bFood = (this.state.nfts.mill || 0) * 1.5 * millIntegrity;

        const lumberMax = this.getMaxBuildingHP("lumberCamp");
        const lumberIntegrity = (this.state.buildingHP.lumberCamp || lumberMax) / lumberMax;
        const bWood = (this.state.nfts.lumberCamp || 0) * 1.5 * lumberIntegrity;

        const miningMax = this.getMaxBuildingHP("miningCamp");
        const miningIntegrity = (this.state.buildingHP.miningCamp || miningMax) / miningMax;
        const bGold = (this.state.nfts.miningCamp || 0) * 1.2 * miningIntegrity;
        const bStone = (this.state.nfts.miningCamp || 0) * 0.8 * miningIntegrity;

        let allyFoodBonus = 0;
        let allyWoodBonus = 0;
        let allyGoldBonus = 0;
        let allyStoneBonus = 0;

        if (this.state.allies && this.state.allies.length > 0) {
            this.state.allies.forEach(npcId => {
                if (npcId === "npc_viper") allyWoodBonus += 10;
                else if (npcId === "npc_hera") allyFoodBonus += 10;
                else if (npcId === "npc_daut") allyStoneBonus += 10;
                else if (npcId === "npc_yo") allyGoldBonus += 10;
                else if (npcId === "npc_tatoh") allyFoodBonus += 10;
            });
        }

        return {
            food: vFood + bFood + allyFoodBonus,
            wood: vWood + bWood + allyWoodBonus,
            gold: vGold + bGold + allyGoldBonus,
            stone: vStone + bStone + allyStoneBonus
        };
    }

    registerPlayer(username, civ) {
        if (!username || !civ) return alert("Please enter a username and select a Civilization NFT.");
        
        let civPerk = "";
        if (civ === "Britons") civPerk = "Britons: Archery range cost -10%, Wood gather +10%, Archers +15% ATK";
        else if (civ === "Franks") civPerk = "Franks: Castles cost -15%, Farm gather +10%, Cavalry +20% HP";
        else if (civ === "Mongols") civPerk = "Mongols: Catapults +20% HP, Gold gather +10%, Cavalry +15% ATK";
        else if (civ === "Byzantines") civPerk = "Byzantines: Faction buildings +20% HP, Stone gather +10%, Counter cost -15%";
        else if (civ === "Teutons") civPerk = "Teutons: Castles +15% ATK, Farm cost -20%, Infantry +10% HP";
        else if (civ === "Huns") civPerk = "Huns: Cavalry stable cost -15%, Wood gather +15%, Cavalry defense +10%";

        this.state.username = username;
        this.state.civ = civ;
        this.state.civPerk = civPerk;
        this.state.registered = true;
        this.state.ecosystem.regTime = Date.now();
        
        this.saveState();
        this.startLoop();
        this.updateUI();
    }

    bindEvents() {
        document.getElementById("register-btn")?.addEventListener("click", () => {
            const username = document.getElementById("reg-username").value;
            const civ = document.getElementById("reg-civ").value;
            this.registerPlayer(username, civ);
        });

        // Setup navbar tabs distributed logically
        const tabs = ["town-center", "manage-villagers", "economic-buildings", "military", "combat-arena", "marketplace", "nft-shop", "leaderboard"];
        tabs.forEach(tab => {
            document.getElementById(`tab-${tab}`)?.addEventListener("click", () => this.switchTab(tab));
        });

        document.getElementById("btn-click-food")?.addEventListener("click", () => this.manualGather("food"));
        document.getElementById("btn-click-wood")?.addEventListener("click", () => this.manualGather("wood"));
        document.getElementById("btn-click-gold")?.addEventListener("click", () => this.manualGather("gold"));
        document.getElementById("btn-click-stone")?.addEventListener("click", () => this.manualGather("stone"));

        // Setup delegate binds dynamically
        document.body.addEventListener("click", (e) => {
            if (e.target.id === "buy-nft-villager") this.buyVillagerNFT();
            
            // Standard / Shop Mill Construction
            if (e.target.id === "buy-nft-mill" || e.target.id === "buy-nft-shop-mill") this.buyBuildingNFT("mill", "gold", 150);
            if (e.target.id === "buy-nft-lumber" || e.target.id === "buy-nft-shop-lumber") this.buyBuildingNFT("lumberCamp", "gold", 150);
            if (e.target.id === "buy-nft-mining" || e.target.id === "buy-nft-shop-mining") this.buyBuildingNFT("miningCamp", "gold", 250);
            
            if (e.target.id === "buy-nft-barracks" || e.target.id === "buy-nft-shop-barracks") this.buyMilitaryBaseNFT("barracks", "food", 500, "gold", 300);
            if (e.target.id === "buy-nft-blacksmith" || e.target.id === "buy-nft-shop-blacksmith") this.buyMilitaryBaseNFT("blacksmith", "wood", 400, "gold", 200);
            if (e.target.id === "buy-nft-market" || e.target.id === "buy-nft-shop-market") this.buyMilitaryBaseNFT("market", "wood", 300, "gold", 100);
            
            if (e.target.id === "buy-nft-archery" || e.target.id === "buy-nft-shop-archery") {
                const costFood = this.state.civ === "Britons" ? 540 : 600;
                const costGold = this.state.civ === "Britons" ? 360 : 400;
                this.buyMilitaryBaseNFT("archeryRange", "food", costFood, "gold", costGold);
            }

            if (e.target.id === "buy-nft-stable" || e.target.id === "buy-nft-shop-stable") this.buyMilitaryBaseNFT("stable", "food", 800, "gold", 500);
            if (e.target.id === "buy-nft-university" || e.target.id === "buy-nft-shop-university") this.buyBuildingNFT("university", "wood", 1000, "gold", 500);
            
            if (e.target.id === "buy-nft-castle" || e.target.id === "buy-nft-shop-castle") {
                const costFood = this.state.civ === "Franks" ? 1700 : 2000;
                const costGold = this.state.civ === "Franks" ? 850 : 1000;
                this.buyMilitaryBaseNFT("castle", "food", costFood, "gold", costGold);
            }

            if (e.target.id === "buy-up-axe" || e.target.id === "buy-up-shop-axe") this.buyTechUpgrade("doubleBitAxe", "wood", 300);
            if (e.target.id === "buy-up-collar" || e.target.id === "buy-up-shop-collar") this.buyTechUpgrade("horseCollar", "food", 300);
            if (e.target.id === "buy-up-gold" || e.target.id === "buy-up-shop-gold") this.buyTechUpgrade("goldMining", "gold", 300);
            if (e.target.id === "buy-up-stone" || e.target.id === "buy-up-shop-stone") this.buyTechUpgrade("stoneMining", "stone", 300);
            if (e.target.id === "buy-up-fletch" || e.target.id === "buy-up-shop-fletch") this.buyTechUpgrade("fletching", "gold", 400);
            if (e.target.id === "buy-up-iron" || e.target.id === "buy-up-shop-iron") this.buyTechUpgrade("ironCasting", "gold", 500);

            // Resource Package Loot Chest triggers (Buy with $AGES memecoins)
            if (e.target.id === "buy-pack-pioneer") this.buyResourcePackage("pioneer", 20, { food: 500, wood: 500, gold: 0, stone: 0 });
            if (e.target.id === "buy-pack-imperial") this.buyResourcePackage("imperial", 50, { food: 0, wood: 0, gold: 1000, stone: 500 });
            if (e.target.id === "buy-pack-siege") this.buyResourcePackage("siege", 15, { food: 0, wood: 150, gold: 100, stone: 50 });
        });

        document.getElementById("swap-rate-btn")?.addEventListener("click", () => this.updateSwapUI());
        document.getElementById("swap-g-to-a")?.addEventListener("click", () => this.executeTokenSwap("gold"));
        document.getElementById("swap-a-to-g")?.addEventListener("click", () => this.executeTokenSwap("ages"));

        document.getElementById("train-knight")?.addEventListener("click", () => {
            const costFood = this.state.civ === "Huns" ? 51 : 60;
            const costGold = this.state.civ === "Huns" ? 63 : 75;
            this.trainUnit("knights", { food: costFood, gold: costGold });
        });

        document.getElementById("train-spearman")?.addEventListener("click", () => {
            const costFood = this.state.civ === "Byzantines" ? 42 : 50;
            const costWood = this.state.civ === "Byzantines" ? 29 : 35;
            this.trainUnit("spearmen", { food: costFood, wood: costWood });
        });

        document.getElementById("train-archer")?.addEventListener("click", () => this.trainUnit("archers", { wood: 45, gold: 35 }));
        document.getElementById("train-champion")?.addEventListener("click", () => this.trainUnit("champions", { food: 60, gold: 20 }));
        document.getElementById("train-catapult")?.addEventListener("click", () => this.trainUnit("catapults", { wood: 150, gold: 100 }));

        document.getElementById("list-rent-btn")?.addEventListener("click", () => this.handlePlayerNFTListing());

        document.getElementById("btn-advance-age")?.addEventListener("click", () => this.triggerAgeUpgrade());
        document.getElementById("btn-age-speedup")?.addEventListener("click", () => this.speedUpAgeResearch());
        document.getElementById("btn-age-test-time")?.addEventListener("click", () => this.testAgeTimeTravel());
        document.getElementById("btn-sim-day")?.addEventListener("click", () => this.simulateDayPassed());

        document.getElementById("reset-game-btn")?.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset all game progress, NFTs, and local balances?")) {
                this.resetState();
            }
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
        document.getElementById(`view-${tabName}`)?.classList.remove("hidden");

        document.querySelectorAll(".sidebar-nav button").forEach(btn => btn.classList.remove("active"));
        document.getElementById(`tab-${tabName}`)?.classList.add("active");

        this.updateUI();
    }

    updateUI() {
        if (!this.state.registered) {
            document.getElementById("registration-pane")?.classList.remove("hidden");
            document.getElementById("main-game-pane")?.classList.add("hidden");
            return;
        }

        document.getElementById("registration-pane")?.classList.add("hidden");
        document.getElementById("main-game-pane")?.classList.remove("hidden");

        document.getElementById("header-player-name").textContent = this.state.username;
        document.getElementById("header-civ").textContent = `Civ: ${this.state.civ} | ${this.state.currentAge}`;
        document.getElementById("town-civ-perk").textContent = this.state.civPerk;

        if (this.activeTab === "town-center") {
            this.renderTownCenter();
        } else if (this.activeTab === "manage-villagers") {
            this.renderManageVillagers();
        } else if (this.activeTab === "economic-buildings") {
            this.renderEconomicBuildings();
        } else if (this.activeTab === "military") {
            this.renderMilitary();
        } else if (this.activeTab === "nft-shop") {
            this.renderShop();
        } else if (this.activeTab === "combat-arena") {
            this.renderCombatArena();
        } else if (this.activeTab === "marketplace") {
            this.renderMarketplace();
        } else if (this.activeTab === "leaderboard") {
            this.renderLeaderboard();
        }
    }

    updateResourceUI(rates = null) {
        document.getElementById("res-food").textContent = Math.floor(this.state.resources.food);
        document.getElementById("res-wood").textContent = Math.floor(this.state.resources.wood);
        document.getElementById("res-gold").textContent = Math.floor(this.state.resources.gold);
        document.getElementById("res-stone").textContent = Math.floor(this.state.resources.stone);
        document.getElementById("res-ages").textContent = Math.floor(this.state.agesToken);

        const limit = this.getStorageLimit();
        document.getElementById("storage-limit-display").textContent = limit.toLocaleString();

        if (rates) {
            document.getElementById("rate-food").textContent = `+${rates.food.toFixed(1)}/m`;
            document.getElementById("rate-wood").textContent = `+${rates.wood.toFixed(1)}/m`;
            document.getElementById("rate-gold").textContent = `+${rates.gold.toFixed(1)}/m`;
            document.getElementById("rate-stone").textContent = `+${rates.stone.toFixed(1)}/m`;
        }
    }

    manualGather(resource) {
        let amt = 1.5;
        if (this.state.civ === "Franks" && resource === "food") amt += 0.5;
        if (this.state.civ === "Britons" && resource === "wood") amt += 0.5;
        if (this.state.civ === "Mongols" && resource === "food") amt += 1.0;

        const limit = this.getStorageLimit();
        this.state.resources[resource] = Math.min(limit, this.state.resources[resource] + amt);
        this.saveState();
        this.updateResourceUI();

        this.spawnFloatingGatherIndicator(resource, amt);
    }

    spawnFloatingGatherIndicator(resource, amt) {
        const btn = document.getElementById(`btn-click-${resource}`);
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        
        const floatText = document.createElement("div");
        floatText.className = "floating-text";
        floatText.textContent = `+${amt.toFixed(1)}`;
        
        const xOffset = Math.random() * 40 - 20;
        floatText.style.left = `${rect.left + rect.width / 2 + xOffset}px`;
        floatText.style.top = `${rect.top}px`;
        
        document.body.appendChild(floatText);
        setTimeout(() => floatText.remove(), 1200);
    }

    renderTownCenter() {
        const rentBenefits = this.marketplace.getRentBenefits();
        const rates = this.getGatherRates(rentBenefits);
        this.updateResourceUI(rates);

        const millMax = this.getMaxBuildingHP("mill");
        const millIntegrity = (this.state.buildingHP.mill || millMax) / millMax;
        const bFood = (this.state.nfts.mill || 0) * 1.5 * millIntegrity;
        document.getElementById("passive-rate-food").textContent = bFood.toFixed(1);

        const lumberMax = this.getMaxBuildingHP("lumberCamp");
        const lumberIntegrity = (this.state.buildingHP.lumberCamp || lumberMax) / lumberMax;
        const bWood = (this.state.nfts.lumberCamp || 0) * 1.5 * lumberIntegrity;
        document.getElementById("passive-rate-wood").textContent = bWood.toFixed(1);

        const miningMax = this.getMaxBuildingHP("miningCamp");
        const miningIntegrity = (this.state.buildingHP.miningCamp || miningMax) / miningMax;
        const bGold = (this.state.nfts.miningCamp || 0) * 1.2 * miningIntegrity;
        const bStone = (this.state.nfts.miningCamp || 0) * 0.8 * miningIntegrity;
        document.getElementById("passive-rate-gold").textContent = bGold.toFixed(1);
        document.getElementById("passive-rate-stone").textContent = bStone.toFixed(1);

        const replenishCosts = this.calculateReplenishCosts();
        let replenishDiv = document.getElementById("replenish-action-container");
        if (!replenishDiv) {
            replenishDiv = document.createElement("div");
            replenishDiv.className = "card p-3 mb-3 text-center border-gold-glow";
            replenishDiv.id = "replenish-action-container";
            
            const tc = document.getElementById("view-town-center");
            tc.insertBefore(replenishDiv, tc.firstChild);
        }

        const needsReplenish = replenishCosts.wood > 0 || replenishCosts.food > 0 || replenishCosts.gold > 0 || replenishCosts.stone > 0;
        if (needsReplenish) {
            replenishDiv.innerHTML = `
                <h4 class="font-cinzel text-warning m-0 mb-1">🛡️ REPLENISH TOWN EMPIRE 🛡️</h4>
                <p class="small text-muted mb-2 font-cinzel">Instantly rebuild flattened structures, heal wounded workers, and treat military casualties.</p>
                <div class="req-list-panel p-2 mb-2 bg-dark-overlay rounded">
                    <span class="req-item font-cinzel text-warning">
                        Costs: 🍖 ${replenishCosts.food} | 🪵 ${replenishCosts.wood} | 🪙 ${replenishCosts.gold} | 🪨 ${replenishCosts.stone}
                    </span>
                </div>
                <button class="btn btn-gold btn-sm w-100 font-cinzel" id="btn-replenish-all">REPLENISH ALL ASSETS</button>
            `;
            document.getElementById("btn-replenish-all")?.addEventListener("click", () => {
                this.executeReplenishAll(replenishCosts);
            });
        } else {
            replenishDiv.innerHTML = `
                <div class="text-success p-2 font-cinzel">
                    🏰 Faction Status: ALL STRUCTURES & FORCES AT MAXIMUM HP 🏰
                </div>
            `;
        }

        this.renderOwnedNFTs();
        this.renderAgeAdvancementSection();

        const rentPerkList = document.getElementById("active-rental-perks");
        if (rentPerkList) {
            rentPerkList.innerHTML = "";
            let perksFound = false;
            this.marketplace.activeRentals.forEach(r => {
                perksFound = true;
                const li = document.createElement("li");
                li.className = "rent-perk-item";
                li.innerHTML = `<strong>${r.name}:</strong> ${r.benefit} <span class="badge badge-warning">${r.timeLeft}s left</span>`;
                rentPerkList.appendChild(li);
            });
            if (!perksFound) {
                rentPerkList.innerHTML = `<p class="muted font-cinzel">No active NFT assets hired from the marketplace.</p>`;
            }
        }
    }

    calculateReplenishCosts() {
        let costs = { food: 0, wood: 0, gold: 0, stone: 0 };

        const shopNFTs = [
            { key: "mill", res: "wood", multiplier: 100 },
            { key: "lumberCamp", res: "wood", multiplier: 100 },
            { key: "miningCamp", res: "wood", multiplier: 100 },
            { key: "barracks", res: "wood", multiplier: 200, goldMult: 100 },
            { key: "blacksmith", res: "wood", multiplier: 150, goldMult: 80 },
            { key: "archeryRange", res: "wood", multiplier: 200, goldMult: 100 },
            { key: "stable", res: "wood", multiplier: 250, goldMult: 120 },
            { key: "market", res: "wood", multiplier: 200, goldMult: 100 },
            { key: "university", res: "wood", multiplier: 300, goldMult: 150 },
            { key: "castle", res: "stone", multiplier: 600, woodMult: 300 }
        ];

        shopNFTs.forEach(nft => {
            if (this.state.nfts[nft.key]) {
                const max = this.getMaxBuildingHP(nft.key);
                const cur = this.state.buildingHP[nft.key] !== undefined ? this.state.buildingHP[nft.key] : max;
                if (cur < max) {
                    const dmg = 1.0 - (cur / max);
                    costs.wood += Math.floor((nft.woodMult || nft.multiplier) * dmg);
                    if (nft.goldMult) costs.gold += Math.floor(nft.goldMult * dmg);
                    if (nft.key === "castle") costs.stone += Math.floor(nft.multiplier * dmg);
                }
            }
        });

        this.state.villagerList.forEach(w => {
            if (w.hp < 100) {
                const dmg = (100 - w.hp) / 100;
                costs.food += Math.floor(150 * dmg);
            }
        });

        const units = [
            { key: "spearmen", res: "food", multiplier: 120 },
            { key: "archers", res: "gold", multiplier: 80, woodMult: 120 },
            { key: "knights", res: "food", multiplier: 240, goldMult: 180 },
            { key: "champions", res: "food", multiplier: 180, goldMult: 50 },
            { key: "catapults", res: "wood", multiplier: 350, goldMult: 200 }
        ];

        units.forEach(u => {
            if (this.state.military[u.key] > 0) {
                const cur = this.state.militaryHP[u.key] !== undefined ? this.state.militaryHP[u.key] : 100;
                if (cur < 100) {
                    const dmg = (100 - cur) / 100;
                    if (u.res === "food") costs.food += Math.floor(u.multiplier * dmg);
                    if (u.res === "wood") costs.wood += Math.floor(u.multiplier * dmg);
                    if (u.goldMult) costs.gold += Math.floor(u.goldMult * dmg);
                    if (u.woodMult) costs.wood += Math.floor(u.woodMult * dmg);
                }
            }
        });

        return costs;
    }

    executeReplenishAll(costs) {
        for (const [res, val] of Object.entries(costs)) {
            if (val > 0 && this.state.resources[res] < val) {
                return alert(`Replenish all failed: Insufficient ${res.toUpperCase()} resources!`);
            }
        }
        for (const [res, val] of Object.entries(costs)) {
            this.state.resources[res] -= val;
        }

        Object.keys(this.state.buildingHP).forEach(key => {
            this.state.buildingHP[key] = this.getMaxBuildingHP(key);
        });

        this.state.villagerList.forEach(w => {
            w.hp = 100;
        });

        Object.keys(this.state.militaryHP).forEach(key => {
            this.state.militaryHP[key] = 100;
        });

        this.saveState();
        this.updateUI();
        this.updateResourceUI();
        alert("🛡️ Replenish Complete! All damaged structural bases, wounded worker villagers, and battle regiments are fully restored.");
    }

    renderOwnedNFTs() {
        const walletList = document.getElementById("my-nfts-wallet");
        if (!walletList) return;
        walletList.innerHTML = "";

        const civCard = this.createNFTCardHTML("👑 Civilization NFT", `${this.state.civ} Card #${Math.floor(this.state.ecosystem.regTime % 9999)}`, this.state.civPerk, "badge-warning");
        walletList.appendChild(civCard);

        if (this.state.nfts.mill > 0) {
            const cur = this.state.buildingHP.mill !== undefined ? this.state.buildingHP.mill : this.getMaxBuildingHP("mill");
            const millCard = this.createNFTCardHTML("🌾 Mill NFT", `Farm Hub x${this.state.nfts.mill}`, `Provides passive Food generation.`, "badge-success", cur, this.getMaxBuildingHP("mill"));
            walletList.appendChild(millCard);
        }
        if (this.state.nfts.lumberCamp > 0) {
            const cur = this.state.buildingHP.lumberCamp !== undefined ? this.state.buildingHP.lumberCamp : this.getMaxBuildingHP("lumberCamp");
            const lumberCard = this.createNFTCardHTML("🪵 Lumber Camp NFT", `Logging Camp x${this.state.nfts.lumberCamp}`, `Provides passive Wood generation.`, "badge-success", cur, this.getMaxBuildingHP("lumberCamp"));
            walletList.appendChild(lumberCard);
        }
        if (this.state.nfts.miningCamp > 0) {
            const cur = this.state.buildingHP.miningCamp !== undefined ? this.state.buildingHP.miningCamp : this.getMaxBuildingHP("miningCamp");
            const miningCard = this.createNFTCardHTML("🪨 Mining Camp NFT", `Ore Hub x${this.state.nfts.miningCamp}`, `Provides Gold & Stone passive gathering.`, "badge-success", cur, this.getMaxBuildingHP("miningCamp"));
            walletList.appendChild(miningCard);
        }
        if (this.state.nfts.blacksmith) {
            const cur = this.state.buildingHP.blacksmith !== undefined ? this.state.buildingHP.blacksmith : this.getMaxBuildingHP("blacksmith");
            const card = this.createNFTCardHTML("🔥 Blacksmith NFT", "Armory Forge", "Unlocks military tech upgrades", "badge-success", cur, this.getMaxBuildingHP("blacksmith"));
            walletList.appendChild(card);
        }
        if (this.state.nfts.university) {
            const cur = this.state.buildingHP.university !== undefined ? this.state.buildingHP.university : this.getMaxBuildingHP("university");
            const card = this.createNFTCardHTML("📜 University NFT", "Academy", "+15% passive extraction rate to resources", "badge-success", cur, this.getMaxBuildingHP("university"));
            walletList.appendChild(card);
        }
        if (this.state.nfts.market) {
            const cur = this.state.buildingHP.market !== undefined ? this.state.buildingHP.market : this.getMaxBuildingHP("market");
            const card = this.createNFTCardHTML("⚖️ Market NFT", "Trading Bazaar", "Unlocks token swaps & rental systems", "badge-success", cur, this.getMaxBuildingHP("market"));
            walletList.appendChild(card);
        }

        if (this.state.nfts.barracks) {
            const cur = this.state.buildingHP.barracks !== undefined ? this.state.buildingHP.barracks : this.getMaxBuildingHP("barracks");
            const card = this.createNFTCardHTML("🛖 Barracks NFT", "Infantry Outpost", "Allows training of Spearmen & Champions", "badge-danger", cur, this.getMaxBuildingHP("barracks"));
            walletList.appendChild(card);
        }
        if (this.state.nfts.archeryRange) {
            const cur = this.state.buildingHP.archeryRange !== undefined ? this.state.buildingHP.archeryRange : this.getMaxBuildingHP("archeryRange");
            const card = this.createNFTCardHTML("🎯 Archery Range NFT", "Ranged Archery Base", "Allows training of Archers", "badge-danger", cur, this.getMaxBuildingHP("archeryRange"));
            walletList.appendChild(card);
        }
        if (this.state.nfts.stable) {
            const cur = this.state.buildingHP.stable !== undefined ? this.state.buildingHP.stable : this.getMaxBuildingHP("stable");
            const card = this.createNFTCardHTML("🐎 Stable NFT", "Cavalry Post", "Allows training of Knights", "badge-danger", cur, this.getMaxBuildingHP("stable"));
            walletList.appendChild(card);
        }
        if (this.state.nfts.castle) {
            const cur = this.state.buildingHP.castle !== undefined ? this.state.buildingHP.castle : this.getMaxBuildingHP("castle");
            const card = this.createNFTCardHTML("🏰 Castle NFT", "Citadel Fortress", "Allows training of Catapults & defends raids", "badge-danger", cur, this.getMaxBuildingHP("castle"));
            walletList.appendChild(card);
        }

        if (this.state.military.catapults > 0) {
            for (let i = 1; i <= this.state.military.catapults; i++) {
                const card = this.createNFTCardHTML("💥 Catapult NFT", `Trebuchet Lvl 4 #${2000 + i}`, "Deals 4x siege damage and neutralizes Castle defenses", "badge-danger");
                walletList.appendChild(card);
            }
        }

        Object.entries(this.state.upgrades).forEach(([techKey, unlocked]) => {
            if (unlocked) {
                const label = techKey === "doubleBitAxe" ? "Double-Bit Axe NFT" :
                              techKey === "horseCollar" ? "Horse Collar NFT" :
                              techKey === "goldMining" ? "Gold Mining Tech NFT" :
                              techKey === "stoneMining" ? "Stone Mining Tech NFT" :
                              techKey === "fletching" ? "Fletching Blacksmith Upgrade" : "Iron Casting Blacksmith Upgrade";
                const desc = techKey.includes("Mining") || techKey.includes("Axe") || techKey.includes("Collar") ? "+25% resource extraction rate" : "+20% target combat damage";
                const card = this.createNFTCardHTML("📜 Technology Upgrade NFT", label, desc, "badge-warning");
                walletList.appendChild(card);
            }
        });
    }

    renderManageVillagers() {
        const total = this.state.villagerList.length;
        const idleCount = this.state.villagerList.filter(w => w.role === "idle").length;
        const foodCount = this.state.villagerList.filter(w => w.role === "food").length;
        const woodCount = this.state.villagerList.filter(w => w.role === "wood").length;
        const goldCount = this.state.villagerList.filter(w => w.role === "gold").length;
        const stoneCount = this.state.villagerList.filter(w => w.role === "stone").length;

        document.getElementById("summary-total-workers").textContent = total;
        document.getElementById("summary-idle-workers").textContent = idleCount;
        document.getElementById("summary-food-workers").textContent = foodCount;
        document.getElementById("summary-wood-workers").textContent = woodCount;
        document.getElementById("summary-gold-workers").textContent = goldCount;
        document.getElementById("summary-stone-workers").textContent = stoneCount;

        const vCost = Math.floor(100 * Math.pow(1.18, this.state.villagerList.length));
        const shopCostLabel = document.getElementById("shop-cost-villager");
        if (shopCostLabel) shopCostLabel.textContent = `${vCost} Gold`;

        const directory = document.getElementById("manage-villagers-directory");
        if (!directory) return;
        directory.innerHTML = "";

        if (this.state.villagerList.length === 0) {
            directory.innerHTML = `<div class="col-12 text-center text-muted font-cinzel py-3">No active worker NFTs registered. Mint Villager above.</div>`;
            return;
        }

        this.state.villagerList.forEach(w => {
            const pct = w.hp;
            const isCritical = w.hp < 25;
            
            let warningText = "";
            if (isCritical) {
                warningText = `
                    <div class="alert-full text-center p-1 rounded font-cinzel mb-2" style="font-size: 0.6rem;">
                        ⚠️ COLLAPSE IMMINENT - HEAL NOW!
                    </div>
                `;
            }

            const card = document.createElement("div");
            card.className = "col-md-4 mb-3";
            card.innerHTML = `
                <div class="card p-3 nft-wallet-card h-100 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="badge badge-info">👨‍🌾 Villager NFT</span>
                            <span class="badge ${w.role === 'idle' ? 'badge-warning' : 'badge-success'}">${w.role.toUpperCase()}</span>
                        </div>
                        ${warningText}
                        <h5 class="font-cinzel text-warning m-0 my-1">${w.name}</h5>
                        <p class="small text-muted m-0">Specialty: <strong>${w.specialty}</strong> (+15% speed)</p>
                        
                        <div class="form-group text-left mt-3">
                            <label class="small text-muted font-cinzel uppercase mb-1 d-block" style="font-size: 0.65rem;">Direct Task Assignment</label>
                            <select id="role-select-${w.id}">
                                <option value="idle" ${w.role === 'idle' ? 'selected' : ''}>Idle Status</option>
                                <option value="food" ${w.role === 'food' ? 'selected' : ''}>Farming (Food)</option>
                                <option value="wood" ${w.role === 'wood' ? 'selected' : ''}>Woodcutting (Wood)</option>
                                <option value="gold" ${w.role === 'gold' ? 'selected' : ''}>Gold Mining (Gold)</option>
                                <option value="stone" ${w.role === 'stone' ? 'selected' : ''}>Stone Quarrying (Stone)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mt-2 w-100">
                        <div class="d-flex justify-content-between small font-cinzel text-muted mb-1" style="font-size: 0.7rem;">
                            <span>Integrity HP: ${w.hp}/100</span>
                            <span class="${w.hp < 40 ? 'text-danger' : 'text-success'}">${pct}%</span>
                        </div>
                        <div class="progress-bar-container" style="height: 6px; margin: 0;">
                            <div class="progress-bar" style="width: ${pct}%; background: ${w.hp < 40 ? 'var(--color-red)' : 'var(--color-green)'}"></div>
                        </div>
                        <div id="individual-heal-btn-wrap-${w.id}"></div>
                    </div>
                </div>
            `;
            directory.appendChild(card);

            document.getElementById(`role-select-${w.id}`)?.addEventListener("change", (e) => {
                w.role = e.target.value;
                this.saveState();
                this.renderManageVillagers();
            });

            if (w.hp < 100) {
                const healCost = Math.floor(150 * ((100 - w.hp) / 100));
                const wrapper = document.getElementById(`individual-heal-btn-wrap-${w.id}`);
                if (wrapper) {
                    const btn = document.createElement("button");
                    btn.className = "btn btn-outline-warning btn-xs mt-2 font-cinzel w-100";
                    btn.textContent = `Treat Worker (🍖 ${healCost} Food)`;
                    btn.addEventListener("click", () => {
                        this.healIndividualVillager(w.id, healCost);
                    });
                    wrapper.appendChild(btn);
                }
            }
        });
    }

    renderEconomicBuildings() {
        document.getElementById("shop-count-mill").textContent = this.state.nfts.mill || 0;
        document.getElementById("shop-count-lumber").textContent = this.state.nfts.lumberCamp || 0;
        document.getElementById("shop-count-mining").textContent = this.state.nfts.miningCamp || 0;

        this.setShopAgeLock("mill", 1);
        this.setShopAgeLock("lumber", 1);
        this.setShopAgeLock("mining", 1);
        this.setShopAgeLock("market", 2);
        this.setShopAgeLock("university", 3);

        this.setShopAgeLock("up-axe", 2);
        this.setShopAgeLock("up-collar", 2);
        this.setShopAgeLock("up-gold", 3);
        this.setShopAgeLock("up-stone", 3);

        this.toggleBaseStatus("market", this.state.nfts.market);
        this.toggleBaseStatus("university", this.state.nfts.university);

        this.toggleTechStatus("axe", this.state.upgrades.doubleBitAxe);
        this.toggleTechStatus("collar", this.state.upgrades.horseCollar);
        this.toggleTechStatus("gold", this.state.upgrades.goldMining);
        this.toggleTechStatus("stone", this.state.upgrades.stoneMining);

        // Dynamically append Health Bars under constructed Economic Cards
        const shopNFTs = [
            { id: "mill", key: "mill", res: "wood", multiplier: 100 },
            { id: "lumber", key: "lumberCamp", res: "wood", multiplier: 100 },
            { id: "mining", key: "miningCamp", res: "wood", multiplier: 100 },
            { id: "market", key: "market", res: "wood", multiplier: 200, goldMult: 100 },
            { id: "university", key: "university", res: "wood", multiplier: 300, goldMult: 150 }
        ];

        shopNFTs.forEach(nft => {
            const card = document.getElementById(`shop-card-${nft.id}`);
            if (!card) return;

            card.querySelector(".building-hp-bar-wrapper")?.remove();

            const isOwned = this.state.nfts[nft.key];
            if (isOwned) {
                const maxHP = this.getMaxBuildingHP(nft.key);
                if (this.state.buildingHP[nft.key] === undefined) {
                    this.state.buildingHP[nft.key] = maxHP;
                }
                const curHP = Math.max(0, this.state.buildingHP[nft.key]);
                const hpPct = ((curHP / maxHP) * 100).toFixed(0);

                const wrapper = document.createElement("div");
                wrapper.className = "building-hp-bar-wrapper mt-3 text-left w-100";
                
                const damagePct = 1.0 - (curHP / maxHP);
                const woodRepair = Math.floor(nft.multiplier * damagePct);
                const goldRepair = nft.goldMult ? Math.floor(nft.goldMult * damagePct) : 0;

                let repairBtn = "";
                let warningText = "";
                if (curHP < maxHP * 0.25) {
                    warningText = `
                        <div class="alert-full text-center p-1 rounded font-cinzel mb-2" style="font-size: 0.6rem;">
                            ⚠️ DESTRUCTION IMMINENT! REPAIR IMMEDIATELY
                        </div>
                    `;
                }

                if (curHP < maxHP) {
                    let costText = "";
                    if (woodRepair > 0) costText += `🪵 ${woodRepair} `;
                    if (goldRepair > 0) costText += `🪙 ${goldRepair} `;

                    repairBtn = `
                        <button class="btn btn-outline-warning btn-xs w-100 mt-2 font-cinzel" id="repair-btn-${nft.key}">
                            REPAIR VAULTS (${costText})
                        </button>
                    `;
                }

                wrapper.innerHTML = `
                    ${warningText}
                    <div class="d-flex justify-content-between small font-cinzel text-muted mb-1">
                        <span>Structural HP: ${curHP}/${maxHP}</span>
                        <span class="${curHP < maxHP * 0.4 ? 'text-danger' : 'text-success'}">${hpPct}%</span>
                    </div>
                    <div class="progress-bar-container" style="height: 10px; margin: 0;">
                        <div class="progress-bar" style="width: ${hpPct}%; background: ${curHP < maxHP * 0.4 ? 'var(--color-red)' : 'var(--color-green)'}"></div>
                    </div>
                    ${repairBtn}
                `;
                card.appendChild(wrapper);

                if (curHP < maxHP) {
                    document.getElementById(`repair-btn-${nft.key}`)?.addEventListener("click", () => {
                        this.repairBuilding(nft.key, { wood: woodRepair, gold: goldRepair, stone: 0 }, maxHP);
                    });
                }
            }
        });

        // Render Active Economic NFTs Wallet
        const econWallet = document.getElementById("economic-nfts-wallet");
        if (econWallet) {
            econWallet.innerHTML = "";

            const civCard = this.createNFTCardHTML("👑 Civilization NFT", `${this.state.civ} Card #${Math.floor(this.state.ecosystem.regTime % 9999)}`, this.state.civPerk, "badge-warning");
            econWallet.appendChild(civCard);

            if (this.state.nfts.mill > 0) {
                const cur = this.state.buildingHP.mill !== undefined ? this.state.buildingHP.mill : this.getMaxBuildingHP("mill");
                const card = this.createNFTCardHTML("🌾 Mill NFT", `Farm Hub x${this.state.nfts.mill}`, `Passive Food Output.`, "badge-success", cur, this.getMaxBuildingHP("mill"));
                econWallet.appendChild(card);
            }
            if (this.state.nfts.lumberCamp > 0) {
                const cur = this.state.buildingHP.lumberCamp !== undefined ? this.state.buildingHP.lumberCamp : this.getMaxBuildingHP("lumberCamp");
                const card = this.createNFTCardHTML("🪵 Lumber Camp NFT", `Logging Camp x${this.state.nfts.lumberCamp}`, `Passive Wood Output.`, "badge-success", cur, this.getMaxBuildingHP("lumberCamp"));
                econWallet.appendChild(card);
            }
            if (this.state.nfts.miningCamp > 0) {
                const cur = this.state.buildingHP.miningCamp !== undefined ? this.state.buildingHP.miningCamp : this.getMaxBuildingHP("miningCamp");
                const card = this.createNFTCardHTML("🪨 Mining Camp NFT", `Ore Hub x${this.state.nfts.miningCamp}`, `Passive Gold & Stone Output.`, "badge-success", cur, this.getMaxBuildingHP("miningCamp"));
                econWallet.appendChild(card);
            }
            if (this.state.nfts.market) {
                const cur = this.state.buildingHP.market !== undefined ? this.state.buildingHP.market : this.getMaxBuildingHP("market");
                const card = this.createNFTCardHTML("⚖️ Market NFT", "Trading Bazaar", "Enables swaps & renting", "badge-success", cur, this.getMaxBuildingHP("market"));
                econWallet.appendChild(card);
            }
            if (this.state.nfts.university) {
                const cur = this.state.buildingHP.university !== undefined ? this.state.buildingHP.university : this.getMaxBuildingHP("university");
                const card = this.createNFTCardHTML("📜 University NFT", "Academy", "+15% global rate speed bonus", "badge-success", cur, this.getMaxBuildingHP("university"));
                econWallet.appendChild(card);
            }
        }
    }

    renderMilitary() {
        const rentBenefits = this.marketplace.getRentBenefits();

        document.getElementById("mil-count-spearman").textContent = this.state.military.spearmen || 0;
        document.getElementById("mil-count-archer").textContent = this.state.military.archers || 0;
        document.getElementById("mil-count-knight").textContent = this.state.military.knights || 0;
        document.getElementById("mil-count-champion").textContent = this.state.military.champions || 0;
        document.getElementById("mil-count-catapult").textContent = this.state.military.catapults || 0;

        this.setShopAgeLock("barracks", 1);
        this.setShopAgeLock("blacksmith", 2);
        this.setShopAgeLock("archery", 2);
        this.setShopAgeLock("stable", 2);
        this.setShopAgeLock("castle", 3);
        this.setShopAgeLock("up-fletch", 3);
        this.setShopAgeLock("up-iron", 4);

        this.toggleBaseStatus("barracks", this.state.nfts.barracks);
        this.toggleBaseStatus("blacksmith", this.state.nfts.blacksmith);
        this.toggleBaseStatus("archery", this.state.nfts.archeryRange || rentBenefits.archeryRangeUnlocked, rentBenefits.archeryRangeUnlocked);
        this.toggleBaseStatus("stable", this.state.nfts.stable || rentBenefits.stableUnlocked, rentBenefits.stableUnlocked);
        this.toggleBaseStatus("castle", this.state.nfts.castle || rentBenefits.castleUnlocked, rentBenefits.castleUnlocked);
        this.toggleTechStatus("fletch", this.state.upgrades.fletching);
        this.toggleTechStatus("iron", this.state.upgrades.ironCasting);

        this.setTrainingUnlock("train-spearman", this.state.nfts.barracks && this.state.ageLevel >= 1, 1);
        this.setTrainingUnlock("train-archer", (this.state.nfts.archeryRange || rentBenefits.archeryRangeUnlocked) && this.state.ageLevel >= 2, 2);
        this.setTrainingUnlock("train-knight", (this.state.nfts.stable || rentBenefits.stableUnlocked) && this.state.ageLevel >= 2, 2);
        this.setTrainingUnlock("train-champion", this.state.nfts.barracks && this.state.ageLevel >= 4, 4);
        this.setTrainingUnlock("train-catapult", (this.state.nfts.castle || rentBenefits.castleUnlocked) && this.state.ageLevel >= 4, 4);

        // HP progress bars under military Shop cards
        const shopNFTs = [
            { id: "barracks", key: "barracks", res: "wood", multiplier: 200, goldMult: 100 },
            { id: "blacksmith", key: "blacksmith", res: "wood", multiplier: 150, goldMult: 80 },
            { id: "archery", key: "archeryRange", res: "wood", multiplier: 200, goldMult: 100 },
            { id: "stable", key: "stable", res: "wood", multiplier: 250, goldMult: 120 },
            { id: "castle", key: "castle", res: "stone", multiplier: 600, woodMult: 300 }
        ];

        shopNFTs.forEach(nft => {
            const card = document.getElementById(`shop-card-${nft.id}`);
            if (!card) return;

            card.querySelector(".building-hp-bar-wrapper")?.remove();

            const isOwned = this.state.nfts[nft.key];
            if (isOwned) {
                const maxHP = this.getMaxBuildingHP(nft.key);
                if (this.state.buildingHP[nft.key] === undefined) {
                    this.state.buildingHP[nft.key] = maxHP;
                }
                const curHP = Math.max(0, this.state.buildingHP[nft.key]);
                const hpPct = ((curHP / maxHP) * 100).toFixed(0);

                const wrapper = document.createElement("div");
                wrapper.className = "building-hp-bar-wrapper mt-3 text-left w-100";
                
                const damagePct = 1.0 - (curHP / maxHP);
                const woodRepair = Math.floor((nft.woodMult || nft.multiplier) * damagePct);
                const goldRepair = nft.goldMult ? Math.floor(nft.goldMult * damagePct) : 0;
                const stoneRepair = nft.id === "castle" ? Math.floor(nft.multiplier * damagePct) : 0;

                let repairBtn = "";
                let warningText = "";
                if (curHP < maxHP * 0.25) {
                    warningText = `
                        <div class="alert-full text-center p-1 rounded font-cinzel mb-2" style="font-size: 0.6rem;">
                            ⚠️ DESTRUCTION IMMINENT! REPAIR IMMEDIATELY
                        </div>
                    `;
                }

                if (curHP < maxHP) {
                    let costText = "";
                    if (stoneRepair > 0) costText += `🪨 ${stoneRepair} `;
                    if (woodRepair > 0) costText += `🪵 ${woodRepair} `;
                    if (goldRepair > 0) costText += `🪙 ${goldRepair} `;

                    repairBtn = `
                        <button class="btn btn-outline-warning btn-xs w-100 mt-2 font-cinzel" id="repair-btn-${nft.key}">
                            REPAIR VAULTS (${costText})
                        </button>
                    `;
                }

                wrapper.innerHTML = `
                    ${warningText}
                    <div class="d-flex justify-content-between small font-cinzel text-muted mb-1">
                        <span>Structural HP: ${curHP}/${maxHP}</span>
                        <span class="${curHP < maxHP * 0.4 ? 'text-danger' : 'text-success'}">${hpPct}%</span>
                    </div>
                    <div class="progress-bar-container" style="height: 10px; margin: 0;">
                        <div class="progress-bar" style="width: ${hpPct}%; background: ${curHP < maxHP * 0.4 ? 'var(--color-red)' : 'var(--color-green)'}"></div>
                    </div>
                    ${repairBtn}
                `;
                card.appendChild(wrapper);

                if (curHP < maxHP) {
                    document.getElementById(`repair-btn-${nft.key}`)?.addEventListener("click", () => {
                        this.repairBuilding(nft.key, { wood: woodRepair, gold: goldRepair, stone: stoneRepair }, maxHP);
                    });
                }
            }
        });

        // Dynamic heal button binds for military units
        const units = [
            { id: "spearman", key: "spearmen", res: "food", multiplier: 120 },
            { id: "archer", key: "archers", res: "gold", multiplier: 80, woodMult: 120 },
            { id: "knight", key: "knights", res: "food", multiplier: 240, goldMult: 180 },
            { id: "champion", key: "champions", res: "food", multiplier: 180, goldMult: 50 },
            { id: "catapult", key: "catapults", res: "wood", multiplier: 350, goldMult: 200 }
        ];

        units.forEach(u => {
            const box = document.getElementById(`garr-item-${u.id}`);
            if (!box) return;

            box.querySelector(".military-hp-wrapper")?.remove();

            const count = this.state.military[u.key] || 0;
            if (count > 0) {
                if (this.state.militaryHP[u.key] === undefined) {
                    this.state.militaryHP[u.key] = 100;
                }
                const curHP = Math.max(0, this.state.militaryHP[u.key]);
                
                const wrapper = document.createElement("div");
                wrapper.className = "military-hp-wrapper mt-2 text-center w-100";

                const damagePct = (100 - curHP) / 100;
                const cost1 = Math.floor(u.multiplier * damagePct);
                const cost2 = u.goldMult ? Math.floor(u.goldMult * damagePct) : 0;
                const cost3 = u.woodMult ? Math.floor(u.woodMult * damagePct) : 0;

                let healBtn = "";
                if (curHP < 100) {
                    let costText = "";
                    if (cost3 > 0) costText += `🪵 ${cost3} `;
                    if (cost1 > 0) costText += `🍖 ${cost1} `;
                    if (cost2 > 0) costText += `🪙 ${cost2} `;

                    healBtn = `
                        <button class="btn btn-outline-warning btn-xs w-100 mt-2 font-cinzel" id="heal-btn-${u.key}">
                            HEAL REGIMENT (${costText})
                        </button>
                    `;
                }

                wrapper.innerHTML = `
                    <div class="d-flex justify-content-between small font-cinzel text-muted mb-1">
                        <span>Regiment Health</span>
                        <span class="${curHP < 40 ? 'text-danger' : 'text-success'}">${curHP}%</span>
                    </div>
                    <div class="progress-bar-container" style="height: 8px; margin: 0;">
                        <div class="progress-bar" style="width: ${curHP}%; background: ${curHP < 40 ? 'var(--color-red)' : 'var(--color-green)'}"></div>
                    </div>
                    ${healBtn}
                `;
                box.appendChild(wrapper);

                if (curHP < 100) {
                    document.getElementById(`heal-btn-${u.key}`)?.addEventListener("click", () => {
                        this.healRegiment(u.key, { food: u.res === "food" ? cost1 : 0, gold: cost2, wood: u.res === "wood" ? cost1 : cost3 });
                    });
                }
            }
        });

        // Render Garrisoned Military NFTs Wallet
        const milWallet = document.getElementById("military-nfts-wallet");
        if (milWallet) {
            milWallet.innerHTML = "";
            let anyMilitaryNFT = false;

            if (this.state.nfts.barracks) {
                anyMilitaryNFT = true;
                const cur = this.state.buildingHP.barracks !== undefined ? this.state.buildingHP.barracks : this.getMaxBuildingHP("barracks");
                const card = this.createNFTCardHTML("🛖 Barracks NFT", "Infantry Outpost", "Spearmen & Champions Hub", "badge-danger", cur, this.getMaxBuildingHP("barracks"));
                milWallet.appendChild(card);
            }
            if (this.state.nfts.blacksmith) {
                anyMilitaryNFT = true;
                const cur = this.state.buildingHP.blacksmith !== undefined ? this.state.buildingHP.blacksmith : this.getMaxBuildingHP("blacksmith");
                const card = this.createNFTCardHTML("🔥 Blacksmith NFT", "Armory Forge", "Prerequisite for combat tech", "badge-success", cur, this.getMaxBuildingHP("blacksmith"));
                milWallet.appendChild(card);
            }
            if (this.state.nfts.archeryRange) {
                anyMilitaryNFT = true;
                const cur = this.state.buildingHP.archeryRange !== undefined ? this.state.buildingHP.archeryRange : this.getMaxBuildingHP("archeryRange");
                const card = this.createNFTCardHTML("🎯 Archery Range NFT", "Ranged Hub", "Archers training base", "badge-danger", cur, this.getMaxBuildingHP("archeryRange"));
                milWallet.appendChild(card);
            }
            if (this.state.nfts.stable) {
                anyMilitaryNFT = true;
                const cur = this.state.buildingHP.stable !== undefined ? this.state.buildingHP.stable : this.getMaxBuildingHP("stable");
                const card = this.createNFTCardHTML("🐎 Stable NFT", "Cavalry Post", "Knights training stable", "badge-danger", cur, this.getMaxBuildingHP("stable"));
                milWallet.appendChild(card);
            }
            if (this.state.nfts.castle) {
                anyMilitaryNFT = true;
                const cur = this.state.buildingHP.castle !== undefined ? this.state.buildingHP.castle : this.getMaxBuildingHP("castle");
                const card = this.createNFTCardHTML("🏰 Castle NFT", "Citadel Fortress", "Catapults base & active defensive arrows", "badge-danger", cur, this.getMaxBuildingHP("castle"));
                milWallet.appendChild(card);
            }

            if (this.state.military.catapults > 0) {
                anyMilitaryNFT = true;
                for (let i = 1; i <= this.state.military.catapults; i++) {
                    const card = this.createNFTCardHTML("💥 Catapult NFT", `Trebuchet Lvl 4 #${2000 + i}`, "Deals 4x siege damage and neutralizes Castle defenses", "badge-danger");
                    milWallet.appendChild(card);
                }
            }

            if (this.state.upgrades.fletching) {
                anyMilitaryNFT = true;
                const card = this.createNFTCardHTML("📜 Technology NFT", "Fletching Upgrade", "Archery damage +20%", "badge-warning");
                milWallet.appendChild(card);
            }
            if (this.state.upgrades.ironCasting) {
                anyMilitaryNFT = true;
                const card = this.createNFTCardHTML("📜 Technology NFT", "Iron Casting Upgrade", "Melee damage +20%", "badge-warning");
                milWallet.appendChild(card);
            }

            if (!anyMilitaryNFT) {
                milWallet.innerHTML = `<div class="col-12 text-center text-muted font-cinzel py-3">No garrisoned military NFTs (Bases, Siege, or combat upgrades) owned. Construct them above.</div>`;
            }
        }
    }

    // Dynamic Shop tab view handling lock status, asset buys, and upgrades
    renderShop() {
        const rentBenefits = this.marketplace.getRentBenefits();

        this.setShopAgeLock("shop-mill", 1);
        this.setShopAgeLock("shop-lumber", 1);
        this.setShopAgeLock("shop-mining", 1);
        this.setShopAgeLock("shop-market", 2);
        this.setShopAgeLock("shop-university", 3);
        
        this.setShopAgeLock("shop-barracks", 1);
        this.setShopAgeLock("shop-blacksmith", 2);
        this.setShopAgeLock("shop-archery", 2);
        this.setShopAgeLock("shop-stable", 2);
        this.setShopAgeLock("shop-castle", 3);

        this.setShopAgeLock("shop-up-axe", 2);
        this.setShopAgeLock("shop-up-collar", 2);
        this.setShopAgeLock("shop-up-gold", 3);
        this.setShopAgeLock("shop-up-stone", 3);
        this.setShopAgeLock("shop-up-fletch", 3);
        this.setShopAgeLock("shop-up-iron", 4);

        // Toggle button states in general shop tab
        this.toggleBaseStatus("shop-market", this.state.nfts.market);
        this.toggleBaseStatus("shop-university", this.state.nfts.university);
        
        this.toggleBaseStatus("shop-barracks", this.state.nfts.barracks);
        this.toggleBaseStatus("shop-blacksmith", this.state.nfts.blacksmith);
        this.toggleBaseStatus("shop-archery", this.state.nfts.archeryRange || rentBenefits.archeryRangeUnlocked, rentBenefits.archeryRangeUnlocked);
        this.toggleBaseStatus("shop-stable", this.state.nfts.stable || rentBenefits.stableUnlocked, rentBenefits.stableUnlocked);
        this.toggleBaseStatus("shop-castle", this.state.nfts.castle || rentBenefits.castleUnlocked, rentBenefits.castleUnlocked);

        this.toggleTechStatus("shop-axe", this.state.upgrades.doubleBitAxe);
        this.toggleTechStatus("shop-collar", this.state.upgrades.horseCollar);
        this.toggleTechStatus("shop-gold", this.state.upgrades.goldMining);
        this.toggleTechStatus("shop-stone", this.state.upgrades.stoneMining);
        this.toggleTechStatus("shop-fletch", this.state.upgrades.fletching);
        this.toggleTechStatus("shop-iron", this.state.upgrades.ironCasting);
    }

    buyResourcePackage(packKey, agesCost, rewards) {
        if (this.state.agesToken < agesCost) {
            return alert(`Purchase failed: Need ${agesCost} $AGES memecoins!`);
        }

        this.state.agesToken -= agesCost;
        const limit = this.getStorageLimit();

        for (const [res, amt] of Object.entries(rewards)) {
            if (amt > 0) {
                this.state.resources[res] = Math.min(limit, this.state.resources[res] + amt);
            }
        }

        this.saveState();
        this.updateUI();
        this.updateResourceUI();
        alert(`🎁 Resource Package Successfully Unlocked!\nVaults credited: ${rewards.food ? '🍖 +' + rewards.food : ''} ${rewards.wood ? '🪵 +' + rewards.wood : ''} ${rewards.gold ? '🪙 +' + rewards.gold : ''} ${rewards.stone ? '🪨 +' + rewards.stone : ''}`);
    }

    healRegiment(unitKey, costs) {
        for (const [res, val] of Object.entries(costs)) {
            if (val > 0 && this.state.resources[res] < val) {
                return alert(`Regiment Heal failed: Insufficient ${res.toUpperCase()}!`);
            }
        }
        for (const [res, val] of Object.entries(costs)) {
            this.state.resources[res] -= val;
        }

        this.state.militaryHP[unitKey] = 100;
        this.saveState();
        this.renderMilitary();
        this.updateResourceUI();
        alert(`💖 Regiment successfully healed. Standing military forces fully restored.`);
    }

    setTrainingUnlock(btnId, unlocked, reqLevel) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        const tooLowAge = this.state.ageLevel < reqLevel;
        if (tooLowAge) {
            btn.disabled = true;
            btn.textContent = `LOCKED: Lvl ${reqLevel} Age`;
        } else {
            btn.disabled = !unlocked;
            btn.textContent = btnId === "train-spearman" ? "Train Spearman" :
                              btnId === "train-archer" ? "Train Archer" :
                              btnId === "train-knight" ? "Train Knight" :
                              btnId === "train-champion" ? "Train Champion" : "Train Catapult";
            if (!unlocked) {
                if (btnId === "train-catapult") {
                    btn.title = "Unlock/rent a Castle NFT to build catapults.";
                } else {
                    btn.title = "Unlock/rent the required Military Building NFT in the Shop first.";
                }
            } else {
                btn.removeAttribute("title");
            }
        }
    }

    trainUnit(unitType, cost) {
        for (const [res, amt] of Object.entries(cost)) {
            if (this.state.resources[res] < amt) {
                return alert(`Training failed: Need ${amt} ${res.toUpperCase()}!`);
            }
        }
        for (const [res, amt] of Object.entries(cost)) {
            this.state.resources[res] -= amt;
        }

        this.state.military[unitType] = (this.state.military[unitType] || 0) + 1;
        this.state.militaryHP[unitType] = 100;

        this.saveState();
        this.renderMilitary();
        this.updateResourceUI();
    }

    renderCombatArena() {
        const listDiv = document.getElementById("combat-targets-list");
        if (!listDiv) return;
        listDiv.innerHTML = "";

        const mapContainer = document.createElement("div");
        mapContainer.className = "strategy-map-container";
        
        const overlay = document.createElement("div");
        overlay.className = "strategy-map-overlay";
        overlay.innerHTML = `
            <h4>🌲 Black Forest PvP Realm 🌲</h4>
            <span>Allies are clustered close in South-West clearing; enemies are in North-East Faction sector.</span>
        `;
        mapContainer.appendChild(overlay);

        const staticTrees = [
            { x: 38, y: 15 }, { x: 42, y: 22 }, { x: 45, y: 32 }, { x: 40, y: 45 },
            { x: 48, y: 55 }, { x: 38, y: 68 }, { x: 35, y: 78 }, { x: 58, y: 10 },
            { x: 62, y: 25 }, { x: 60, y: 40 }, { x: 64, y: 68 }, { x: 62, y: 82 },
            { x: 10, y: 35 }, { x: 15, y: 25 }, { x: 88, y: 60 }, { x: 85, y: 75 }
        ];

        staticTrees.forEach((t, i) => {
            const tree = document.createElement("div");
            tree.className = "strategy-map-tree";
            tree.textContent = i % 2 === 0 ? "🌲" : "🌳";
            tree.style.left = `${t.x}%`;
            tree.style.top = `${t.y}%`;
            mapContainer.appendChild(tree);
        });

        const coordinates = {
            "npc_viper": { x: 22, y: 56 },
            "npc_hera": { x: 80, y: 20 },
            "npc_daut": { x: 50, y: 38 },
            "npc_yo": { x: 74, y: 56 },
            "npc_tatoh": { x: 25, y: 80 }
        };

        const userNode = document.createElement("div");
        userNode.className = "map-kingdom-node node-user-kingdom";
        userNode.style.left = `10%`;
        userNode.style.top = `68%`;
        
        let playerAgeIcon = "⛺";
        if (this.state.ageLevel === 2) playerAgeIcon = "🪵";
        else if (this.state.ageLevel === 3) playerAgeIcon = "🏰";
        else if (this.state.ageLevel === 4) playerAgeIcon = "👑";

        const playerPower = this.leaderboard.calculatePower(this.state);
        const playerSize = Math.max(70, Math.min(115, 70 + (playerPower - 1000) / 100));

        const userMil = (this.state.military.spearmen || 0) + (this.state.military.archers || 0) + 
                        (this.state.military.knights || 0) + (this.state.military.champions || 0) + 
                        (this.state.military.catapults || 0);
        
        const playerHasCastle = this.state.nfts.castle ? "🏰" : "";

        userNode.innerHTML = `
            <div class="map-kingdom-icon" style="width: ${playerSize}px; height: ${playerSize}px;">
                <div class="village-layout">
                    <span class="village-assets-banner font-cinzel">${playerHasCastle} ⚔️${userMil}</span>
                    <span class="village-row-houses">🌳🏡🌳</span>
                    <span class="node-icon-graphic">${playerAgeIcon}</span>
                </div>
            </div>
            <div class="map-kingdom-label font-cinzel">
                ${this.state.username} (YOU)
                <span class="map-kingdom-power" style="color: #81c784;">Power: ${playerPower}</span>
            </div>
        `;
        mapContainer.appendChild(userNode);

        const targets = this.leaderboard.npcs;
        targets.forEach(target => {
            const coords = coordinates[target.id] || { x: 50, y: 50 };
            const node = document.createElement("div");
            const isAllied = this.state.allies && this.state.allies.includes(target.id);
            node.className = `map-kingdom-node ${isAllied ? 'node-ally-kingdom' : ''}`;
            node.style.left = `${coords.x}%`;
            node.style.top = `${coords.y}%`;

            let npcIcon = "⛺";
            if (target.power > 8500) npcIcon = "👑";
            else if (target.power > 7800) npcIcon = "🏰";
            else if (target.power > 7000) npcIcon = "🪵";

            const size = Math.max(70, Math.min(115, 70 + (target.power - 7000) / 40));

            let houses = "🏡🌳";
            if (size > 95) houses = "🏡🌳🏰🌳🏡";
            else if (size > 80) houses = "🏡🌳🏡";

            const npcHasCastle = (target.military.champions > 15 || target.power > 7500) ? "🏰" : "";
            const npcMil = (target.military.spearmen || 0) + (target.military.archers || 0) + 
                           (target.military.knights || 0) + (target.military.champions || 0);

            node.innerHTML = `
                <div class="map-kingdom-icon" style="width: ${size}px; height: ${size}px;">
                    <div class="village-layout">
                        <span class="village-assets-banner font-cinzel">${npcHasCastle} ⚔️${npcMil}</span>
                        <span class="village-row-houses">${houses}</span>
                        <span class="node-icon-graphic">${npcIcon}</span>
                    </div>
                </div>
                <div class="map-kingdom-label font-cinzel">
                    ${target.name.replace(/ \(.+\)/, "")} ${isAllied ? '🤝' : ''}
                    <span class="map-kingdom-power">${isAllied ? 'ALLY' : 'Power: ' + target.power}</span>
                </div>
            `;

            node.addEventListener("click", () => this.selectMapTarget(target));
            mapContainer.appendChild(node);
        });

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("style", "position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;");
        targets.forEach(target => {
            const coords = coordinates[target.id];
            if (!coords) return;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const isAllied = this.state.allies && this.state.allies.includes(target.id);
            
            line.setAttribute("x1", "15%");
            line.setAttribute("y1", "75%");
            line.setAttribute("x2", `${coords.x + 5}%`);
            line.setAttribute("y2", `${coords.y + 5}%`);
            
            if (isAllied) {
                line.setAttribute("stroke", "#81c784");
                line.setAttribute("stroke-width", "3");
                line.setAttribute("stroke-dasharray", "6,4");
            } else {
                line.setAttribute("stroke", "#d32f2f");
                line.setAttribute("stroke-width", "1");
                line.setAttribute("stroke-dasharray", "2,8");
            }
            svg.appendChild(line);
        });
        mapContainer.appendChild(svg);

        listDiv.appendChild(mapContainer);

        const detailsPanel = document.createElement("div");
        detailsPanel.className = "card p-4 selected-target-panel mt-3";
        detailsPanel.id = "target-inspect-panel";

        if (!this.selectedTarget) {
            detailsPanel.innerHTML = `
                <div class="text-center text-muted py-2 font-cinzel">
                    <p class="m-0">Click any Kingdom Node on the map above to inspect defenses, form alliances, or launch a raid.</p>
                </div>
            `;
        } else {
            const target = this.selectedTarget;
            const hasCastle = target.military.champions > 15 || target.power > 7500;
            const castleWarning = hasCastle ? 
                `<div class="badge badge-danger mb-2 font-cinzel">🏰 Citadel Defense Active (Castle arrow fire deals 200 dmg unless countered by Catapults)</div>` : "";

            const isAllied = this.state.allies && this.state.allies.includes(target.id);
            
            let actionBtnHtml = "";
            if (isAllied) {
                actionBtnHtml = `
                    <div class="row w-100">
                        <div class="col-12">
                            <button class="btn btn-outline-danger w-100" id="btn-break-alliance">BREAK ALLIANCE PACT</button>
                        </div>
                    </div>
                `;
            } else {
                actionBtnHtml = `
                    <div class="row">
                        <div class="col-6">
                            <button class="btn btn-outline-success w-100" id="btn-form-alliance">FORM ALLIANCE (100 $AGES)</button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-danger w-100" id="btn-execute-raid">LAUNCH RAIDING MARCH</button>
                        </div>
                    </div>
                `;
            }

            detailsPanel.innerHTML = `
                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                    <h3 class="font-cinzel m-0 gold-text">${target.name} ${isAllied ? '🤝 (Allied Pact)' : ''}</h3>
                    <span class="badge ${isAllied ? 'badge-success' : 'badge-danger'}">${isAllied ? 'ALLIED' : 'Power: ' + target.power}</span>
                </div>
                ${isAllied ? `<div class="badge badge-success mb-2 font-cinzel">🤝 Alliance Tributary: You receive +10/min of their specialty resource!</div>` : castleWarning}
                <div class="row">
                    <div class="col-md-6 mb-2 text-left">
                        <h5 class="font-cinzel text-warning mb-1">Garrison Forces:</h5>
                        <ul class="small m-0 pl-3">
                            <li>🔱 Spearmen: ${target.military.spearmen}</li>
                            <li>🏹 Archers: ${target.military.archers}</li>
                            <li>🐎 Knights: ${target.military.knights}</li>
                            <li>🛡️ Champions: ${target.military.champions}</li>
                        </ul>
                    </div>
                    <div class="col-md-6 mb-2 text-left">
                        <h5 class="font-cinzel text-warning mb-1">Vulnerable Vaults:</h5>
                        <ul class="small m-0 pl-3">
                            <li>🍖 Food: ${target.resources.food}</li>
                            <li>🪵 Wood: ${target.resources.wood}</li>
                            <li>🪙 Gold: ${target.resources.gold}</li>
                            <li>🪨 Stone: ${target.resources.stone}</li>
                        </ul>
                    </div>
                </div>
                <div class="divider my-2"></div>
                <div class="row align-items-center mt-2">
                    <div class="col-md-5 small text-muted text-left font-cinzel">
                        Civ Perk: <em>${target.civPerk}</em>
                    </div>
                    <div class="col-md-7">
                        ${actionBtnHtml}
                    </div>
                </div>
            `;

            setTimeout(() => {
                document.getElementById("btn-execute-raid")?.addEventListener("click", () => this.executeRaid(target));
                document.getElementById("btn-form-alliance")?.addEventListener("click", () => this.formDiplomaticAlliance(target));
                document.getElementById("btn-break-alliance")?.addEventListener("click", () => this.breakDiplomaticAlliance(target));
            }, 10);
        }
        listDiv.appendChild(detailsPanel);

        this.renderAlliesDashboard();

        const logBox = document.getElementById("combat-log-console");
        if (logBox) {
            logBox.innerHTML = "";
            if (this.state.combatLogs.length === 0) {
                logBox.innerHTML = `<p class="muted font-cinzel">Awaiting troop deployment logs...</p>`;
            } else {
                const lastLog = this.state.combatLogs[this.state.combatLogs.length - 1];
                const heading = document.createElement("h5");
                heading.className = "text-center gold-text border-bottom pb-2";
                heading.textContent = `Combat Report (Outcome: ${lastLog.winner})`;
                logBox.appendChild(heading);

                lastLog.log.forEach(line => {
                    const p = document.createElement("p");
                    p.className = "combat-log-line";
                    p.innerHTML = line;
                    logBox.appendChild(p);
                });
            }
        }
    }

    formDiplomaticAlliance(target) {
        if (this.state.agesToken < 100) {
            return alert("Form Alliance failed: Diplomacy requires 100 $AGES memetokens as a signing treaty tribute.");
        }

        this.state.agesToken -= 100;
        this.state.allies.push(target.id);
        this.selectedTarget = null;
        
        this.saveState();
        this.renderCombatArena();
        this.updateResourceUI();
        alert(`🤝 Faction Treaty Signed! You are now allied with ${target.name}. They will send you passive resource trade tributes.`);
    }

    breakDiplomaticAlliance(target) {
        if (!confirm(`Are you sure you want to break your diplomatic pact with ${target.name}? You will lose their resource tribute.`)) return;

        this.state.allies = this.state.allies.filter(id => id !== target.id);
        this.selectedTarget = null;

        this.saveState();
        this.renderCombatArena();
        alert(`💔 Treaty Broken. ${target.name} is now a hostile empire and can be plundered.`);
    }

    renderAlliesDashboard() {
        const alliesList = document.getElementById("allies-active-list");
        if (!alliesList) return;
        alliesList.innerHTML = "";

        if (!this.state.allies || this.state.allies.length === 0) {
            alliesList.innerHTML = `<p class="muted small text-center m-0">No diplomatic alliances signed. Open the strategy map above to form alliances.</p>`;
            return;
        }

        this.state.allies.forEach(npcId => {
            const npc = this.leaderboard.npcs.find(n => n.id === npcId);
            if (!npc) return;

            let tradeRes = "Food";
            let tradeVal = "🍖 +10/m";
            if (npcId === "npc_viper") { tradeRes = "Wood"; tradeVal = "🪵 +10/m"; }
            else if (npcId === "npc_daut") { tradeRes = "Stone"; tradeVal = "🪨 +10/m"; }
            else if (npcId === "npc_yo") { tradeRes = "Gold"; tradeVal = "🪙 +10/m"; }

            const div = document.createElement("div");
            div.className = "ally-card";
            div.innerHTML = `
                <div>
                    <strong class="text-success font-cinzel">${npc.name.replace(/ \(.+\)/, "")}</strong>
                    <div class="small text-muted font-cinzel">Civ: ${npc.civ} | Specialty: ${tradeRes}</div>
                </div>
                <span class="badge badge-success font-cinzel">${tradeVal}</span>
            `;
            alliesList.appendChild(div);
        });
    }

    selectMapTarget(target) {
        this.selectedTarget = target;
        this.renderCombatArena();
    }

    executeRaid(target) {
        const isAllied = this.state.allies && this.state.allies.includes(target.id);
        if (isAllied) {
            return alert("Raid aborted: You cannot raid a diplomatic ally! Break the alliance pact first.");
        }

        const totalArmy = (this.state.military.spearmen || 0) + 
                          (this.state.military.archers || 0) + 
                          (this.state.military.knights || 0) + 
                          (this.state.military.champions || 0) +
                          (this.state.military.catapults || 0);

        if (totalArmy === 0) {
            return alert("Raiding requires an army! Recruit military units in the Barracks first.");
        }

        if (!confirm(`Are you sure you want to march your army against ${target.name}?`)) return;

        const result = CombatEngine.resolveCombat(this.state, target);
        this.state.military = result.remainingMilitary;
        
        let buildingDestructionLogs = [];

        if (result.winner === "Attacker") {
            const limit = this.getStorageLimit();
            this.state.resources.food = Math.min(limit, this.state.resources.food + result.loot.food);
            this.state.resources.wood = Math.min(limit, this.state.resources.wood + result.loot.wood);
            this.state.resources.gold = Math.min(limit, this.state.resources.gold + result.loot.gold);
            this.state.resources.stone = Math.min(limit, this.state.resources.stone + result.loot.stone);
            
            if (result.pillagedNFT) {
                this.state.upgrades.ironCasting = true;
                alert(`🎁 Victory! Looted resources and pillaged an upgrade NFT: ${result.pillagedNFT.name}`);
            }

            Object.keys(this.state.militaryHP).forEach(unit => {
                if (this.state.military[unit] > 0) {
                    const dmg = 5 + Math.floor(Math.random() * 10);
                    const actualDmg = (this.state.civ === "Huns" && (unit === "knights")) ? Math.floor(dmg * 0.9) : dmg;
                    this.state.militaryHP[unit] = Math.max(10, this.state.militaryHP[unit] - actualDmg);
                }
            });

            this.state.villagerList.forEach(w => {
                if (Math.random() < 0.4) {
                    const dmg = 5 + Math.floor(Math.random() * 10);
                    w.hp = Math.max(0, w.hp - dmg);
                }
            });

            const ownedKeys = Object.keys(this.state.nfts).filter(k => this.state.nfts[k] === true || this.state.nfts[k] > 0);
            if (ownedKeys.length > 0) {
                const randKey = ownedKeys[Math.floor(Math.random() * ownedKeys.length)];
                const normalKey = randKey === "mill" ? "mill" :
                                  randKey === "lumberCamp" ? "lumberCamp" :
                                  randKey === "miningCamp" ? "miningCamp" :
                                  randKey === "archeryRange" ? "archeryRange" : randKey;
                
                if (this.state.buildingHP[normalKey] !== undefined) {
                    const maxB = this.getMaxBuildingHP(normalKey);
                    const dmgB = Math.floor(maxB * (0.05 + Math.random() * 0.10));
                    this.state.buildingHP[normalKey] = Math.max(0, this.state.buildingHP[normalKey] - dmgB);

                    if (this.state.buildingHP[normalKey] <= 0) {
                        this.destroyBuildingNFT(normalKey);
                        buildingDestructionLogs.push(`💥 Your ${normalKey.toUpperCase()} NFT was completely destroyed in the raid due to structural neglect!`);
                    }
                }
            }

        } else {
            Object.keys(this.state.militaryHP).forEach(unit => {
                if (this.state.military[unit] > 0) {
                    const dmg = 30 + Math.floor(Math.random() * 25);
                    const actualDmg = (this.state.civ === "Huns" && (unit === "knights")) ? Math.floor(dmg * 0.9) : dmg;
                    this.state.militaryHP[unit] = Math.max(5, this.state.militaryHP[unit] - actualDmg);
                }
            });

            this.state.villagerList.forEach(w => {
                const dmg = 15 + Math.floor(Math.random() * 25);
                w.hp = Math.max(0, w.hp - dmg);
            });

            const ownedKeys = Object.keys(this.state.nfts).filter(k => this.state.nfts[k] === true || this.state.nfts[k] > 0);
            if (ownedKeys.length > 0) {
                const count = Math.min(ownedKeys.length, 2);
                for(let i=0; i<count; i++) {
                    const randKey = ownedKeys[Math.floor(Math.random() * ownedKeys.length)];
                    const normalKey = randKey === "mill" ? "mill" :
                                      randKey === "lumberCamp" ? "lumberCamp" :
                                      randKey === "miningCamp" ? "miningCamp" :
                                      randKey === "archeryRange" ? "archeryRange" : randKey;
                    
                    if (this.state.buildingHP[normalKey] !== undefined) {
                        const maxB = this.getMaxBuildingHP(normalKey);
                        const dmgB = Math.floor(maxB * (0.20 + Math.random() * 0.20));
                        this.state.buildingHP[normalKey] = Math.max(0, this.state.buildingHP[normalKey] - dmgB);

                        if (this.state.buildingHP[normalKey] <= 0) {
                            this.destroyBuildingNFT(normalKey);
                            buildingDestructionLogs.push(`💥 Your ${normalKey.toUpperCase()} NFT was completely destroyed in the raid due to structural neglect!`);
                        }
                    }
                }
            }
        }

        let deadWorkers = [];
        this.state.villagerList = this.state.villagerList.filter(w => {
            if (w.hp <= 0) {
                deadWorkers.push(w.name);
                return false;
            }
            return true;
        });

        deadWorkers.forEach(() => {
            if (this.state.villagerJobs.wood > 0) this.state.villagerJobs.wood--;
            else if (this.state.villagerJobs.food > 0) this.state.villagerJobs.food--;
            else if (this.state.villagerJobs.gold > 0) this.state.villagerJobs.gold--;
            else if (this.state.villagerJobs.stone > 0) this.state.villagerJobs.stone--;
        });

        if (this.state.villagerList.length === 0) {
            this.state.villagerList.push({ id: 1001, name: "Worker #1001", hp: 10, maxHp: 100, specialty: "General", role: "idle" });
            deadWorkers = deadWorkers.filter(name => name !== "Worker #1001");
        }

        const npcIndex = this.leaderboard.npcs.findIndex(n => n.id === target.id);
        if (npcIndex !== -1) {
            this.leaderboard.npcs[npcIndex].military = result.defenderRemainingMilitary;
            if (result.winner === "Attacker") {
                this.leaderboard.npcs[npcIndex].resources.food = Math.max(0, this.leaderboard.npcs[npcIndex].resources.food - result.loot.food);
                this.leaderboard.npcs[npcIndex].resources.wood = Math.max(0, this.leaderboard.npcs[npcIndex].resources.wood - result.loot.wood);
                this.leaderboard.npcs[npcIndex].resources.gold = Math.max(0, this.leaderboard.npcs[npcIndex].resources.gold - result.loot.gold);
                this.leaderboard.npcs[npcIndex].resources.stone = Math.max(0, this.leaderboard.npcs[npcIndex].resources.stone - result.loot.stone);
            }
            this.leaderboard.saveLeaderboard();
        }

        this.state.combatPoints = Math.max(0, this.state.combatPoints + result.points);
        
        if (buildingDestructionLogs.length > 0) {
            result.log.push(`---`);
            buildingDestructionLogs.forEach(l => result.log.push(l));
        }
        if (deadWorkers.length > 0) {
            result.log.push(`---`);
            deadWorkers.forEach(wName => result.log.push(`☠️ CASUALTY: ${wName} died of battle wounds!`));
        }

        this.state.combatLogs.push({
            timestamp: Date.now(),
            winner: result.winner,
            log: result.log
        });

        if (this.state.combatLogs.length > 10) this.state.combatLogs.shift();

        this.selectedTarget = null;
        this.saveState();
        this.renderCombatArena();
        this.updateResourceUI();
        
        let destructiveAlertText = "";
        if (buildingDestructionLogs.length > 0) {
            destructiveAlertText += `\n💥 BUILDING LOSS: Your buildings were completely flattened!`;
        }
        if (deadWorkers.length > 0) {
            destructiveAlertText += `\n☠️ WORKER DEATHS: ${deadWorkers.length} Villager NFTs have died!`;
        }

        if (result.winner === "Attacker") {
            alert(`⚔️ Victory! You plundered their vaults!\n⚠️ Warning: Wounded units require healing.${destructiveAlertText}`);
        } else {
            alert(`💀 Defeat! Your raid was repelled.\n⚠️ Major structural damage sustained.${destructiveAlertText}`);
        }
    }

    destroyBuildingNFT(key) {
        if (key === "mill" || key === "lumberCamp" || key === "miningCamp") {
            if (this.state.nfts[key] > 0) this.state.nfts[key]--;
        } else {
            this.state.nfts[key] = false;
        }
        this.state.buildingHP[key] = this.getMaxBuildingHP(key);
    }

    buyVillagerNFT() {
        const vCost = Math.floor(100 * Math.pow(1.18, this.state.villagerList.length));
        if (this.state.resources.gold < vCost) return alert("Not enough Gold resources to mint Villager NFT!");
        
        this.state.resources.gold -= vCost;
        
        const nextId = 1000 + this.state.villagerList.length + 1;
        const specs = ["Food", "Wood", "Gold", "Stone", "General"];
        const spec = specs[Math.floor(Math.random() * specs.length)];

        this.state.villagerList.push({
            id: nextId,
            name: `Worker #${nextId}`,
            hp: 100,
            maxHp: 100,
            specialty: spec,
            role: "idle"
        });

        this.saveState();
        this.updateUI();
        alert("🎉 Successfully minted a new individual Villager NFT! Gatherer assigned with specialty: " + spec);
    }

    buyBuildingNFT(buildingKey, resName, cost) {
        if (this.state.resources[resName] < cost) return alert(`Not enough ${resName.toUpperCase()} to buy ${buildingKey}!`);
        
        this.state.resources[resName] -= cost;
        if (buildingKey === "mill" || buildingKey === "lumberCamp" || buildingKey === "miningCamp") {
            this.state.nfts[buildingKey] = (this.state.nfts[buildingKey] || 0) + 1;
        } else {
            this.state.nfts[buildingKey] = true;
        }
        
        const maxHP = this.getMaxBuildingHP(buildingKey);
        this.state.buildingHP[buildingKey] = maxHP;

        this.saveState();
        this.updateUI();
        alert(`🎉 Successfully constructed ${buildingKey.toUpperCase()}!`);
    }

    buyMilitaryBaseNFT(buildingKey, res1Type, res1Cost, res2Type, res2Cost) {
        if (this.state.resources[res1Type] < res1Cost || this.state.resources[res2Type] < res2Cost) {
            return alert(`Construction failed: Requires ${res1Cost} ${res1Type.toUpperCase()} and ${res2Cost} ${res2Type.toUpperCase()}.`);
        }
        this.state.resources[res1Type] -= res1Cost;
        this.state.resources[res2Type] -= res2Cost;
        this.state.nfts[buildingKey] = true;

        const maxHP = this.getMaxBuildingHP(buildingKey);
        this.state.buildingHP[buildingKey] = maxHP;

        this.saveState();
        this.updateUI();
        alert(`⚖️ Construction Completed! You have unlocked your ${buildingKey.toUpperCase()} building NFT.`);
    }

    buyTechUpgrade(upgradeKey, resourceType, cost) {
        if (upgradeKey === "fletching" || upgradeKey === "ironCasting") {
            if (!this.state.nfts.blacksmith) {
                return alert("Research failed: Requires Blacksmith NFT constructed first!");
            }
        }

        if (this.state.resources[resourceType] < cost) {
            return alert(`Research failed: Not enough ${resourceType.toUpperCase()}!`);
        }
        this.state.resources[resourceType] -= cost;
        this.state.upgrades[upgradeKey] = true;

        this.saveState();
        this.updateUI();
        alert(`🎓 Tech upgrade unlocked! Boosted active gameplay stats.`);
    }

    // Keep compatibility for legacy adjustJob code triggers
    adjustJob(resource, amount) {
        const totalIdle = this.state.villagerList.filter(w => w.role === "idle");
        const totalAssigned = this.state.villagerList.filter(w => w.role === resource);

        if (amount > 0) {
            if (totalIdle.length > 0) {
                totalIdle[0].role = resource;
            }
        } else {
            if (totalAssigned.length > 0) {
                totalAssigned[0].role = "idle";
            }
        }
        this.saveState();
        this.renderTownCenter();
    }

    renderMarketplace() {
        const isLocked = !this.state.nfts.market;
        document.getElementById("market-locked-screen")?.classList.toggle("hidden", !isLocked);
        document.getElementById("market-active-screen")?.classList.toggle("hidden", isLocked);

        if (isLocked) return;

        this.updateSwapUI();

        document.getElementById("mcap-display").textContent = this.state.ecosystem.marketCap.toLocaleString();
        document.getElementById("price-display").textContent = this.state.ecosystem.tokenPrice.toFixed(4);
        document.getElementById("pool-extracted-display").textContent = (this.state.ecosystem.totalPool - this.state.ecosystem.remainingPool).toLocaleString();
        document.getElementById("pool-remaining-display").textContent = this.state.ecosystem.remainingPool.toLocaleString();

        const rentContainer = document.getElementById("rent-available-list");
        if (rentContainer) {
            rentContainer.innerHTML = "";
            const rentListings = this.leaderboard.getRentedAssets();
            rentListings.forEach(item => {
                const tr = document.createElement("tr");
                const disabled = item.status !== "available" ? "disabled" : "";
                const btnText = item.status === "available" ? "Hire NFT" : "Rented";
                const btnClass = item.status === "available" ? "btn-warning" : "btn-outline-secondary";

                tr.innerHTML = `
                    <td><strong>${item.name}</strong></td>
                    <td class="small">${item.ownerName}</td>
                    <td><span class="badge badge-info">${item.benefit}</span></td>
                    <td>🪙 ${item.cost} Gold</td>
                    <td>${item.duration}s</td>
                    <td>
                        <button class="btn btn-sm ${btnClass}" ${disabled} id="btn-rent-${item.ownerId}-${item.id}">
                            ${btnText}
                        </button>
                    </td>
                `;
                rentContainer.appendChild(tr);

                document.getElementById(`btn-rent-${item.ownerId}-${item.id}`)?.addEventListener("click", () => {
                    this.executeRentNFT(item.ownerId, item.id);
                });
            });
        }

        const playerRentContainer = document.getElementById("player-listings-list");
        if (playerRentContainer) {
            playerRentContainer.innerHTML = "";
            if (this.marketplace.playerListings.length === 0) {
                playerRentContainer.innerHTML = `<tr><td colspan="5" class="text-center text-muted">You have not listed any assets for rent.</td></tr>`;
            } else {
                this.marketplace.playerListings.forEach(item => {
                    const statusText = item.status === "rented" ? `<span class="badge badge-warning">Rented (${item.timeLeft}s)</span>` : `<span class="badge badge-success">Listed</span>`;
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td>${item.type.toUpperCase()}</td>
                        <td>🪙 ${item.cost} Gold</td>
                        <td>${statusText}</td>
                    `;
                    playerRentContainer.appendChild(tr);
                });
            }
        }
    }

    updateSwapUI() {
        const rate = this.marketplace.getSwapRate(this.state.ecosystem);
        const display = document.getElementById("swap-rate-display");
        if (display) {
            display.textContent = `1 Gold = ${rate.toFixed(6)} $AGES Memecoin`;
        }
    }

    executeTokenSwap(type) {
        const inputVal = Math.floor(parseFloat(document.getElementById("swap-amount").value));
        if (isNaN(inputVal) || inputVal <= 0) return alert("Please enter a valid positive quantity to exchange.");

        let result;
        if (type === "gold") {
            result = this.marketplace.swapGoldForAges(this.state, inputVal);
        } else {
            result = this.marketplace.swapAgesForGold(this.state, inputVal);
        }

        if (result.success) {
            this.saveState();
            this.updateResourceUI();
            this.updateSwapUI();
            this.renderMarketplace();
            alert(`💰 Transaction Successful: ${result.message}`);
        } else {
            alert(`⚠️ Swap Failed: ${result.message}`);
        }
    }

    executeRentNFT(npcId, rentalId) {
        const result = this.marketplace.rentNFT(this.state, npcId, rentalId);
        if (result.success) {
            this.saveState();
            this.updateResourceUI();
            this.renderMarketplace();
            alert(`🎉 NFT Lease Signed! ${result.message}`);
        } else {
            alert(`⚠️ Hire Failed: ${result.message}`);
        }
    }

    handlePlayerNFTListing() {
        const assetName = document.getElementById("rent-asset-select").value;
        const costGold = Math.floor(parseFloat(document.getElementById("rent-asset-cost").value));
        const duration = Math.floor(parseFloat(document.getElementById("rent-asset-duration").value));

        if (!assetName || isNaN(costGold) || costGold <= 0 || isNaN(duration) || duration <= 0) {
            return alert("Invalid listing details. Please select an NFT and positive rates/durations.");
        }

        let assetUnlocked = false;
        let assetType = "building";

        if (assetName === "Castle NFT" && this.state.nfts.castle) assetUnlocked = true;
        if (assetName === "Barracks NFT" && this.state.nfts.barracks) assetUnlocked = true;
        if (assetName === "Villager NFT" && this.state.villagerList.length > 1) {
            assetUnlocked = true;
            assetType = "villager";
        }

        if (!assetUnlocked) {
            return alert(`Listing failed: You do not own a spare ${assetName} to list for rent!`);
        }

        if (assetType === "villager") {
            const idToKill = this.state.villagerList[this.state.villagerList.length - 1].id;
            this.state.villagerList = this.state.villagerList.filter(w => w.id !== idToKill);
            
            if (this.state.villagerJobs.wood > 0) this.state.villagerJobs.wood--;
            else if (this.state.villagerJobs.food > 0) this.state.villagerJobs.food--;
            else if (this.state.villagerJobs.gold > 0) this.state.villagerJobs.gold--;
            else if (this.state.villagerJobs.stone > 0) this.state.villagerJobs.stone--;
        }

        const result = this.marketplace.listPlayerAsset(assetName, assetType, costGold, duration);
        if (result.success) {
            this.saveState();
            this.renderMarketplace();
            alert(result.message);
        }
    }

    renderLeaderboard() {
        const tbody = document.getElementById("leaderboard-tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const allPlayers = this.leaderboard.getLeaderboard(this.state);
        allPlayers.forEach((player, index) => {
            const tr = document.createElement("tr");
            if (player.isUser) {
                tr.className = "table-highlight";
            }
            tr.innerHTML = `
                <td><strong>#${index + 1}</strong></td>
                <td>
                    <span class="player-name-lbl">${player.name}</span>
                    ${player.isUser ? ' <span class="badge badge-warning">YOU</span>' : ''}
                </td>
                <td>${player.civ}</td>
                <td>⚔️ ${player.power}</td>
                <td>🍖 ${Math.floor(player.resources.food)} | 🪵 ${Math.floor(player.resources.wood)} | 🪙 ${Math.floor(player.resources.gold)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    createNFTCardHTML(title, mintId, desc, badgeClass, curHP = null, maxHP = null) {
        let hpBarHtml = "";
        let warningHtml = "";

        if (curHP !== null && maxHP !== null) {
            const pct = ((curHP / maxHP) * 100).toFixed(0);
            const isCritical = curHP < maxHP * 0.25;

            if (isCritical) {
                warningHtml = `
                    <div class="alert-full text-center p-1 rounded font-cinzel mb-2" style="font-size: 0.65rem; background: var(--color-red); color: white; animation: flashAlert 0.8s infinite alternate;">
                        ⚠️ COLLAPSE IMMINENT - REPAIR NOW!
                    </div>
                `;
            }

            hpBarHtml = `
                <div class="mt-2 w-100">
                    <div class="d-flex justify-content-between small font-cinzel text-muted mb-1" style="font-size: 0.7rem;">
                        <span>Integrity: ${curHP}/${maxHP}</span>
                        <span class="${curHP < maxHP * 0.4 ? 'text-danger' : 'text-success'}">${pct}%</span>
                    </div>
                    <div class="progress-bar-container" style="height: 6px; margin: 0;">
                        <div class="progress-bar" style="width: ${pct}%; background: ${curHP < maxHP * 0.4 ? 'var(--color-red)' : 'var(--color-green)'}"></div>
                    </div>
                </div>
            `;
        }

        const div = document.createElement("div");
        div.className = "col-md-4 mb-3";
        div.innerHTML = `
            <div class="card p-3 nft-wallet-card h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge ${badgeClass}">${title}</span>
                    </div>
                    ${warningHtml}
                    <h5 class="font-cinzel text-warning m-0 my-1">${mintId}</h5>
                    <p class="small text-muted m-0">${desc}</p>
                </div>
                ${hpBarHtml}
            </div>
        `;
        return div;
    }

    setShopAgeLock(elemId, reqLevel) {
        const prefixes = ["", "shop-"];
        prefixes.forEach(p => {
            const card = document.getElementById(`shop-card-${p}${elemId}`);
            if (!card) return;

            const tooLowAge = this.state.ageLevel < reqLevel;
            let lockOverlay = card.querySelector(".shop-lock-overlay");

            if (tooLowAge) {
                if (!lockOverlay) {
                    lockOverlay = document.createElement("div");
                    lockOverlay.className = "shop-lock-overlay font-cinzel";
                    card.appendChild(lockOverlay);
                }
                lockOverlay.innerHTML = `<span>🔒 LOCKED<br><small style="font-size: 0.7rem;">Requires Lvl ${reqLevel} Age</small></span>`;
                card.querySelectorAll("button").forEach(btn => btn.disabled = true);
            } else {
                lockOverlay?.remove();
                card.querySelectorAll("button").forEach(btn => btn.disabled = false);
            }
        });
    }

    toggleBaseStatus(buildingKey, constructed, isRented = false) {
        const prefixes = ["", "shop-"];
        prefixes.forEach(p => {
            const card = document.getElementById(`shop-card-${p}${buildingKey}`);
            if (!card) return;

            const btn = card.querySelector("button");
            if (!btn) return;

            if (constructed) {
                btn.disabled = true;
                btn.className = "btn btn-outline-secondary btn-sm w-100";
                btn.textContent = isRented ? "Active Hire Lease" : "Constructed";
            } else {
                btn.disabled = false;
                btn.className = "btn btn-gold btn-sm w-100";
                
                const rawKey = buildingKey.replace("shop-", "");
                if (rawKey === "barracks") btn.textContent = "Mint Barracks";
                else if (rawKey === "blacksmith") btn.textContent = "Mint Blacksmith";
                else if (rawKey === "market") btn.textContent = "Mint Market";
                else if (rawKey === "archery") btn.textContent = "Mint Archery Range";
                else if (rawKey === "stable") btn.textContent = "Mint Stable";
                else if (rawKey === "university") btn.textContent = "Mint University";
                else if (rawKey === "castle") btn.textContent = "Mint Castle";
            }
        });
    }

    toggleTechStatus(techId, researched) {
        const prefixes = ["", "shop-"];
        prefixes.forEach(p => {
            const card = document.getElementById(`shop-card-${p}${techId}`);
            if (!card) return;

            const btn = card.querySelector("button");
            if (!btn) return;

            if (researched) {
                btn.disabled = true;
                btn.className = "btn btn-outline-secondary btn-sm w-100";
                btn.textContent = "Researched";
            } else {
                btn.disabled = false;
                btn.className = "btn btn-gold btn-sm w-100";
                
                const rawId = techId.replace("shop-", "");
                if (rawId === "axe") btn.textContent = "Research Axe";
                else if (rawId === "collar") btn.textContent = "Research Collar";
                else if (rawId === "gold") btn.textContent = "Research Gold Mining";
                else if (rawId === "stone") btn.textContent = "Research Stone Mining";
                else if (rawId === "fletch") btn.textContent = "Research Fletching";
                else if (rawId === "iron") btn.textContent = "Research Iron Casting";
            }
        });
    }

    triggerAgeUpgrade() {
        if (this.state.ageUpgradeProgress.active) {
            return alert("Age advancement is already in progress!");
        }

        const nextLevel = this.state.ageLevel + 1;
        const reqs = this.getAgeRequirements(nextLevel);

        if (!reqs) {
            return alert("You have already reached the final Imperial Age!");
        }

        for (const [res, val] of Object.entries(reqs.cost)) {
            if (this.state.resources[res] < val) {
                return alert(`Upgrade failed: Requires ${val} ${res.toUpperCase()}!`);
            }
        }

        for (const [res, val] of Object.entries(reqs.cost)) {
            this.state.resources[res] -= val;
        }

        const now = Date.now();
        this.state.ageUpgradeProgress = {
            active: true,
            targetAge: reqs.name,
            targetLevel: nextLevel,
            startTime: now,
            endTime: now + reqs.durationMs
        };

        this.saveState();
        this.updateUI();
        this.updateResourceUI();
        alert(`🏛️ Age advancement initialized! Your scholars have begun research on the ${reqs.name}. This upgrade normally takes 5 days.`);
    }

    speedUpAgeResearch() {
        if (!this.state.ageUpgradeProgress.active) return;
        const nextLevel = this.state.ageUpgradeProgress.targetLevel;
        const reqs = this.getAgeRequirements(nextLevel);
        if (!reqs) return;

        if (this.state.agesToken < reqs.speedupCost) {
            return alert(`Speed up failed: Requires ${reqs.speedupCost} $AGES memecoins!`);
        }

        if (!confirm(`Spend ${reqs.speedupCost} $AGES memecoins to instantly complete research on the ${reqs.name}?`)) return;

        this.state.agesToken -= reqs.speedupCost;
        this.state.ageLevel = nextLevel;
        this.state.currentAge = reqs.name;
        this.state.ageUpgradeProgress = { active: false, targetAge: "", targetLevel: 0, startTime: 0, endTime: 0 };

        this.saveState();
        this.updateUI();
        this.updateResourceUI();
        alert(`⚡ Instant upgrade complete! Welcome to the ${reqs.name}!`);
    }

    testAgeTimeTravel() {
        if (!this.state.ageUpgradeProgress.active) {
            return alert("No age upgrade in progress to time-warp.");
        }
        
        this.state.ageUpgradeProgress.endTime -= 86400 * 1000;
        this.saveState();
        this.updateAgeResearchTick();
        this.updateUI();
        alert("⏩ scholars worked overtime: Skipped 24 hours of research!");
    }

    updateAgeResearchTick() {
        if (!this.state.ageUpgradeProgress.active) return;

        const now = Date.now();
        const diff = this.state.ageUpgradeProgress.endTime - now;

        if (diff <= 0) {
            const reqs = this.getAgeRequirements(this.state.ageUpgradeProgress.targetLevel);
            this.state.ageLevel = this.state.ageUpgradeProgress.targetLevel;
            this.state.currentAge = this.state.ageUpgradeProgress.targetAge;
            this.state.ageUpgradeProgress = { active: false, targetAge: "", targetLevel: 0, startTime: 0, endTime: 0 };
            this.saveState();
            this.updateUI();
            alert(`🏛️ Era upgrade complete! You have entered the ${this.state.currentAge}!`);
        }
    }

    renderAgeAdvancementSection() {
        const wrapper = document.getElementById("age-upgrade-action-wrapper");
        if (!wrapper) return;
        wrapper.innerHTML = "";

        if (this.state.ageLevel >= 4) {
            wrapper.innerHTML = `<div class="text-success text-center p-3 font-cinzel">🏆 Maximum Age Level Achieved (Imperial Age Lvl 4) 🏆</div>`;
            return;
        }

        const nextLevel = this.state.ageLevel + 1;
        const reqs = this.getAgeRequirements(nextLevel);
        if (!reqs) return;

        if (this.state.ageUpgradeProgress.active) {
            const diff = this.state.ageUpgradeProgress.endTime - Date.now();
            const daysLeft = (diff / (24 * 3600 * 1000)).toFixed(2);
            
            wrapper.innerHTML = `
                <div class="age-progress-container text-center p-3 border rounded bg-dark-overlay">
                    <h5 class="font-cinzel text-warning m-0 mb-1">ADVANCING TO ${reqs.name.toUpperCase()}</h5>
                    <p class="small text-muted font-cinzel mb-2">Progress: ${daysLeft} days remaining...</p>
                    <div class="progress-bar-container mb-3" style="height: 12px; margin: 0;">
                        <div class="progress-bar" style="width: ${Math.min(100, 100 - (diff / reqs.durationMs * 100))}%"></div>
                    </div>
                    <div class="row">
                        <div class="col-6">
                            <button id="btn-age-speedup" class="btn btn-gold btn-sm w-100 font-cinzel">SPEED UP (💎 ${reqs.speedupCost} $AGES)</button>
                        </div>
                        <div class="col-6">
                            <button id="btn-age-speed-warp" class="btn btn-outline-warning btn-sm w-100 font-cinzel">FAST WARP (24h)</button>
                        </div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                document.getElementById("btn-age-speedup")?.addEventListener("click", () => this.speedUpAgeResearch());
                document.getElementById("btn-age-speed-warp")?.addEventListener("click", () => this.testAgeTimeTravel());
            }, 10);
            return;
        }

        let costItems = [];
        for (const [res, val] of Object.entries(reqs.cost)) {
            if (val > 0) {
                const has = this.state.resources[res] >= val;
                costItems.push(`<span class="req-item font-cinzel ${has ? 'text-success' : 'text-danger'}">${res.toUpperCase()}: ${val}</span>`);
            }
        }

        wrapper.innerHTML = `
            <div class="age-advance-ready-panel text-center p-3">
                <h4 class="font-cinzel text-warning m-0 mb-2">UPGRADE TO ${reqs.name.toUpperCase()}</h4>
                <p class="small text-muted mb-3 font-cinzel">Collect resources to advance your civilisation to the next epoch.</p>
                <div class="req-list-panel p-2 mb-3 bg-dark-overlay rounded">
                    ${costItems.join(" | ")}
                </div>
                <button id="btn-advance-age" class="btn btn-gold w-100 font-cinzel">INITIATE ADVANCEMENT</button>
            </div>
        `;

        setTimeout(() => {
            document.getElementById("btn-advance-age")?.addEventListener("click", () => this.triggerAgeUpgrade());
        }, 10);
    }

    getAgeRequirements(nextLevel) {
        if (nextLevel === 2) {
            return {
                name: "Feudal Age",
                cost: { food: 1500, wood: 1500, gold: 500, stone: 0 },
                durationMs: 432000000,
                speedupCost: 500
            };
        }
        if (nextLevel === 3) {
            return {
                name: "Castle Age",
                cost: { food: 8000, wood: 8000, gold: 3000, stone: 1500 },
                durationMs: 432000000,
                speedupCost: 1500
            };
        }
        if (nextLevel === 4) {
            return {
                name: "Imperial Age",
                cost: { food: 35000, wood: 35000, gold: 15000, stone: 8000 },
                durationMs: 432000000,
                speedupCost: 5000
            };
        }
        return null;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    window.game = new GameController();
});
