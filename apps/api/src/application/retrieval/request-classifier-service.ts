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
  "everdell",
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
  "bid",
  "board game",
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
  "goal",
  "hand",
  "hand limit",
  "legal",
  "meeple",
  "move",
  "objective",
  "pawn",
  "pay",
  "penalty",
  "phase",
  "piece",
  "placement",
  "player",
  "point",
  "resource",
  "road",
  "roll",
  "round",
  "rule",
  "score",
  "setup",
  "shuffle",
  "tie",
  "tile",
  "token",
  "trade",
  "turn",
  "victory",
  "win",
  "worker",
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
    const asksHowToPlayKnownGame =
      searchableQuery.startsWith("how to play ") && mentionsKnownGame;
    const isGameRuleQuestion =
      asksHowToPlayKnownGame ||
      (mentionsRuleTerm && (mentionsKnownGame || looksLikeQuestion));

    return {
      isGameRuleQuestion,
      normalizedQuery,
      reason: isGameRuleQuestion ? "board_game_rule" : "out_of_scope",
    };
  }
}
