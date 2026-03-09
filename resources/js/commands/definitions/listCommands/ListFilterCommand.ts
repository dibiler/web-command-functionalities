import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListFilterCommand extends AbstractCommand {
    readonly name = 'list:filter';
    readonly group = 'list';
    readonly description = 'Filter list values by a query token.';

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
            name: 'query',
            type: 'string',
            required: true,
            description: 'Filter query value.',
            shortAlias: 'q',
            longAlias: 'query',
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
        const query = typeof input.query === 'string' ? input.query : '';

        return {
            ok: true,
            output: values.filter((value) => value.includes(query)).join(separator),
        };
    }
}
