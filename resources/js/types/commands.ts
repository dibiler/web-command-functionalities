export type CommandParameterType = 'string' | 'number' | 'boolean' | 'json';

export type CommandParameterDefinition = {
    name: string;
    type: CommandParameterType;
    required: boolean;
    description: string;
    defaultValue?: unknown;
    shortAlias?: string;
    longAlias?: string;
};

export type CommandDefinition = {
    name: string;
    group: string;
    description: string;
    parameters: readonly CommandParameterDefinition[];
};

export type CommandInputValues = Record<string, unknown>;

export type CommandExecutionResult = {
    ok: boolean;
    output: string;
    metadata?: Record<string, unknown>;
};

export type CommandExecutionContext = {
    timestamp: string;
    variables: Record<string, string>;
    availableCommands: CommandDefinition[];
};
