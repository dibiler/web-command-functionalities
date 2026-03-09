import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListRandomCommand extends AbstractCommand {
    readonly name = 'list:random';
    readonly group = 'list';
    readonly description = 'Return a random item from the provided list.';

    readonly parameters = [
        {
            name: 'list',
            type: 'string',
            required: true,
            description: 'List input.',
            shortAlias: 'l',
            longAlias: 'list',
        },
        {
            name: 'separator',
            type: 'string',
            required: false,
            description: 'List separator character/string.',
            defaultValue: ',',
            shortAlias: 's',
            longAlias: 'separator',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const separator = typeof input.separator === 'string' && input.separator.length > 0 ? input.separator : ',';
        const values = this.parseSeparatedList(input.list, separator);

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
