// export const mergeContent = (oldContent = [], newContent = []) => {
//   return [...oldContent, ...newContent];
// };

export const mergeContent = (oldContent = [], newContent = []) => {
  if (!oldContent.length) return newContent;

  const merged = [...oldContent];

  newContent.forEach((block) => {
    const last = merged[merged.length - 1];

    // streaming text chunk
    if (last && last.type === 'text' && block.type === 'text') {
      merged[merged.length - 1] = {
        ...last,
        data: {
          ...last.data,
          text: (last.data?.text || '') + (block.data?.text || ''),
        },
      };
    } else {
      merged.push(block);
    }
  });

  return merged;
};

export const upsertMessage = (
  prevMessages,
  incoming,
  pendingAssistantMessageIdRef,
) => {
  console.log('Prev Message: ', prevMessages);
  const existingIdx = prevMessages.findIndex(
    (m) => m.message_id === incoming.message_id,
  );

  if (existingIdx !== -1) {
    const existing = prevMessages[existingIdx];

    const updatedMessage = incoming.overwrite
      ? { ...incoming }
      : {
          ...existing,
          ...incoming,
          content: mergeContent(existing.content, incoming.content),
        };

    const updated = [...prevMessages];
    updated[existingIdx] = updatedMessage;

    return updated;
  }

  if (pendingAssistantMessageIdRef.current) {
    const tempIdx = prevMessages.findIndex(
      (m) => m.message_id === pendingAssistantMessageIdRef.current,
    );

    if (tempIdx !== -1) {
      const updated = [...prevMessages];
      updated[tempIdx] = incoming;
      pendingAssistantMessageIdRef.current = null;
      return updated;
    }
  }

  return [...prevMessages, incoming];
};
