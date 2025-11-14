
// Дополнительные фичи: квесты, босс, сохранения
(function(){
  const QUESTS = [
    { id: 'kill10', title: 'Первая кровь', desc: 'Убейте 10 врагов.', type: 'kills', target: 10, rewardXp: 100 },
    { id: 'loot5',  title: 'Собиратель',   desc: 'Подберите 5 предметов.', type: 'loot',  target: 5,  rewardXp: 80  }
  ];
  let questProgress = {};
  let bossSpawned = false;

  function initQuests() {
    QUESTS.forEach(q => {
      questProgress[q.id] = { current: 0, completed: false };
    });
    renderQuestLog();
  }

  function renderQuestLog() {
    let box = document.getElementById('questLog');
    if (!box) return;
    box.innerHTML = '<div class="ql-title">Квесты</div>';
    QUESTS.forEach(q => {
      const prog = questProgress[q.id] || {current:0,completed:false};
      const line = document.createElement('div');
      line.className = 'ql-item' + (prog.completed ? ' completed' : '');
      line.innerHTML =
        '<div class="ql-name">' + q.title + '</div>' +
        '<div class="ql-desc">' + q.desc + '</div>' +
        '<div class="ql-progress">' + Math.min(prog.current, q.target) + ' / ' + q.target + '</div>';
      box.appendChild(line);
    });
  }

  function updateQuestProgress(type, amount) {
    QUESTS.forEach(q => {
      const prog = questProgress[q.id];
      if (!prog || prog.completed) return;
      if (q.type !== type) return;
      prog.current += amount;
      if (prog.current >= q.target) {
        prog.completed = true;
        if (window.createFloatingText && window.player) {
          createFloatingText(player.x, player.y - 80, 'Квест: ' + q.title + ' выполнен', '#f1c40f');
        }
        if (window.player) {
          player.xp += q.rewardXp;
          if (window.checkLevelUp) checkLevelUp();
        }
      }
    });
    renderQuestLog();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #questLog {
        position: absolute;
        top: 200px;
        right: 20px;
        background: rgba(0,0,20,0.9);
        border-radius: 12px;
        border: 1px solid #3a7ca5;
        padding: 8px 10px;
        width: 260px;
        font-size: 12px;
        pointer-events: auto;
      }
      #questLog .ql-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      #questLog .ql-item {
        border-top: 1px solid rgba(58,124,165,0.4);
        padding-top: 4px;
        margin-top: 4px;
      }
      #questLog .ql-item.completed {
        color: #22c55e;
      }
      #questLog .ql-name { font-weight: 500; }
      #questLog .ql-desc { opacity: 0.8; }
      #questLog .ql-progress { font-size: 11px; opacity: 0.9; }
      #saveBtn, #loadBtn {
        position: absolute;
        top: 60px;
        left: 20px;
        padding: 8px 12px;
        background: #1f2937;
        color: #e5e7eb;
        border-radius: 8px;
        border: 1px solid #3a7ca5;
        cursor: pointer;
        font-size: 12px;
        pointer-events: auto;
      }
      #loadBtn { left: 120px; }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const ui = document.getElementById('ui');
    if (!ui) return;
    // Квест-лог
    const qbox = document.createElement('div');
    qbox.id = 'questLog';
    ui.appendChild(qbox);

    // Кнопки сохранения
    const save = document.createElement('button');
    save.id = 'saveBtn';
    save.textContent = 'Сохранить';
    save.addEventListener('click', saveGame);
    ui.appendChild(save);

    const load = document.createElement('button');
    load.id = 'loadBtn';
    load.textContent = 'Загрузить';
    load.addEventListener('click', loadGame);
    ui.appendChild(load);
  }

  function saveGame() {
    if (!window.player) return;
    const data = {
      cls: player.class,
      level: player.level,
      xp: player.xp,
      xpToNext: player.xpToNext,
      hp: player.hp,
      maxHp: player.maxHp,
      mp: player.mp,
      maxMp: player.maxMp,
      inventory: player.inventory,
      equipment: player.equipment,
      skillPoints: window.skillPoints || 0,
      skills: Object.keys(player.skills || {}).filter(k => player.skills[k].unlocked),
      quests: questProgress
    };
    try {
      localStorage.setItem('eternalRpgSave', JSON.stringify(data));
      if (window.createFloatingText) {
        createFloatingText(player.x, player.y - 80, 'Сохранено', '#3b82f6');
      }
    } catch(e) {
      console.error('Save error', e);
      alert('Не удалось сохранить (localStorage).');
    }
  }

  function loadGame() {
    let raw = null;
    try {
      raw = localStorage.getItem('eternalRpgSave');
    } catch(e) {
      console.error('Load error', e);
    }
    if (!raw) {
      alert('Сохранение не найдено.');
      return;
    }
    const data = JSON.parse(raw);
    if (!data || !window.selectClass) return;
    // если класс отличается, переинициализируем
    if (!window.player || player.class !== data.cls) {
      selectClass(data.cls || 'warrior');
    }
    // применяем сохранённое
    player.level = data.level || 1;
    player.xp = data.xp || 0;
    player.xpToNext = data.xpToNext || player.xpToNext;
    player.hp = data.hp || player.hp;
    player.maxHp = data.maxHp || player.maxHp;
    player.mp = data.mp || player.mp;
    player.maxMp = data.maxMp || player.maxMp;
    player.inventory = data.inventory || player.inventory;
    player.equipment = data.equipment || player.equipment;
    window.skillPoints = data.skillPoints || 0;
    questProgress = data.quests || questProgress;
    // восстановить умения
    if (data.skills) {
      data.skills.forEach(id => {
        if (!player.skills[id]) player.skills[id] = { unlocked: true, cooldown: 0 };
        else player.skills[id].unlocked = true;
      });
    }
    if (window.updateInventoryUI) updateInventoryUI();
    if (window.updateSkillTree) updateSkillTree();
    if (window.updateUI) updateUI();
    renderQuestLog();
    if (window.createFloatingText) {
      createFloatingText(player.x, player.y - 80, 'Загружено', '#22c55e');
    }
  }

  function spawnBoss() {
    if (!window.player || !window.enemies) return;
    if (!window.sprites) return;
    if (!sprites.enemy.boss) sprites.enemy.boss = '🐲';
    const boss = {
      x: player.x + 200,
      y: player.y,
      radius: 32,
      hp: 260,
      maxHp: 260,
      speed: 2.2,
      dmg: 35,
      type: 'boss',
      lastAttack: 0,
      hpBar: document.createElement('div')
    };
    boss.hpBar.className = 'enemy-hp';
    document.body.appendChild(boss.hpBar);
    enemies.push(boss);
    bossSpawned = true;
    if (window.createFloatingText) {
      createFloatingText(player.x, player.y - 100, 'Появился босс!', '#f97316');
    }
  }

  function patchLogic() {
    // квесты по убийствам + босс
    if (window.checkCollisions) {
      const oldCheck = window.checkCollisions;
      window.checkCollisions = function() {
        const before = (window.enemies && enemies.length) || 0;
        oldCheck();
        const after = (window.enemies && enemies.length) || 0;
        const killed = Math.max(0, before - after);
        if (killed > 0) {
          updateQuestProgress('kills', killed);
          if (window.player) {
            player.kills = (player.kills || 0) + killed;
            if (!bossSpawned && player.kills >= 20) {
              spawnBoss();
            }
          }
        }
      };
    }
    // квесты по луту
    if (window.addToInventory) {
      const oldAdd = window.addToInventory;
      window.addToInventory = function(item) {
        oldAdd(item);
        updateQuestProgress('loot', 1);
      };
    }
  }

  window.addEventListener('load', function(){
    injectStyles();
    injectUI();
    initQuests();
    patchLogic();
  });
})();