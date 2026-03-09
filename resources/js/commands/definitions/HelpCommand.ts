import { AbstractCommand } from '../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../types/commands';

export class HelpCommand extends AbstractCommand {
    readonly name = 'help';
    readonly group = 'core';
    readonly description = 'Show commands globally or by group.';

    readonly parameters = [
        {
            name: 'group',
            type: 'string',
            required: false,
            description: 'Optional command group scope (example: list).',
            shortAlias: 'g',
            longAlias: 'group',
        },
        {
            name: 'verbose',
            type: 'boolean',
            required: false,
            description: 'Show full details (description and parameter metadata).',
            defaultValue: false,
            shortAlias: 'v',
            longAlias: 'verbose',
        },
    ] as const;

    execute(input: CommandInputValues, context: CommandExecutionContext): CommandExecutionResult {
        const groupFromFlag = typeof input.group === 'string' ? input.group.trim() : '';
        const positionalArgs = Array.isArray(input._args) ? input._args : [];
        const scopeFromPositional = typeof positionalArgs[0] === 'string' ? positionalArgs[0].trim() : '';
        const verbose = this.parseBooleanFlag(input.verbose);
        const scope = groupFromFlag || scopeFromPositional || null;

        const commandMatch = scope
            ? context.availableCommands.find((command) => command.name === scope)
            : undefined;

        if (commandMatch) {
            return {
                ok: true,
                output: this.renderCommandDetails(commandMatch),
            };
        }

        const group = scope;

        const commands = group
            ? context.availableCommands.filter((command) => command.group === group)
            : context.availableCommands;

        if (commands.length === 0) {
            return {
                ok: true,
                output: `No commands found for group: ${group}`,
            };
        }

        const lines: string[] = [
            group ? `Commands in group "${group}":` : 'Available commands:',
            '',
        ];

        for (const command of commands) {
            if (verbose) {
                lines.push(this.renderCommandDetails(command));
                lines.push('');
            } else {
                lines.push(this.renderCommandSummary(command));
            }
        }

        return {
            ok: true,
            output: lines.join('\n').trim(),
        };
    }

    private parseBooleanFlag(value: unknown): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }

        return false;
    }

    private renderCommandSummary(command: CommandExecutionContext['availableCommands'][number]): string {
        if (command.parameters.length === 0) {
            return `- ${command.name}`;
        }

        const parameterHints = command.parameters.map((parameter) => {
            const descriptor = `--${parameter.name}=<${parameter.type}>`;
            return parameter.required ? descriptor : `[${descriptor}]`;
        }).join(' ');

        return `- ${command.name} ${parameterHints}`;
    }

    private renderCommandDetails(command: CommandExecutionContext['availableCommands'][number]): string {
        const lines: string[] = [];

        lines.push(`${command.name} (${command.group})`);
        lines.push(`  Description: ${command.description}`);

        if (command.parameters.length === 0) {
            lines.push('  Parameters: none');
            return lines.join('\n');
        }

        lines.push('  Parameters:');

        for (const parameter of command.parameters) {
            const aliases = [parameter.shortAlias ? `-${parameter.shortAlias}` : '', parameter.longAlias ? `--${parameter.longAlias}` : '']
                .filter((alias) => alias.length > 0)
                .join(', ');

            const defaultValue = parameter.defaultValue === undefined || parameter.defaultValue === null || parameter.defaultValue === ''
                ? '(empty)'
                : String(parameter.defaultValue);

            lines.push(
                `   - ${parameter.name} [${parameter.type}] | ${parameter.required ? 'required' : 'optional'} | default: ${defaultValue}`,
            );

            if (aliases.length > 0) {
                lines.push(`     aliases: ${aliases}`);
            }

            lines.push(`     ${parameter.description}`);
        }

        return lines.join('\n');
    }
}
