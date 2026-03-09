import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class StringHashCommand extends AbstractCommand {
    readonly name = 'string:hash';
    readonly group = 'string';
    readonly description = 'Create a deterministic hash from the provided text.';

    readonly parameters = [
        {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Text to hash.',
            shortAlias: 't',
            longAlias: 'text',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const positionalArgs = Array.isArray(input._args) ? input._args : [];
        const fromNamed = typeof input.text === 'string' ? input.text : '';
        const fromPositional = typeof positionalArgs[0] === 'string' ? positionalArgs[0] : '';
        const text = (fromNamed || fromPositional).trim();

        if (text.length === 0) {
            return {
                ok: false,
                output: 'Missing required parameter: text.',
            };
        }

        const hashHex = this.fnv1a32(text);

        return {
            ok: true,
            output: hashHex,
        };
    }

    private fnv1a32(value: string): string {
        let hash = 0x811c9dc5;

        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }

        return (hash >>> 0).toString(16).padStart(8, '0');
    }
}
