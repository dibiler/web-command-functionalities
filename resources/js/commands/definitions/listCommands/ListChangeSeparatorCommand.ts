import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListChangeSeparatorCommand extends AbstractCommand {
    readonly name = 'list:changeSeparator';
    readonly group = 'list';
    readonly description = 'Return the same list values using a different output separator.';

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
            description: 'Input list separator character/string.',
            defaultValue: ',',
            shortAlias: 's',
            longAlias: 'separator',
        },
        {
            name: 'newSeparator',
            type: 'string',
            required: true,
            description: 'Desired output separator character/string.',
            shortAlias: 'n',
            longAlias: 'newSeparator',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const separator = typeof input.separator === 'string' && input.separator.length > 0 ? input.separator : ',';
        const newSeparator = typeof input.newSeparator === 'string' && input.newSeparator.length > 0
            ? input.newSeparator
            : null;

        if (!newSeparator) {
            return {
                ok: false,
                output: 'Missing required parameter: newSeparator.',
            };
        }

        const values = this.parseSeparatedList(input.list, separator);

        return {
            ok: true,
            output: values.join(newSeparator),
        };
    }
}
