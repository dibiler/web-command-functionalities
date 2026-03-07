import { AbstractCommand } from '../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../types/commands';

export class ListUniqueCommand extends AbstractCommand {
    readonly name = 'list:unique';
    readonly group = 'list';
    readonly description = 'Remove duplicate values from the list.';

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
        return {
            ok: true,
            output: Array.from(new Set(values)).join(','),
        };
    }
}
