ALTER TABLE conversation_messages
  ALTER COLUMN conversation_id TYPE UUID USING conversation_id::UUID;

ALTER TABLE conversation_messages
  ADD CONSTRAINT conversation_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES conversations(id)
  ON DELETE CASCADE;
