import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

export class ListFromRangeCommand extends AbstractCommand {
    readonly name = 'list:fromRange';
    readonly group = 'list';
    readonly description = 'Create a numeric list from start to end using an optional step.';

    readonly parameters = [
        {
            name: 'start',
            type: 'number',
            required: true,
            description: 'Range start value.',
            shortAlias: 's',
            longAlias: 'start',
        },
        {
            name: 'end',
            type: 'number',
            required: true,
            description: 'Range end value.',
            shortAlias: 'e',
            longAlias: 'end',
        },
        {
            name: 'step',
            type: 'number',
            required: false,
            description: 'Step increment/decrement value (default: 1 or -1 based on range direction).',
            defaultValue: 1,
            shortAlias: 'p',
            longAlias: 'step',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const start = this.parseNumber(input.start);
        const end = this.parseNumber(input.end);

        if (start === null) {
            return {
                ok: false,
                output: 'Missing or invalid required parameter: start.',
            };
        }

        if (end === null) {
            return {
                ok: false,
                output: 'Missing or invalid required parameter: end.',
            };
        }

        const rawStep = this.parseNumber(input.step);
        const defaultStep = start <= end ? 1 : -1;
        const step = rawStep === null ? defaultStep : rawStep;

        if (step === 0) {
            return {
                ok: false,
                output: 'Invalid parameter: step cannot be 0.',
            };
        }

        if (start < end && step < 0) {
            return {
                ok: false,
                output: 'Invalid step direction: step must be positive when start is less than end.',
            };
        }

        if (start > end && step > 0) {
            return {
                ok: false,
                output: 'Invalid step direction: step must be negative when start is greater than end.',
            };
        }

        const values: number[] = [];
        const maxIterations = 10000;

        if (step > 0) {
            for (let current = start; current <= end; current += step) {
                values.push(current);
                if (values.length > maxIterations) {
                    return {
                        ok: false,
                        output: 'Range too large to generate safely.',
                    };
                }
            }
        } else {
            for (let current = start; current >= end; current += step) {
                values.push(current);
                if (values.length > maxIterations) {
                    return {
                        ok: false,
                        output: 'Range too large to generate safely.',
                    };
                }
            }
        }

        return {
            ok: true,
            output: values.join(','),
        };
    }

    private parseNumber(value: unknown): number | null {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        const parsed = typeof value === 'number' ? value : Number(value);

        if (!Number.isFinite(parsed)) {
            return null;
        }

        return parsed;
    }
}
