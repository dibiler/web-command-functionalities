import { AbstractCommand } from '../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../types/commands';

export class ListSortAscCommand extends AbstractCommand {
    readonly name = 'list:sortAsc';
    readonly group = 'list';
    readonly description = 'Sort numeric values in ascending order.';

    readonly parameters = [
        {
            name: 'list',
            type: 'string',
            required: true,
            description: 'Comma-separated numeric list input.',
            shortAlias: 'l',
            longAlias: 'list',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const values = this.parseCommaSeparatedList(input.list)
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value))
            .sort((left, right) => left - right);

        return {
            ok: true,
            output: values.join(','),
        };
    }
}
