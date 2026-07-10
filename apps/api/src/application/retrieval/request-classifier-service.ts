import { includesTerm } from "../../shared/helpers";

export type RequestClassification = {
  isGameRuleQuestion: boolean;
  normalizedQuery: string;
  reason: "board_game_rule" | "out_of_scope";
};

const BOARD_GAME_NAMES = [
  "ark nova",
  "azul",
  "catan",
  "gloomhaven",
  "pandemic",
  "root",
  "scythe",
  "terraforming mars",
  "ticket to ride",
  "wingspan",
];

const RULE_TERMS = [
  "action",
  "allowed",
  "attack",
  "build",
  "card",
  "city",
  "combat",
  "cost",
  "dice",
  "discard",
  "draw",
  "end game",
  "game end",
  "hand",
  "hand limit",
  "legal",
  "move",
  "pay",
  "phase",
  "placement",
  "player",
  "point",
  "resource",
  "road",
  "round",
  "rule",
  "score",
  "setup",
  "token",
  "turn",
  "victory",
  "win",
];

const QUESTION_TERMS = [
  "are",
  "can",
  "do",
  "does",
  "how",
  "is",
  "may",
  "must",
  "when",
  "what",
  "where",
  "which",
  "who",
];

export class RequestClassifierService {
  classify(query: string): RequestClassification {
    const normalizedQuery = query.trim();
    const searchableQuery = normalizedQuery.toLowerCase();
    const mentionsKnownGame = BOARD_GAME_NAMES.some((gameName) =>
      includesTerm(searchableQuery, gameName),
    );
    const mentionsRuleTerm = RULE_TERMS.some((term) =>
      includesTerm(searchableQuery, term),
    );
    const looksLikeQuestion = QUESTION_TERMS.some((term) =>
      searchableQuery.startsWith(`${term} `),
    );
    const isGameRuleQuestion =
      mentionsRuleTerm && (mentionsKnownGame || looksLikeQuestion);

    return {
      isGameRuleQuestion,
      normalizedQuery,
      reason: isGameRuleQuestion ? "board_game_rule" : "out_of_scope",
    };
  }
}
