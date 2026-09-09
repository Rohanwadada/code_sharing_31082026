export const processStreamEvent = (data, handlers) => {
  const content = data?.content || [];
  const messageId = data?.message_id;

  content.forEach((item) => {
    if (item.type === 'artifact') {
      handlers?.onArtifact?.(item);
    } else if (item.type === 'node_content_gen_start') {
      handlers?.onNodeContentGenerationStart(messageId, item);
    } else if (item.type === 'content_gen_status_delta') {
      handlers?.onContentGenStatusDelta(messageId, item);
    } else if (item.type === 'content_gen_overall_status') {
      handlers?.onContentGenOverallStatusUpdate(messageId, item);
    } else if (item.type === 'course_recommendation_overall_status') {
      handlers?.onCourseRecommendationOverallStatusUpdate(messageId, item);
    } else if (item.type === 'course_recommendation_delta') {
      handlers?.onCourseRecommendationStatusDelta(messageId, item);
    } else if (item.type === 'task_notify') {
      handlers?.onNotify(item);
    }
  });
};
