import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class StringReplaceCommand extends AbstractCommand {
    readonly name = 'string:replace';
    readonly group = 'string';
    readonly description = 'Replace all appearances of a selected value with a target value.';

    readonly parameters = [
        {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Input text where replacement is applied.',
            shortAlias: 't',
            longAlias: 'text',
        },
        {
            name: 'search',
            type: 'string',
            required: true,
            description: 'Selected character/value to replace.',
            shortAlias: 's',
            longAlias: 'search',
        },
        {
            name: 'target',
            type: 'string',
            required: true,
            description: 'Target character/value used as replacement.',
            shortAlias: 'r',
            longAlias: 'target',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const positionalArgs = Array.isArray(input._args) ? input._args : [];

        const text = this.pickString(input.text, positionalArgs[0]);
        const search = this.pickString(input.search, positionalArgs[1]);
        const target = this.pickString(input.target, positionalArgs[2]);

        if (text.length === 0) {
            return {
                ok: false,
                output: 'Missing required parameter: text.',
            };
        }

        if (search.length === 0) {
            return {
                ok: false,
                output: 'Missing required parameter: search.',
            };
        }

        return {
            ok: true,
            output: text.split(search).join(target),
        };
    }

    private pickString(primary: unknown, fallback: unknown): string {
        if (typeof primary === 'string' && primary.length > 0) {
            return primary;
        }

        if (typeof fallback === 'string' && fallback.length > 0) {
            return fallback;
        }

        return '';
    }
}
