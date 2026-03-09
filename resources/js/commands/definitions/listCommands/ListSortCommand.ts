import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListSortCommand extends AbstractCommand {
    readonly name = 'list:sort';
    readonly group = 'list';
    readonly description = 'Sort numeric values in ascending or descending order.';

    readonly parameters = [
        {
            name: 'list',
            type: 'string',
            required: true,
            description: 'Numeric list input.',
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
        {
            name: 'sortOrder',
            type: 'string',
            required: false,
            description: 'Sort order (asc or desc).',
            defaultValue: 'asc',
            shortAlias: 'o',
            longAlias: 'sortOrder',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const separator = typeof input.separator === 'string' && input.separator.length > 0 ? input.separator : ',';

        const values = this.parseSeparatedList(input.list, separator)
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value))
            .sort((left, right) => {
                if (input.sortOrder === 'desc') {
                    return right - left;
                }
                return left - right;
            });

        return {
            ok: true,
            output: values.join(separator),
        };
    }
}
