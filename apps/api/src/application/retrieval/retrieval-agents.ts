export interface RetrievalAgent {
  run(input: string): Promise<string>;
}

export type CreateRuleContextAgent = (context: string) => RetrievalAgent;

export type CreateRuleAnswerAgent = (context: string) => RetrievalAgent;

export type CreateConversationTitleAgent = () => RetrievalAgent;
