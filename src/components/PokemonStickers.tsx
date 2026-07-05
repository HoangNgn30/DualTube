import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Trash2, RotateCcw, Plus } from "lucide-react";

interface PokemonData {
  id: number;
  name: string;
}

const POPULAR_POKEMON: PokemonData[] = [
  { id: 25, name: "Pikachu" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 7, name: "Squirtle" },
  { id: 133, name: "Eevee" },
  { id: 143, name: "Snorlax" },
  { id: 39, name: "Jigglypuff" },
  { id: 94, name: "Gengar" },
  { id: 54, name: "Psyduck" },
  { id: 150, name: "Mewtwo" },
  { id: 175, name: "Togepi" },
  { id: 448, name: "Lucario" },
  { id: 258, name: "Mudkip" },
  { id: 384, name: "Rayquaza" },
  { id: 132, name: "Ditto" },
  { id: 149, name: "Dragonite" },
  { id: 197, name: "Umbreon" },
  { id: 282, name: "Gardevoir" },
  { id: 487, name: "Giratina" },
  { id: 658, name: "Greninja" },
  { id: 151, name: "Mew" },
  { id: 3, name: "Venusaur" },
  { id: 6, name: "Charizard" },
  { id: 9, name: "Blastoise" },
  { id: 134, name: "Vaporeon" },
  { id: 135, name: "Jolteon" },
  { id: 136, name: "Flareon" },
  { id: 196, name: "Espeon" },
  { id: 249, name: "Lugia" },
  { id: 250, name: "Ho-Oh" },
  { id: 382, name: "Kyogre" },
  { id: 383, name: "Groudon" },
  { id: 493, name: "Arceus" },
  { id: 129, name: "Magikarp" },
  { id: 130, name: "Gyarados" },
  { id: 63, name: "Abra" },
  { id: 65, name: "Alakazam" },
  { id: 66, name: "Machop" },
  { id: 68, name: "Machamp" },
  { id: 74, name: "Geodude" },
  { id: 76, name: "Golem" },
  { id: 92, name: "Gastly" },
  { id: 93, name: "Haunter" },
  { id: 123, name: "Scyther" },
  { id: 212, name: "Scizor" },
  { id: 144, name: "Articuno" },
  { id: 145, name: "Zapdos" },
  { id: 146, name: "Moltres" },
  { id: 248, name: "Tyranitar" },
  { id: 373, name: "Salamence" }
];

const EVOLUTION_CHAIN: { [key: number]: { nextId: number; nextName: string; clicksRequired: number } } = {
  // Gen 1 Starters
  1: { nextId: 2, nextName: "Ivysaur", clicksRequired: 15 },
  2: { nextId: 3, nextName: "Venusaur", clicksRequired: 15 },
  4: { nextId: 5, nextName: "Charmeleon", clicksRequired: 15 },
  5: { nextId: 6, nextName: "Charizard", clicksRequired: 15 },
  7: { nextId: 8, nextName: "Wartortle", clicksRequired: 15 },
  8: { nextId: 9, nextName: "Blastoise", clicksRequired: 15 },
  
  // Pikachu & standard popular ones
  25: { nextId: 26, nextName: "Raichu", clicksRequired: 15 },
  39: { nextId: 40, nextName: "Wigglytuff", clicksRequired: 15 },
  54: { nextId: 55, nextName: "Golduck", clicksRequired: 15 },
  129: { nextId: 130, nextName: "Gyarados", clicksRequired: 15 },
  143: { nextId: 143, nextName: "Snorlax-Zen", clicksRequired: 15 }, // special easter egg
  
  // Togepi & Mudkip
  175: { nextId: 176, nextName: "Togetic", clicksRequired: 15 },
  176: { nextId: 468, nextName: "Togekiss", clicksRequired: 15 },
  258: { nextId: 259, nextName: "Marshtomp", clicksRequired: 15 },
  259: { nextId: 260, nextName: "Swampert", clicksRequired: 15 },

  // Abra, Machop, Geodude, Gastly
  63: { nextId: 64, nextName: "Kadabra", clicksRequired: 15 },
  64: { nextId: 65, nextName: "Alakazam", clicksRequired: 15 },
  66: { nextId: 67, nextName: "Machoke", clicksRequired: 15 },
  67: { nextId: 68, nextName: "Machamp", clicksRequired: 15 },
  74: { nextId: 75, nextName: "Graveler", clicksRequired: 15 },
  75: { nextId: 76, nextName: "Golem", clicksRequired: 15 },
  92: { nextId: 93, nextName: "Haunter", clicksRequired: 15 },
  93: { nextId: 94, nextName: "Gengar", clicksRequired: 15 },

  // Scyther
  123: { nextId: 212, nextName: "Scizor", clicksRequired: 15 }
};

