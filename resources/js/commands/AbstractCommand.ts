import type {
    CommandDefinition,
    CommandExecutionContext,
    CommandExecutionResult,
    CommandInputValues,
    CommandParameterDefinition,
} from '../types/commands';

export abstract class AbstractCommand {
    abstract readonly name: string;
    abstract readonly group: string;
    abstract readonly description: string;
    abstract readonly parameters: readonly CommandParameterDefinition[];

    abstract execute(input: CommandInputValues, context: CommandExecutionContext): CommandExecutionResult;

    metadata(): CommandDefinition {
        return {
            name: this.name,
            group: this.group,
            description: this.description,
            parameters: this.parameters,
        };
    }

    protected parseSeparatedList(rawValue: unknown, separator: unknown = ','): string[] {
        if (typeof rawValue !== 'string') {
            return [];
        }

        const parsedSeparator = typeof separator === 'string' && separator.length > 0
            ? separator
            : ',';

        return rawValue
            .split(parsedSeparator)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
}
