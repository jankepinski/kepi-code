import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { configSchema, type Config } from "../config/schema.js";
import { writeGlobalConfig } from "../config/load.js";
import { installBuiltinSkills } from "./install.js";

interface WizardProps {
  onDone: (config: Config) => void;
}

export const FirstRunWizard: React.FC<WizardProps> = ({ onDone }) => {
  const [step, setStep] = useState<"api-key" | "model" | "saving" | "done">("api-key");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-sonnet-4");
  const [error, setError] = useState<string | null>(null);

  if (step === "api-key") {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Welcome to kepi code
        </Text>
        <Text>Let's get set up. You'll need an OpenRouter API key.</Text>
        <Text dimColor>Get one at: https://openrouter.ai/keys</Text>
        <Box marginTop={1}>
          <Text>API key: </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            mask="*"
            onSubmit={(value) => {
              if (!value.trim()) {
                setError("API key cannot be empty");
                return;
              }
              setError(null);
              setStep("model");
            }}
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
      </Box>
    );
  }

  if (step === "model") {
    return (
      <Box flexDirection="column">
        <Text>Default model (press enter to accept):</Text>
        <Box>
          <Text>Model: </Text>
          <TextInput
            value={model}
            onChange={setModel}
            onSubmit={async () => {
              setStep("saving");
              try {
                const config = configSchema.parse({
                  openrouter: { apiKey, model: model.trim() || "anthropic/claude-sonnet-4" },
                });
                await writeGlobalConfig(config);
                await installBuiltinSkills();
                setStep("done");
                setTimeout(() => {
                  onDone(config);
                }, 300);
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setStep("model");
              }
            }}
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
      </Box>
    );
  }

  if (step === "saving") {
    return <Text>Saving config...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="green">Setup complete.</Text>
      <Text dimColor>Config saved at ~/.kepi/config.json</Text>
    </Box>
  );
};

export default FirstRunWizard;
