import React from "react";
import Inventory from "../../features/inventory";
import Recipes from "../../features/recipes";
import Shopping from "../../features/shopping";
import Impact from "../../features/impact/Impact";
import Settings from "../../features/settings/components/SettingsPage";

export const appRoutes = [
  { path: "/home", Component: Inventory },
  { path: "/recipes", Component: Recipes },
  { path: "/shop", Component: Shopping },
  { path: "/impact", Component: Impact },
  { path: "/settings", Component: Settings },
];
