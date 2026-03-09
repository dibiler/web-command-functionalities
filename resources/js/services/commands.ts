import { findCommandByName, getCommandDefinitions } from '../commands/CommandRegistry';

import type { CommandDefinition, CommandExecutionResult, CommandInputValues } from '../types/commands';

type ParsedCommand = {
    name: string;
    input: CommandInputValues;
    assignedVariable?: string;
};

export function getAvailableCommands(): CommandDefinition[] {
    return getCommandDefinitions();
}

export function buildCommandSuggestions(commands: CommandDefinition[]): string[] {
    const groups = Array.from(new Set(commands.map((command) => command.group)));

    const commandExamples = commands.slice(0, 4).map((command) => {
        const listParam = command.parameters.find((parameter) => parameter.name === 'list');
        return listParam ? `${command.name} --list="1,2,2,3"` : command.name;
    });

    const sortCommand = commands.find((command) => command.name.includes('sortAsc'))?.name;
    const uniqueCommand = commands.find((command) => command.name.includes('unique'))?.name;

    return Array.from(new Set([
        'help',
        ...groups.map((group) => `help ${group}`),
        ...commandExamples,
        sortCommand ? `$tempList << ${sortCommand} --list="5,3,2,1"` : '',
        uniqueCommand ? `${uniqueCommand} --list=$tempList` : '',
    ].filter((entry) => entry.length > 0)));
}

export function executeCommandPrompt(
    prompt: string,
    variables: Record<string, string>,
): { result: CommandExecutionResult; assignedVariable?: string } {
    const parsed = parsePrompt(prompt, variables);

    if (!parsed) {
        return {
            result: {
                ok: false,
                output: 'Invalid command prompt.',
            },
        };
    }

    const command = findCommandByName(parsed.name);

    if (!command) {
        return {
            result: {
                ok: false,
                output: `Unknown command: ${parsed.name}`,
            },
            assignedVariable: parsed.assignedVariable,
        };
    }

    const normalizedInput = normalizeInputForCommand(parsed.input, command.metadata());

    const result = command.execute(normalizedInput, {
        timestamp: new Date().toISOString(),
        variables,
        availableCommands: getAvailableCommands(),
    });

    return {
        result,
        assignedVariable: parsed.assignedVariable,
    };
}

function normalizeInputForCommand(input: CommandInputValues, metadata: CommandDefinition): CommandInputValues {
    const normalized: CommandInputValues = { ...input };

    for (const parameter of metadata.parameters) {
        if (parameter.shortAlias && input[parameter.shortAlias] !== undefined && normalized[parameter.name] === undefined) {
            normalized[parameter.name] = input[parameter.shortAlias];
        }

        if (parameter.longAlias && input[parameter.longAlias] !== undefined && normalized[parameter.name] === undefined) {
            normalized[parameter.name] = input[parameter.longAlias];
        }
    }

    return normalized;
}

function parsePrompt(prompt: string, variables: Record<string, string>): ParsedCommand | null {
    const assignmentMatch = prompt.match(/^\s*(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*<<\s*(.+)$/);
    const assignedVariable = assignmentMatch?.[1]?.slice(1);
    const rawCommand = assignmentMatch ? assignmentMatch[2] : prompt;

    const tokens = tokenize(rawCommand);
    if (tokens.length === 0) {
        return null;
    }

    const [name, ...args] = tokens;
    const input: CommandInputValues = {};
    const positionalArgs: unknown[] = [];

    for (let index = 0; index < args.length; index += 1) {
        const token = args[index];

        if (token.startsWith('--')) {
            const [rawKey, rawValue] = token.slice(2).split('=', 2);
            const value = rawValue ?? args[index + 1] ?? true;

            input[rawKey] = resolveVariableValue(value, variables);

            if (rawValue === undefined && args[index + 1] && !args[index + 1].startsWith('-')) {
                index += 1;
            }

            continue;
        }

        if (token.startsWith('-') && token.length > 1) {
            const alias = token.slice(1);
            const value = args[index + 1] ?? true;

            input[alias] = resolveVariableValue(value, variables);

            if (args[index + 1] && !args[index + 1].startsWith('-')) {
                index += 1;
            }

            continue;
        }

        positionalArgs.push(resolveVariableValue(token, variables));
    }

    if (positionalArgs.length > 0) {
        input._args = positionalArgs;
    }

    return {
        name,
        input,
        assignedVariable,
    };
}

function tokenize(source: string): string[] {
    const matches = source.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];

    return matches.map((token) => {
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            return token.slice(1, -1);
        }

        return token;
    });
}

function resolveVariableValue(value: unknown, variables: Record<string, string>): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    if (value.startsWith('$')) {
        const variableName = value.slice(1);
        return variables[variableName] ?? '';
    }

    return value;
}
