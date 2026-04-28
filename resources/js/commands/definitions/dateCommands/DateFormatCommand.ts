import { AbstractCommand } from '../../AbstractCommand';

import type { CommandExecutionContext, CommandExecutionResult, CommandInputValues } from '../../../types/commands';

type FormatToken = 'Y' | 'y' | 'm' | 'd' | 'H' | 'i' | 's';

type TokenValuesResult =
    | { ok: true; tokens: Record<FormatToken, string> }
    | { ok: false; output: string };

export class DateFormatCommand extends AbstractCommand {
    readonly name = 'date:format';
    readonly group = 'date';
    readonly description = 'Parse a date with an input format and render it in the desired output format.';

    readonly parameters = [
        {
            name: 'date',
            type: 'string',
            required: false,
            description: 'Date value to transform (default: current date).',
            shortAlias: 'd',
            longAlias: 'date',
        },
        {
            name: 'format',
            type: 'string',
            required: false,
            description: 'Input format (default: Y-m-d).',
            defaultValue: 'Y-m-d',
            shortAlias: 'f',
            longAlias: 'format',
        },
        {
            name: 'output',
            type: 'string',
            required: false,
            description: 'Output format (default: d/m/Y).',
            defaultValue: 'd/m/Y',
            shortAlias: 'o',
            longAlias: 'output',
        },
        {
            name: 'locale',
            type: 'string',
            required: false,
            description: 'Locale used for Intl formatting token extraction (default: en-GB).',
            defaultValue: 'en-GB',
            longAlias: 'locale',
        },
        {
            name: 'timezone',
            type: 'string',
            required: false,
            description: 'IANA timezone for output values (example: UTC, Europe/Madrid).',
            longAlias: 'timezone',
        },
    ] as const;

    execute(input: CommandInputValues, _context: CommandExecutionContext): CommandExecutionResult {
        const positionalArgs = Array.isArray(input._args) ? input._args : [];
        const fromNamed = typeof input.date === 'string' ? input.date.trim() : '';
        const fromPositional = typeof positionalArgs[0] === 'string' ? positionalArgs[0].trim() : '';
        const dateValue = fromNamed || fromPositional;

        const inputFormat = typeof input.format === 'string' && input.format.trim().length > 0
            ? input.format.trim()
            : 'Y-m-d';

        const outputFormat = typeof input.output === 'string' && input.output.trim().length > 0
            ? input.output.trim()
            : 'd/m/Y';

        const locale = typeof input.locale === 'string' && input.locale.trim().length > 0
            ? input.locale.trim()
            : 'en-GB';

        const timezone = typeof input.timezone === 'string' && input.timezone.trim().length > 0
            ? input.timezone.trim()
            : undefined;

        const parsedDate = dateValue
            ? this.parseWithFormat(dateValue, inputFormat)
            : new Date();

        if (dateValue && !parsedDate) {
            return {
                ok: false,
                output: `Invalid date "${dateValue}" for format "${inputFormat}".`,
            };
        }

        const formatted = this.formatDate(parsedDate!, outputFormat, locale, timezone);

        if (!formatted.ok) {
            return formatted;
        }

        return {
            ok: true,
            output: formatted.output,
        };
    }

    private parseWithFormat(dateValue: string, format: string): Date | null {
        const tokenPatterns: Record<FormatToken, string> = {
            Y: '(\\d{4})',
            y: '(\\d{2})',
            m: '(\\d{1,2})',
            d: '(\\d{1,2})',
            H: '(\\d{1,2})',
            i: '(\\d{1,2})',
            s: '(\\d{1,2})',
        };

        const tokenOrder: FormatToken[] = [];
        let pattern = '';

        for (const character of format) {
            if (this.isFormatToken(character)) {
                tokenOrder.push(character);
                pattern += tokenPatterns[character];
            } else {
                pattern += this.escapeRegex(character);
            }
        }

        const match = new RegExp(`^${pattern}$`).exec(dateValue);
        if (!match) {
            return null;
        }

        const valuesByToken: Partial<Record<FormatToken, number>> = {};

        tokenOrder.forEach((token, index) => {
            valuesByToken[token] = Number(match[index + 1]);
        });

        const year = valuesByToken.Y ?? (valuesByToken.y !== undefined ? 2000 + valuesByToken.y : 1970);
        const month = valuesByToken.m ?? 1;
        const day = valuesByToken.d ?? 1;
        const hour = valuesByToken.H ?? 0;
        const minute = valuesByToken.i ?? 0;
        const second = valuesByToken.s ?? 0;

        if (
            !this.inRange(month, 1, 12)
            || !this.inRange(day, 1, 31)
            || !this.inRange(hour, 0, 23)
            || !this.inRange(minute, 0, 59)
            || !this.inRange(second, 0, 59)
        ) {
            return null;
        }

        const date = new Date(year, month - 1, day, hour, minute, second, 0);
        if (
            date.getFullYear() !== year
            || date.getMonth() !== month - 1
            || date.getDate() !== day
            || date.getHours() !== hour
            || date.getMinutes() !== minute
            || date.getSeconds() !== second
        ) {
            return null;
        }

        return date;
    }

    private formatDate(
        date: Date,
        format: string,
        locale: string,
        timezone?: string,
    ): CommandExecutionResult {
        const tokenValuesResult = this.getTokenValues(date, locale, timezone);

        if (!tokenValuesResult.ok) {
            return tokenValuesResult;
        }

        const tokenValues = tokenValuesResult.tokens;

        return {
            ok: true,
            output: format
                .split('')
                .map((character) => tokenValues[character as FormatToken] ?? character)
                .join(''),
        };
    }

    private getTokenValues(
        date: Date,
        locale: string,
        timezone?: string,
    ): TokenValuesResult {
        if (!this.isValidLocale(locale)) {
            return {
                ok: false,
                output: `Invalid locale: ${locale}`,
            };
        }

        let formatter: Intl.DateTimeFormat;

        try {
            formatter = new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: timezone,
            });
        } catch {
            return {
                ok: false,
                output: `Invalid timezone: ${timezone}`,
            };
        }

        const parts = formatter.formatToParts(date);

        const byType = (type: Intl.DateTimeFormatPartTypes): string => {
            return parts.find((part) => part.type === type)?.value ?? '';
        };

        return {
            ok: true,
            tokens: {
                Y: byType('year') || String(date.getFullYear()),
                y: byType('year') ? String(Number(byType('year')) % 100).padStart(2, '0') : String(date.getFullYear() % 100).padStart(2, '0'),
                m: byType('month') || this.pad(date.getMonth() + 1),
                d: byType('day') || this.pad(date.getDate()),
                H: byType('hour') || this.pad(date.getHours()),
                i: byType('minute') || this.pad(date.getMinutes()),
                s: byType('second') || this.pad(date.getSeconds()),
            },
        };
    }

    private isValidLocale(locale: string): boolean {
        return Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
    }

    private inRange(value: number, min: number, max: number): boolean {
        return Number.isInteger(value) && value >= min && value <= max;
    }

    private isFormatToken(value: string): value is FormatToken {
        return ['Y', 'y', 'm', 'd', 'H', 'i', 's'].includes(value);
    }

    private pad(value: number): string {
        return String(value).padStart(2, '0');
    }

    private escapeRegex(character: string): string {
        return character.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    }
}
