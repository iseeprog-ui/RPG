export function viz(){
  return {
    bgStarAlpha:1,
    nebulaAlpha:0.18,
    playerFill:"#f8fbff",
    playerStroke:"#6fb3ff",
    playerGlow:12,
    pirateStroke:"#ff7a8a",
    fedStroke:"#6fb3ff",
    clanStroke:"#ffd37a",
    bulletPlayer:"#e6ecff",
    bulletEnemy:"#ff7a8a"
  };
}

export const FACTIONS = [
  {id:"traders", name:"Консорциум Торговцев"},
  {id:"feds", name:"Федерация"},
  {id:"clan", name:"Клан Свободных"},
];

export const PIRATES = "pirates";

export const SHIP_CLASSES = [
  {
    id:"interceptor", name:"Перехватчик",
    cost:0,
    hp:90, shield:70, thrust:520, gunDmg:9, gunCd:0.11, cargo:8, crewSlots:2,
    slots:[{id:"gun",name:"Оружие",level:1,effect:"+урон"},
           {id:"engine",name:"Двигатель",level:1,effect:"+тяга"}]
  },
  {
    id:"frigate", name:"Фрегат",
    cost:460,
    hp:130, shield:95, thrust:420, gunDmg:12, gunCd:0.125, cargo:12, crewSlots:3,
    slots:[{id:"gun",name:"Оружие",level:1,effect:"+урон"},
           {id:"shield",name:"Щит",level:1,effect:"+щит"},
           {id:"engine",name:"Двигатель",level:1,effect:"+тяга"}]
  },
  {
    id:"cruiser", name:"Крейсер",
    cost:980,
    hp:190, shield:130, thrust:340, gunDmg:16, gunCd:0.14, cargo:18, crewSlots:4,
    slots:[{id:"gun",name:"Оружие",level:1,effect:"+урон"},
           {id:"gun2",name:"Оружие II",level:1,effect:"+скоростр"},
           {id:"shield",name:"Щит",level:1,effect:"+щит"},
           {id:"engine",name:"Двигатель",level:1,effect:"+тяга"}]
  },

  // --- FACTION UNIQUE SHIPS ---
  {
    id:"traders_liner", name:"Торговый Лайнер Консорциума",
    cost:1400, unlock:{rep:"traders", min:60, storyFlag:"aligned_traders"},
    hp:150, shield:120, thrust:380, gunDmg:14, gunCd:0.13, cargo:28, crewSlots:4,
    slots:[
      {id:"gun",name:"Оружие",level:2,effect:"+урон"},
      {id:"shield",name:"Щит",level:2,effect:"+щит"},
      {id:"engine",name:"Двигатель",level:1,effect:"+тяга"},
      {id:"cargo_mod",name:"Трюм-модуль",level:2,effect:"+трюм"},
    ]
  },
  {
    id:"feds_vanguard", name:"Авангард Федерации",
    cost:1600, unlock:{rep:"feds", min:60, storyFlag:"aligned_feds"},
    hp:220, shield:170, thrust:360, gunDmg:18, gunCd:0.12, cargo:16, crewSlots:4,
    slots:[
      {id:"gun",name:"Оружие",level:2,effect:"+урон"},
      {id:"gun2",name:"Оружие II",level:2,effect:"+скоростр"},
      {id:"shield",name:"Щит",level:2,effect:"+щит"},
      {id:"engine",name:"Двигатель",level:1,effect:"+тяга"},
    ]
  },
  {
    id:"clan_raider", name:"Рейдер Клана Свободных",
    cost:1500, unlock:{rep:"clan", min:60, storyFlag:"aligned_clan"},
    hp:170, shield:110, thrust:500, gunDmg:17, gunCd:0.105, cargo:14, crewSlots:3,
    slots:[
      {id:"gun",name:"Оружие",level:3,effect:"+урон"},
      {id:"engine",name:"Двигатель",level:2,effect:"+тяга"},
      {id:"stealth",name:"Скрыт-модуль",level:1,effect:"+уклон"},
    ]
  }
];

export const GOODS = [
  {id:"ore", name:"Руда", base:18},
  {id:"food", name:"Провиант", base:12},
  {id:"tech", name:"Техника", base:42},
  {id:"med", name:"Медпакеты", base:35},
  {id:"art", name:"Артефакты", base:80},
  {id:"heart", name:"Сердце Туманности (уник.)", base:0, unique:true},
];

export const MODULE_TYPES = [
  {id:"gun", name:"Лазерный модуль", stat:"gun", bonus:{dmg:+3}, price:120},
  {id:"gun2", name:"Плазма-модуль", stat:"gun", bonus:{dmg:+2, cd:-0.01}, price:150},
  {id:"shield", name:"Генератор щита", stat:"shield", bonus:{shieldMax:+12}, price:140},
  {id:"engine", name:"Турбодвигатель", stat:"engine", bonus:{thrust:+45}, price:130},
  {id:"cargo_mod", name:"Расширитель трюма", stat:"cargo", bonus:{cargoLimit:+3}, price:110},
  {id:"stealth", name:"Модуль маскировки", stat:"stealth", bonus:{evasion:+0.05}, price:160},
];
