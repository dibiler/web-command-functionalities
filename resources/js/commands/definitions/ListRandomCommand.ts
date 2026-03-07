import { AbstractCommand } from '../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../types/commands';

export class ListRandomCommand extends AbstractCommand {
    readonly name = 'list:random';
    readonly group = 'list';
    readonly description = 'Return a random item from the provided list.';

    readonly parameters = [
        {
            name: 'list',
            type: 'string',
            required: true,
            description: 'Comma-separated list input.',
            shortAlias: 'l',
            longAlias: 'list',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const values = this.parseCommaSeparatedList(input.list);

        if (values.length === 0) {
            return {
                ok: false,
                output: 'No list values were provided.',
            };
        }

        return {
            ok: true,
            output: values[Math.floor(Math.random() * values.length)],
        };
    }
}
