import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListCountCommand extends AbstractCommand {
    readonly name = 'list:count';
    readonly group = 'list';
    readonly description = 'Return the number of items in a list.';

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

        return {
            ok: true,
            output: String(values.length),
        };
    }
}
