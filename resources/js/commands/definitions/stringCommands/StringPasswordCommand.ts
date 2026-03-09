import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class StringPasswordCommand extends AbstractCommand {
    readonly name = 'string:password';
    readonly group = 'string';
    readonly description = 'Generate a password with configurable length and character sets.';

    readonly parameters = [
        {
            name: 'length',
            type: 'number',
            required: false,
            description: 'Desired password length.',
            defaultValue: 8,
            shortAlias: 'l',
            longAlias: 'length',
        },
        {
            name: 'nums',
            type: 'boolean',
            required: false,
            description: 'Include numeric characters.',
            defaultValue: true,
            shortAlias: 'n',
            longAlias: 'nums',
        },
        {
            name: 'specialchars',
            type: 'boolean',
            required: false,
            description: 'Include special characters.',
            defaultValue: true,
            shortAlias: 's',
            longAlias: 'specialchars',
        },
        {
            name: 'uppercase',
            type: 'boolean',
            required: false,
            description: 'Include uppercase letters.',
            defaultValue: true,
            shortAlias: 'u',
            longAlias: 'uppercase',
        },
        {
            name: 'lowercase',
            type: 'boolean',
            required: false,
            description: 'Include lowercase letters.',
            defaultValue: true,
            shortAlias: 'l',
            longAlias: 'lowercase',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const length = this.parseLength(input.length);

        if (length === null) {
            return {
                ok: false,
                output: 'Invalid parameter: length must be a positive integer.',
            };
        }

        const includeNums = this.parseBoolean(input.nums, true);
        const includeSpecialChars = this.parseBoolean(input.specialchars, true);
        const includeUppercase = this.parseBoolean(input.uppercase, true);
        const includeLowercase = this.parseBoolean(input.lowercase, true);

        const pools: string[] = [];

        if (includeNums) {
            pools.push('0123456789');
        }

        if (includeSpecialChars) {
            pools.push('!@#$%^&*()-_=+[]{}|;:,.<>?/');
        }

        if (includeUppercase) {
            pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        }

        if (includeLowercase) {
            pools.push('abcdefghijklmnopqrstuvwxyz');
        }

        if (pools.length === 0) {
            return {
                ok: false,
                output: 'At least one character set must be enabled (nums, specialchars, uppercase, lowercase).',
            };
        }

        const allCharacters = pools.join('');
        let password = '';

        for (let index = 0; index < length; index += 1) {
            const randomIndex = this.getRandomIndex(allCharacters.length);
            password += allCharacters[randomIndex];
        }

        return {
            ok: true,
            output: password,
        };
    }

    private parseLength(value: unknown): number | null {
        if (value === undefined || value === null || value === '') {
            return 8;
        }

        const numeric = typeof value === 'number' ? value : Number(value);

        if (!Number.isInteger(numeric) || numeric <= 0) {
            return null;
        }

        return numeric;
    }

    private parseBoolean(value: unknown, fallback: boolean): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) {
                return true;
            }

            if (['false', '0', 'no', 'off'].includes(normalized)) {
                return false;
            }
        }

        return fallback;
    }

    private getRandomIndex(maxExclusive: number): number {
        const maybeCrypto = globalThis.crypto;

        if (!maybeCrypto || typeof maybeCrypto.getRandomValues !== 'function') {
            return Math.floor(Math.random() * maxExclusive);
        }

        const values = new Uint32Array(1);
        maybeCrypto.getRandomValues(values);
        return values[0] % maxExclusive;
    }
}
