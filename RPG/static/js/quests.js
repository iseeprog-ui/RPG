import { QUEST_TEMPLATES } from './constants.js';
import { gameState } from './state.js';
import { gainExperience } from './player.js';

export function initQuests() {
  gameState.quests = QUEST_TEMPLATES.map(template => ({
    ...template,
    progress: 0,
    completed: false,
    claimed: false
  }));
}

export function questsForZone(zoneId) {
  return gameState.quests.filter(q => q.zone === zoneId && !q.completed);
}

export function updateQuest(type, target, amount = 1) {
  gameState.quests.forEach(quest => {
    if (quest.completed) return;
    if (quest.type === type && quest.target === target) {
      quest.progress += amount;
      if ((quest.count && quest.progress >= quest.count) || quest.type === 'boss') {
        quest.completed = true;
        grantQuestRewards(quest);
      }
    }
  });
}

function grantQuestRewards(quest) {
  const reward = quest.reward || {};
  if (reward.xp) gainExperience(reward.xp);
  if (reward.gold) gameState.stats.gold += reward.gold;
  if (reward.legendary) {
    gameState.stats.lootCount += 1;
  }
  gameState.ui.log.push(`Квест "${quest.id}" завершён!`);
  window.dispatchEvent(new CustomEvent('questCompleted', { detail: quest }));
}

export function getQuestData() {
  return gameState.quests;
}

