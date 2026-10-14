export const serviceLabels = {
  steam: "Steam",
  egs: "Epic Games",
  gog: "GOG",
  amazon: "Amazon Games",
  ubisoft: "Ubisoft Connect",
  ea_app: "EA app",
  other: "Other services",
} as const;

export type GameService = keyof typeof serviceLabels;
export const gameServices = Object.keys(serviceLabels) as GameService[];
export const shortServiceLabels: Record<GameService, string> = {
  ...serviceLabels, egs: "Epic", amazon: "Amazon", ubisoft: "Ubisoft", other: "Other",
};
