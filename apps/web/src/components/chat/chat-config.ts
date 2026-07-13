import type { Conversation, Role } from "./chat-types";

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  guest: "Guest",
  pro: "Pro",
  standard: "Standard",
};

export const roleOrder: Role[] = ["guest", "standard", "pro", "admin"];

export const planRows = [
  {
    id: "questions",
    label: "Questions",
    guest: "3 total",
    standard: "Unlimited",
    pro: "Unlimited",
    admin: "Unlimited",
  },
  {
    id: "games",
    label: "Rulebooks",
    guest: "Catan, Ticket to Ride",
    standard: "All games",
    pro: "All games",
    admin: "All games",
  },
  {
    id: "history",
    label: "Chat history",
    guest: "Not saved",
    standard: "Saved",
    pro: "Saved + favorites",
    admin: "Saved",
  },
  {
    id: "detail",
    label: "Answer detail",
    guest: "Basic",
    standard: "Full citations",
    pro: "Full citations + priority",
    admin: "Full citations + internal tools",
  },
];

export const gamesByToken: Record<string, string> = {
  azul: "Azul",
  catan: "Catan",
  gloomhaven: "Gloomhaven",
  monopoly: "Monopoly",
  pandemic: "Pandemic",
  root: "Root",
  scythe: "Scythe",
  "terraforming mars": "Terraforming Mars",
  "ticket to ride": "Ticket to Ride",
  wingspan: "Wingspan",
};

export const exampleQuestions = [
  {
    id: "ask-example-catan-road-btn",
    label: "In Catan, can I build a road through an opponent's settlement?",
  },
  {
    id: "ask-example-gloomhaven-infusion-btn",
    label: "How does elemental infusion work in Gloomhaven?",
  },
  {
    id: "ask-example-ticket-to-ride-btn",
    label: "In Ticket to Ride, what if I cannot complete a ticket?",
  },
  {
    id: "ask-example-root-vagabond-btn",
    label: "Can the Vagabond be attacked while allied in Root?",
  },
];

export const seedConversations: Conversation[] = [
  {
    id: "seed-catan",
    title: "Catan - road through settlement",
    game: "Catan",
    messages: [
      {
        id: "seed-catan-user",
        role: "user",
        text: "Can I build a road through an opponent's settlement?",
      },
      {
        id: "seed-catan-assistant",
        role: "assistant",
        phase: "done",
        revealed: 999,
        text: "No - in Catan you may never build a road through or past a settlement or city belonging to another player. [[1]] A settlement placed on one of your road's intersections breaks the connection there, so a segment on the far side no longer counts as part of your network. This is also how Longest Road can be interrupted. [[2]]",
        cites: [
          {
            n: 1,
            book: "Catan Base Game Almanac",
            page: 7,
            quote:
              "A road may not be built past a settlement or city belonging to another player.",
          },
          {
            n: 2,
            book: "Catan Base Game Almanac",
            page: 9,
            quote:
              "An opponent settlement placed on your road interrupts it for Longest Road.",
          },
        ],
      },
    ],
  },
  {
    id: "seed-gloomhaven",
    title: "Gloomhaven - elemental infusion",
    game: "Gloomhaven",
    messages: [
      {
        id: "seed-gloomhaven-user",
        role: "user",
        text: "How does elemental infusion work?",
      },
      {
        id: "seed-gloomhaven-assistant",
        role: "assistant",
        phase: "done",
        revealed: 999,
        text: "When an ability creates an element, its token goes in the Strong column of the elemental infusion table. [[1]] At the end of that round it moves to Waning, and at the end of the following round it is consumed. [[2]]",
        cites: [
          {
            n: 1,
            book: "Gloomhaven Rulebook",
            page: 20,
            quote:
              "Infused elements are placed in the Strong area of the element table.",
          },
          {
            n: 2,
            book: "Gloomhaven Rulebook",
            page: 21,
            quote:
              "At the end of the next round, any element still present is removed.",
          },
        ],
      },
    ],
  },
];
