export const substringSearch = (query, items, { keys }) => {
  const q = query.toLowerCase();

  return items
    .filter((item) => keys.some((k) => item[k]?.toLowerCase().includes(q)))
    .map((item) => ({
      item,
      score: 1,
      matches: [], // no highlighting
    }));
};

export const prefixSearch = (query, items, { keys }) => {
  const q = query.toLowerCase();

  return items
    .filter((item) => keys.some((k) => item[k]?.toLowerCase().startsWith(q)))
    .map((item) => ({
      item,
      score: 1,
      matches: [], // no highlighting
    }));
};
