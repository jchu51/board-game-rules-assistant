import type { Role } from "./chat-types";

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
