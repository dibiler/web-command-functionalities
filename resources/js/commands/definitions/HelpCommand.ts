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
    ] as const;

    execute(input: CommandInputValues, context: CommandExecutionContext): CommandExecutionResult {
        const group = typeof input.group === 'string' ? input.group : null;

        if (group) {
            const commands = context.availableCommands.filter((command) => command.group === group);
            const names = commands.map((command) => command.name).join(', ');

            return {
                ok: true,
                output: commands.length > 0
                    ? `Commands in ${group}: ${names}`
                    : `No commands found for group: ${group}`,
            };
        }

        const names = context.availableCommands.map((command) => command.name).join(', ');
        return {
            ok: true,
            output: `Available commands: ${names}`,
        };
    }
}
