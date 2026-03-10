import { findCommandByName, getCommandDefinitions } from '../commands/CommandRegistry';

import type { CommandDefinition, CommandExecutionResult, CommandInputValues } from '../types/commands';

type ParsedCommand = {
    name: string;
    input: CommandInputValues;
    assignedVariable?: string;
};

type ParseResult = {
    parsed?: ParsedCommand;
    error?: string;
};

type ResolvedValue = {
    value: unknown;
    missingVariable?: string;
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

    const sortCommand = commands.find((command) => command.name.includes('sort'))?.name;
    const uniqueCommand = commands.find((command) => command.name.includes('unique'))?.name;
    /*
        return Array.from(new Set([
            'help',
            ...groups.map((group) => `help ${group}`),
            ...commandExamples,
            sortCommand ? `$tempList << ${sortCommand} --list="5,3,2,1"` : '',
            uniqueCommand ? `${uniqueCommand} --list=$tempList` : '',
        ].filter((entry) => entry.length > 0)));*/
    return Array.from(new Set([
        'list:changeSeparator --separator=";" --newSeparator="," --list=""',
        'list:changeSeparator --separator="," --newSeparator=";" --list=""',
        'list:fromRange --step=1 --start=1 --end=10',
        'list:unique --list=""',
        'help list',
        'help string',
    ]));
}

export function executeCommandPrompt(
    prompt: string,
    variables: Record<string, string>,
): { result: CommandExecutionResult; assignedVariable?: string } {
    const parseResult = parsePrompt(prompt, variables);

    if (!parseResult) {
        return {
            result: {
                ok: false,
                output: 'Invalid command prompt.',
            },
        };
    }

    if (parseResult.error) {
        return {
            result: {
                ok: false,
                output: parseResult.error,
            },
        };
    }

    const parsed = parseResult.parsed;

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

function parsePrompt(prompt: string, variables: Record<string, string>): ParseResult | null {
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

            const nestedResolution = resolveNestedCommandSubstitution(rawKey, rawValue, args, index, variables);
            if (nestedResolution.handled) {
                if (nestedResolution.error) {
                    return {
                        error: nestedResolution.error,
                    };
                }

                input[rawKey] = nestedResolution.value ?? '';
                break;
            }

            const value = rawValue ?? args[index + 1] ?? true;
            const resolved = resolveVariableValue(value, variables);

            if (resolved.missingVariable) {
                return {
                    error: `Variable not found: $${resolved.missingVariable}`,
                };
            }

            input[rawKey] = resolved.value;

            if (rawValue === undefined && args[index + 1] && !args[index + 1].startsWith('-')) {
                index += 1;
            }

            continue;
        }

        if (token.startsWith('-') && token.length > 1) {
            const [alias, rawAliasValue] = token.slice(1).split('=', 2);

            const nestedResolution = resolveNestedCommandSubstitution(alias, rawAliasValue, args, index, variables);
            if (nestedResolution.handled) {
                if (nestedResolution.error) {
                    return {
                        error: nestedResolution.error,
                    };
                }

                input[alias] = nestedResolution.value ?? '';
                break;
            }

            const value = rawAliasValue ?? args[index + 1] ?? true;
            const resolved = resolveVariableValue(value, variables);

            if (resolved.missingVariable) {
                return {
                    error: `Variable not found: $${resolved.missingVariable}`,
                };
            }

            input[alias] = resolved.value;

            if (rawAliasValue === undefined && args[index + 1] && !args[index + 1].startsWith('-')) {
                index += 1;
            }

            continue;
        }

        const resolved = resolveVariableValue(token, variables);

        if (resolved.missingVariable) {
            return {
                error: `Variable not found: $${resolved.missingVariable}`,
            };
        }

        positionalArgs.push(resolved.value);
    }

    if (positionalArgs.length > 0) {
        input._args = positionalArgs;
    }

    return {
        parsed: {
            name,
            input,
            assignedVariable,
        },
    };
}

function resolveNestedCommandSubstitution(
    parameterName: string,
    rawInlineValue: string | undefined,
    args: string[],
    index: number,
    variables: Record<string, string>,
): { handled: boolean; value?: string; error?: string } {
    const inlineValue = typeof rawInlineValue === 'string' ? stripWrappingQuotes(rawInlineValue).trim() : '';
    const nextToken = args[index + 1] ?? '';

    let nestedTokens: string[] | null = null;

    if (inlineValue.startsWith('<<')) {
        const firstToken = inlineValue.slice(2).trim();
        nestedTokens = [firstToken, ...args.slice(index + 1)].filter((token) => token.length > 0);
    } else if (nextToken === '<<' || nextToken.startsWith('<<')) {
        const firstToken = nextToken === '<<' ? '' : nextToken.slice(2).trim();
        nestedTokens = [firstToken, ...args.slice(index + 2)].filter((token) => token.length > 0);
    }

    if (!nestedTokens) {
        return {
            handled: false,
        };
    }

    if (nestedTokens.length === 0) {
        return {
            handled: true,
            error: `Missing nested command after << for parameter: ${parameterName}`,
        };
    }

    const nestedPrompt = nestedTokens.join(' ');
    const nestedExecution = executeCommandPrompt(nestedPrompt, variables).result;

    if (!nestedExecution.ok) {
        return {
            handled: true,
            error: `Nested command failed for parameter ${parameterName}: ${nestedExecution.output}`,
        };
    }

    return {
        handled: true,
        value: nestedExecution.output,
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

function resolveVariableValue(value: unknown, variables: Record<string, string>): ResolvedValue {
    if (typeof value !== 'string') {
        return { value };
    }

    const normalizedValue = stripWrappingQuotes(value);

    if (normalizedValue.startsWith('$')) {
        const variableName = normalizedValue.slice(1);

        if (!(variableName in variables)) {
            return {
                value: '',
                missingVariable: variableName,
            };
        }

        return {
            value: variables[variableName],
        };
    }

    return { value: normalizedValue };
}

function stripWrappingQuotes(value: string): string {
    if (value.length < 2) {
        return value;
    }

    const startsWithDouble = value.startsWith('"') && value.endsWith('"');
    const startsWithSingle = value.startsWith("'") && value.endsWith("'");

    if (startsWithDouble || startsWithSingle) {
        return value.slice(1, -1);
    }

    return value;
}
