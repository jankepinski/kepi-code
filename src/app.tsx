import React from "react";
import { Action } from "./types/action.js";
import { useAppPhase } from "./hooks/useAppPhase.js";
import PhaseRouter from "./ui/PhaseRouter.js";

export { Action };

export interface AppProps {
  action?: Action;
}

export const App: React.FC<AppProps> = ({ action }) => {
  const { phase, handlePick, handleFirstRunDone, persistConfig } = useAppPhase(action);
  return (
    <PhaseRouter
      phase={phase}
      onPick={handlePick}
      onFirstRunDone={handleFirstRunDone}
      onPersistConfig={persistConfig}
    />
  );
};

export default App;
