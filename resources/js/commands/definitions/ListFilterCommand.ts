import { AbstractCommand } from '../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../types/commands';

export class ListFilterCommand extends AbstractCommand {
    readonly name = 'list:filter';
    readonly group = 'list';
    readonly description = 'Filter list values by a query token.';

    readonly parameters = [
        {
            name: 'list',
            type: 'string',
            required: true,
            description: 'Comma-separated list input.',
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
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const values = this.parseCommaSeparatedList(input.list);
        const query = typeof input.query === 'string' ? input.query : '';

        return {
            ok: true,
            output: values.filter((value) => value.includes(query)).join(','),
        };
    }
}
