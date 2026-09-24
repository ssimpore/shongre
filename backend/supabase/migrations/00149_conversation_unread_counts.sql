CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts(
  p_user_id UUID,
  p_conversation_ids UUID[]
)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT conversation.id,
         COUNT(message.id) FILTER (
           WHERE message.sender_id <> p_user_id
             AND NOT (p_user_id = ANY(COALESCE(message.read_by, '{}'::UUID[])))
         ) AS unread_count
  FROM public.conversations conversation
  LEFT JOIN public.messages message ON message.conversation_id = conversation.id
  WHERE conversation.id = ANY(p_conversation_ids)
    AND p_user_id IN (conversation.buyer_id, conversation.seller_id)
  GROUP BY conversation.id;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_unread_counts(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_unread_counts(UUID, UUID[]) TO service_role;
