const DREAM_CUE = /(?:梦见|梦到|梦里|梦中|做(?:了)?(?:一场|一个)?梦|噩梦|美梦|nightmare|\b(?:dreamed|dreamt|dream)\b)/i;

export const resolveDreamText = (event = "", explicitDream = "") => {
  const savedDream = explicitDream.trim();
  if (savedDream) return savedDream;
  const journalText = event.trim();
  return DREAM_CUE.test(journalText) ? journalText : "";
};