const EEVEELUTIONS = [
  { id: 134, name: "Vaporeon" },
  { id: 135, name: "Jolteon" },
  { id: 136, name: "Flareon" },
  { id: 196, name: "Espeon" },
  { id: 197, name: "Umbreon" }
];

const playPokemonCry = (pokemonId: number) => {
  try {
    // Standard PokeAPI cries
    const audio = new Audio(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/cries/${pokemonId}.ogg`);
    audio.volume = 0.2;
    audio.play().catch((err) => {
      console.log("Audio play blocked or failed. User needs to interact first:", err);
    });
  } catch (err) {
    console.error("Failed to play pokemon cry:", err);
  }
};

interface Sticker {
  uniqueId: string;
  pokemonId: number;
  name: string;
  x: number; // percentage left
  y: number; // percentage top
  size: number; // in pixels
  rotation: number; // in degrees
  bounceDelay: number; // seconds
  isShiny: boolean;
}

export default function PokemonStickers() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [clickCount, setClickCount] = useState<{ [key: string]: number }>({});
  const [evolutionNotice, setEvolutionNotice] = useState<{ [key: string]: string | null }>({});

  // Initialize 5 random stickers
  const generateInitialStickers = () => {
    const newStickers: Sticker[] = [];
    // Ensure we pick 5 distinct/random ones from our popular list
    const shuffled = [...POPULAR_POKEMON].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    selected.forEach((poke, index) => {
      // Divide screen into approximate sectors to avoid complete overlap initially
      const col = index % 5; // 0, 1, 2, 3, 4
      
      // Calculate bounded randomized grid slots across the screen width
      const baseLeft = 5 + col * 18; // 5%, 23%, 41%, 59%, 77%
      const baseTop = 20 + Math.random() * 45; // 20% to 65%

      const randomX = baseLeft + (Math.random() * 8 - 4);
      const randomY = baseTop;
      const randomSize = Math.floor(Math.random() * 50) + 70; // 70px to 120px
      const randomRotation = Math.floor(Math.random() * 40) - 20; // -20deg to 20deg
      const bounceDelay = Math.random() * 2;
      const isShiny = Math.random() < 0.15; // 15% chance of being shiny!

      newStickers.push({
        uniqueId: `sticker-${poke.id}-${Date.now()}-${index}`,
        pokemonId: poke.id,
        name: poke.name,
        x: Math.max(2, Math.min(randomX, 88)),
        y: Math.max(10, Math.min(randomY, 82)),
        size: randomSize,
        rotation: randomRotation,
        bounceDelay: bounceDelay,
        isShiny: isShiny
      });
    });

    setStickers(newStickers);
  };


  useEffect(() => {
    // Load from local storage or generate new ones
    try {
      const stored = localStorage.getItem("dualtube_pokemon_stickers");
      if (stored) {
        setStickers(JSON.parse(stored));
      } else {
        generateInitialStickers();
      }
    } catch {
      generateInitialStickers();
    }
  }, []);

  const saveStickers = (updated: Sticker[]) => {
    setStickers(updated);
    try {
      localStorage.setItem("dualtube_pokemon_stickers", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save stickers:", err);
    }
  };

  const removeSticker = (uniqueId: string) => {
    const updated = stickers.filter((s) => s.uniqueId !== uniqueId);
    saveStickers(updated);
  };

  const handleReset = () => {
    generateInitialStickers();
  };

  const addOneSticker = () => {
    const randomPoke = POPULAR_POKEMON[Math.floor(Math.random() * POPULAR_POKEMON.length)];
    const randomX = Math.random() * 80 + 5;
    const randomY = Math.random() * 65 + 15;
    const randomSize = Math.floor(Math.random() * 50) + 70;
    const randomRotation = Math.floor(Math.random() * 40) - 20;
    const isShiny = Math.random() < 0.15;

    const newSticker: Sticker = {
      uniqueId: `sticker-${randomPoke.id}-${Date.now()}`,
      pokemonId: randomPoke.id,
      name: randomPoke.name,
      x: randomX,
      y: randomY,
      size: randomSize,
      rotation: randomRotation,
      bounceDelay: Math.random() * 2,
      isShiny: isShiny
    };

    const updated = [...stickers, newSticker];
    saveStickers(updated);
  };

  const handleStickerClick = (uniqueId: string) => {
    const sticker = stickers.find(s => s.uniqueId === uniqueId);
    if (!sticker) return;

    // 1. Play Cry sound
    playPokemonCry(sticker.pokemonId);

    setClickCount((prev) => {
      const nextClicks = (prev[uniqueId] || 0) + 1;
      
      const checkEvolution = () => {
        // Special case: Eevee -> Random Eeveelution
        if (sticker.pokemonId === 133 && nextClicks >= 15) {
          const choice = EEVEELUTIONS[Math.floor(Math.random() * EEVEELUTIONS.length)];
          triggerEvolutionEffect(uniqueId, choice.id, choice.name, "TIẾN HÓA!");
          return true;
        }

        // Special case: Ditto -> Transform
        if (sticker.pokemonId === 132 && nextClicks >= 5) {
          const nonDitto = POPULAR_POKEMON.filter(p => p.id !== 132);
          const choice = nonDitto[Math.floor(Math.random() * nonDitto.length)];
          triggerEvolutionEffect(uniqueId, choice.id, choice.name, "BIẾN HÌNH!");
          return true;
        }

        // Standard evolution
        const evolution = EVOLUTION_CHAIN[sticker.pokemonId];
        if (evolution && nextClicks >= evolution.clicksRequired) {
          triggerEvolutionEffect(uniqueId, evolution.nextId, evolution.nextName, "TIẾN HÓA!");
          return true;
        }

        return false;
      };

      if (checkEvolution()) {
        return { ...prev, [uniqueId]: 0 };
      }

      return {
        ...prev,
        [uniqueId]: nextClicks
      };
    });
  };

  const triggerEvolutionEffect = (uniqueId: string, nextId: number, nextName: string, message: string) => {
    // Show banner notice for 2.5 seconds
    setEvolutionNotice(prev => ({ ...prev, [uniqueId]: message }));
    
    // Play evolved cry with a tiny delay
    setTimeout(() => {
      playPokemonCry(nextId);
    }, 450);

    // Update the stickers list
    setStickers(prev => {
      const updated = prev.map(s => {
        if (s.uniqueId === uniqueId) {
          return {
            ...s,
            pokemonId: nextId,
            name: nextName
          };
        }
        return s;
      });
      // Save to local storage
      try {
        localStorage.setItem("dualtube_pokemon_stickers", JSON.stringify(updated));
      } catch (err) {
        console.error("Save failed:", err);
      }
      return updated;
    });

    // Clear notice after 2.5 seconds
    setTimeout(() => {
      setEvolutionNotice(prev => ({ ...prev, [uniqueId]: null }));
    }, 2500);
  };

  return (
    <>
      {/* Control panel floating in bottom right, stylish and non-intrusive */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-[#0f0f0f]/90 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl shadow-2xl">
        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
          🐾 Sticker Mode ({stickers.length})
        </span>
        <button
          onClick={addOneSticker}
          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer active:scale-95"
          title="Thêm sticker ngẫu nhiên"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-red-400 hover:text-red-300 transition-all cursor-pointer active:scale-95"
          title="Tải lại 5 sticker ngẫu nhiên"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Render the Stickers in an absolute layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 min-h-screen">
        {stickers.map((sticker) => {
          const clicks = clickCount[sticker.uniqueId] || 0;
          const evolution = EVOLUTION_CHAIN[sticker.pokemonId];
          const isEevee = sticker.pokemonId === 133;
          const isDitto = sticker.pokemonId === 132;
          const hasEvolution = !!evolution || isEevee || isDitto;
          const maxClicks = isEevee ? 15 : (isDitto ? 5 : (evolution ? evolution.clicksRequired : 0));

          return (
            <motion.div
              key={sticker.uniqueId}
              drag
              dragMomentum={false}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 15 }}
              whileDrag={{ scale: 1.15, zIndex: 50, cursor: "grabbing" }}
              className="absolute pointer-events-auto select-none group"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                width: `${sticker.size}px`,
                height: `${sticker.size}px`,
                transform: `rotate(${sticker.rotation}deg)`
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -6, 0],
              }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 20 },
                opacity: { duration: 0.2 },
                y: {
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: sticker.bounceDelay
                }
              }}
              onClick={() => handleStickerClick(sticker.uniqueId)}
            >
              <div className="relative w-full h-full cursor-grab active:cursor-grabbing">
                {/* Close/Remove icon visible on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSticker(sticker.uniqueId);
                  }}
                  className="absolute -top-1 -right-1 z-30 p-1 bg-red-600 hover:bg-red-500 border border-white rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md"
                  title="Gỡ sticker"
                >
                  <Trash2 size={8} />
                </button>

                {/* Evolution Banner Overlay */}
                {evolutionNotice[sticker.uniqueId] && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap flex flex-col items-center">
                    <div className="bg-amber-500 text-black font-black text-[9px] px-2.5 py-0.5 rounded-full border border-white shadow-lg animate-bounce uppercase tracking-wider">
                      ⚡ {evolutionNotice[sticker.uniqueId]} ⚡
                    </div>
                    <div className="absolute bg-amber-400 w-full h-full rounded-full opacity-30 animate-ping pointer-events-none" />
                  </div>
                )}

                {/* Progress helper overlay on hover */}
                {hasEvolution && !evolutionNotice[sticker.uniqueId] && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/85 text-amber-400 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30">
                    ⭐ {clicks}/{maxClicks} CLICK TO EVOLVE
                  </div>
                )}

                {/* Shiny effect if Pokemon is shiny */}
                {sticker.isShiny && (
                  <div className="absolute inset-0 z-10 animate-pulse pointer-events-none">
                    <Sparkles className="absolute top-0 left-0 text-yellow-300 w-4 h-4" />
                    <Sparkles className="absolute bottom-1 right-1 text-yellow-300 w-3 h-3" />
                  </div>
                )}

                {/* Sticker body with transparent background and native PNG drop-shadow */}
                <div 
                  className="w-full h-full p-1 flex items-center justify-center transition-transform hover:scale-115 relative"
                  style={{
                    transform: `rotate(${(clicks * 15) % 360}deg)`,
                    transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  }}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${sticker.pokemonId}.png`}
                    alt={sticker.name}
                    className={`w-full h-full object-contain filter transition-all duration-300 ${
                      sticker.isShiny 
                        ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.85)] hover:drop-shadow-[0_0_18px_rgba(251,191,36,1)]" 
                        : "drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] hover:scale-105"
                    }`}
                    referrerPolicy="no-referrer"
                    draggable="false"
                  />
                  
                  {/* Speech Bubble / Badge when clicked */}
                  {clicks > 0 && !evolutionNotice[sticker.uniqueId] && (
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-black/90 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap shadow-md z-20 animate-bounce">
                      {sticker.isShiny ? "✨ SHINY " : ""}{sticker.name.toUpperCase()}!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
